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
		fs.writeFileSync('prebuild-targets.json', JSON.stringify(targets));
		for (const file of expectedFiles(targets)) {
			fs.writeFileSync(`binaries/${file}`, 'native addon');
		}
		for (const file of [
			'src/fs-ext.ts',
			'load-prebuilt.js',
			'install.js',
			'patch-nan-v8-14.js',
		]) {
			fs.writeFileSync(file, 'runtime source');
		}
		check(targets);
	} finally {
		process.chdir(previous);
		fs.rmSync(dir, { recursive: true, force: true });
	}
}
