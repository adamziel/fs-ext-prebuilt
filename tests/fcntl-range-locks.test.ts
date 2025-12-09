import { fork, ChildProcess } from 'node:child_process';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
import * as fsExt from '../src/fs-ext';

// Skip on Windows - fcntl is not available
const isWindows = process.platform === 'win32';
const describeUnix = isWindows ? describe.skip : describe;

// Use local build for testing
fsExt.useNativeModule('local');

const LOCK_FILE = path.join(os.tmpdir(), `fcntl-jest-test-${process.pid}.lock`);

interface WorkerResult {
	status: 'acquired' | 'blocked' | 'error';
	time?: number;
	code?: string;
	message?: string;
}

describeUnix('fcntl range locks', () => {
	beforeEach(() => {
		fs.writeFileSync(LOCK_FILE, 'x'.repeat(1000));
	});

	afterEach(() => {
		fs.rmSync(LOCK_FILE, { force: true });
	});

	describe('backward compatibility (old signature)', () => {
		test('fcntlSync(fd, cmd, arg) works without start/len', () => {
			const fd = fs.openSync(LOCK_FILE, 'r+');
			try {
				// Acquire whole-file lock using old signature
				const result = fsExt.fcntlSync(fd, fsExt.constants.F_SETLK, fsExt.constants.F_WRLCK);
				expect(result).toBe(0);

				// Release lock
				const unlockResult = fsExt.fcntlSync(fd, fsExt.constants.F_SETLK, fsExt.constants.F_UNLCK);
				expect(unlockResult).toBe(0);
			} finally {
				fs.closeSync(fd);
			}
		});

		test('fcntl(fd, cmd, arg, callback) works without start/len', (done) => {
			const fd = fs.openSync(LOCK_FILE, 'r+');

			fsExt.fcntl(fd, fsExt.constants.F_SETLK, fsExt.constants.F_WRLCK, (err) => {
				expect(err).toBeNull();

				// Release lock
				fsExt.fcntl(fd, fsExt.constants.F_SETLK, fsExt.constants.F_UNLCK, (err2) => {
					expect(err2).toBeNull();
					fs.closeSync(fd);
					done();
				});
			});
		});

		test('fcntlSync with string command "setlk" works', () => {
			const fd = fs.openSync(LOCK_FILE, 'r+');
			try {
				const result = fsExt.fcntlSync(fd, 'setlk', fsExt.constants.F_WRLCK);
				expect(result).toBe(0);

				fsExt.fcntlSync(fd, 'setlk', fsExt.constants.F_UNLCK);
			} finally {
				fs.closeSync(fd);
			}
		});
	});

	describe('range locks with start/len', () => {
		test('fcntlSync locks specific byte range', () => {
			const fd = fs.openSync(LOCK_FILE, 'r+');
			try {
				// Lock bytes 100-200
				const result = fsExt.fcntlSync(
					fd,
					fsExt.constants.F_SETLK,
					fsExt.constants.F_WRLCK,
					100,
					100
				);
				expect(result).toBe(0);

				// Unlock the range
				const unlockResult = fsExt.fcntlSync(
					fd,
					fsExt.constants.F_SETLK,
					fsExt.constants.F_UNLCK,
					100,
					100
				);
				expect(unlockResult).toBe(0);
			} finally {
				fs.closeSync(fd);
			}
		});

		test('fcntl async locks specific byte range', (done) => {
			const fd = fs.openSync(LOCK_FILE, 'r+');

			fsExt.fcntl(
				fd,
				fsExt.constants.F_SETLK,
				fsExt.constants.F_WRLCK,
				200,
				50,
				(err) => {
					expect(err).toBeNull();

					// Unlock
					fsExt.fcntl(
						fd,
						fsExt.constants.F_SETLK,
						fsExt.constants.F_UNLCK,
						200,
						50,
						(err2) => {
							expect(err2).toBeNull();
							fs.closeSync(fd);
							done();
						}
					);
				}
			);
		});

		test('F_SETLKW (blocking) works with range', () => {
			const fd = fs.openSync(LOCK_FILE, 'r+');
			try {
				const result = fsExt.fcntlSync(
					fd,
					fsExt.constants.F_SETLKW,
					fsExt.constants.F_WRLCK,
					300,
					100
				);
				expect(result).toBe(0);

				fsExt.fcntlSync(
					fd,
					fsExt.constants.F_SETLK,
					fsExt.constants.F_UNLCK,
					300,
					100
				);
			} finally {
				fs.closeSync(fd);
			}
		});
	});

	describe('multiprocess locking', () => {
		const spawnWorker = (
			lockStart: number | undefined,
			lockLen: number | undefined,
			useBlocking: boolean
		): Promise<WorkerResult> => {
			const env: NodeJS.ProcessEnv = {
				...process.env,
				LOCK_FILE,
				USE_BLOCKING: useBlocking ? '1' : '0'
			};
			// Only set LOCK_START and LOCK_LEN if they are numbers (not undefined)
			if (typeof lockStart === 'number') {
				env.LOCK_START = String(lockStart);
			}
			if (typeof lockLen === 'number') {
				env.LOCK_LEN = String(lockLen);
			}

			return new Promise((resolve, reject) => {
				const worker: ChildProcess = fork(
					path.join(__dirname, '..', 'dist-workers', 'fcntl-worker.js'),
					[],
					{ env }
				);

				const timeout = setTimeout(() => {
					worker.kill();
					reject(new Error('Worker timed out'));
				}, 5000);

				worker.on('message', (msg: WorkerResult) => {
					clearTimeout(timeout);
					worker.kill();
					resolve(msg);
				});

				worker.on('error', (err: Error) => {
					clearTimeout(timeout);
					reject(err);
				});
			});
		};

		test('blocking lock waits for lock to be released', async () => {
			const fd = fs.openSync(LOCK_FILE, 'r+');
			const lockAcquiredAt = Date.now();

			// Acquire lock on bytes 100-200
			fsExt.fcntlSync(fd, fsExt.constants.F_SETLK, fsExt.constants.F_WRLCK, 100, 100);

			// Start worker that will try to acquire same range (blocking)
			const workerPromise = spawnWorker(100, 100, true);

			// Release lock after 200ms
			await new Promise((r) => setTimeout(r, 200));
			fsExt.fcntlSync(fd, fsExt.constants.F_SETLK, fsExt.constants.F_UNLCK, 100, 100);
			fs.closeSync(fd);

			const result = await workerPromise;
			expect(result.status).toBe('acquired');

			const waitTime = result.time! - lockAcquiredAt;
			expect(waitTime).toBeGreaterThanOrEqual(150);
		});

		test('non-blocking lock fails when range is locked', async () => {
			const fd = fs.openSync(LOCK_FILE, 'r+');

			// Acquire lock on bytes 200-300
			fsExt.fcntlSync(fd, fsExt.constants.F_SETLK, fsExt.constants.F_WRLCK, 200, 100);

			try {
				const result = await spawnWorker(200, 100, false);
				expect(result.status).toBe('blocked');
				expect(['EAGAIN', 'EACCES']).toContain(result.code);
			} finally {
				fsExt.fcntlSync(fd, fsExt.constants.F_SETLK, fsExt.constants.F_UNLCK, 200, 100);
				fs.closeSync(fd);
			}
		});

		test('different ranges can be locked by different processes', async () => {
			const fd = fs.openSync(LOCK_FILE, 'r+');

			// Acquire lock on bytes 300-400
			fsExt.fcntlSync(fd, fsExt.constants.F_SETLK, fsExt.constants.F_WRLCK, 300, 100);

			try {
				// Worker tries to lock different range (500-600)
				const result = await spawnWorker(500, 100, false);
				expect(result.status).toBe('acquired');
			} finally {
				fsExt.fcntlSync(fd, fsExt.constants.F_SETLK, fsExt.constants.F_UNLCK, 300, 100);
				fs.closeSync(fd);
			}
		});

		test('whole-file lock blocks child process from acquiring lock', async () => {
			const fd = fs.openSync(LOCK_FILE, 'r+');

			// Acquire whole-file lock using old signature (no start/len)
			fsExt.fcntlSync(fd, fsExt.constants.F_SETLK, fsExt.constants.F_WRLCK);

			try {
				// Worker tries to acquire whole-file lock (non-blocking) - should fail
				const result = await spawnWorker(undefined, undefined, false);
				expect(result.status).toBe('blocked');
				expect(['EAGAIN', 'EACCES']).toContain(result.code);
			} finally {
				fsExt.fcntlSync(fd, fsExt.constants.F_SETLK, fsExt.constants.F_UNLCK);
				fs.closeSync(fd);
			}
		});
	});
});
