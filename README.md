# fs-ext-extra-prebuilt

A fork of [fs-ext](https://github.com/baudehlo/node-fs-ext) that ships prebuilt binaries for all major platforms and adds Windows-specific file locking APIs.

## Why this fork?

The original `fs-ext` package requires compilation during `npm install`, which can fail in environments without build tools. This fork:

- **Ships prebuilt binaries** for macOS (x64, arm64), Linux (x64, arm64), and Windows (x64, arm64)
- **Adds `LockFileEx`/`UnlockFileEx`** Windows APIs for byte-range file locking
- **Supports Node.js 20+** and Electron
- **Falls back to local compilation** if no prebuilt binary matches your platform

## Installation

```sh
npm install fs-ext-extra-prebuilt
```

## Usage

```js
const { flock, flockSync } = require('fs-ext-extra-prebuilt');
const fs = require('fs');

const fd = fs.openSync('foo.txt', 'r');
flock(fd, 'ex', (err) => {
	if (err) {
		return console.error("Couldn't lock file");
	}
	// file is locked
});
```

## API

### flock(fd, flags, [callback])

Asynchronous flock(2). No arguments other than a possible error are passed to
the callback. Flags can be 'sh', 'ex', 'shnb', 'exnb', 'un' and correspond
to the various LOCK_SH, LOCK_EX, LOCK_SH|LOCK_NB, etc.

NOTE (from flock() man page): flock() does not lock files over NFS. Use fcntl(2)
instead: that does work over NFS, given a sufficiently recent version of Linux
and a server which supports locking.

### flockSync(fd, flags)

Synchronous flock(2). Throws an exception on error.

### fcntl(fd, cmd, [arg], [start], [len], [callback])

Asynchronous fcntl(2).

callback will be given two arguments (err, result).

The supported commands are:

- 'getfd' ( F_GETFD )
- 'setfd' ( F_SETFD )
- 'setlk' ( F_SETLK )
- 'getlk' ( F_GETLK )
- 'setlkw' ( F_SETLKW )

For F_SETLK and F_SETLKW, the `arg` parameter specifies the lock type (F_RDLCK, F_WRLCK, or F_UNLCK).
The optional `start` and `len` parameters specify the byte range to lock. If omitted, they default
to 0, which locks the entire file.

### fcntlSync(fd, cmd, [arg], [start], [len])

Synchronous fcntl(2). Throws an exception on error.

### seek(fd, offset, whence, [callback])

Asynchronous lseek(2).

callback will be given two arguments (err, currFilePos).

whence can be 0 (SEEK_SET) to set the new position in bytes to offset,
1 (SEEK_CUR) to set the new position to the current position plus offset
bytes (can be negative), or 2 (SEEK_END) to set to the end of the file
plus offset bytes (usually negative or zero to seek to the end of the file).

### seekSync(fd, offset, whence)

Synchronous lseek(2). Throws an exception on error. Returns current file position.

### lockFileEx(fd, flags, offsetLow, offsetHigh, lengthLow, lengthHigh, [callback]) - Windows only

Asynchronous LockFileEx. Locks a byte range in a file.

Flags:

- `0` - shared lock
- `constants.LOCKFILE_EXCLUSIVE_LOCK` - exclusive lock
- `constants.LOCKFILE_FAIL_IMMEDIATELY` - non-blocking (can be OR'd with above)

### lockFileExSync(fd, flags, offsetLow, offsetHigh, lengthLow, lengthHigh) - Windows only

Synchronous LockFileEx. Throws an exception on error.

### unlockFileEx(fd, offsetLow, offsetHigh, lengthLow, lengthHigh, [callback]) - Windows only

Asynchronous UnlockFileEx. Unlocks a byte range in a file.

### unlockFileExSync(fd, offsetLow, offsetHigh, lengthLow, lengthHigh) - Windows only

Synchronous UnlockFileEx. Throws an exception on error.

## Constants

Available via `require('fs-ext-extra-prebuilt').constants`:

- `LOCK_SH`, `LOCK_EX`, `LOCK_NB`, `LOCK_UN` - flock flags
- `F_GETFD`, `F_SETFD`, `F_GETLK`, `F_SETLK`, `F_SETLKW` - fcntl commands
- `F_RDLCK`, `F_WRLCK`, `F_UNLCK` - fcntl lock types
- `FD_CLOEXEC` - close-on-exec flag
- `LOCKFILE_EXCLUSIVE_LOCK`, `LOCKFILE_FAIL_IMMEDIATELY` - Windows LockFileEx flags

## License

MIT

## Automatic prebuild releases

The daily build workflow reads released Node versions and their module ABIs from
`https://nodejs.org/dist/index.json`. It keeps one build target per ABI, starting
at Node 20. A new patch with the same ABI does not trigger another build. The
Electron target still follows Studio's package version.

Detection writes `prebuild-targets.json`. Every build and validation job uses
that same snapshot. All six platform/architecture combinations are required,
including Windows ARM64. Node binaries are tested in their target Node runtimes,
and each packed npm tarball is installed with scripts disabled so a local
compilation cannot hide a missing prebuild.

The publisher stores a fingerprint of the binary set and runtime sources in npm
metadata. Unchanged builds do not consume another version. If publication fails
after the version commit, the next daily run retries that unpublished version.
Re-running the failed publish job also reuses its pending version commit. It
does not include newer, untested trunk changes.
Changed sources, build settings, or dependencies require another build and test
run, even when the ABI list is unchanged. Tags are pushed after npm publication
succeeds.

Automatic builds dispatch a separate `publish.yml` run at the tested commit.
This preserves the existing npm trusted-publisher workflow identity.

For a local build, run `node prebuildify.js`. `NODE_VERSIONS` can select newer
released headers for an ABI without dropping the other supported ABIs.
`ELECTRON_VERSION` selects an exact Electron version instead of Studio's version.
CI sets `PREBUILD_TARGETS_PATH` to use its frozen snapshot.

New binaries use the runtime's actual module ABI in their filename. The loader
also matches platform, architecture, and Linux libc. Existing exact-major legacy
binaries remain usable during rollout; it no longer guesses a lower Node major
or tries a Node binary inside Electron.
