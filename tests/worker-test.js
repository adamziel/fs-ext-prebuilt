'use strict';

const { Worker, isMainThread, parentPort } = require('node:worker_threads');
const assert = require('node:assert');
const fs = require('node:fs');
const fsExt = require('../fs-ext');

class Mutex {
	constructor(filename) {
		this.filename = filename;
	}
	lock() {
		this.fd = fs.openSync(this.filename, 'w+');
		fsExt.flockSync(this.fd, 'ex');
	}
	unlock() {
		fsExt.flockSync(this.fd, 'un');
		fs.closeSync(this.fd);
		fs.rmSync(this.filename, { force: true });
		this.fd = null;
	}
}

const LOCK_FILE = 'worker-test.lock';

if (isMainThread) {
	// Main thread: acquire lock, hold it, then release
	const m = new Mutex(LOCK_FILE);
	m.lock();
	const lockAcquiredAt = Date.now();

	const worker = new Worker(__filename);

	// Release lock after 200ms
	setTimeout(() => {
		m.unlock();
	}, 200);

	worker.on('message', (msg) => {
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
		console.log(
			`Worker lock test passed: worker waited ${timeDiff}ms for lock`
		);
	});

	worker.on('error', (err) => {
		console.error('Worker error:', err);
		process.exit(1);
	});
} else {
	// Worker thread: try to acquire the same lock (should block until main releases)
	const m = new Mutex(LOCK_FILE);
	m.lock();
	const acquiredAt = Date.now();
	m.unlock();

	parentPort.postMessage({ acquiredAt });
}
