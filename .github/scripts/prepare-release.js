const fs = require('fs');
const crypto = require('crypto');
const { execFileSync } = require('child_process');
const { expectedFiles, fetchJson } = require('./prebuild-targets');

module.exports = { releaseAction, fingerprint };

/** Prepares a tested package version, reusing a matching pending commit on reruns. */
async function main() {
	const targets = JSON.parse(fs.readFileSync('prebuild-targets.json', 'utf8'));
	const digest = fingerprint(targets);
	reusePendingRelease(targets, digest);
	let pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
	let published;
	try {
		published = await fetchJson(
			`https://registry.npmjs.org/${encodeURIComponent(pkg.name)}/${pkg.version}`,
		);
	} catch (error) {
		if (error.statusCode !== 404) {
			throw error;
		}
	}
	const action = releaseAction(
		published,
		digest,
		process.env.ONLY_IF_NEEDED === 'true',
	);
	if (action === 'skip') {
		setOutput('version', pkg.version);
		setOutput('publish', 'false');
		return;
	}
	if (action === 'bump') {
		const bump = process.env.VERSION_BUMP || 'patch';
		if (!['patch', 'minor', 'major'].includes(bump)) {
			throw new Error(`Invalid version bump: ${bump}`);
		}
		execFileSync('npm', ['version', bump, '--no-git-tag-version'], {
			stdio: 'inherit',
		});
		pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
	}
	// Save the fingerprint in npm metadata, not just Git. If publishing fails
	// after the version commit, the next run retries that unpublished version.
	pkg.prebuiltFingerprint = digest;
	fs.writeFileSync('package.json', JSON.stringify(pkg, null, '\t') + '\n');
	setOutput('publish', 'true');
	setOutput('version', pkg.version);
}

/**
 * Reuses the version-only commit left by a failed publish attempt.
 * Reruns retain the original tested source_ref. The first commit after it may
 * be the pending version; later trunk commits can contain untested changes.
 */
function reusePendingRelease(targets, digest) {
	const tested = execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim();
	execFileSync('git', ['fetch', 'origin', 'trunk'], { stdio: 'inherit' });
	const pending = execFileSync('git', [
		'rev-list', '--ancestry-path', '--first-parent', '--reverse', `${tested}..FETCH_HEAD`,
	], { encoding: 'utf8' }).trim().split(/\r?\n/)[0];
	if (!pending) {
		return;
	}
	const changed = execFileSync('git', ['diff', '--name-only', tested, pending], {
		encoding: 'utf8',
	}).trim().split(/\r?\n/).filter(Boolean);
	if (changed.some((file) => !['package.json', 'package-lock.json'].includes(file))) {
		return;
	}
	const pkg = JSON.parse(execFileSync('git', ['show', `${pending}:package.json`], {
		encoding: 'utf8',
	}));
	if (pkg.prebuiltFingerprint !== digest) {
		return;
	}
	execFileSync('git', ['checkout', '--detach', pending], { stdio: 'inherit' });
	// The saved field alone cannot approve changes to dependencies or scripts.
	if (fingerprint(targets) !== digest) {
		throw new Error('Pending release does not match the tested package');
	}
}

function releaseAction(published, digest, onlyIfNeeded) {
	if (!published) {
		return 'retry';
	}
	return onlyIfNeeded && published.prebuiltFingerprint === digest
		? 'skip'
		: 'bump';
}

/**
 * Hashes package and build inputs, excluding release version bookkeeping.
 * A pending version can then be retried without treating its version bump as
 * an untested source change.
 */
function fingerprint(targets) {
	const hash = crypto.createHash('sha256');
	const files = [
		'package.json',
		'package-lock.json',
		'prebuild-targets.json',
		'src/fs-ext.ts',
		'tsconfig.json',
		'fs-ext.cc',
		'binding.gyp',
		'load-prebuilt.js',
		'install.js',
		'patch-nan-v8-14.js',
		'README.md',
		'LICENSE.txt',
		...expectedFiles(targets).map((file) => `binaries/${file}`),
	].sort();
	for (const file of files) {
		let content = fs.readFileSync(file);
		if (file === 'package.json' || file === 'package-lock.json') {
			const metadata = JSON.parse(content);
			delete metadata.version;
			delete metadata.prebuiltFingerprint;
			if (metadata.packages) {
				delete metadata.packages[''].version;
			}
			content = Buffer.from(JSON.stringify(metadata));
		}
		hash.update(`${file}\0${content.length}\0`);
		hash.update(content);
	}
	return hash.digest('hex');
}

function setOutput(name, value) {
	fs.appendFileSync(process.env.GITHUB_OUTPUT, `${name}=${value}\n`);
}

if (require.main === module) {
	main().catch((error) => {
		console.error(error);
		process.exitCode = 1;
	});
}
