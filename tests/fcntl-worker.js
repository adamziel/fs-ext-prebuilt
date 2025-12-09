'use strict';

// Worker process for multiprocess lock tests
// Communicates with parent via IPC

const fs = require('node:fs');
const fsExt = require('../fs-ext');

const LOCK_FILE = process.env.LOCK_FILE;
const start = parseInt(process.env.LOCK_START, 10);
const len = parseInt(process.env.LOCK_LEN, 10);
const useBlocking = process.env.USE_BLOCKING === '1';

const fd = fs.openSync(LOCK_FILE, 'r+');

try {
	if (useBlocking) {
		// F_SETLKW - blocking lock, will wait until lock is available
		fsExt.fcntlSync(fd, fsExt.constants.F_SETLKW, fsExt.constants.F_WRLCK, start, len);
		process.send({ status: 'acquired', time: Date.now() });

		// Release lock
		fsExt.fcntlSync(fd, fsExt.constants.F_SETLK, fsExt.constants.F_UNLCK, start, len);
	} else {
		// F_SETLK - non-blocking, will fail immediately if lock is held
		try {
			fsExt.fcntlSync(fd, fsExt.constants.F_SETLK, fsExt.constants.F_WRLCK, start, len);
			process.send({ status: 'acquired', time: Date.now() });
			fsExt.fcntlSync(fd, fsExt.constants.F_SETLK, fsExt.constants.F_UNLCK, start, len);
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
