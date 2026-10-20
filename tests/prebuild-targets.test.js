const { test } = require('node:test');
const assert = require('node:assert/strict');
const {
	selectTargets,
	expectedFiles,
	platforms,
} = require('../.github/scripts/prebuild-targets');
const { releaseAction } = require('../.github/scripts/prepare-release');

const registry = {
	NODE_MODULE_VERSION: [
		{ runtime: 'node', versions: '26.0.0-pre', modules: 147 },
		{ runtime: 'electron', versions: '44', modules: 149 },
	],
};
const releases = [
	{ version: 'v26.4.0', modules: '147' },
	{ version: 'v26.0.0', modules: '147' },
	{ version: 'v24.0.0', modules: '137' },
	{ version: 'v20.0.0', modules: '115' },
];

test('ships Node 26 even while the ABI registry still calls it a prerelease', () => {
	const targets = selectTargets(releases, registry, '44.1.1');
	assert.deepEqual(
		targets
			.filter((target) => target.runtime === 'node')
			.map((target) => target.abi),
		['115', '137', '147'],
	);
	assert.equal(
		targets.find((target) => target.abi === '147').version,
		'26.0.0',
	);
});

test('a new patch with the same ABI leaves the target list unchanged', () => {
	const original = selectTargets(releases, registry, '44.1.1');
	const patched = selectTargets(
		[{ version: 'v26.5.0', modules: '147' }, ...releases],
		registry,
		'44.1.1',
	);
	assert.deepEqual(patched, original);
});

test('a new released ABI adds one target without removing older ABIs', () => {
	const targets = selectTargets(
		[{ version: 'v27.0.0', modules: '153' }, ...releases],
		registry,
		'44.1.1',
	);
	assert.equal(targets.filter((target) => target.runtime === 'node').length, 4);
	assert(targets.some((target) => target.abi === '115'));
	assert(targets.some((target) => target.abi === '153'));
});

test('manual header selection does not replace the supported ABI set', () => {
	const targets = selectTargets(releases, registry, '44.1.1', '26.4.0');
	assert.equal(
		targets.find((target) => target.abi === '147').version,
		'26.4.0',
	);
	assert(targets.some((target) => target.abi === '115'));
	assert.throws(
		() => selectTargets(releases, registry, '44.1.1', '27.0.0'),
		/not a released/,
	);
});

test('requires every platform for every selected target', () => {
	const targets = selectTargets(releases, registry, '44.1.1');
	const files = expectedFiles(targets);
	assert.equal(new Set(files).size, platforms.length * targets.length);
	assert(files.includes('fs-ext-win32-arm64-node-abi147.node'));
	assert(files.includes('fs-ext-linux-x64-glibc-node-abi147.node'));
});

test('retries an unpublished version without consuming another version number', () => {
	assert.equal(releaseAction(undefined, 'new-binaries', true), 'retry');
	assert.equal(
		releaseAction(
			{ prebuiltFingerprint: 'old-binaries' },
			'new-binaries',
			true,
		),
		'bump',
	);
	assert.equal(
		releaseAction(
			{ prebuiltFingerprint: 'same-binaries' },
			'same-binaries',
			true,
		),
		'skip',
	);
	assert.equal(
		releaseAction(
			{ prebuiltFingerprint: 'same-binaries' },
			'same-binaries',
			false,
		),
		'bump',
	);
});

test('validation rejects a missing platform without fetching a new target list', () => {
	withBinaryTree((targets) => {
		const { execFileSync } = require('child_process');
		const fs = require('fs');
		const validator =
			require.resolve('../.github/scripts/check-prebuild-targets');
		execFileSync(process.execPath, [validator, 'validate'], { stdio: 'pipe' });
		fs.unlinkSync(`binaries/${expectedFiles(targets)[0]}`);
		assert.throws(
			() =>
				execFileSync(process.execPath, [validator, 'validate'], {
					stdio: 'pipe',
				}),
			/Missing binaries/,
		);
	});
});

test('the release fingerprint changes with binary contents and rejects missing binaries', () => {
	withBinaryTree((targets) => {
		const fs = require('fs');
		const { fingerprint } = require('../.github/scripts/prepare-release');
		const file = `binaries/${expectedFiles(targets)[0]}`;
		const before = fingerprint(targets);
		assert.equal(fingerprint(targets), before);
		fs.writeFileSync(file, 'rebuilt native addon');
		assert.notEqual(fingerprint(targets), before);
		fs.unlinkSync(file);
		assert.throws(() => fingerprint(targets), /ENOENT/);
	});
});

