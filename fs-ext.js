// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.

'use strict';

var loader = require('./load-prebuilt');

// Load native module (prebuilt first, then local build)
var binding = loader.loadNativeModule();
if (!binding) {
	throw new Error(
		'Failed to load fs-ext native module. ' +
			'No prebuilt binary found for ' +
			process.platform +
			'-' +
			process.arch +
			' (Node ' +
			process.version +
			'), and no local build available.'
	);
}

// Used by flock
function stringToFlockFlags(flag) {
	// Only mess with strings
	if (typeof flag !== 'string') {
		return flag;
	}
	switch (flag) {
		case 'sh':
			return binding.constants.LOCK_SH;

		case 'ex':
			return binding.constants.LOCK_EX;

		case 'shnb':
			return binding.constants.LOCK_SH | binding.constants.LOCK_NB;

		case 'exnb':
			return binding.constants.LOCK_EX | binding.constants.LOCK_NB;

		case 'un':
			return binding.constants.LOCK_UN;

		default:
			throw new Error('Unknown flock flag: ' + flag);
	}
}

// used by Fcntl
function stringToFcntlFlags(flag) {
	if (typeof flag !== 'string') {
		return flag;
	}

	switch (flag) {
		case 'getfd':
			return binding.constants.F_GETFD;

		case 'setfd':
			return binding.constants.F_SETFD;

		case 'setlk':
			return binding.constants.F_SETLK;

		case 'setlkw':
			return binding.constants.F_SETLKW;

		case 'getlk':
			return binding.constants.F_GETLK;

		default:
			throw new Error('Unknown fcntl flag: ' + flag);
	}
}

function noop() {}

exports.flock = function (fd, flags, callback) {
	callback = arguments[arguments.length - 1];
	if (typeof callback !== 'function') {
		callback = noop;
	}

	var oper = stringToFlockFlags(flags);

	binding.flock(fd, oper, callback);
};

exports.flockSync = function (fd, flags) {
	var oper = stringToFlockFlags(flags);

	return binding.flock(fd, oper);
};

// fcntl(fd, cmd, arg, [start, len], [callback])
//
// For F_SETLK and F_SETLKW, start and len specify the byte range to lock.
// If start and len are omitted, they default to 0, which locks the entire file.
exports.fcntl = function (fd, cmd, arg, start, len, callback) {
	cmd = stringToFcntlFlags(cmd);

	// Handle different argument patterns:
	// fcntl(fd, cmd, callback) - arg defaults to 0
	// fcntl(fd, cmd, arg, callback) - no range
	// fcntl(fd, cmd, arg, start, len) - sync with range
	// fcntl(fd, cmd, arg, start, len, callback) - async with range

	if (typeof arg === 'function') {
		callback = arg;
		arg = 0;
		start = undefined;
		len = undefined;
	} else if (typeof start === 'function') {
		callback = start;
		start = undefined;
		len = undefined;
	} else if (typeof len === 'function') {
		callback = len;
		len = undefined;
	}

	if (arg === undefined || arg === null) arg = 0;

	// If start and len are provided, pass them to the binding
	if (start !== undefined && len !== undefined) {
		if (typeof callback === 'function') {
			return binding.fcntl(fd, cmd, arg, start, len, callback);
		}
		return binding.fcntl(fd, cmd, arg, start, len);
	}

	if (typeof callback === 'function') {
		return binding.fcntl(fd, cmd, arg, callback);
	}
	return binding.fcntl(fd, cmd, arg);
};

// fcntlSync(fd, cmd, arg, [start, len])
exports.fcntlSync = function (fd, cmd, arg, start, len) {
	cmd = stringToFcntlFlags(cmd);
	if (arg === undefined || arg === null) arg = 0;

	// If start and len are provided, pass them to the binding
	if (start !== undefined && len !== undefined) {
		return binding.fcntl(fd, cmd, arg, start, len);
	}

	return binding.fcntl(fd, cmd, arg);
};

exports.seek = function (fd, position, whence, callback) {
	callback = arguments[arguments.length - 1];
	if (typeof callback !== 'function') {
		callback = noop;
	}

	binding.seek(fd, position, whence, callback);
};

