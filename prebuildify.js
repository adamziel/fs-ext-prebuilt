#!/usr/bin/env node
/* eslint-disable no-console */
// Cross-platform prebuild runner.
// Environment overrides:
//   NODE_VERSIONS       - comma/space list of Node versions (default: stable >=20 from ABI registry)
//   ELECTRON_VERSION    - Electron version override (default: Automattic/studio package.json)
//   REFRESH_ABI=1       - force download of the ABI registry even if cached locally
//   ABI_REGISTRY_URL    - alternate ABI registry URL
//   ABI_REGISTRY_PATH   - alternate path to cache the ABI registry
//   STUDIO_PACKAGE_URL  - alternate package.json URL for Electron lookup
const fs = require('fs');
const path = require('path');
const https = require('https');
const { execSync } = require('child_process');

const ROOT = __dirname;
const BIN_DIR = path.join(ROOT, 'binaries');
const PREBUILD_DIR = path.join(ROOT, 'prebuilds');

const ABI_REGISTRY_URL =
	process.env.ABI_REGISTRY_URL ||
	'https://raw.githubusercontent.com/nodejs/node/main/doc/abi_version_registry.json';
const ABI_REGISTRY_PATH =
	process.env.ABI_REGISTRY_PATH || path.join(ROOT, 'abi-registry.json');
const STUDIO_PACKAGE_URL =
	process.env.STUDIO_PACKAGE_URL ||
	'https://raw.githubusercontent.com/Automattic/studio/trunk/package.json';
const NODE_VERSIONS_ENV = process.env.NODE_VERSIONS || '';
const ELECTRON_VERSION_ENV = process.env.ELECTRON_VERSION || '';

const STRIP_SUPPORTED = process.platform !== 'win32';
const TAG_LIBC = process.platform === 'linux';

function fetchJson(url) {
	return new Promise((resolve, reject) => {
		https
			.get(url, (res) => {
				const { statusCode, headers } = res;
				if (statusCode >= 300 && statusCode < 400 && headers.location) {
					// Follow redirects (GitHub raw redirects frequently)
					res.resume();
					return resolve(fetchJson(headers.location));
				}

				if (statusCode < 200 || statusCode >= 300) {
					res.resume();
					return reject(
						new Error(
							`Request failed for ${url} with status ${statusCode}`
						)
					);
				}

				let data = '';
				res.setEncoding('utf8');
				res.on('data', (chunk) => {
					data += chunk;
				});
				res.on('end', () => {
					try {
						resolve(JSON.parse(data));
					} catch (err) {
						reject(err);
					}
				});
			})
			.on('error', reject);
	});
}

function cleanDir(dirPath) {
	fs.rmSync(dirPath, { recursive: true, force: true });
	fs.mkdirSync(dirPath, { recursive: true });
}

async function ensureAbiRegistry() {
	const shouldRefresh =
		process.env.REFRESH_ABI === '1' || !fs.existsSync(ABI_REGISTRY_PATH);

	if (shouldRefresh) {
		console.log('Fetching ABI registry...');
		const registry = await fetchJson(ABI_REGISTRY_URL);
		fs.writeFileSync(ABI_REGISTRY_PATH, JSON.stringify(registry, null, 2));
		return registry;
	}

	return JSON.parse(fs.readFileSync(ABI_REGISTRY_PATH, 'utf8'));
}

function parseNodeVersions(registry) {
	if (NODE_VERSIONS_ENV.trim()) {
		return NODE_VERSIONS_ENV.split(/[\s,]+/).filter(Boolean);
	}

	const entries = registry.NODE_MODULE_VERSION || [];
	const versions = entries
		.filter((entry) => entry.runtime === 'node')
		.map((entry) => entry.versions)
		.filter(Boolean)
		.filter((version) => !String(version).endsWith('-pre'))
		.filter((version) => {
			const major = parseInt(String(version).split('.')[0], 10);
			return Number.isFinite(major) && major >= 20;
		});

	const unique = Array.from(new Set(versions));
	unique.sort((a, b) => parseInt(b, 10) - parseInt(a, 10));
	return unique;
}

async function resolveElectronVersion() {
	if (ELECTRON_VERSION_ENV.trim()) {
		return ELECTRON_VERSION_ENV.trim().replace(/^[^0-9]*/, '');
	}

	console.log('Fetching Electron version from Automattic/studio...');
	const studioPackage = await fetchJson(STUDIO_PACKAGE_URL);
	const electron =
		studioPackage?.devDependencies?.electron ||
		studioPackage?.dependencies?.electron ||
		'';

	if (!electron) {
		throw new Error(
			'Unable to determine Electron version from Studio package.json'
		);
	}

	return electron.replace(/^[^0-9]*/, '');
}

function runPrebuild(targetLabel, targetSpec) {
    console.log(`\n=== Building for ${targetLabel} (${targetSpec}) ===`);

    fs.rmSync(PREBUILD_DIR, { recursive: true, force: true });

	const args = ['npx', '--yes', 'prebuildify', '--arch', 'x86_64+arm'];

	if (STRIP_SUPPORTED) {
		args.push('--strip');
	}

	if (TAG_LIBC) {
		args.push('--tag-libc');
	}

	args.push('--target', targetSpec);

    // Force C++20 for Node 25+ V8 headers that use C++20 template features.
    // On macOS, GYP's make generator ignores cflags_cc from binding.gyp.
    // We pass the flag via GYP_DEFINES which node-gyp passes to GYP.
    const buildEnv = {
        ...process.env,
        CXXFLAGS: '-std=c++20',
        // This tells GYP to append these flags
        GYP_DEFINES: 'clang=1',
    };

    if (process.platform === 'darwin') {
        // On macOS, pass C++20 flag via node-gyp's devdir mechanism won't help.
        // Instead, we'll modify the args to pass through node-gyp.
        buildEnv.CXXFLAGS = '-std=c++20 -stdlib=libc++';
    }

    // Add verbose flag to debug what's happening
    args.push('-v');

    execSync(args.join(' '), {
        stdio: 'inherit',
        cwd: ROOT,
        env: buildEnv,
    });

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
			const destinationName = `fs-ext-${dirent.name}-${targetLabel}.node`;
			const destination = path.join(BIN_DIR, destinationName);
			fs.copyFileSync(path.join(buildDir, file), destination);
			console.log(`  → ${destinationName}`);
		});
	});
}

(async () => {
	const registry = await ensureAbiRegistry();
	const nodeVersions = parseNodeVersions(registry);
	const electronVersion = await resolveElectronVersion();

	if (!nodeVersions.length) {
		throw new Error(
			'No Node.js versions selected. Set NODE_VERSIONS to override.'
		);
	}

	console.log(
		`Building prebuilds for Node.js versions: ${nodeVersions.join(', ')}`
	);
	console.log(`Electron target: ${electronVersion}`);
	console.log(`Architectures: arm64+x86_64`);

	cleanDir(BIN_DIR);

	nodeVersions.forEach((version) => {
		runPrebuild(`node-${version}`, `node@${version}`);
	});

	runPrebuild(`electron-${electronVersion}`, `electron@${electronVersion}`);

	fs.rmSync(PREBUILD_DIR, { recursive: true, force: true });

	console.log('\n=== Build complete ===');
	console.log(`Binaries are available in ${BIN_DIR}`);
})().catch((err) => {
	console.error(err);
	process.exit(1);
});