test('scheduled retries require the same tested package inputs', () => {
	withBinaryTree((targets) => {
		const fs = require('fs');
		const { execFileSync } = require('child_process');
		const { fingerprint } = require('../.github/scripts/prepare-release');
		const selector = require.resolve('../.github/scripts/prebuild-targets');
		const detector = require.resolve('../.github/scripts/check-prebuild-targets');
		fs.writeFileSync(
			'freeze-targets.cjs',
			`require(${JSON.stringify(selector)}).resolveTargets = async () => ${JSON.stringify(targets)};`,
		);
		/** Runs the real scheduled detector with upstream discovery stubbed. */
		const detect = () =>
			execFileSync(process.execPath, ['--require', './freeze-targets.cjs', detector], {
				env: { ...process.env, EVENT_NAME: 'schedule', GITHUB_OUTPUT: '' },
				encoding: 'utf8',
			});
		assert.match(detect(), /should_build=true/);
		const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
		pkg.prebuiltFingerprint = fingerprint(targets);
		fs.writeFileSync('package.json', JSON.stringify(pkg));
		assert.match(detect(), /should_build=false/);

		// A failed push run leaves the old binaries and target snapshot in Git.
		// The next daily run must test the changed wrapper instead of publishing it.
		fs.writeFileSync('src/fs-ext.ts', 'throw new Error("untested runtime change");');
		assert.match(detect(), /should_build=true/);
	});
});

test('the fingerprint includes native sources, build settings, and package dependencies', () => {
	withBinaryTree((targets) => {
		const fs = require('fs');
		const { fingerprint } = require('../.github/scripts/prepare-release');
		const before = fingerprint(targets);
		// Keep the fingerprint aligned with the files shipped in the package.
		const pkg = require('../package.json');
		assert.deepEqual(pkg.files.filter((file) => file.endsWith('/')), ['dist/', 'binaries/']);
		for (const file of [...pkg.files.filter((file) => !file.endsWith('/')), 'tsconfig.json']) {
			const original = fs.readFileSync(file);
			fs.appendFileSync(file, '\nchanged shipped file');
			assert.notEqual(fingerprint(targets), before, file);
			fs.writeFileSync(file, original);
		}
		for (const file of ['package.json', 'package-lock.json']) {
			const original = fs.readFileSync(file);
			const metadata = JSON.parse(original);
			metadata.dependencies = { nan: '^2.28.0' };
			fs.writeFileSync(file, JSON.stringify(metadata));
			assert.notEqual(fingerprint(targets), before, file);
			fs.writeFileSync(file, original);
		}
	});
});

test('release version bookkeeping leaves the tested fingerprint unchanged', () => {
	withBinaryTree((targets) => {
		const fs = require('fs');
		const { fingerprint } = require('../.github/scripts/prepare-release');
		const before = fingerprint(targets);
		for (const file of ['package.json', 'package-lock.json']) {
			const metadata = JSON.parse(fs.readFileSync(file, 'utf8'));
			metadata.version = '2.2.15';
			if (file === 'package.json') {
				metadata.prebuiltFingerprint = before;
			} else {
				metadata.packages[''].version = metadata.version;
			}
			fs.writeFileSync(file, JSON.stringify(metadata));
		}
		assert.equal(fingerprint(targets), before);
	});
});

test('a publish rerun reuses the pending version commit instead of creating a sibling', () => {
	withReleaseRepo((targets, git, tested) => {
		const fs = require('fs');
		git('config', 'core.autocrlf', 'true');
		const pending = commitPendingRelease(targets, git);
		git('push', 'origin', 'HEAD:trunk');
		git('checkout', '--detach', tested);

		assert.match(runPrepareRelease(), /publish=true/);
		assert.equal(git('rev-parse', 'HEAD'), pending);
		assert.equal(JSON.parse(fs.readFileSync('package.json')).version, '2.2.15');
		// Git can mark LF-written metadata dirty after a CRLF checkout. Stage it,
		// as publish.yml does, before checking whether another commit is needed.
		git('add', 'package.json', 'package-lock.json');
		assert.equal(git('diff', '--staged', '--name-only'), '');
		git('push', 'origin', 'HEAD:trunk');
	});
});

test('a publish rerun does not adopt newer untested trunk sources', () => {
	withReleaseRepo((targets, git, tested) => {
		const fs = require('fs');
		const pending = commitPendingRelease(targets, git);
		fs.writeFileSync('src/fs-ext.ts', 'untested trunk source');
		git('add', 'src/fs-ext.ts');
		git('commit', '-m', 'Change runtime source');
		git('push', 'origin', 'HEAD:trunk');
		git('checkout', '--detach', tested);

		assert.match(runPrepareRelease(), /publish=true/);
		assert.equal(git('rev-parse', 'HEAD'), pending);
		assert.equal(fs.readFileSync('src/fs-ext.ts', 'utf8'), 'runtime source');
	});
});

test('a rerun skips an already-published pending version without another bump', () => {
	withReleaseRepo((targets, git, tested) => {
		const { fingerprint } = require('../.github/scripts/prepare-release');
		const pending = commitPendingRelease(targets, git);
		git('push', 'origin', 'HEAD:trunk');
		git('checkout', '--detach', tested);

		assert.match(runPrepareRelease({ prebuiltFingerprint: fingerprint(targets) }), /publish=false/);
		assert.equal(git('rev-parse', 'HEAD'), pending);
		assert.equal(git('status', '--porcelain', '--untracked-files=no'), '');
	});
});

