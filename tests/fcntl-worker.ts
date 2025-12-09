// Worker process for multiprocess lock tests
// Communicates with parent via IPC

import * as fs from 'node:fs';
// eslint-disable-next-line @typescript-eslint/no-var-requires
const fsExt = require('..');

// Use local build if available (same as test file)
try {
	fsExt.useNativeModule('local');
} catch (e) {
	// Local build not available, use prebuilt
}

const LOCK_FILE = process.env.LOCK_FILE!;
const start = process.env.LOCK_START ? parseInt(process.env.LOCK_START, 10) : undefined;
const len = process.env.LOCK_LEN ? parseInt(process.env.LOCK_LEN, 10) : undefined;
const useBlocking = process.env.USE_BLOCKING === '1';
const useWholeFile = start === undefined || len === undefined;

const fd = fs.openSync(LOCK_FILE, 'r+');

// Helper to call fcntlSync with or without range
function lockFile(cmd: number, type: number): number {
	if (useWholeFile) {
		return fsExt.fcntlSync(fd, cmd, type);
	}
	return fsExt.fcntlSync(fd, cmd, type, start!, len!);
}

try {
	if (useBlocking) {
		// F_SETLKW - blocking lock, will wait until lock is available
		lockFile(fsExt.constants.F_SETLKW, fsExt.constants.F_WRLCK);
		process.send!({ status: 'acquired', time: Date.now() });

		// Release lock
		lockFile(fsExt.constants.F_SETLK, fsExt.constants.F_UNLCK);
	} else {
		// F_SETLK - non-blocking, will fail immediately if lock is held
		try {
			lockFile(fsExt.constants.F_SETLK, fsExt.constants.F_WRLCK);
			process.send!({ status: 'acquired', time: Date.now() });
			lockFile(fsExt.constants.F_SETLK, fsExt.constants.F_UNLCK);
		} catch (e) {
			const err = e as NodeJS.ErrnoException;
			// EAGAIN or EACCES means lock is held by another process
			if (err.code === 'EAGAIN' || err.code === 'EACCES') {
				process.send!({ status: 'blocked', code: err.code });
			} else {
				process.send!({ status: 'error', message: err.message, code: err.code });
			}
		}
	}
} finally {
	fs.closeSync(fd);
}
