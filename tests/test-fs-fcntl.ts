// Test these APIs as published in extension module 'fs-ext'
//
// fsExt.fcntl(fd, cmd, [arg], [callback])

import * as assert from 'assert';
import * as path from 'path';
import * as util from 'util';
import * as fs from 'fs';
import * as os from 'os';
import * as fsExt from '../src/fs-ext';

// Use local build if available
try {
	fsExt.useNativeModule('local');
} catch (e) {
	// Local build not available, use prebuilt
}

let tests_ok = 0;
let tests_run = 0;

const debug_me = false;

const tmp_dir = os.tmpdir();
const file_path = path.join(tmp_dir, 'what.when.fcntl.test');

let file_fd: number = -1;
let err: Error | null | undefined;

// Report on test results

// Clean up and report on final success or failure of tests here
process.addListener('exit', () => {
	try {
		fs.closeSync(file_fd);
	} catch (e) {
		// might not be open, that's okay.
	}

	remove_file_wo_error(file_path);

	console.log('Tests run: %d     ok: %d', tests_run, tests_ok);
	assert.equal(tests_ok, tests_run, 'One or more subtests failed');
});

// Test helpers

function remove_file_wo_error(filePath: string): void {
	try {
		fs.unlinkSync(filePath);
	} catch (e) {
		// might not exist, that's okay.
	}
}

function expect_errno(api_name: string, resource: unknown, error: Error | null | undefined, expected_errno: string): void {
	let fault_msg: string | undefined;

	if (debug_me) console.log('  expected_errno(err): ' + error);

	if (error && (error as NodeJS.ErrnoException).code !== expected_errno) {
		fault_msg = api_name + '(): expected error ' + expected_errno + ', got another error';
	} else if (!error) {
		fault_msg = api_name + '(): expected error ' + expected_errno + ', got another error';
	}

	if (!fault_msg) {
		tests_ok++;
		if (debug_me) console.log(' FAILED OK: ' + api_name);
	} else {
		console.log('FAILURE: ' + fault_msg);
		console.log('   ARGS: ', util.inspect(arguments));
	}
}

function expect_ok(api_name: string, resource: unknown, error: Error | null | undefined): void {
	let fault_msg: string | undefined;

	if (error) {
		fault_msg = api_name + '(): returned error';
	}

	if (!fault_msg) {
		tests_ok++;
		if (debug_me) console.log('        OK: ' + api_name);
	} else {
		console.log('FAILURE: ' + fault_msg);
		console.log('   ARGS: ', util.inspect(arguments));
	}
}

// Setup for testing

// Check whether this version of node.js has these APIs to test

tests_run++;
if (typeof fsExt.fcntl !== 'function') {
	console.log('fsExt.fcntl API is missing');
} else {
	tests_ok++;
}

tests_run++;
if (typeof fsExt.fcntlSync !== 'function') {
	console.log('fsExt.fcntlSync API is missing');
} else {
	tests_ok++;
}

// If any pre-checks and setup fail, quit before tests
if (tests_run !== tests_ok) {
	process.exit(1);
}

// Delete any prior copy of test data file(s)
remove_file_wo_error(file_path);

// Create a new file
tests_run++;
try {
	file_fd = fs.openSync(file_path, 'w');
	tests_ok++;
} catch (e) {
	console.log('  Unable to create test data file %j', file_path);
	console.log('    Error was: %j', e);
}

if (tests_run !== tests_ok) {
	process.exit(1);
}

// Test that constants are published

const constant_names = ['F_SETFD', 'F_GETFD', 'FD_CLOEXEC'] as const;

constant_names.forEach((name) => {
	const value = fsExt.constants[name];
	if (debug_me)
		console.log(
			'  %s    %j    %j',
			name,
			value,
			typeof value
		);

	tests_run++;
	if (value !== undefined && typeof value === 'number') {
		tests_ok++;
	} else {
		console.log('FAILURE: %s is not defined correctly', name);
		console.log(
			'  %s    %j    %j',
			name,
			value,
			typeof value
		);
	}
});

// Test bad argument handling

// fd value is undefined

tests_run++;
try {
	err = null;
	fsExt.fcntlSync(undefined as unknown as number, 0);
} catch (e) {
	err = e as Error;
}

if (err) {
	if (debug_me) console.log('    err    %j', err);
	tests_ok++;
} else if (debug_me) {
	console.log('    expected error from undefined fd argument');
}

// fd value is non-number

tests_run++;
try {
	err = null;
	fsExt.fcntlSync('foo' as unknown as number, 0);
} catch (e) {
	err = e as Error;
}

if (err) {
	if (debug_me) console.log('    err    %j', err);
	tests_ok++;
} else if (debug_me) {
	console.log('    expected error from non-numeric fd argument');
}

// fd value is negative

