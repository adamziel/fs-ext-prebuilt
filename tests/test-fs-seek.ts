// Test these APIs as published in extension module 'fs-ext'
//
// fsExt.seek(fd, offset, whence, [callback])
// fsExt.seekSync(fd, offset, whence)

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
const file_path = path.join(tmp_dir, 'what.when.seek.test');

let file_fd: number = -1;
let result: number | undefined;
let err: Error | null | undefined;
let offset_big: number;

// Clean up and report on final success or failure of tests here
function listen_for_exit(exit_code: number): void {
	try {
		fs.closeSync(file_fd);
	} catch (e) {
		// might not be open, that's okay.
	}

	remove_file_wo_error(file_path);

	console.log('Tests run: %d     ok: %d', tests_run, tests_ok);

	if (!exit_code && tests_ok !== tests_run) {
		console.log('One or more subtests failed!');
		process.removeListener('exit', listen_for_exit);
		process.exit(1);
	}
}

process.addListener('exit', listen_for_exit);

// Test helpers

function remove_file_wo_error(filePath: string): void {
	try {
		fs.unlinkSync(filePath);
	} catch (e) {
		// might not exist, that's okay.
	}
}

function expect_value(api_name: string, error: Error | null | undefined, value_seen: number | undefined, value_expected: number): void {
	let fault_msg: string | undefined;

	if (error) {
		if (error instanceof Error) {
			fault_msg = api_name + '(): returned error ' + error.message;
		} else {
			fault_msg = api_name + '(): returned error ' + error;
		}
	} else if (value_seen !== value_expected) {
		fault_msg = api_name + "(): wrong value '" + value_seen + "'  (expecting " + value_expected + ')';
	}

	if (!fault_msg) {
		tests_ok++;
		if (debug_me) console.log('        OK: %s() returned ', api_name, value_seen);
	} else {
		console.log('FAILURE: ' + fault_msg);
		console.log('   ARGS: ', util.inspect(arguments));
	}
}

function expect_errno(api_name: string, error: Error | null | undefined, value_seen: number | undefined, expected_errno: string): void {
	let fault_msg: string | undefined;

	if (debug_me) console.log('  expected_errno(err):  %j', error);

	if (error) {
		if (error instanceof Error) {
			if ((error as NodeJS.ErrnoException).code !== undefined) {
				if ((error as NodeJS.ErrnoException).code !== expected_errno) {
					fault_msg = api_name + "(): returned wrong errno '" + error.message + "'  (expecting " + expected_errno + ')';
				}
			} else {
				fault_msg = api_name + "(): returned wrong error '" + error + "'";
				console.log('  (We see non-errno error %j', error);
			}
		} else {
			fault_msg = api_name + "(): returned wrong error '" + error + "'";
			console.log('  (We see non-Error error %j', error);
		}
	} else {
		fault_msg = api_name + "(): expected errno '" + expected_errno + "', but got result " + value_seen;
	}

	if (!fault_msg) {
		tests_ok++;
		if (debug_me) console.log(' FAILED OK: ' + api_name);
	} else {
		console.log('FAILURE: ' + fault_msg);
		console.log('   ARGS: ', util.inspect(arguments));
	}
}

function expect_error(api_name: string, error: Error | null | undefined, value_seen: number | undefined, expected_error: string): void {
	let fault_msg: string | undefined;

	if (debug_me) console.log('  expected_error(err):  %j', error);

	if (error) {
		if (error instanceof Error) {
			if ((error as NodeJS.ErrnoException).code !== undefined) {
				fault_msg = api_name + "(): returned wrong error '" + error.message + "'  (expecting " + expected_error + ')';
			} else if (error.message !== undefined) {
				if (error.message !== expected_error) {
					fault_msg = api_name + "(): returned wrong error '" + error + "'";
					console.log('  (We see non-errno error %j', error);
				}
			} else {
				fault_msg = api_name + "(): returned wrong error '" + error + "'";
				console.log('  (We see non-errno error %j', error);
			}
		} else {
			fault_msg = api_name + "(): returned wrong error '" + error + "'";
			console.log('  (We see non-Error error %j', error);
		}
	} else {
		fault_msg = api_name + "(): expected errno '" + expected_error + "', but got result " + value_seen;
	}

	if (!fault_msg) {
		tests_ok++;
		if (debug_me) console.log(' FAILED OK: ' + api_name);
	} else {
		console.log('FAILURE: ' + fault_msg);
		console.log('   ARGS: ', util.inspect(arguments));
	}
}

// Setup for testing

tests_run++;
if (typeof fsExt.seek !== 'function') {
	console.log('fsExt.seek API is missing');
} else {
	tests_ok++;
}

