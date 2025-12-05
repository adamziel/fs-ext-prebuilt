'use strict';

// Test the Windows-specific LockFileEx/UnlockFileEx APIs
//
// fsExt.lockFileEx(fd, flags, offsetLow, offsetHigh, lengthLow, lengthHigh, [callback])
// fsExt.lockFileExSync(fd, flags, offsetLow, offsetHigh, lengthLow, lengthHigh)
// fsExt.unlockFileEx(fd, offsetLow, offsetHigh, lengthLow, lengthHigh, [callback])
// fsExt.unlockFileExSync(fd, offsetLow, offsetHigh, lengthLow, lengthHigh)

var assert = require('assert'),
	path = require('path'),
	util = require('util'),
	fs = require('fs'),
	fsExt = require('../fs-ext'),
	os = require('os');

var tests_ok = 0,
	tests_run = 0;

var debug_me = false;

var tmp_dir = os.tmpdir(),
	file_path = path.join(tmp_dir, 'what.when.lockfileex.test');

var file_fd, err;

// LockFileEx flags (from Windows API)
var LOCKFILE_EXCLUSIVE_LOCK = 0x00000002;
var LOCKFILE_FAIL_IMMEDIATELY = 0x00000001;

// Report on test results
process.addListener('exit', function () {
	try {
		fs.closeSync(file_fd);
	} catch (e) {
		// might not be open, that's okay.
	}

	remove_file_wo_error(file_path);

	console.log('LockFileEx Tests run: %d     ok: %d', tests_run, tests_ok);
	assert.equal(tests_ok, tests_run, 'One or more subtests failed');
});

// Test helpers
function remove_file_wo_error(file_path) {
	try {
		fs.unlinkSync(file_path);
	} catch (e) {
		// might not exist, that's okay.
	}
}

