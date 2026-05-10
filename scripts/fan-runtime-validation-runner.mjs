import { spawn } from 'node:child_process';
import http from 'node:http';

const waitForServer = (url, timeoutMs = 45000) =>
  new Promise((resolve, reject) => {
    const deadline = Date.now() + timeoutMs;

    const check = () => {
      const req = http.get(url, (res) => {
        res.resume();
        resolve();
      });

      req.on('error', () => {
        if (Date.now() >= deadline) {
          reject(new Error(`Timed out waiting for ${url}`));
          return;
        }
        setTimeout(check, 1000);
      });
    };

    check();
  });

const npmExecutable = process.platform === 'win32' ? 'npm.cmd' : 'npm';
const vite = spawn(npmExecutable, ['run', 'dev', '--', '--host', '127.0.0.1', '--port', '4173'], {
  cwd: process.cwd(),
  stdio: 'inherit',
  shell: true,
});

const cleanup = () => {
  if (!vite.killed) {
    vite.kill();
  }
};

process.on('exit', cleanup);
process.on('SIGINT', () => {
  cleanup();
  process.exit(130);
});
process.on('SIGTERM', () => {
  cleanup();
  process.exit(143);
});

try {
  await waitForServer('http://127.0.0.1:4173');
  await import('./fan-runtime-validation.mjs');
} finally {
  cleanup();
}
