// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.

// Type definitions for the native binding constants
export interface FsExtConstants {
	// Seek constants
	SEEK_SET: number;
	SEEK_CUR: number;
	SEEK_END: number;

	// Flock constants
	LOCK_SH: number;
	LOCK_EX: number;
	LOCK_NB: number;
	LOCK_UN: number;

	// Fcntl constants
	F_GETFD: number;
	F_SETFD: number;
	F_GETFL: number;
	F_SETFL: number;
	FD_CLOEXEC: number;

	// Fcntl lock constants (Unix)
	F_RDLCK: number;
	F_WRLCK: number;
	F_UNLCK: number;
	F_SETLK: number;
	F_SETLKW: number;
	F_GETLK: number;

	// Windows LockFileEx constants
	LOCKFILE_EXCLUSIVE_LOCK: number;
	LOCKFILE_FAIL_IMMEDIATELY: number;
}

// StatVFS result interface
export interface StatVFSResult {
	f_bsize: number;
	f_frsize: number;
	f_blocks: number;
	f_bfree: number;
	f_bavail: number;
	f_files: number;
	f_ffree: number;
	f_favail: number;
	f_fsid: number;
	f_flag: number;
	f_namemax: number;
}

// Callback types
export type ErrorCallback = (err: NodeJS.ErrnoException | null) => void;
export type ResultCallback<T> = (err: NodeJS.ErrnoException | null, result?: T) => void;

// Flock flag string types
export type FlockFlagString = 'sh' | 'ex' | 'shnb' | 'exnb' | 'un';

// Fcntl command string types
export type FcntlCmdString = 'getfd' | 'setfd' | 'setlk' | 'setlkw' | 'getlk';

// Native module source type
export type NativeModuleSource = 'prebuilt' | 'local';

// Native binding interface
interface NativeBinding {
	constants: FsExtConstants;
	flock(fd: number, flags: number, callback?: ErrorCallback): number;
	fcntl(fd: number, cmd: number, arg: number, callback?: ErrorCallback): number;
	fcntl(fd: number, cmd: number, arg: number, start: number, len: number, callback?: ErrorCallback): number;
	seek(fd: number, position: number, whence: number, callback?: ResultCallback<number>): number;
	statVFS(path: string, callback: ResultCallback<StatVFSResult>): void;
	lockFileEx?(
		fd: number,
		flags: number,
		offsetLow: number,
		offsetHigh: number,
		lengthLow: number,
		lengthHigh: number,
		callback?: ErrorCallback
	): number;
	unlockFileEx?(
		fd: number,
		offsetLow: number,
		offsetHigh: number,
		lengthLow: number,
		lengthHigh: number,
		callback?: ErrorCallback
	): number;
}

// Loader interface
interface Loader {
	loadNativeModule(source?: NativeModuleSource): NativeBinding | null;
	useNativeModule(source: NativeModuleSource): NativeBinding | null;
	getNativeModuleSource(): NativeModuleSource | null;
}

// eslint-disable-next-line @typescript-eslint/no-var-requires
const loader: Loader = require('../load-prebuilt');

// Load native module (prebuilt first, then local build)
let binding = loader.loadNativeModule();
if (!binding) {
	throw new Error(
		'Failed to load fs-ext native module. ' +
		'No prebuilt binary found for ' +
		process.platform +
		'-' +
		process.arch +
		' (Node ' +
		process.version +
		'), and no local build available.'
	);
}

// Convert string flock flags to numeric constants
function stringToFlockFlags(flag: FlockFlagString | number): number {
	if (typeof flag !== 'string') {
		return flag;
	}
	switch (flag) {
		case 'sh':
			return binding!.constants.LOCK_SH;
		case 'ex':
			return binding!.constants.LOCK_EX;
		case 'shnb':
			return binding!.constants.LOCK_SH | binding!.constants.LOCK_NB;
		case 'exnb':
			return binding!.constants.LOCK_EX | binding!.constants.LOCK_NB;
		case 'un':
			return binding!.constants.LOCK_UN;
		default:
			throw new Error('Unknown flock flag: ' + flag);
	}
}

