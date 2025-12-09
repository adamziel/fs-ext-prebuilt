// Stress test these APIs as published in extension module 'fs-ext'
// Specifically, try to exercise any memory leaks by simple repetition.
//
// fs.flock(fd, flags, [callback])
//
// Asynchronous flock(2).  No arguments other than a possible error are
// passed to the callback.  Flags can be 'sh', 'ex', 'shnb', 'exnb', 'un'
// and correspond to the various LOCK_SH, LOCK_EX, LOCK_SH|LOCK_NB, etc.
//
// fs.flockSync(fd, flags)
//
// Synchronous flock(2). Throws an exception on error.

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

const debug_me = false;

const tmp_dir = os.tmpdir();
const file_path = path.join(tmp_dir, 'what.when.flock.test');

let file_fd: number = -1;
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

function expect_errno(api_name: string, resource: unknown, error: Error | null | undefined, expected_errno: string): void {
	let fault_msg: string | undefined;

	if (debug_me) console.log('  expected_errno(err): ' + error);

	if (error && (error as NodeJS.ErrnoException).code !== expected_errno) {
		fault_msg =
			api_name +
			'(): expected error ' +
			expected_errno +
			', got another error';
	} else if (!error) {
		fault_msg =
			api_name +
			'(): expected error ' +
			expected_errno +
			', got another error';
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
		console.log('    err: %j', error);
	}
}

// Setup for testing

// We assume that test-fs-flock.js has run successfully before this
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

// Repeat a successful flockSync() call
how_many_times = 10000000;

for (let i = 0; i < how_many_times; i++) {
	tests_run++;
	err = undefined;
	try {
		fsExt.flockSync(file_fd, 'un');
	} catch (e) {
		err = e as Error;
	}
	expect_ok('flockSync', file_fd, err);
}

console.log('  After %d calls to successful flockSync():', how_many_times);
display_memory_usage_now();
console.log('        Time is %s', new Date());

// Repeat a successful flock() call
how_many_times = 1000000;
how_many_done = 0;

function test_failing_flock(): void {
	how_many_times = 1000000;
	how_many_done = 0;

	tests_run++;
	fsExt.flock(-99, 'un', function func_bad_flock_cb(flockErr) {
		expect_errno('flock', -99, flockErr, 'EBADF');
		if (debug_me)
			console.log('    flock call counter   %d', how_many_times);

		how_many_done += 1;
		if (how_many_done < how_many_times) {
			tests_run++;
			fsExt.flock(-99, 'un', func_bad_flock_cb);
			return;
		}
		console.log('  After %d calls to failing flock():', how_many_times);
		display_memory_usage_now();
		console.log('        Time is %s', new Date());
	});
}

tests_run++;
fsExt.flock(file_fd, 'un', function func_good_flock_cb(flockErr) {
	expect_ok('flock', file_fd, flockErr);
	if (debug_me)
		console.log('    flock call counter   %d', how_many_times);

	how_many_done += 1;
	if (how_many_done < how_many_times) {
		tests_run++;
		fsExt.flock(file_fd, 'un', func_good_flock_cb);
		return;
	}
	console.log('  After %d calls to successful flock():', how_many_times);
	display_memory_usage_now();
	console.log('        Time is %s', new Date());

	test_failing_flock();
});
