import { spawn } from 'node:child_process';
import process from 'node:process';

const children = [];
let shuttingDown = false;
let exitCode = 0;

function launch(label, args) {
  const child = spawn(process.execPath, args, {
    stdio: 'inherit',
    env: { ...process.env },
  });
  child._label = label;
  child.on('exit', (code, signal) => {
    if (shuttingDown) return;
    if (signal) {
      console.error(`[${label}] killed by ${signal}`);
      exitCode = 1;
    } else if (code !== 0) {
      console.error(`[${label}] exited with code ${code}`);
      exitCode = code ?? 1;
    } else {
      console.log(`[${label}] exited cleanly`);
    }
    if (!shuttingDown) shutdown('child-exit');
  });
  children.push(child);
  return child;
}

function shutdown(reason) {
  if (shuttingDown) return;
  shuttingDown = true;
  console.log(`[supervisor] shutting down (${reason})`);

  const api = children.find((c) => c._label === 'api');
  if (api && !api.killed) api.kill('SIGTERM');

  setTimeout(() => {
    const worker = children.find((c) => c._label === 'worker');
    if (worker && !worker.killed) worker.kill('SIGTERM');

    setTimeout(() => {
      for (const c of children) {
        if (!c.killed) c.kill('SIGKILL');
      }
      process.exit(exitCode);
    }, 25_000).unref();
  }, 2_000).unref();
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

launch('worker', ['src/worker.js']);
launch('api', ['src/server.js']);