tests_run++;
try {
	err = null;
	fsExt.fcntlSync(-9, 0);
} catch (e) {
	err = e as Error;
}
expect_errno('fcntlSync', -9, err, 'EBADF');

// fd value is 'impossible'

tests_run++;
try {
	err = null;
	fsExt.fcntlSync(98765, 0);
} catch (e) {
	err = e as Error;
}
expect_errno('fcntlSync', 98765, err, 'EBADF');

// flags value is invalid

tests_run++;
try {
	err = null;
	fsExt.fcntlSync(file_fd, 'foo' as unknown as number);
} catch (e) {
	err = e as Error;
}

if (err) {
	if (debug_me) console.log('    err    %j', err);
	tests_ok++;
} else if (debug_me) {
	console.log('    expected error from non-numeric fd argument');
}

// Test valid calls: fcntlSync

tests_run++;
try {
	err = null;
	fsExt.fcntlSync(file_fd, 'getfd');
} catch (e) {
	err = e as Error;
}
expect_ok('fcntlSync', file_fd, err);

// operation setfd then getfd

tests_run++;
try {
	err = null;
	let flags = fsExt.fcntlSync(file_fd, 'getfd');
	console.log('initial flags:' + flags);

	fsExt.fcntlSync(file_fd, 'setfd', flags | fsExt.constants.FD_CLOEXEC);
	flags = fsExt.fcntlSync(file_fd, 'getfd');
	if ((flags & fsExt.constants.FD_CLOEXEC) !== fsExt.constants.FD_CLOEXEC) {
		throw new Error('Expected FD_CLOEXEC to be set: ' + flags);
	}

	fsExt.fcntlSync(file_fd, 'setfd', flags & ~fsExt.constants.FD_CLOEXEC);
	flags = fsExt.fcntlSync(file_fd, 'getfd');
	if ((flags & fsExt.constants.FD_CLOEXEC) === fsExt.constants.FD_CLOEXEC) {
		throw new Error('Expected FD_CLOEXEC to be cleared');
	}
} catch (e) {
	err = e as Error;
}
expect_ok('fcntlSync', file_fd, err);

// Test valid calls: fcntl

tests_run++;
fsExt.fcntl(file_fd, 'getfd', (error) => {
	expect_ok('fcntl', file_fd, error);

	tests_run++;
	fsExt.fcntl(
		file_fd,
		'setfd',
		fsExt.fcntlSync(file_fd, 'getfd') | fsExt.constants.FD_CLOEXEC,
		(error2) => {
			expect_ok('fcntl', file_fd, error2);

			tests_run++;
			fsExt.fcntl(file_fd, 'getfd', (error3) => {
				expect_ok('fcntl', file_fd, error3);

				const currentFlags = fsExt.fcntlSync(file_fd, 'getfd');
				if ((currentFlags & fsExt.constants.FD_CLOEXEC) !== fsExt.constants.FD_CLOEXEC) {
					tests_run++;
					expect_ok('fcntl', file_fd, new Error('did not set cloexec'));
				}

				tests_run++;
				fsExt.fcntl(
					file_fd,
					'setfd',
					currentFlags & ~fsExt.constants.FD_CLOEXEC,
					(error4) => {
						expect_ok('fcntl', file_fd, error4);

						tests_run++;
						fsExt.fcntl(file_fd, 'getfd', (error5) => {
							expect_ok('fcntl', file_fd, error5);

							const finalFlags = fsExt.fcntlSync(file_fd, 'getfd');
							if ((finalFlags & fsExt.constants.FD_CLOEXEC) === fsExt.constants.FD_CLOEXEC) {
								tests_run++;
								expect_ok('fcntl', file_fd, new Error('did not clear cloexec'));
							}

							// Test invalid calls: fcntl
							tests_run++;
							let testErr: Error | undefined;
							try {
								fsExt.fcntl(file_fd, 'foo' as unknown as number, () => {
									console.log('  unexpected callback from fcntl() with bad argument');
								});
								testErr = undefined;
							} catch (e) {
								testErr = e as Error;
							}
							if (testErr) {
								if (debug_me) console.log('    err    %j', testErr);
								tests_ok++;
							} else if (debug_me) {
								console.log('  unexpected success from fcntl() with bad argument');
							}

							// Test range locks with start and len parameters
							testRangeLocks();
						});
					}
				);
			});
		}
	);
});

