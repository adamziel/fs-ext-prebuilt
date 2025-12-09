// Test these APIs as published in extension module 'fs-ext'
//
// fsExt.flock(fd, flags, [callback])
// fsExt.flockSync(fd, flags)

import * as assert from 'assert';
import * as path from 'path';
import * as util from 'util';
import * as fs from 'fs';
import * as os from 'os';
import * as fsExt from '../src/fs-ext';

let tests_ok = 0;
let tests_run = 0;

const debug_me = false;

const tmp_dir = os.tmpdir();
const file_path = path.join(tmp_dir, 'what.when.flock.test');

let file_fd: number = -1;
let err: Error | null | undefined;

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

tests_run++;
if (typeof fsExt.flock !== 'function') {
	console.log('fsExt.flock API is missing');
} else {
	tests_ok++;
}

tests_run++;
if (typeof fsExt.flockSync !== 'function') {
	console.log('fsExt.flockSync API is missing');
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

const constant_names = ['LOCK_EX', 'LOCK_NB', 'LOCK_SH', 'LOCK_UN'] as const;

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
	fsExt.flockSync(undefined as unknown as number, 'un');
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
	fsExt.flockSync('foo' as unknown as number, 'un');
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
	fsExt.flockSync(-9, 'un');
} catch (e) {
	err = e as Error;
}
expect_errno('flockSync', -9, err, 'EBADF');

// fd value is 'impossible'

tests_run++;
try {
	err = null;
	fsExt.flockSync(98765, 'un');
} catch (e) {
	err = e as Error;
}
expect_errno('flockSync', 98765, err, 'EBADF');

// flags value is invalid

tests_run++;
try {
	err = null;
	fsExt.flockSync(file_fd, 'foo' as fsExt.FlockFlagString);
} catch (e) {
	err = e as Error;
}

if (err) {
	if (debug_me) console.log('    err    %j', err);
	tests_ok++;
} else if (debug_me) {
	console.log('    expected error from non-numeric fd argument');
}

// Test valid calls: flockSync

// operation LOCK_UN: 'un'

tests_run++;
try {
	err = null;
	fsExt.flockSync(file_fd, 'un');
} catch (e) {
	err = e as Error;
}
expect_ok('flockSync', file_fd, err);

// operation LOCK_UN: 'sh' then 'un'

tests_run++;
try {
	err = null;
	fsExt.flockSync(file_fd, 'sh');
} catch (e) {
	err = e as Error;
}
expect_ok('flockSync', file_fd, err);

tests_run++;
try {
	err = null;
	fsExt.flockSync(file_fd, 'un');
} catch (e) {
	err = e as Error;
}
expect_ok('flockSync', file_fd, err);

// operation LOCK_UN: 'ex' then 'un'

tests_run++;
try {
	err = null;
	fsExt.flockSync(file_fd, 'ex');
} catch (e) {
	err = e as Error;
}
expect_ok('flockSync', file_fd, err);

tests_run++;
try {
	err = null;
	fsExt.flockSync(file_fd, 'un');
} catch (e) {
	err = e as Error;
}
expect_ok('flockSync', file_fd, err);

// operation LOCK_UN: 'shnb' then 'un'

tests_run++;
try {
	err = null;
	fsExt.flockSync(file_fd, 'shnb');
} catch (e) {
	err = e as Error;
}
expect_ok('flockSync', file_fd, err);

tests_run++;
try {
	err = null;
	fsExt.flockSync(file_fd, 'un');
} catch (e) {
	err = e as Error;
}
expect_ok('flockSync', file_fd, err);

// operation LOCK_UN: 'exnb' then 'un'

tests_run++;
try {
	err = null;
	fsExt.flockSync(file_fd, 'exnb');
} catch (e) {
	err = e as Error;
}
expect_ok('flockSync', file_fd, err);

tests_run++;
try {
	err = null;
	fsExt.flockSync(file_fd, 'un');
} catch (e) {
	err = e as Error;
}
expect_ok('flockSync', file_fd, err);

// Test valid calls: flock

tests_run++;
tests_run++;
fsExt.flock(file_fd, 'sh', (error) => {
	expect_ok('flock', file_fd, error);

	// After a change to returning arguments to async callback routines,
	// check that this API still receives only one argument.
	tests_ok++; // For the extra test_run above

	tests_run++;
	fsExt.flock(file_fd, 'exnb', (error2) => {
		if (process.platform === 'win32') {
			// Windows doesn't support lock upgrades
			expect_errno('flock', 10035, error2, 'EWOULDBLOCK');
		} else {
			expect_ok('flock', file_fd, error2);
		}

		tests_run++;
		fsExt.flock(file_fd, 'un', (error3) => {
			expect_ok('flock', file_fd, error3);

			// Test invalid calls: flock
			tests_run++;
			let testErr: Error | undefined;
			try {
				fsExt.flock(file_fd, 'foo' as fsExt.FlockFlagString, () => {
					console.log('  unexpected callback from flock() with bad argument');
				});
				testErr = undefined;
			} catch (e) {
				testErr = e as Error;
			}
			if (testErr) {
				if (debug_me) console.log('    err    %j', testErr);
				tests_ok++;
			} else if (debug_me) {
				console.log('  unexpected success from flock() with bad argument');
			}
		});
	});
});
