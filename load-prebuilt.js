/**
 * Shared logic for loading native binaries.
 *
 * Used by both the install script (to check if we need node-gyp) and
 * the main module (to load the binary at runtime).
 */
'use strict';

var path = require('path');
var fs = require('fs');

var BINARIES_DIR = path.join(__dirname, 'binaries');
var LOCAL_BUILD_PATH = path.join(__dirname, 'build', 'Release', 'fs_ext.node');

// Cached binding and the source it was loaded from
var cachedBinding = null;
var cachedSource = null;

/**
 * Find the best matching prebuilt binary for the current platform.
 * Returns the filename if found, null otherwise.
 */
function findPrebuiltBinary() {
	var platform = process.platform;
	var arch = process.arch;
	// Check if running in Electron. Never substitute a Node binary in that runtime.
	var runtime = process.versions.electron ? 'electron' : 'node';
	var platformArch = platform + '-' + arch;
	var libc = '';
	if (platform === 'linux') {
		libc = process.report && process.report.getReport().header.glibcVersionRuntime
			? 'glibc' : 'musl';
	}
	var binaryPlatform = platformArch + (libc ? '-' + libc : '');
	// Match platform/arch, Linux libc, runtime, and the actual module ABI.
	// Format: fs-ext-{platform}-{arch}[-libc]-{runtime}-abi{modules}.node
	var exactAbi = 'fs-ext-' + binaryPlatform + '-' + runtime + '-abi' + process.versions.modules + '.node';
	if (fs.existsSync(path.join(BINARIES_DIR, exactAbi))) {
		return exactAbi;
	}

	// Keep existing release binaries usable until the first ABI-named build.
	// Older Linux binaries were built on glibc and cannot run on musl.
	if (libc === 'musl') {
		return null;
	}
	var version = runtime === 'electron'
		? process.versions.electron
		: process.versions.node.split('.')[0] + '.0.0';
	var legacy = 'fs-ext-' + platformArch + '-' + runtime + '-' + version + '.node';
	return fs.existsSync(path.join(BINARIES_DIR, legacy)) ? legacy : null;
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
 * Try to load the local build (from build/Release/fs_ext.node).
 * Returns the loaded module if successful, null otherwise.
 */
function loadLocalBuild() {
	try {
		return require(LOCAL_BUILD_PATH);
	} catch (e) {
		return null;
	}
}

/**
 * Load the native module with explicit source selection.
 *
 * @param {string} [source] - 'prebuilt', 'local', or undefined for auto (prebuilt first, then local)
 * @returns {Object|null} The loaded binding or null if loading failed
 */
function loadNativeModule(source) {
	// If we have a cached binding from the same source, return it
	if (cachedBinding && (source === undefined || source === cachedSource)) {
		return cachedBinding;
	}

	var binding = null;

	if (source === 'local') {
		binding = loadLocalBuild();
		if (binding) {
			cachedBinding = binding;
			cachedSource = 'local';
		}
	} else if (source === 'prebuilt') {
		binding = loadPrebuilt();
		if (binding) {
			cachedBinding = binding;
			cachedSource = 'prebuilt';
		}
	} else {
		// Auto mode: try prebuilt first, then local
		binding = loadPrebuilt();
		if (binding) {
			cachedBinding = binding;
			cachedSource = 'prebuilt';
		} else {
			binding = loadLocalBuild();
			if (binding) {
				cachedBinding = binding;
				cachedSource = 'local';
			}
		}
	}

	return binding;
}

/**
 * Switch the native module source. Clears cache and reloads.
 * Useful for testing to switch between prebuilt and local builds.
 *
 * @param {string} source - 'prebuilt' or 'local'
 * @returns {Object|null} The loaded binding or null if loading failed
 */
function useNativeModule(source) {
	cachedBinding = null;
	cachedSource = null;
	return loadNativeModule(source);
}

/**
 * Get the current binding source.
 * @returns {string|null} 'prebuilt', 'local', or null if not loaded
 */
function getNativeModuleSource() {
	return cachedSource;
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
	loadLocalBuild: loadLocalBuild,
	loadNativeModule: loadNativeModule,
	useNativeModule: useNativeModule,
	getNativeModuleSource: getNativeModuleSource,
	getPrebuiltPath: getPrebuiltPath,
	BINARIES_DIR: BINARIES_DIR,
	LOCAL_BUILD_PATH: LOCAL_BUILD_PATH
};