exports.seekSync = function (fd, position, whence) {
	return binding.seek(fd, position, whence);
};

exports.statVFS = function (path, callback) {
	path = path || '/';
	return binding.statVFS(path, callback);
};

// Windows-only: LockFileEx binding
// lockFileEx(fd, flags, offsetLow, offsetHigh, lengthLow, lengthHigh [, callback])
// flags: 0 for shared lock, LOCKFILE_EXCLUSIVE_LOCK for exclusive, can OR with LOCKFILE_FAIL_IMMEDIATELY
exports.lockFileEx = function (
	fd,
	flags,
	offsetLow,
	offsetHigh,
	lengthLow,
	lengthHigh,
	callback
) {
	if (!binding.lockFileEx) {
		throw new Error('lockFileEx is only available on Windows');
	}
	callback = arguments[arguments.length - 1];
	if (typeof callback !== 'function') {
		callback = noop;
	}
	return binding.lockFileEx(
		fd,
		flags,
		offsetLow,
		offsetHigh,
		lengthLow,
		lengthHigh,
		callback
	);
};

exports.lockFileExSync = function (
	fd,
	flags,
	offsetLow,
	offsetHigh,
	lengthLow,
	lengthHigh
) {
	if (!binding.lockFileEx) {
		throw new Error('lockFileEx is only available on Windows');
	}
	return binding.lockFileEx(
		fd,
		flags,
		offsetLow,
		offsetHigh,
		lengthLow,
		lengthHigh
	);
};

// Windows-only: UnlockFileEx binding
// unlockFileEx(fd, offsetLow, offsetHigh, lengthLow, lengthHigh [, callback])
exports.unlockFileEx = function (
	fd,
	offsetLow,
	offsetHigh,
	lengthLow,
	lengthHigh,
	callback
) {
	if (!binding.unlockFileEx) {
		throw new Error('unlockFileEx is only available on Windows');
	}
	callback = arguments[arguments.length - 1];
	if (typeof callback !== 'function') {
		callback = noop;
	}
	return binding.unlockFileEx(
		fd,
		offsetLow,
		offsetHigh,
		lengthLow,
		lengthHigh,
		callback
	);
};

exports.unlockFileExSync = function (
	fd,
	offsetLow,
	offsetHigh,
	lengthLow,
	lengthHigh
) {
	if (!binding.unlockFileEx) {
		throw new Error('unlockFileEx is only available on Windows');
	}
	return binding.unlockFileEx(
		fd,
		offsetLow,
		offsetHigh,
		lengthLow,
		lengthHigh
	);
};

// Ensure Windows LockFileEx constants are available on all platforms
if (binding.constants.LOCKFILE_EXCLUSIVE_LOCK === undefined) {
	binding.constants.LOCKFILE_EXCLUSIVE_LOCK = 0x00000002;
}
if (binding.constants.LOCKFILE_FAIL_IMMEDIATELY === undefined) {
	binding.constants.LOCKFILE_FAIL_IMMEDIATELY = 0x00000001;
}

exports.constants = binding.constants;

/**
 * Switch to a different native module source.
 * Useful for testing to explicitly use the local build instead of prebuilts.
 *
 * @param {string} source - 'prebuilt' or 'local'
 * @throws {Error} if the requested source cannot be loaded
 */
exports.useNativeModule = function (source) {
	var newBinding = loader.useNativeModule(source);
	if (!newBinding) {
		throw new Error(
			'Failed to load fs-ext native module from source: ' + source
		);
	}
	binding = newBinding;
	exports.constants = binding.constants;

	// Re-add Windows constants if needed
	if (binding.constants.LOCKFILE_EXCLUSIVE_LOCK === undefined) {
		binding.constants.LOCKFILE_EXCLUSIVE_LOCK = 0x00000002;
	}
	if (binding.constants.LOCKFILE_FAIL_IMMEDIATELY === undefined) {
		binding.constants.LOCKFILE_FAIL_IMMEDIATELY = 0x00000001;
	}
};

/**
 * Get the current native module source.
 * @returns {string|null} 'prebuilt', 'local', or null if not loaded
 */
exports.getNativeModuleSource = function () {
	return loader.getNativeModuleSource();
};