// Convert string fcntl commands to numeric constants
function stringToFcntlFlags(flag: FcntlCmdString | number): number {
	if (typeof flag !== 'string') {
		return flag;
	}
	switch (flag) {
		case 'getfd':
			return binding!.constants.F_GETFD;
		case 'setfd':
			return binding!.constants.F_SETFD;
		case 'setlk':
			return binding!.constants.F_SETLK;
		case 'setlkw':
			return binding!.constants.F_SETLKW;
		case 'getlk':
			return binding!.constants.F_GETLK;
		default:
			throw new Error('Unknown fcntl flag: ' + flag);
	}
}

function noop(): void {}

/**
 * Apply or remove an advisory lock on an open file (async).
 *
 * @param fd - File descriptor
 * @param flags - Lock operation: 'sh', 'ex', 'shnb', 'exnb', 'un', or numeric flags
 * @param callback - Called when operation completes
 */
export function flock(fd: number, flags: FlockFlagString | number, callback?: ErrorCallback): void {
	const cb = typeof callback === 'function' ? callback : noop;
	const oper = stringToFlockFlags(flags);
	binding!.flock(fd, oper, cb);
}

/**
 * Apply or remove an advisory lock on an open file (sync).
 *
 * @param fd - File descriptor
 * @param flags - Lock operation: 'sh', 'ex', 'shnb', 'exnb', 'un', or numeric flags
 * @returns 0 on success
 */
export function flockSync(fd: number, flags: FlockFlagString | number): number {
	const oper = stringToFlockFlags(flags);
	return binding!.flock(fd, oper);
}

/**
 * Perform file control operations (async).
 *
 * For F_SETLK and F_SETLKW, start and len specify the byte range to lock.
 * If start and len are omitted, they default to 0, which locks the entire file.
 *
 * @param fd - File descriptor
 * @param cmd - Command: 'getfd', 'setfd', 'setlk', 'setlkw', 'getlk', or numeric
 * @param arg - Command argument (e.g., F_RDLCK, F_WRLCK, F_UNLCK for locks)
 * @param start - Start offset for byte-range locks (optional)
 * @param len - Length for byte-range locks (optional)
 * @param callback - Called when operation completes
 */
export function fcntl(
	fd: number,
	cmd: FcntlCmdString | number,
	arg?: number | ErrorCallback,
	start?: number | ErrorCallback,
	len?: number | ErrorCallback,
	callback?: ErrorCallback
): void {
	const numCmd = stringToFcntlFlags(cmd as FcntlCmdString | number);

	// Handle different argument patterns:
	// fcntl(fd, cmd, callback) - arg defaults to 0
	// fcntl(fd, cmd, arg, callback) - no range
	// fcntl(fd, cmd, arg, start, len) - sync with range
	// fcntl(fd, cmd, arg, start, len, callback) - async with range

	let numArg: number;
	let numStart: number | undefined;
	let numLen: number | undefined;
	let cb: ErrorCallback | undefined;

	if (typeof arg === 'function') {
		cb = arg;
		numArg = 0;
	} else if (typeof start === 'function') {
		cb = start;
		numArg = arg ?? 0;
	} else if (typeof len === 'function') {
		cb = len;
		numArg = arg as number ?? 0;
		numStart = start as number;
	} else {
		cb = callback;
		numArg = arg as number ?? 0;
		numStart = start as number | undefined;
		numLen = len as number | undefined;
	}

	// If start and len are provided, pass them to the binding
	if (numStart !== undefined && numLen !== undefined) {
		if (typeof cb === 'function') {
			binding!.fcntl(fd, numCmd, numArg, numStart, numLen, cb);
			return;
		}
		binding!.fcntl(fd, numCmd, numArg, numStart, numLen);
		return;
	}

	if (typeof cb === 'function') {
		binding!.fcntl(fd, numCmd, numArg, cb);
		return;
	}
	binding!.fcntl(fd, numCmd, numArg);
}