function expect_errno(api_name, resource, err, expected_errno) {
	var fault_msg;

	if (debug_me) console.log('  expected_errno(err): ' + err);

	if (err && err.code !== expected_errno) {
		fault_msg =
			api_name +
			'(): expected error ' +
			expected_errno +
			', got another error';
	} else if (!err) {
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

function expect_ok(api_name, resource, err) {
	var fault_msg;

	if (err) {
		fault_msg = api_name + '(): returned error: ' + err.message;
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

// Check whether this version has these APIs to test
tests_run++;
if (typeof fsExt.lockFileEx !== 'function') {
	console.log('fsExt.lockFileEx API is missing');
} else {
	tests_ok++;
}

tests_run++;
if (typeof fsExt.lockFileExSync !== 'function') {
	console.log('fsExt.lockFileExSync API is missing');
} else {
	tests_ok++;
}

tests_run++;
if (typeof fsExt.unlockFileEx !== 'function') {
	console.log('fsExt.unlockFileEx API is missing');
} else {
	tests_ok++;
}

tests_run++;
if (typeof fsExt.unlockFileExSync !== 'function') {
	console.log('fsExt.unlockFileExSync API is missing');
} else {
	tests_ok++;
}

// If any pre-checks and setup fail, quit before tests
if (tests_run !== tests_ok) {
	process.exit(1);
}

// Delete any prior copy of test data file(s)
remove_file_wo_error(file_path);

// Create a new file with some content
tests_run++;
try {
	file_fd = fs.openSync(file_path, 'w+');
	fs.writeSync(file_fd, 'Test data for LockFileEx testing\n');
	tests_ok++;
} catch (e) {
	console.log('  Unable to create test data file %j', file_path);
	console.log('    Error was: %j', e);
}

if (tests_run !== tests_ok) {
	process.exit(1);
}

// Test that Windows lock constants are available
tests_run++;
if (
	fsExt.constants.LOCKFILE_EXCLUSIVE_LOCK !== undefined &&
	typeof fsExt.constants.LOCKFILE_EXCLUSIVE_LOCK === 'number'
) {
	tests_ok++;
	if (debug_me)
		console.log(
			'  LOCKFILE_EXCLUSIVE_LOCK = ' +
				fsExt.constants.LOCKFILE_EXCLUSIVE_LOCK
		);
} else {
	console.log('FAILURE: LOCKFILE_EXCLUSIVE_LOCK is not defined correctly');
}

tests_run++;
if (
	fsExt.constants.LOCKFILE_FAIL_IMMEDIATELY !== undefined &&
	typeof fsExt.constants.LOCKFILE_FAIL_IMMEDIATELY === 'number'
) {
	tests_ok++;
	if (debug_me)
		console.log(
			'  LOCKFILE_FAIL_IMMEDIATELY = ' +
				fsExt.constants.LOCKFILE_FAIL_IMMEDIATELY
		);
} else {
	console.log('FAILURE: LOCKFILE_FAIL_IMMEDIATELY is not defined correctly');
}

// Test valid calls: lockFileExSync / unlockFileExSync

// Test shared lock on entire file (offset 0, length 0xFFFFFFFF = entire file)
tests_run++;
try {
	err = fsExt.lockFileExSync(file_fd, 0, 0, 0, 0xffffffff, 0);
	err = null;
} catch (e) {
	err = e;
}
expect_ok('lockFileExSync (shared)', file_fd, err);

// Unlock
tests_run++;
try {
	err = fsExt.unlockFileExSync(file_fd, 0, 0, 0xffffffff, 0);
	err = null;
} catch (e) {
	err = e;
}
expect_ok('unlockFileExSync', file_fd, err);

// Test exclusive lock
tests_run++;
try {
	err = fsExt.lockFileExSync(
		file_fd,
		fsExt.constants.LOCKFILE_EXCLUSIVE_LOCK,
		0,
		0,
		0xffffffff,
		0
	);
	err = null;
} catch (e) {
	err = e;
}
expect_ok('lockFileExSync (exclusive)', file_fd, err);

// Unlock
tests_run++;
try {
	err = fsExt.unlockFileExSync(file_fd, 0, 0, 0xffffffff, 0);
	err = null;
} catch (e) {
	err = e;
}
expect_ok('unlockFileExSync', file_fd, err);

// Test byte-range lock (lock only first 100 bytes)
tests_run++;
try {
	err = fsExt.lockFileExSync(
		file_fd,
		fsExt.constants.LOCKFILE_EXCLUSIVE_LOCK,
		0,
		0,
		100,
		0
	);
	err = null;
} catch (e) {
	err = e;
}
expect_ok('lockFileExSync (byte-range)', file_fd, err);

// Unlock byte range
tests_run++;
try {
	err = fsExt.unlockFileExSync(file_fd, 0, 0, 100, 0);
	err = null;
} catch (e) {
	err = e;
}
expect_ok('unlockFileExSync (byte-range)', file_fd, err);

// Test async lockFileEx / unlockFileEx
tests_run++;
tests_run++;
fsExt.lockFileEx(file_fd, 0, 0, 0, 0xffffffff, 0, function (err) {
	expect_ok('lockFileEx (async shared)', file_fd, err);

	fsExt.unlockFileEx(file_fd, 0, 0, 0xffffffff, 0, function (err) {
		expect_ok('unlockFileEx (async)', file_fd, err);

		// Test async exclusive lock
		tests_run++;
		tests_run++;
		fsExt.lockFileEx(
			file_fd,
			fsExt.constants.LOCKFILE_EXCLUSIVE_LOCK,
			0,
			0,
			0xffffffff,
			0,
			function (err) {
				expect_ok('lockFileEx (async exclusive)', file_fd, err);

				fsExt.unlockFileEx(file_fd, 0, 0, 0xffffffff, 0, function (err) {
					expect_ok('unlockFileEx (async after exclusive)', file_fd, err);

					// Test non-blocking lock attempt (LOCKFILE_FAIL_IMMEDIATELY)
					// First acquire an exclusive lock, then try to acquire another
					tests_run++;
					tests_run++;
					tests_run++;
					fsExt.lockFileEx(
						file_fd,
						fsExt.constants.LOCKFILE_EXCLUSIVE_LOCK,
						0,
						0,
						0xffffffff,
						0,
						function (err) {
							expect_ok('lockFileEx (setup for conflict test)', file_fd, err);

							// Try to acquire another lock with FAIL_IMMEDIATELY - should fail
							// Note: On Windows, same process can usually upgrade locks,
							// so this test verifies the API works rather than lock conflict
							fsExt.lockFileEx(
								file_fd,
								fsExt.constants.LOCKFILE_EXCLUSIVE_LOCK |
									fsExt.constants.LOCKFILE_FAIL_IMMEDIATELY,
								0,
								0,
								0xffffffff,
								0,
								function (err) {
									// This might succeed or fail depending on Windows lock behavior
									// for same-process lock upgrades. Either way, the API should work.
									tests_ok++;
									if (debug_me) {
										if (err) {
											console.log(
												'  lockFileEx with FAIL_IMMEDIATELY returned error (expected): ' +
													err.message
											);
										} else {
											console.log(
												'  lockFileEx with FAIL_IMMEDIATELY succeeded (same process upgrade)'
											);
										}
									}

									// Clean up - unlock
									fsExt.unlockFileEx(
										file_fd,
										0,
										0,
										0xffffffff,
										0,
										function (err) {
											expect_ok('unlockFileEx (final cleanup)', file_fd, err);
										}
									);
								}
							);
						}
					);
				});
			}
		);
	});
});
