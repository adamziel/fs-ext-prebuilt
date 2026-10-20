const https = require('https');

// The same rows drive building, target-runtime tests, and completeness checks.
const platforms = [
	// macOS arm64 (Apple Silicon)
	{
		os: 'macos',
		arch: 'arm64',
		runner: 'macos-14',
		binaryPlatform: 'darwin-arm64',
	},
	// macOS x64 (Intel)
	{
		os: 'macos',
		arch: 'x64',
		runner: 'macos-15-intel',
		binaryPlatform: 'darwin-x64',
	},
	// Linux arm64
	{
		os: 'linux',
		arch: 'arm64',
		runner: 'ubuntu-24.04-arm',
		binaryPlatform: 'linux-arm64-glibc',
	},
	// Linux x64
	{
		os: 'linux',
		arch: 'x64',
		runner: 'ubuntu-24.04',
		binaryPlatform: 'linux-x64-glibc',
	},
	// Windows arm64 (runner may not be available in all repos). If unavailable,
	// stop publication rather than silently omit this platform.
	{
		os: 'windows',
		arch: 'arm64',
		runner: 'windows-11-arm',
		binaryPlatform: 'win32-arm64',
	},
	// Windows x64
	{
		os: 'windows',
		arch: 'x64',
		runner: 'windows-2022',
		binaryPlatform: 'win32-x64',
	},
];

module.exports = {
	resolveTargets,
	selectTargets,
	expectedFiles,
	binaryName,
	fetchJson,
	platforms,
};

async function resolveTargets(env = process.env) {
	const releases = await fetchJson('https://nodejs.org/dist/index.json');
	const registry = await fetchJson(
		env.ABI_REGISTRY_URL ||
			'https://raw.githubusercontent.com/nodejs/node/main/doc/abi_version_registry.json',
	);
	let electron = env.ELECTRON_VERSION;
	if (!electron) {
		const studio = await fetchJson(
			env.STUDIO_PACKAGE_URL ||
				'https://raw.githubusercontent.com/Automattic/studio/trunk/apps/studio/package.json',
		);
		electron =
			studio.devDependencies?.electron || studio.dependencies?.electron;
	}
	return selectTargets(releases, registry, electron, env.NODE_VERSIONS);
}

function selectTargets(releases, registry, electronVersion, nodeVersions = '') {
	// The release index records shipped ABIs. The ABI registry can retain a
	// "-pre" label after a Node release and is not a reliable release list.
	const released = releases.filter(
		(release) =>
			/^v\d+\.\d+\.\d+$/.test(release.version) &&
			Number(release.version.split('.')[0].slice(1)) >= 20 &&
			/^\d+$/.test(String(release.modules)),
	);
	released.sort((a, b) => {
		const av = a.version.slice(1).split('.').map(Number);
		const bv = b.version.slice(1).split('.').map(Number);
		return av[0] - bv[0] || av[1] - bv[1] || av[2] - bv[2];
	});
	const nodes = new Map();
	for (const release of released) {
		const abi = String(release.modules);
		// Keep the first release for each ABI. A new patch using the same ABI
		// must not cause another package release or drop an older ABI.
		if (!nodes.has(abi)) {
			nodes.set(abi, {
				runtime: 'node',
				version: release.version.slice(1),
				abi,
			});
		}
	}
	for (const version of nodeVersions.split(/[\s,]+/).filter(Boolean)) {
		const release = released.find(
			(entry) => entry.version === `v${version.replace(/^v/, '')}`,
		);
		if (!release) {
			throw new Error(`Node ${version} is not a released Node >=20 target`);
		}
		// An override may select newer headers, but cannot remove other ABIs.
		nodes.set(String(release.modules), {
			runtime: 'node',
			version: release.version.slice(1),
			abi: String(release.modules),
		});
	}
	if (!nodes.size) {
		throw new Error('No released Node targets found');
	}
	const electron = String(electronVersion || '').replace(/^[^0-9]*/, '');
	if (!/^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/.test(electron)) {
		throw new Error(
			`Expected an exact Electron version, got ${electronVersion}`,
		);
	}
	const electronAbi = registry.NODE_MODULE_VERSION.find(
		(entry) =>
			entry.runtime === 'electron' && entry.versions === electron.split('.')[0],
	)?.modules;
	if (!electronAbi) {
		throw new Error(`No ABI registered for Electron ${electron}`);
	}
	return [
		...nodes.values(),
		{ runtime: 'electron', version: electron, abi: String(electronAbi) },
	];
}

function expectedFiles(targets) {
	return platforms.flatMap((platform) =>
		targets.map((target) => binaryName(platform.binaryPlatform, target)),
	);
}

function binaryName(platform, target) {
	return `fs-ext-${platform}-${target.runtime}-abi${target.abi}.node`;
}

function fetchJson(url) {
	return new Promise((resolve, reject) => {
		https
			.get(url, (res) => {
				if (
					res.statusCode >= 300 &&
					res.statusCode < 400 &&
					res.headers.location
				) {
					// Follow redirects (GitHub raw redirects frequently).
					res.resume();
					resolve(fetchJson(new URL(res.headers.location, url).href));
					return;
				}
				if (res.statusCode < 200 || res.statusCode >= 300) {
					res.resume();
					reject(
						Object.assign(
							new Error(`Request failed for ${url}: ${res.statusCode}`),
							{
								statusCode: res.statusCode,
							},
						),
					);
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
					} catch (error) {
						reject(error);
					}
				});
			})
			.on('error', reject);
	});
}