// Test F_SETLK and F_SETLKW with start and len parameters for range locking
function testRangeLocks(): void {
	if (debug_me) console.log('\nTesting range locks with start and len...');

	// Test that F_RDLCK, F_WRLCK, and F_UNLCK constants are available
	const lock_constant_names = ['F_RDLCK', 'F_WRLCK', 'F_UNLCK', 'F_SETLK', 'F_SETLKW'] as const;
	lock_constant_names.forEach((name) => {
		const value = fsExt.constants[name];
		tests_run++;
		if (value !== undefined && typeof value === 'number') {
			tests_ok++;
			if (debug_me) console.log('  %s = %d', name, value);
		} else {
			console.log('FAILURE: %s is not defined correctly', name);
		}
	});

	// Test synchronous range lock: lock bytes 10-20
	tests_run++;
	try {
		fsExt.fcntlSync(file_fd, fsExt.constants.F_SETLK, fsExt.constants.F_WRLCK, 10, 10);
		if (debug_me) console.log('  Sync range lock (10-20) acquired');
		tests_ok++;
	} catch (e) {
		console.log('FAILURE: fcntlSync with range lock failed: %s', (e as Error).message);
	}

	// Test synchronous range unlock
	tests_run++;
	try {
		fsExt.fcntlSync(file_fd, fsExt.constants.F_SETLK, fsExt.constants.F_UNLCK, 10, 10);
		if (debug_me) console.log('  Sync range unlock (10-20) succeeded');
		tests_ok++;
	} catch (e) {
		console.log('FAILURE: fcntlSync unlock with range failed: %s', (e as Error).message);
	}

	// Test asynchronous range lock
	tests_run++;
	fsExt.fcntl(file_fd, fsExt.constants.F_SETLK, fsExt.constants.F_WRLCK, 100, 50, (asyncErr) => {
		if (asyncErr) {
			console.log('FAILURE: async fcntl with range lock failed: %s', asyncErr.message);
		} else {
			tests_ok++;
			if (debug_me) console.log('  Async range lock (100-150) acquired');
		}

		// Unlock the range
		tests_run++;
		fsExt.fcntl(file_fd, fsExt.constants.F_SETLK, fsExt.constants.F_UNLCK, 100, 50, (asyncErr2) => {
			if (asyncErr2) {
				console.log('FAILURE: async fcntl unlock with range failed: %s', asyncErr2.message);
			} else {
				tests_ok++;
				if (debug_me) console.log('  Async range unlock (100-150) succeeded');
			}

			// Test F_SETLKW (blocking lock) with range - sync
			tests_run++;
			try {
				fsExt.fcntlSync(file_fd, fsExt.constants.F_SETLKW, fsExt.constants.F_WRLCK, 200, 100);
				if (debug_me) console.log('  Sync blocking range lock (200-300) acquired');
				tests_ok++;

				// Unlock it
				fsExt.fcntlSync(file_fd, fsExt.constants.F_SETLK, fsExt.constants.F_UNLCK, 200, 100);
				if (debug_me) console.log('  Sync range unlock (200-300) succeeded');
			} catch (e) {
				console.log('FAILURE: fcntlSync F_SETLKW with range failed: %s', (e as Error).message);
			}

			// Test whole-file lock (backward compatibility - no start/len)
			tests_run++;
			try {
				fsExt.fcntlSync(file_fd, fsExt.constants.F_SETLK, fsExt.constants.F_WRLCK);
				if (debug_me) console.log('  Sync whole-file lock acquired (backward compat)');
				tests_ok++;

				fsExt.fcntlSync(file_fd, fsExt.constants.F_SETLK, fsExt.constants.F_UNLCK);
				if (debug_me) console.log('  Sync whole-file unlock succeeded');
			} catch (e) {
				console.log('FAILURE: fcntlSync whole-file lock (backward compat) failed: %s', (e as Error).message);
			}

			// Test async whole-file lock with old signature: fcntl(fd, cmd, arg, callback)
			tests_run++;
			fsExt.fcntl(file_fd, fsExt.constants.F_SETLK, fsExt.constants.F_WRLCK, (asyncErr3) => {
				if (asyncErr3) {
					console.log('FAILURE: async whole-file lock (old signature) failed: %s', asyncErr3.message);
				} else {
					tests_ok++;
					if (debug_me) console.log('  Async whole-file lock acquired (old signature)');
				}

				// Unlock with old signature
				tests_run++;
				fsExt.fcntl(file_fd, fsExt.constants.F_SETLK, fsExt.constants.F_UNLCK, (asyncErr4) => {
					if (asyncErr4) {
						console.log('FAILURE: async whole-file unlock (old signature) failed: %s', asyncErr4.message);
					} else {
						tests_ok++;
						if (debug_me) console.log('  Async whole-file unlock succeeded (old signature)');
					}

					// Test with string command names (backward compat)
					tests_run++;
					try {
						fsExt.fcntlSync(file_fd, 'setlk', fsExt.constants.F_WRLCK);
						if (debug_me) console.log('  Sync lock with string cmd "setlk" succeeded');
						tests_ok++;

						fsExt.fcntlSync(file_fd, 'setlk', fsExt.constants.F_UNLCK);
					} catch (e) {
						console.log('FAILURE: fcntlSync with string cmd failed: %s', (e as Error).message);
					}

					if (debug_me) console.log('Range lock tests completed.');
				});
			});
		});
	});
}