tests_run++;
if (typeof fsExt.seekSync !== 'function') {
	console.log('fsExt.seekSync API is missing');
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

const constant_names = ['SEEK_SET', 'SEEK_CUR', 'SEEK_END'] as const;

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
result = err = undefined;
try {
	result = fsExt.seekSync(undefined as unknown as number, 0, 0);
} catch (e) {
	err = e as Error;
}
expect_error('seekSync', err, result, 'Bad argument');

// fd value is non-number

tests_run++;
result = err = undefined;
try {
	result = fsExt.seekSync('foo' as unknown as number, 0, 0);
} catch (e) {
	err = e as Error;
}
expect_error('seekSync', err, result, 'Bad argument');

// fd value is negative

tests_run++;
result = err = undefined;
try {
	result = fsExt.seekSync(-9, 0, 0);
} catch (e) {
	err = e as Error;
}
expect_errno('seekSync', err, result, 'EBADF');

// fd value is 'impossible'

tests_run++;
result = err = undefined;
try {
	result = fsExt.seekSync(98765, 0, 0);
} catch (e) {
	err = e as Error;
}
expect_errno('seekSync', err, result, 'EBADF');

// whence value is invalid

tests_run++;
result = err = undefined;
try {
	result = fsExt.seekSync(file_fd, 0, 98765);
} catch (e) {
	err = e as Error;
}
expect_errno('seekSync', err, result, 'EINVAL');

tests_run++;
result = err = undefined;
try {
	result = fsExt.seekSync(file_fd, 0, -99);
} catch (e) {
	err = e as Error;
}
expect_errno('seekSync', err, result, 'EINVAL');

// offset value is negative

tests_run++;
result = err = undefined;
try {
	result = fsExt.seekSync(file_fd, -98765, 0);
} catch (e) {
	err = e as Error;
}
expect_errno('seekSync', err, result, 'EINVAL');

// offset value is non-integer

tests_run++;
result = err = undefined;
try {
	result = fsExt.seekSync(file_fd, 4.0001, 0);
} catch (e) {
	err = e as Error;
}
expect_error('seekSync', err, result, 'Not an integer');

// offset value is "too big" (beyond end of file)
// This unexpectedly 'works' ...

tests_run++;
result = err = undefined;
try {
	result = fsExt.seekSync(file_fd, 98765, 0);
} catch (e) {
	err = e as Error;
}
expect_value('seekSync', err, result, 98765);

// offset value is "very big" (from below to beyond 32 bits)

tests_run++;
result = err = undefined;
offset_big = 2 * 1024 * 1024 * 1024 - 1;
try {
	result = fsExt.seekSync(file_fd, offset_big, 0);
} catch (e) {
	err = e as Error;
}
expect_value('seekSync', err, result, offset_big);

tests_run++;
result = err = undefined;
offset_big = 2 * 1024 * 1024 * 1024;
try {
	result = fsExt.seekSync(file_fd, offset_big, 0);
} catch (e) {
	err = e as Error;
}
expect_value('seekSync', err, result, offset_big);

tests_run++;
result = err = undefined;
offset_big = 42 * 1024 * 1024 * 1024;
try {
	result = fsExt.seekSync(file_fd, offset_big, 0);
} catch (e) {
	err = e as Error;
}
expect_value('seekSync', err, result, offset_big);

tests_run++;
result = err = undefined;
offset_big = 8 * 1024 * 1024 * 1024 * 1024 - 1;
// Linux is limited to 43 bits for file position values?
try {
	result = fsExt.seekSync(file_fd, offset_big, 0);
} catch (e) {
	err = e as Error;
}
expect_value('seekSync', err, result, offset_big);

// Test valid calls: seekSync

// SEEK_SET to 0

tests_run++;
result = err = undefined;
try {
	result = fsExt.seekSync(file_fd, 0, 0);
} catch (e) {
	err = e as Error;
}
expect_value('seekSync', err, result, 0);

// SEEK_CUR to 0

tests_run++;
result = err = undefined;
try {
	result = fsExt.seekSync(file_fd, 0, 1);
} catch (e) {
	err = e as Error;
}
expect_value('seekSync', err, result, 0);

// SEEK_END to 0

tests_run++;
result = err = undefined;
try {
	result = fsExt.seekSync(file_fd, 0, 2);
} catch (e) {
	err = e as Error;
}
expect_value('seekSync', err, result, 0);

// SEEK_SET to 0 using published constant

tests_run++;
result = err = undefined;
try {
	result = fsExt.seekSync(file_fd, 0, fsExt.constants.SEEK_SET);
} catch (e) {
	err = e as Error;
}
expect_value('seekSync', err, result, 0);

// SEEK_CUR to 0 using published constant

tests_run++;
result = err = undefined;
try {
	result = fsExt.seekSync(file_fd, 0, fsExt.constants.SEEK_CUR);
} catch (e) {
	err = e as Error;
}
expect_value('seekSync', err, result, 0);

// SEEK_END to 0 using published constant

tests_run++;
result = err = undefined;
try {
	result = fsExt.seekSync(file_fd, 0, fsExt.constants.SEEK_END);
} catch (e) {
	err = e as Error;
}
expect_value('seekSync', err, result, 0);

// Test valid calls: seek

// SEEK_SET to 0

tests_run++;
fsExt.seek(file_fd, 0, 0, (error, seekResult) => {
	expect_value('seek', error, seekResult, 0);

	tests_run++;
	fsExt.seek(file_fd, 0, 1, (error2, seekResult2) => {
		expect_value('seek', error2, seekResult2, 0);

		tests_run++;
		fsExt.seek(file_fd, 0, 2, (error3, seekResult3) => {
			expect_value('seek', error3, seekResult3, 0);

			// Test invalid calls: seek

			// offset value is negative
			tests_run++;
			fsExt.seek(file_fd, -98765, 0, (error4, seekResult4) => {
				expect_errno('seek', error4, seekResult4, 'EINVAL');

				// offset value is quite large (over 32 bits)
				tests_run++;
				offset_big = 42 * 1024 * 1024 * 1024;
				fsExt.seek(file_fd, offset_big, 0, (error5, seekResult5) => {
					expect_value('seek', error5, seekResult5, offset_big);
				});
			});
		});
	});
});
