// Stress test these APIs as published in extension module 'fs-ext'
// Specifically, try to exercise any memory leaks by simple repetition.

//    fs.seek(fd, offset, whence, [callback])
//
//  Asynchronous lseek(2).
//
//  callback will be given two arguments (err, currFilePos).
//
//  whence can be 0 (SEEK_SET) to set the new position in bytes to offset,
//  1 (SEEK_CUR) to set the new position to the current position plus offset
//  bytes (can be negative), or 2 (SEEK_END) to set to the end of the file
//  plus offset bytes (usually negative or zero to seek to the end of the file).
//
//    fs.seekSync(fd, offset, whence)
//
//  Synchronous lseek(2). Throws an exception on error.  Returns current
//  file position.

// Ideas for testing borrowed from bnoordhuis (Ben Noordhuis)

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

let debug_me = true;
debug_me = false;

const tmp_dir = os.tmpdir();
const file_path = path.join(tmp_dir, 'what.when.seek.test');

let file_fd: number = -1;
let result: number | undefined;
let err: Error | null | undefined;

// Report on test results

// Clean up and report on final success or failure of tests here
process.addListener('exit', () => {
	console.log('');
	console.log('  After all testing:');
	display_memory_usage_now();
	console.log('    End time is %s', new Date());

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

function display_memory_usage_now(): void {
	const usage = process.memoryUsage();
	console.log(
		'    memory:  heapUsed  %d      rss       %d',
		usage.heapUsed,
		usage.rss
	);
	console.log(
		'             heapTotal %d',
		usage.heapTotal
	);
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
		fault_msg =
			api_name +
			'(): wrong value ' +
			value_seen +
			'  (expecting ' +
			value_expected +
			')';
	}

	if (!fault_msg) {
		tests_ok++;
		if (debug_me)
			console.log('        OK: %s() returned ', api_name, value_seen);
	} else {
		console.log('FAILURE: ' + fault_msg);
		console.log('   ARGS: ', util.inspect(arguments));
	}
}

function expect_errno(api_name: string, error: Error | null | undefined, value_seen: number | undefined, expected_errno: string): void {
	let fault_msg: string | undefined;

	if (debug_me) console.log('  expected_errno(err): ' + error);

	if (error) {
		if (error instanceof Error) {
			const errnoError = error as NodeJS.ErrnoException;
			if (errnoError.code !== undefined) {
				if (errnoError.code !== expected_errno) {
					fault_msg =
						api_name +
						"(): returned wrong errno '" +
						error.message +
						"'  (expecting " +
						expected_errno +
						')';
				}
			} else {
				fault_msg = api_name + "(): returned wrong error '" + error + "'";
			}
		} else {
			fault_msg = api_name + "(): returned wrong error '" + error + "'";
		}
	} else {
		fault_msg =
			api_name +
			"(): expected errno '" +
			expected_errno +
			"', but got result " +
			value_seen;
	}

	if (!fault_msg) {
		tests_ok++;
		if (debug_me) console.log(' FAILED OK: ' + api_name);
	} else {
		console.log('FAILURE: ' + fault_msg);
		if (debug_me) console.log('   ARGS: ', util.inspect(arguments));
	}
}

// Setup for testing

// We assume that test-fs-seek.js has run successfully before this
// test and so we omit several duplicate tests.

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

// Stress testing

let how_many_times: number;
let how_many_done: number;

console.log('  Start time is %s', new Date());
console.log('  Before any testing:');
display_memory_usage_now();
console.log('');

// Repeat a successful seekSync() call
how_many_times = 10000000;

for (let i = 0; i < how_many_times; i++) {
	tests_run++;
	result = err = undefined;
	result = fsExt.seekSync(file_fd, 0, 0);
	expect_value('seekSync', err, result, 0);
}

console.log('  After %d calls to successful seekSync():', how_many_times);
display_memory_usage_now();
console.log('        Time is %s', new Date());

// Repeat a successful seek() call
how_many_times = 1000000;
how_many_done = 0;

function test_failing_seek(): void {
	how_many_times = 1000000;
	how_many_done = 0;

	tests_run++;
	fsExt.seek(-99, 0, 0, function func_bad_seek_cb(seekErr, seekResult) {
		expect_errno('seek', seekErr, seekResult, 'EBADF');
		if (debug_me)
			console.log('    seek call counter   %d', how_many_times);

		how_many_done += 1;
		if (how_many_done < how_many_times) {
			tests_run++;
			fsExt.seek(-99, 0, 0, func_bad_seek_cb);
			return;
		}
		console.log('  After %d calls to failing seek():', how_many_times);
		display_memory_usage_now();
		console.log('        Time is %s', new Date());
	});
}

tests_run++;
fsExt.seek(file_fd, 0, 0, function func_good_seek_cb(seekErr, seekResult) {
	expect_value('seek', seekErr, seekResult, 0);
	if (debug_me) console.log('    seek call counter   %d', how_many_times);

	how_many_done += 1;
	if (how_many_done < how_many_times) {
		tests_run++;
		fsExt.seek(file_fd, 0, 0, func_good_seek_cb);
		return;
	}
	console.log('  After %d calls to successful seek():', how_many_times);
	display_memory_usage_now();
	console.log('        Time is %s', new Date());

	test_failing_seek();
});
