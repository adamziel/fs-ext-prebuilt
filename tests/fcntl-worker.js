'use strict';

// Worker process for multiprocess lock tests
// Communicates with parent via IPC

var fs = require('node:fs');
var fsExt = require('../fs-ext');

// Use local build if available (same as test file)
try {
	fsExt.useNativeModule('local');
} catch (e) {
	// Local build not available, use prebuilt
}

var LOCK_FILE = process.env.LOCK_FILE;
var start = process.env.LOCK_START ? parseInt(process.env.LOCK_START, 10) : undefined;
var len = process.env.LOCK_LEN ? parseInt(process.env.LOCK_LEN, 10) : undefined;
var useBlocking = process.env.USE_BLOCKING === '1';
var useWholeFile = start === undefined || len === undefined;

var fd = fs.openSync(LOCK_FILE, 'r+');

// Helper to call fcntlSync with or without range
function lockFile(cmd, type) {
	if (useWholeFile) {
		return fsExt.fcntlSync(fd, cmd, type);
	}
	return fsExt.fcntlSync(fd, cmd, type, start, len);
}

try {
	if (useBlocking) {
		// F_SETLKW - blocking lock, will wait until lock is available
		lockFile(fsExt.constants.F_SETLKW, fsExt.constants.F_WRLCK);
		process.send({ status: 'acquired', time: Date.now() });

		// Release lock
		lockFile(fsExt.constants.F_SETLK, fsExt.constants.F_UNLCK);
	} else {
		// F_SETLK - non-blocking, will fail immediately if lock is held
		try {
			lockFile(fsExt.constants.F_SETLK, fsExt.constants.F_WRLCK);
			process.send({ status: 'acquired', time: Date.now() });
			lockFile(fsExt.constants.F_SETLK, fsExt.constants.F_UNLCK);
		} catch (e) {
			// EAGAIN or EACCES means lock is held by another process
			if (e.code === 'EAGAIN' || e.code === 'EACCES') {
				process.send({ status: 'blocked', code: e.code });
			} else {
				process.send({ status: 'error', message: e.message, code: e.code });
			}
		}
	}
} finally {
	fs.closeSync(fd);
}
