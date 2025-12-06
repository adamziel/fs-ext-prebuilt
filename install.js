#!/usr/bin/env node
/**
 * Install script that tries prebuilt binaries first, falling back to node-gyp.
 *
 * This avoids requiring build tools (Python, C++ compiler, etc.) on platforms
 * where we ship prebuilt binaries.
 */
'use strict';

var path = require('path');
var fs = require('fs');
var spawn = require('child_process').spawn;

var ROOT = __dirname;
var BINARIES_DIR = path.join(ROOT, 'binaries');

/**
 * Try to find and load a prebuilt binary for the current platform.
 * Returns true if successful, false otherwise.
 */
function tryLoadPrebuilt() {
	var platform = process.platform;
	var arch = process.arch;
	var nodeVersionNum = parseInt(process.versions.node.split('.')[0], 10);

	// Check if running in Electron
	var isElectron = !!(process.versions && process.versions.electron);
	var electronVersion = isElectron ? process.versions.electron : null;

	var files;
	try {
		files = fs.readdirSync(BINARIES_DIR);
	} catch (e) {
		console.log('No binaries directory found');
		return false;
	}

	// Filter files that match our platform/arch
	var platformArch = platform + '-' + arch;
	var candidates = files.filter(function (f) {
		return (
			f.startsWith('fs-ext-') &&
			f.includes(platformArch) &&
			f.endsWith('.node')
		);
	});

	if (candidates.length === 0) {
		console.log('No prebuilt binaries found for ' + platformArch);
		return false;
	}

	// Try Electron binary first
	if (isElectron && electronVersion) {
		var electronBinary = candidates.find(function (f) {
			return f.includes('electron-' + electronVersion);
		});
		if (electronBinary) {
			try {
				require(path.join(BINARIES_DIR, electronBinary));
				console.log('Using prebuilt binary: ' + electronBinary);
				return true;
			} catch (e) {
				// Failed to load, continue
			}
		}
	}

	// Try to find exact Node version match
	var nodeVersion = nodeVersionNum + '.0.0';
	var nodeBinary = candidates.find(function (f) {
		return f.includes('node-' + nodeVersion);
	});

	if (!nodeBinary) {
		// Find highest version <= current
		var nodeCandidates = candidates
			.filter(function (f) {
				return f.includes('-node-');
			})
			.map(function (f) {
				var match = f.match(/-node-(\d+)\./);
				return match
					? { file: f, version: parseInt(match[1], 10) }
					: null;
			})
			.filter(function (c) {
				return c && c.version <= nodeVersionNum;
			})
			.sort(function (a, b) {
				return b.version - a.version;
			});

		if (nodeCandidates.length > 0) {
			nodeBinary = nodeCandidates[0].file;
		}
	}

	if (nodeBinary) {
		try {
			require(path.join(BINARIES_DIR, nodeBinary));
			console.log('Using prebuilt binary: ' + nodeBinary);
			return true;
		} catch (e) {
			console.log('Failed to load ' + nodeBinary + ': ' + e.message);
		}
	}

	return false;
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

// Main
if (tryLoadPrebuilt()) {
	console.log('Prebuilt binary works, skipping compilation.');
	process.exit(0);
} else {
	buildFromSource();
}
