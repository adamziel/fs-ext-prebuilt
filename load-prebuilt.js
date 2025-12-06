/**
 * Shared logic for loading prebuilt binaries.
 *
 * Used by both the install script (to check if we need node-gyp) and
 * the main module (to load the binary at runtime).
 */
'use strict';

var path = require('path');
var fs = require('fs');

var BINARIES_DIR = path.join(__dirname, 'binaries');

/**
 * Find the best matching prebuilt binary for the current platform.
 * Returns the filename if found, null otherwise.
 */
function findPrebuiltBinary() {
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
		return null;
	}

	// Filter files that match our platform/arch
	// Format: fs-ext-{platform}-{arch}[-libc]-{runtime}-{version}.node
	var platformArch = platform + '-' + arch;
	var candidates = files.filter(function (f) {
		return (
			f.startsWith('fs-ext-') &&
			f.includes(platformArch) &&
			f.endsWith('.node')
		);
	});

	if (candidates.length === 0) {
		return null;
	}

	// Try Electron binary first
	if (isElectron && electronVersion) {
		var electronBinary = candidates.find(function (f) {
			return f.includes('electron-' + electronVersion);
		});
		if (electronBinary) {
			return electronBinary;
		}
	}

	// Try to find exact Node version match
	var nodeVersion = nodeVersionNum + '.0.0';
	var nodeBinary = candidates.find(function (f) {
		return f.includes('node-' + nodeVersion);
	});

	if (nodeBinary) {
		return nodeBinary;
	}

	// Find highest version <= current
	var nodeCandidates = candidates
		.filter(function (f) {
			return f.includes('-node-');
		})
		.map(function (f) {
			var match = f.match(/-node-(\d+)\./);
			return match ? { file: f, version: parseInt(match[1], 10) } : null;
		})
		.filter(function (c) {
			return c && c.version <= nodeVersionNum;
		})
		.sort(function (a, b) {
			return b.version - a.version;
		});

	if (nodeCandidates.length > 0) {
		return nodeCandidates[0].file;
	}

	return null;
}

/**
 * Try to load a prebuilt binary.
 * Returns the loaded module if successful, null otherwise.
 */
function loadPrebuilt() {
	var binaryName = findPrebuiltBinary();
	if (!binaryName) {
		return null;
	}

	try {
		return require(path.join(BINARIES_DIR, binaryName));
	} catch (e) {
		return null;
	}
}

/**
 * Get the path to a prebuilt binary without loading it.
 * Returns { path, name } if found, null otherwise.
 */
function getPrebuiltPath() {
	var binaryName = findPrebuiltBinary();
	if (!binaryName) {
		return null;
	}
	return {
		name: binaryName,
		path: path.join(BINARIES_DIR, binaryName)
	};
}

module.exports = {
	findPrebuiltBinary: findPrebuiltBinary,
	loadPrebuilt: loadPrebuilt,
	getPrebuiltPath: getPrebuiltPath,
	BINARIES_DIR: BINARIES_DIR
};
