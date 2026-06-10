#!/usr/bin/env node
/**
 * Install script that tries prebuilt binaries first, falling back to node-gyp.
 *
 * This avoids requiring build tools (Python, C++ compiler, etc.) on platforms
 * where we ship prebuilt binaries.
 */
'use strict';

var spawn = require('child_process').spawn;
var prebuilt = require('./load-prebuilt');

var ROOT = __dirname;

/**
 * Try to load a prebuilt binary for the current platform.
 * Returns true if successful, false otherwise.
 */
function tryLoadPrebuilt() {
	var info = prebuilt.getPrebuiltPath();
	if (!info) {
		console.log(
			'No prebuilt binary found for ' +
				process.platform +
				'-' +
				process.arch
		);
		return false;
	}

	try {
		require(info.path);
		console.log('Using prebuilt binary: ' + info.name);
		return true;
	} catch (e) {
		console.log('Failed to load ' + info.name + ': ' + e.message);
		return false;
	}
}

/**
 * Run node-gyp to build from source.
 */
function buildFromSource() {
	console.log('Building from source with node-gyp...');

	var nodeGyp = process.platform === 'win32' ? 'node-gyp.cmd' : 'node-gyp';
	var args = ['rebuild'];

	var child = spawn(nodeGyp, args, {
		cwd: ROOT,
		stdio: 'inherit',
		shell: process.platform === 'win32'
	});

	child.on('close', function (code) {
		process.exit(code || 0);
	});

	child.on('error', function (err) {
		console.error('Failed to run node-gyp:', err.message);
		console.error('Please ensure you have build tools installed.');
		console.error('See: https://github.com/nodejs/node-gyp#installation');
		process.exit(1);
	});
}

/**
 * Remove binaries for other platforms so downstream tools (e.g. Windows code
 * signing) never encounter files they cannot process.
 */
function removeOtherPlatformBinaries() {
	var fs = require('fs');
	var path = require('path');
	var binDir = path.join(ROOT, 'binaries');
	var currentPlatformPrefix = 'fs-ext-' + process.platform + '-';
	try {
		var files = fs.readdirSync(binDir);

		// Safety check: only clean up if at least one file matches the expected
		// naming scheme. If none do, the scheme may have changed and deleting
		// would wipe every binary.
		var hasCurrentPlatformBinaries = files.some(function (file) {
			return file.startsWith(currentPlatformPrefix);
		});
		if (!hasCurrentPlatformBinaries) {
			console.log(
				'No binaries matching ' +
					currentPlatformPrefix +
					'* found, skipping cleanup.'
			);
			return;
		}

		files.forEach(function (file) {
			if (!file.startsWith(currentPlatformPrefix)) {
				try {
					fs.unlinkSync(path.join(binDir, file));
				} catch (e) {
					// Non-fatal: log and continue.
					console.log('Could not remove ' + file + ': ' + e.message);
				}
			}
		});
	} catch (e) {
		// Non-fatal: binaries directory may not exist if publishing without them.
		console.log('Could not clean up binaries directory: ' + e.message);
	}
}

// Main
if (tryLoadPrebuilt()) {
	console.log('Prebuilt binary works, skipping compilation.');
	removeOtherPlatformBinaries();
	process.exit(0);
} else {
	buildFromSource();
}
