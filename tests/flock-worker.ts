// Worker thread for flock blocking test

import { parentPort } from 'node:worker_threads';
import * as fs from 'node:fs';
// eslint-disable-next-line @typescript-eslint/no-var-requires
const fsExt = require('..');

// Use local build if available
try {
	fsExt.useNativeModule('local');
} catch (e) {
	// Local build not available, use prebuilt
}

const LOCK_FILE = 'worker-test.lock';

// Worker thread: try to acquire the same lock (should block until main releases)
const fd = fs.openSync(LOCK_FILE, 'w+');
fsExt.flockSync(fd, 'ex');
const acquiredAt = Date.now();
fsExt.flockSync(fd, 'un');
fs.closeSync(fd);
fs.rmSync(LOCK_FILE, { force: true });

parentPort!.postMessage({ acquiredAt });
