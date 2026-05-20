const fs = require('fs');
const https = require('https');

const mode = process.argv[2] || 'detect';
const eventName = process.env.EVENT_NAME || '';
const nodeVersionsOverride = process.env.NODE_VERSIONS || '';
const electronVersionOverride = process.env.ELECTRON_VERSION || '';
const abiUrl =
	process.env.ABI_REGISTRY_URL ||
	'https://raw.githubusercontent.com/nodejs/node/main/doc/abi_version_registry.json';
const studioPackageUrl =
	process.env.STUDIO_PACKAGE_URL ||
	'https://raw.githubusercontent.com/Automattic/studio/trunk/apps/studio/package.json';
const platforms = [
	'darwin-arm64',
	'darwin-x64',
	'linux-arm64',
	'linux-x64',
	'win32-arm64',
	'win32-x64',
];

function setOutput(name, value) {
	if (!process.env.GITHUB_OUTPUT) {
		console.log(`${name}=${value}`);
		return;
	}
	fs.appendFileSync(process.env.GITHUB_OUTPUT, `${name}=${value}\n`);
}

function fetchJson(url) {
	return new Promise((resolve, reject) => {
		https
			.get(url, (res) => {
				if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
					res.resume();
					resolve(fetchJson(res.headers.location));
					return;
				}
				if (res.statusCode < 200 || res.statusCode >= 300) {
					res.resume();
					reject(new Error(`Request failed for ${url} with status ${res.statusCode}`));
					return;
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

function parseNodeVersions(registry) {
	if (nodeVersionsOverride.trim()) {
		return nodeVersionsOverride.split(/[\s,]+/).filter(Boolean);
	}

	const versions = (registry.NODE_MODULE_VERSION || [])
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

function normalizeElectronVersion(version) {
	return String(version || '').trim().replace(/^[^0-9]*/, '');
}

async function getExpectedState() {
	const registry = await fetchJson(abiUrl);
	const nodeVersions = parseNodeVersions(registry);
	const studioPackage = await fetchJson(studioPackageUrl);
	const electronVersion = normalizeElectronVersion(
		electronVersionOverride ||
			studioPackage?.devDependencies?.electron ||
			studioPackage?.dependencies?.electron
	);

	if (!nodeVersions.length) {
		throw new Error('No Node.js versions selected');
	}
	if (!electronVersion) {
		throw new Error('Unable to determine Electron version from Studio package.json');
	}

	const expectedTargets = new Set([
		...nodeVersions.map((version) => `node-${version}`),
		`electron-${electronVersion}`,
	]);
	const expectedFiles = new Set();
	for (const platform of platforms) {
		for (const target of expectedTargets) {
			expectedFiles.add(`fs-ext-${platform}-${target}.node`);
		}
	}

	return { nodeVersions, electronVersion, expectedFiles };
}

function compareBinaries(expectedFiles) {
	const binaryFiles = fs.existsSync('binaries')
		? fs.readdirSync('binaries').filter((file) => file.endsWith('.node'))
		: [];

	return {
		missing: [...expectedFiles].filter((file) => !binaryFiles.includes(file)),
		extra: binaryFiles.filter((file) => !expectedFiles.has(file)),
	};
}

(async () => {
	if (mode === 'detect' && eventName !== 'schedule') {
		setOutput('should_build', 'true');
		setOutput('reason', `${eventName || 'manual'} runs always rebuild`);
		return;
	}

	const { nodeVersions, electronVersion, expectedFiles } = await getExpectedState();
	const { missing, extra } = compareBinaries(expectedFiles);
	const targetSummary = `Node ${nodeVersions.join(', ')}; Electron ${electronVersion}`;

	if (mode === 'validate') {
		if (missing.length || extra.length) {
			if (missing.length) {
				console.error(`Missing expected binaries:\n${missing.join('\n')}`);
			}
			if (extra.length) {
				console.error(`Unexpected binaries:\n${extra.join('\n')}`);
			}
			process.exit(1);
		}
		console.log(`All expected prebuilds are present: ${targetSummary}`);
		return;
	}

	if (missing.length || extra.length) {
		const reason = [
			missing.length ? `missing ${missing.length} expected binaries` : '',
			extra.length ? `found ${extra.length} stale binaries` : '',
		]
			.filter(Boolean)
			.join('; ');
		setOutput('should_build', 'true');
		setOutput('reason', reason);
		return;
	}

	setOutput('should_build', 'false');
	setOutput('reason', `prebuild targets current: ${targetSummary}`);
})().catch((err) => {
	console.error(err);
	process.exit(1);
});
