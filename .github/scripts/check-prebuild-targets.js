const fs = require('fs');
const {
	resolveTargets,
	expectedFiles,
	platforms,
} = require('./prebuild-targets');
const { fingerprint } = require('./prepare-release');

/** Detects changed package inputs, or validates the frozen target's binary set. */
async function main() {
	const mode = process.argv[2] || 'detect';
	const snapshotPath = 'prebuild-targets.json';
	const previous = fs.existsSync(snapshotPath)
		? fs.readFileSync(snapshotPath, 'utf8')
		: '';
	// Build and validation consume this exact snapshot, including the Electron
	// version. They must not fetch a newer target halfway through a release.
	const targets =
		mode === 'validate' ? JSON.parse(previous) : await resolveTargets();
	const expected = expectedFiles(targets);
	const files = fs.existsSync('binaries')
		? fs.readdirSync('binaries').filter((file) => file.endsWith('.node'))
		: [];
	const missing = expected.filter((file) => !files.includes(file));
	const extra = files.filter((file) => !expected.includes(file));
	if (mode === 'validate') {
		if (missing.length || extra.length) {
			throw new Error(
				`Missing binaries: ${missing.join(', ')}\nUnexpected binaries: ${extra.join(', ')}`,
			);
		}
		console.log('All expected prebuilds are present');
		return;
	}
	const snapshot = JSON.stringify(targets, null, 2) + '\n';
	fs.writeFileSync(snapshotPath, snapshot);
	const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
	// A failed push run can leave new source beside the previous binary set.
	// Only a package matching the saved release fingerprint may skip tests.
	const packageUnchanged =
		missing.length === 0 &&
		extra.length === 0 &&
		pkg.prebuiltFingerprint === fingerprint(targets);
	const shouldBuild =
		process.env.EVENT_NAME !== 'schedule' || !packageUnchanged;
	setOutput('platforms', JSON.stringify(platforms));
	setOutput('should_build', String(shouldBuild));
	setOutput(
		'reason',
		`${missing.length} missing, ${extra.length} unexpected binaries; snapshot changed: ${previous !== snapshot}; package unchanged: ${packageUnchanged}`,
	);
	setOutput(
		'node_versions',
		JSON.stringify(
			targets
				.filter((target) => target.runtime === 'node')
				.map((target) => target.version),
		),
	);
}

function setOutput(name, value) {
	const line = `${name}=${value}\n`;
	if (process.env.GITHUB_OUTPUT) {
		fs.appendFileSync(process.env.GITHUB_OUTPUT, line);
	} else {
		process.stdout.write(line);
	}
}

main().catch((error) => {
	console.error(error);
	process.exitCode = 1;
});