/**
 * Perform file control operations (sync).
 *
 * For F_SETLK and F_SETLKW, start and len specify the byte range to lock.
 * If start and len are omitted, they default to 0, which locks the entire file.
 *
 * @param fd - File descriptor
 * @param cmd - Command: 'getfd', 'setfd', 'setlk', 'setlkw', 'getlk', or numeric
 * @param arg - Command argument (e.g., F_RDLCK, F_WRLCK, F_UNLCK for locks)
 * @param start - Start offset for byte-range locks (optional)
 * @param len - Length for byte-range locks (optional)
 * @returns Result of the fcntl call
 */
export function fcntlSync(
	fd: number,
	cmd: FcntlCmdString | number,
	arg?: number,
	start?: number,
	len?: number
): number {
	const numCmd = stringToFcntlFlags(cmd as FcntlCmdString | number);
	const numArg = arg ?? 0;

	// If start and len are provided, pass them to the binding
	if (start !== undefined && len !== undefined) {
		return binding!.fcntl(fd, numCmd, numArg, start, len);
	}

	return binding!.fcntl(fd, numCmd, numArg);
}

/**
 * Reposition read/write file offset (async).
 *
 * @param fd - File descriptor
 * @param position - Offset in bytes
 * @param whence - SEEK_SET, SEEK_CUR, or SEEK_END
 * @param callback - Called with (err, newPosition)
 */
export function seek(fd: number, position: number, whence: number, callback?: ResultCallback<number>): void {
	const cb = typeof callback === 'function' ? callback : noop;
	binding!.seek(fd, position, whence, cb);
}

/**
 * Reposition read/write file offset (sync).
 *
 * @param fd - File descriptor
 * @param position - Offset in bytes
 * @param whence - SEEK_SET, SEEK_CUR, or SEEK_END
 * @returns New file position
 */
export function seekSync(fd: number, position: number, whence: number): number {
	return binding!.seek(fd, position, whence);
}

/**
 * Get filesystem statistics.
 *
 * @param path - Path to any file on the filesystem
 * @param callback - Called with (err, stats)
 */
export function statVFS(path: string | undefined, callback: ResultCallback<StatVFSResult>): void {
	const fsPath = path || '/';
	binding!.statVFS(fsPath, callback);
}

/**
 * Lock a file region using Windows LockFileEx (async, Windows only).
 *
 * @param fd - File descriptor
 * @param flags - 0 for shared, LOCKFILE_EXCLUSIVE_LOCK for exclusive
 * @param offsetLow - Low 32 bits of offset
 * @param offsetHigh - High 32 bits of offset
 * @param lengthLow - Low 32 bits of length
 * @param lengthHigh - High 32 bits of length
 * @param callback - Called when operation completes
 */
export function lockFileEx(
	fd: number,
	flags: number,
	offsetLow: number,
	offsetHigh: number,
	lengthLow: number,
	lengthHigh: number,
	callback?: ErrorCallback
): void {
	if (!binding!.lockFileEx) {
		throw new Error('lockFileEx is only available on Windows');
	}
	const cb = typeof callback === 'function' ? callback : noop;
	binding!.lockFileEx(fd, flags, offsetLow, offsetHigh, lengthLow, lengthHigh, cb);
}

/**
 * Lock a file region using Windows LockFileEx (sync, Windows only).
 *
 * @param fd - File descriptor
 * @param flags - 0 for shared, LOCKFILE_EXCLUSIVE_LOCK for exclusive
 * @param offsetLow - Low 32 bits of offset
 * @param offsetHigh - High 32 bits of offset
 * @param lengthLow - Low 32 bits of length
 * @param lengthHigh - High 32 bits of length
 * @returns 0 on success
 */
