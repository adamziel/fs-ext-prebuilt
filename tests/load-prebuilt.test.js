const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const vm = require('vm');
const path = require('path');

function selectBinary(
	files,
	{
		platform = 'darwin',
		arch = 'arm64',
		node = '26.4.0',
		abi = '147',
		electron,
		libc = 'glibc',
	} = {},
) {
	const context = {
		module: { exports: {} },
		__dirname: '/package',
		process: {
			platform,
			arch,
			versions: { node, modules: abi, electron },
			report: {
				getReport: () => ({
					header: libc === 'glibc' ? { glibcVersionRuntime: '2.39' } : {},
				}),
			},
		},
		require(name) {
			if (name === 'fs') {
				return { existsSync: (file) => files.includes(path.basename(file)) };
			}
			return require(name);
		},
	};
	vm.runInNewContext(
		fs.readFileSync(path.join(__dirname, '../load-prebuilt.js'), 'utf8'),
		context,
	);
	return context.module.exports.findPrebuiltBinary();
}

test('selects the actual ABI rather than guessing a lower Node major', () => {
	assert.equal(selectBinary(['fs-ext-darwin-arm64-node-25.0.0.node']), null);
	assert.equal(
		selectBinary(['fs-ext-darwin-arm64-node-abi147.node']),
		'fs-ext-darwin-arm64-node-abi147.node',
	);
});

test('does not fall back from Electron to a Node binary', () => {
	assert.equal(
		selectBinary(['fs-ext-darwin-arm64-node-abi147.node'], {
			electron: '44.1.1',
			abi: '149',
		}),
		null,
	);
	assert.equal(
		selectBinary(['fs-ext-darwin-arm64-electron-abi149.node'], {
			electron: '44.7.2',
			abi: '149',
		}),
		'fs-ext-darwin-arm64-electron-abi149.node',
	);
});

test('does not select glibc binaries on musl', () => {
	const files = [
		'fs-ext-linux-x64-glibc-node-abi147.node',
		'fs-ext-linux-x64-node-26.0.0.node',
	];
	assert.equal(
		selectBinary(files, { platform: 'linux', arch: 'x64', libc: 'musl' }),
		null,
	);
	assert.equal(
		selectBinary(files, { platform: 'linux', arch: 'x64' }),
		files[0],
	);
});

test('retains exact-major legacy binaries while ABI-named builds roll out', () => {
	assert.equal(
		selectBinary(['fs-ext-darwin-arm64-node-24.0.0.node'], {
			node: '24.21.0',
			abi: '137',
		}),
		'fs-ext-darwin-arm64-node-24.0.0.node',
	);
});
