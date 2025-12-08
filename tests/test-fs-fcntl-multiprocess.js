'use strict';

// Test fcntl range locks across multiple processes.
// This verifies that:
// 1. When one process holds a lock on a byte range, another process is blocked
// 2. Different byte ranges can be locked independently by different processes

const { fork } = require('node:child_process');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');

// fcntl is not available on Windows
if (process.platform === 'win32') {
	console.log('Skipping fcntl multiprocess test on Windows');
	process.exit(0);
}

const fsExt = require('../fs-ext');

const LOCK_FILE = path.join(os.tmpdir(), 'fcntl-multiprocess-test.lock');
const ROLE = process.env.FCNTL_TEST_ROLE;

// Ensure test file exists with some content
function ensureTestFile() {
	fs.writeFileSync(LOCK_FILE, 'x'.repeat(1000));
}

// Child process: worker that tries to acquire a lock
if (ROLE === 'worker') {
	const start = parseInt(process.env.LOCK_START, 10);
	const len = parseInt(process.env.LOCK_LEN, 10);
	const useBlocking = process.env.USE_BLOCKING === '1';

	const fd = fs.openSync(LOCK_FILE, 'r+');

	try {
		if (useBlocking) {
			// F_SETLKW - blocking lock, will wait until lock is available
			fsExt.fcntlSync(fd, fsExt.constants.F_SETLKW, fsExt.constants.F_WRLCK, start, len);
			process.send({ status: 'acquired', time: Date.now() });

			// Hold lock briefly then release
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

	process.exit(0);
}

// Main process: run the tests
if (!ROLE) {
	let tests_run = 0;
	let tests_ok = 0;

	process.on('exit', () => {
		fs.rmSync(LOCK_FILE, { force: true });
		console.log('Tests run: %d     ok: %d', tests_run, tests_ok);
		assert.equal(tests_ok, tests_run, 'One or more subtests failed');
	});

	ensureTestFile();

	// Test 1: Verify that a lock blocks another process from acquiring the same range
	async function testBlockingLock() {
		tests_run++;

		const fd = fs.openSync(LOCK_FILE, 'r+');
		let resolved = false;
		let fdClosed = false;

		// Acquire lock on bytes 100-200
		fsExt.fcntlSync(fd, fsExt.constants.F_SETLK, fsExt.constants.F_WRLCK, 100, 100);
		const lockAcquiredAt = Date.now();

		// Spawn worker that will try to acquire the same range (blocking)
		const worker = fork(__filename, [], {
			env: {
				...process.env,
				FCNTL_TEST_ROLE: 'worker',
				LOCK_START: '100',
				LOCK_LEN: '100',
				USE_BLOCKING: '1',
			},
		});

		return new Promise((resolve) => {
			// Release lock after 200ms
			setTimeout(() => {
				if (!fdClosed) {
					fdClosed = true;
					try {
						fsExt.fcntlSync(fd, fsExt.constants.F_SETLK, fsExt.constants.F_UNLCK, 100, 100);
						fs.closeSync(fd);
					} catch (e) { /* ignore */ }
				}
			}, 200);

			worker.on('message', (msg) => {
				if (resolved) return;
				resolved = true;

				if (msg.status === 'acquired') {
					const waitTime = msg.time - lockAcquiredAt;
					if (waitTime >= 150) {
						tests_ok++;
						console.log(`  OK: Blocking lock test passed - worker waited ${waitTime}ms`);
					} else {
						console.log(`  FAILURE: Worker acquired lock too early (${waitTime}ms)`);
					}
				} else {
					console.log(`  FAILURE: Unexpected worker status: ${msg.status}`);
				}
				worker.kill();
				resolve();
			});

			worker.on('error', (err) => {
				if (resolved) return;
				resolved = true;
				console.log(`  FAILURE: Worker error: ${err.message}`);
				resolve();
			});

			// Timeout after 5 seconds
			setTimeout(() => {
				if (!resolved) {
					resolved = true;
					console.log('  FAILURE: Test timed out');
					worker.kill();
					resolve();
				}
			}, 5000);
		});
	}

	// Test 2: Verify that non-blocking lock fails when range is already locked
	async function testNonBlockingLockFails() {
		tests_run++;

		const fd = fs.openSync(LOCK_FILE, 'r+');
		let resolved = false;

		// Acquire lock on bytes 200-300
		fsExt.fcntlSync(fd, fsExt.constants.F_SETLK, fsExt.constants.F_WRLCK, 200, 100);

		// Spawn worker that will try non-blocking lock on same range
		const worker = fork(__filename, [], {
			env: {
				...process.env,
				FCNTL_TEST_ROLE: 'worker',
				LOCK_START: '200',
				LOCK_LEN: '100',
				USE_BLOCKING: '0',
			},
		});

		return new Promise((resolve) => {
			const cleanup = () => {
				if (resolved) return;
				resolved = true;
				try {
					fsExt.fcntlSync(fd, fsExt.constants.F_SETLK, fsExt.constants.F_UNLCK, 200, 100);
					fs.closeSync(fd);
				} catch (e) { /* ignore */ }
				worker.kill();
				resolve();
			};

			worker.on('message', (msg) => {
				if (msg.status === 'blocked') {
					tests_ok++;
					console.log(`  OK: Non-blocking lock correctly failed with ${msg.code}`);
				} else if (msg.status === 'acquired') {
					console.log('  FAILURE: Worker should not have acquired the lock');
				} else {
					console.log(`  FAILURE: Unexpected status: ${msg.status} - ${msg.message}`);
				}
				cleanup();
			});

			worker.on('error', (err) => {
				console.log(`  FAILURE: Worker error: ${err.message}`);
				cleanup();
			});

			setTimeout(() => {
				if (!resolved) {
					console.log('  FAILURE: Test timed out');
					cleanup();
				}
			}, 5000);
		});
	}

	// Test 3: Verify that different ranges can be locked by different processes
	async function testDifferentRangesIndependent() {
		tests_run++;

		const fd = fs.openSync(LOCK_FILE, 'r+');
		let resolved = false;

		// Acquire lock on bytes 300-400
		fsExt.fcntlSync(fd, fsExt.constants.F_SETLK, fsExt.constants.F_WRLCK, 300, 100);

		// Spawn worker that will try to lock a DIFFERENT range (500-600)
		const worker = fork(__filename, [], {
			env: {
				...process.env,
				FCNTL_TEST_ROLE: 'worker',
				LOCK_START: '500',
				LOCK_LEN: '100',
				USE_BLOCKING: '0',
			},
		});

		return new Promise((resolve) => {
			const cleanup = () => {
				if (resolved) return;
				resolved = true;
				try {
					fsExt.fcntlSync(fd, fsExt.constants.F_SETLK, fsExt.constants.F_UNLCK, 300, 100);
					fs.closeSync(fd);
				} catch (e) { /* ignore */ }
				worker.kill();
				resolve();
			};

			worker.on('message', (msg) => {
				if (msg.status === 'acquired') {
					tests_ok++;
					console.log('  OK: Different ranges can be locked independently');
				} else {
					console.log(`  FAILURE: Worker should have acquired lock on different range: ${msg.status}`);
				}
				cleanup();
			});

			worker.on('error', (err) => {
				console.log(`  FAILURE: Worker error: ${err.message}`);
				cleanup();
			});

			setTimeout(() => {
				if (!resolved) {
					console.log('  FAILURE: Test timed out');
					cleanup();
				}
			}, 5000);
		});
	}

	// Run all tests sequentially
	(async () => {
		console.log('Testing fcntl range locks across multiple processes...\n');

		await testBlockingLock();
		await testNonBlockingLockFails();
		await testDifferentRangesIndependent();

		console.log('\nMultiprocess fcntl tests completed.');
	})();
}
