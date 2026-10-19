const fs = require('fs');
const path = require('path');
const os = require('os');
const assert = require('assert/strict');
const { execFileSync } = require('child_process');

const tarball = path.resolve(process.argv[2]);
const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'fs-ext-packed-'));
try {
	fs.writeFileSync(path.join(dir, 'package.json'), '{}');
	// Install scripts are disabled deliberately: a source build must not hide
	// a missing binary in the npm tarball.
	execFileSync(
		process.platform === 'win32' ? 'npm.cmd' : 'npm',
		[
			'install',
			'--ignore-scripts',
			'--omit=dev',
			'--no-audit',
			'--no-fund',
			tarball,
		],
		{ cwd: dir, stdio: 'inherit', shell: process.platform === 'win32' },
	);
	const installed = path.join(dir, 'node_modules', 'fs-ext-extra-prebuilt');
	const binding = require(installed);
	assert.equal(binding.getNativeModuleSource(), 'prebuilt');
	assert.equal(fs.existsSync(path.join(installed, 'build')), false);
	const fd = fs.openSync(path.join(dir, 'locked.txt'), 'w+');
	try {
		binding.flockSync(fd, 'exnb');
		binding.flockSync(fd, 'un');
		if (process.platform !== 'win32') {
			binding.fcntlSync(fd, 'setlk', binding.constants.F_WRLCK, 0, 1);
			binding.fcntlSync(fd, 'setlk', binding.constants.F_UNLCK, 0, 1);
		}
	} finally {
		fs.closeSync(fd);
	}
} finally {
	fs.rmSync(dir, { recursive: true, force: true });
}