test('a stale pending fingerprint cannot approve changed package dependencies', () => {
	withReleaseRepo((targets, git, tested) => {
		const fs = require('fs');
		commitPendingRelease(targets, git);
		const pkg = JSON.parse(fs.readFileSync('package.json'));
		pkg.dependencies.nan = '^2.28.0';
		fs.writeFileSync('package.json', JSON.stringify(pkg));
		git('add', 'package.json');
		git('commit', '--amend', '--no-edit');
		git('push', 'origin', 'HEAD:trunk');
		git('checkout', '--detach', tested);

		assert.throws(runPrepareRelease, /Pending release does not match the tested package/);
	});
});

/** Runs release checks against a local Git remote without accessing GitHub. */
function withReleaseRepo(check) {
	const { execFileSync } = require('child_process');
	const path = require('path');
	const root = path.join(__dirname, '..');
	const author = ['%an', '%ae'].map((format) =>
		execFileSync('git', ['log', '-1', `--format=${format}`], {
			cwd: root,
			encoding: 'utf8',
		}).trim(),
	);
	withBinaryTree((targets) => {
		/** Executes Git in this fixture and returns its trimmed output. */
		const git = (...args) =>
			execFileSync('git', args, { encoding: 'utf8', stdio: 'pipe' }).trim();
		git('init', '--initial-branch=trunk');
		git('config', 'user.name', author[0]);
		git('config', 'user.email', author[1]);
		git('config', 'commit.gpgsign', 'false');
		git('add', '.');
		git('commit', '-m', 'Tested package inputs');
		git('clone', '--bare', '.', 'origin.git');
		git('remote', 'add', 'origin', path.join(process.cwd(), 'origin.git'));
		check(targets, git, git('rev-parse', 'HEAD'));
	});
}

/** Records the version-only commit that remains after npm publication fails. */
function commitPendingRelease(targets, git) {
	const fs = require('fs');
	const { fingerprint } = require('../.github/scripts/prepare-release');
	const digest = fingerprint(targets);
	for (const file of ['package.json', 'package-lock.json']) {
		const metadata = JSON.parse(fs.readFileSync(file));
		metadata.version = '2.2.15';
		if (file === 'package.json') {
			metadata.prebuiltFingerprint = digest;
		} else {
			metadata.packages[''].version = metadata.version;
		}
		fs.writeFileSync(file, JSON.stringify(metadata, null, '\t') + '\n');
	}
	git('add', 'package.json', 'package-lock.json');
	git('commit', '-m', 'v2.2.15');
	return git('rev-parse', 'HEAD');
}

/** Runs the publisher offline with supplied npm metadata for the pending version. */
function runPrepareRelease(published) {
	const fs = require('fs');
	const path = require('path');
	const { execFileSync } = require('child_process');
	const selector = require.resolve('../.github/scripts/prebuild-targets');
	fs.writeFileSync(
		'fake-registry.cjs',
		`require(${JSON.stringify(selector)}).fetchJson = async (url) => {
			if (url.endsWith('/2.2.15')) {
				const published = ${JSON.stringify(published)};
				if (published) return published;
				throw Object.assign(new Error('Not published'), { statusCode: 404 });
			}
			return { version: '2.2.14' };
		};`,
	);
	execFileSync(process.execPath, [
		'--require', './fake-registry.cjs',
		require.resolve('../.github/scripts/prepare-release'),
	], {
		env: { ...process.env, ONLY_IF_NEEDED: 'true', GITHUB_OUTPUT: path.resolve('release-output') },
		stdio: 'pipe',
	});
	return fs.readFileSync('release-output', 'utf8');
}

/** Runs a release check against a complete temporary package and binary set. */
function withBinaryTree(check) {
	const fs = require('fs');
	const path = require('path');
	const os = require('os');
	const previous = process.cwd();
	const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'fs-ext-release-'));
	const targets = [{ runtime: 'node', version: '26.0.0', abi: '147' }];
	try {
		process.chdir(dir);
		fs.mkdirSync('binaries');
		fs.mkdirSync('src');
		fs.writeFileSync('prebuild-targets.json', JSON.stringify(targets, null, 2) + '\n');
		for (const file of ['package.json', 'package-lock.json']) {
			const metadata = JSON.parse(fs.readFileSync(path.join(__dirname, '..', file)));
			metadata.version = '2.2.14';
			delete metadata.prebuiltFingerprint;
			if (metadata.packages) {
				metadata.packages[''].version = metadata.version;
			}
			fs.writeFileSync(file, JSON.stringify(metadata, null, '\t') + '\n');
		}
		for (const file of expectedFiles(targets)) {
			fs.writeFileSync(`binaries/${file}`, 'native addon');
		}
		for (const file of [
			'src/fs-ext.ts',
			'load-prebuilt.js',
			'install.js',
			'patch-nan-v8-14.js',
			'fs-ext.cc',
			'binding.gyp',
			'tsconfig.json',
			'README.md',
			'LICENSE.txt',
		]) {
			fs.writeFileSync(file, 'runtime source');
		}
		check(targets);
	} finally {
		process.chdir(previous);
		fs.rmSync(dir, { recursive: true, force: true });
	}
}
