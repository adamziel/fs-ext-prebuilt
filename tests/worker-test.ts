import { Worker, isMainThread } from 'node:worker_threads';
import * as assert from 'node:assert';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as fsExt from '../src/fs-ext';

// Use local build if available
try {
	fsExt.useNativeModule('local');
} catch (e) {
	// Local build not available, use prebuilt
}

const LOCK_FILE = 'worker-test.lock';

if (isMainThread) {
	// Main thread: acquire lock, hold it, then release
	const fd = fs.openSync(LOCK_FILE, 'w+');
	fsExt.flockSync(fd, 'ex');
	const lockAcquiredAt = Date.now();

	// Use a separate JavaScript worker file because Node's native TypeScript
	// support runs workers as ESM which has issues with require paths
	const workerPath = path.join(__dirname, 'flock-worker.js');
	const worker = new Worker(workerPath);

	// Release lock after 200ms
	setTimeout(() => {
		fsExt.flockSync(fd, 'un');
		fs.closeSync(fd);
		fs.rmSync(LOCK_FILE, { force: true });
	}, 200);

	worker.on('message', (msg: { acquiredAt: number }) => {
		// Worker reports when it acquired the lock
		const workerAcquiredAt = msg.acquiredAt;

		// The worker should have acquired the lock AFTER we released it
		// (at least 150ms after we acquired it, giving some margin)
		const timeDiff = workerAcquiredAt - lockAcquiredAt;
		assert.ok(
			timeDiff >= 150,
			`Worker acquired lock too early: ${timeDiff}ms after main (expected >= 150ms)`
		);

		worker.terminate();
		console.log(`Worker lock test passed: worker waited ${timeDiff}ms for lock`);
	});

	worker.on('error', (err: Error) => {
		console.error('Worker error:', err);
		process.exit(1);
	});
}
