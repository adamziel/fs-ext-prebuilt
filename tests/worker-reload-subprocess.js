// Helper script that spawns sequential workers to test native addon reload
// This is run as a subprocess so crashes don't kill the test runner

const { Worker } = require('node:worker_threads');
const path = require('node:path');
const os = require('node:os');

const fsExtPath = path.join(__dirname, '..', 'dist', 'fs-ext.js').replace(/\\/g, '\\\\');
const tmpDir = os.tmpdir().replace(/\\/g, '\\\\');

// Worker code that loads the native addon and uses sync flock operation
// This tests the worker reload issue without hitting the async uv_default_loop bug
const workerCode = `
	const { parentPort } = require('node:worker_threads');
	const fs = require('node:fs');
	const os = require('node:os');
	const path = require('node:path');
	try {
		const fsExt = require('${fsExtPath}');
		// Use sync flock which doesn't involve uv_queue_work
		const tmpFile = path.join('${tmpDir}', 'fs-ext-worker-test-' + process.pid + '.tmp');
		const fd = fs.openSync(tmpFile, 'w');
		fsExt.flockSync(fd, 'ex');
		fsExt.flockSync(fd, 'un');
		fs.closeSync(fd);
		fs.unlinkSync(tmpFile);
		parentPort.postMessage({ success: true });
	} catch (err) {
		parentPort.postMessage({ success: false, error: err.message });
	}
`;

function runWorker() {
	return new Promise((resolve, reject) => {
		const worker = new Worker(workerCode, { eval: true });

		const timeout = setTimeout(() => {
			worker.terminate();
			reject(new Error('Worker timed out'));
		}, 5000);

		worker.on('message', (msg) => {
			clearTimeout(timeout);
			worker.terminate();
			resolve(msg);
		});

		worker.on('error', (err) => {
			clearTimeout(timeout);
			reject(err);
		});

		worker.on('exit', (code) => {
			clearTimeout(timeout);
			if (code !== 0) {
				reject(new Error(`Worker exited with code ${code}`));
			}
		});
	});
}

async function main() {
	const numWorkers = parseInt(process.argv[2] || '3', 10);
	const numRounds = 2;

	// Run multiple rounds: spawn workers, wait for all to complete, then spawn new batch
	for (let round = 0; round < numRounds; round++) {
		console.log(`\nRound ${round + 1}: Spawning ${numWorkers} concurrent workers...`);

		// Spawn all workers concurrently
		const promises = [];
		for (let i = 0; i < numWorkers; i++) {
			console.log(`  Starting worker ${round + 1}.${i + 1}...`);
			promises.push(runWorker());
		}

		// Wait for all to complete
		const results = await Promise.all(promises);

		for (let i = 0; i < results.length; i++) {
			console.log(`  Worker ${round + 1}.${i + 1} result:`, results[i]);
			if (!results[i].success) {
				console.error(`  Worker ${round + 1}.${i + 1} failed:`, results[i].error);
				process.exit(1);
			}
		}

		console.log(`Round ${round + 1} complete, all workers disposed.`);
	}

	console.log('\nAll rounds completed successfully');
	process.exit(0);
}

main().catch((err) => {
	console.error('Fatal error:', err.message);
	process.exit(1);
});