export function lockFileExSync(
	fd: number,
	flags: number,
	offsetLow: number,
	offsetHigh: number,
	lengthLow: number,
	lengthHigh: number
): number {
	if (!binding!.lockFileEx) {
		throw new Error('lockFileEx is only available on Windows');
	}
	return binding!.lockFileEx(fd, flags, offsetLow, offsetHigh, lengthLow, lengthHigh);
}

/**
 * Unlock a file region using Windows UnlockFileEx (async, Windows only).
 *
 * @param fd - File descriptor
 * @param offsetLow - Low 32 bits of offset
 * @param offsetHigh - High 32 bits of offset
 * @param lengthLow - Low 32 bits of length
 * @param lengthHigh - High 32 bits of length
 * @param callback - Called when operation completes
 */
export function unlockFileEx(
	fd: number,
	offsetLow: number,
	offsetHigh: number,
	lengthLow: number,
	lengthHigh: number,
	callback?: ErrorCallback
): void {
	if (!binding!.unlockFileEx) {
		throw new Error('unlockFileEx is only available on Windows');
	}
	const cb = typeof callback === 'function' ? callback : noop;
	binding!.unlockFileEx(fd, offsetLow, offsetHigh, lengthLow, lengthHigh, cb);
}

/**
 * Unlock a file region using Windows UnlockFileEx (sync, Windows only).
 *
 * @param fd - File descriptor
 * @param offsetLow - Low 32 bits of offset
 * @param offsetHigh - High 32 bits of offset
 * @param lengthLow - Low 32 bits of length
 * @param lengthHigh - High 32 bits of length
 * @returns 0 on success
 */
export function unlockFileExSync(
	fd: number,
	offsetLow: number,
	offsetHigh: number,
	lengthLow: number,
	lengthHigh: number
): number {
	if (!binding!.unlockFileEx) {
		throw new Error('unlockFileEx is only available on Windows');
	}
	return binding!.unlockFileEx(fd, offsetLow, offsetHigh, lengthLow, lengthHigh);
}

// Ensure Windows LockFileEx constants are available on all platforms
if (binding.constants.LOCKFILE_EXCLUSIVE_LOCK === undefined) {
	(binding.constants as FsExtConstants).LOCKFILE_EXCLUSIVE_LOCK = 0x00000002;
}
if (binding.constants.LOCKFILE_FAIL_IMMEDIATELY === undefined) {
	(binding.constants as FsExtConstants).LOCKFILE_FAIL_IMMEDIATELY = 0x00000001;
}

/**
 * Constants for use with flock, fcntl, seek, and Windows lock functions.
 */
export const constants: FsExtConstants = binding.constants;

/**
 * Switch to a different native module source.
 * Useful for testing to explicitly use the local build instead of prebuilts.
 *
 * @param source - 'prebuilt' or 'local'
 * @throws Error if the requested source cannot be loaded
 */
export function useNativeModule(source: NativeModuleSource): void {
	const newBinding = loader.useNativeModule(source);
	if (!newBinding) {
		throw new Error('Failed to load fs-ext native module from source: ' + source);
	}
	binding = newBinding;

	// Re-add Windows constants if needed
	if (binding.constants.LOCKFILE_EXCLUSIVE_LOCK === undefined) {
		(binding.constants as FsExtConstants).LOCKFILE_EXCLUSIVE_LOCK = 0x00000002;
	}
	if (binding.constants.LOCKFILE_FAIL_IMMEDIATELY === undefined) {
		(binding.constants as FsExtConstants).LOCKFILE_FAIL_IMMEDIATELY = 0x00000001;
	}

	// Update exported constants reference
	(exports as { constants: FsExtConstants }).constants = binding.constants;
}

/**
 * Get the current native module source.
 *
 * @returns 'prebuilt', 'local', or null if not loaded
 */
export function getNativeModuleSource(): NativeModuleSource | null {
	return loader.getNativeModuleSource();
}
