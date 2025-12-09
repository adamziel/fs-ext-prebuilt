// Run all legacy tests
// These tests use a custom counter-based framework

if (process.platform !== 'win32') {
	require('./tests/test-fs-fcntl');
}

require('./tests/test-fs-seek');

require('./tests/test-fs-flock');

// Windows-specific LockFileEx/UnlockFileEx tests
if (process.platform === 'win32') {
	require('./tests/test-fs-lockfileex');
}

require('./tests/worker-test');

// for stress testing only
if (process.argv[2] === '--stress') {
	require('./tests/test-fs-seek_stress');
	require('./tests/test-fs-flock_stress');
}
