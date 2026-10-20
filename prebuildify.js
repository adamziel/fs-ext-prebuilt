#!/usr/bin/env node
/* eslint-disable no-console */
// Cross-platform prebuild runner.
// NODE_VERSIONS can select newer released headers for an ABI without dropping
// other ABIs. ELECTRON_VERSION overrides Studio's exact Electron version.
// PREBUILD_TARGETS_PATH freezes the target list across CI build/validation jobs.
// ABI_REGISTRY_URL overrides the registry used for Electron ABI lookup.
// STUDIO_PACKAGE_URL overrides the Studio package.json URL for Electron lookup.
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');
require('./patch-nan-v8-14');
const { resolveTargets, binaryName } = require('./.github/scripts/prebuild-targets');

const ROOT = __dirname;
const BIN_DIR = path.join(ROOT, 'binaries');
const PREBUILD_DIR = path.join(ROOT, 'prebuilds');

const STRIP_SUPPORTED = process.platform !== 'win32';
const TAG_LIBC = process.platform === 'linux';
const LIBC = TAG_LIBC
	? process.env.PREBUILD_LIBC || (process.report.getReport().header.glibcVersionRuntime ? 'glibc' : 'musl')
	: '';

async function main() {
	const targets = process.env.PREBUILD_TARGETS_PATH
		? JSON.parse(fs.readFileSync(process.env.PREBUILD_TARGETS_PATH, 'utf8'))
		: await resolveTargets();
	console.log('Building prebuild targets:', targets);
	const architectures = getArchitectures();
	console.log(`Platform: ${process.platform}, Architecture: ${architectures.join(', ')}`);

	cleanDir(BIN_DIR);

	targets.forEach(runPrebuild);
	fs.writeFileSync(path.join(ROOT, 'prebuild-targets.json'), JSON.stringify(targets, null, 2) + '\n');

	fs.rmSync(PREBUILD_DIR, { recursive: true, force: true });

	console.log('\n=== Build complete ===');
	console.log(`Binaries are available in ${BIN_DIR}`);
}

function runPrebuild(target) {
	const architectures = getArchitectures();
	for (const arch of architectures) {
		runPrebuildForArch(target, arch);
	}
}

function runPrebuildForArch(target, arch) {
	const targetLabel = `${target.runtime}-${target.version} (ABI ${target.abi})`;
	const targetSpec = `${target.runtime}@${target.version}`;
	console.log(`\n=== Building for ${targetLabel} [${arch}] (${targetSpec}) ===`);

	fs.rmSync(PREBUILD_DIR, { recursive: true, force: true });

	// Use locally installed prebuildify instead of npx to avoid download hangs on Windows
	const prebuildifyBin = path.join(ROOT, 'node_modules', '.bin', 'prebuildify');
	const args = [prebuildifyBin, '--arch', arch];

	if (STRIP_SUPPORTED) {
		args.push('--strip');
	}

	if (TAG_LIBC) {
		args.push('--tag-libc');
	}

	args.push('--target', targetSpec);

	console.log(`Running: ${args.join(' ')}`);

	// Add node_modules/.bin to PATH so node-gyp is found
	const binDir = path.join(ROOT, 'node_modules', '.bin');
	const pathEnv = process.platform === 'win32'
		? `${binDir};${process.env.PATH || ''}`
		: `${binDir}:${process.env.PATH || ''}`;

	const result = spawnSync(args[0], args.slice(1), {
		stdio: 'inherit',
		cwd: ROOT,
		// 10 minute timeout per build target to prevent hanging builds
		timeout: 600000,
		shell: process.platform === 'win32',
		env: { ...process.env, PATH: pathEnv },
	});

	if (result.error) {
		throw result.error;
	}
	if (result.status !== 0) {
		throw new Error(`prebuildify exited with code ${result.status}`);
	}

	const osDirs = fs
		.readdirSync(PREBUILD_DIR, { withFileTypes: true })
		.filter((entry) => entry.isDirectory());

	if (!osDirs.length) {
		throw new Error(
			'No prebuild outputs found. Expected prebuilds/<platform>-<arch>'
		);
	}

	fs.mkdirSync(BIN_DIR, { recursive: true });

	osDirs.forEach((dirent) => {
		const buildDir = path.join(PREBUILD_DIR, dirent.name);
		const artifacts = fs
			.readdirSync(buildDir)
			.filter((file) => file.endsWith('.node'));

		if (!artifacts.length) {
			throw new Error(`No .node artifacts in ${buildDir}`);
		}

		artifacts.forEach((file) => {
			const platform = dirent.name + (LIBC ? '-' + LIBC : '');
			const destinationName = binaryName(platform, target);
			const destination = path.join(BIN_DIR, destinationName);
			fs.copyFileSync(path.join(buildDir, file), destination);
			console.log(`  → ${destinationName}`);
		});
	});
}

// Determine which architectures to build for based on platform.
// We build for the native architecture only. CI uses separate runners for
// each platform/architecture combination.
function getArchitectures() {
	// Always build for native architecture only.
	// CI uses separate runners for x64 and arm64 on all platforms.
	return [process.arch];
}

function cleanDir(dirPath) {
	fs.rmSync(dirPath, { recursive: true, force: true });
	fs.mkdirSync(dirPath, { recursive: true });
}

main().catch((err) => {
	console.error(err);
	process.exit(1);
});
