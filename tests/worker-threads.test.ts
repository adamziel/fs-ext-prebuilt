import { spawn } from 'node:child_process';
import * as path from 'node:path';

// Skip on Windows - the persistent symbols are only used on Unix for statvfs
const isWindows = process.platform === 'win32';
const describeUnix = isWindows ? describe.skip : describe;

describeUnix('worker threads reload (subprocess)', () => {
	// This test runs in a subprocess so that native addon crashes
	// don't kill the Jest process
	test('native addon can be reloaded in sequential workers', async () => {
		const result = await new Promise<{ exitCode: number | null; stdout: string; stderr: string }>((resolve) => {
			const child = spawn(process.execPath, [
				path.join(__dirname, 'worker-reload-subprocess.js'),
				'3' // number of sequential workers
			], {
				stdio: ['ignore', 'pipe', 'pipe']
			});

			let stdout = '';
			let stderr = '';

			child.stdout.on('data', (data) => {
				stdout += data.toString();
			});

			child.stderr.on('data', (data) => {
				stderr += data.toString();
			});

			child.on('close', (exitCode) => {
				resolve({ exitCode, stdout, stderr });
			});
		});

		// Log output for debugging
		if (result.stdout) console.log('stdout:', result.stdout);
		if (result.stderr) console.log('stderr:', result.stderr);

		expect(result.exitCode).toBe(0);
	}, 30000);
});
