import { execFile } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import { mkdir, mkdtemp, realpath, rm, writeFile } from 'node:fs/promises';
import { createServer } from 'node:net';
import path from 'node:path';
import { promisify } from 'node:util';
import { fileURLToPath, pathToFileURL } from 'node:url';

const execute = promisify(execFile);
const workspace = fileURLToPath(new URL('../..', import.meta.url));

/** Disposable Windows PostgreSQL. Never reads PG*, DATABASE_URL or app credentials. */
export async function withLocalPostgres(run) {
  if (process.platform !== 'win32') throw new Error('This native harness currently requires Windows x64');
  const tools = path.join(workspace, 'output/billing-postgres-tools/node_modules');
  const { initdb, pg_ctl } = await import(pathToFileURL(path.join(tools, '@embedded-postgres/windows-x64/dist/index.js')).href);
  const { default: pg } = await import(pathToFileURL(path.join(tools, 'pg/lib/index.js')).href);
  const root = path.join(workspace, 'output/billing-postgres-runs');
  await mkdir(root, { recursive: true });
  const realRoot = await realpath(root);
  const directory = await mkdtemp(path.join(realRoot, 'run-'));
  const data = path.join(directory, 'data');
  const passwordFile = path.join(directory, 'password');
  const password = randomBytes(32).toString('hex');
  const env = Object.fromEntries(['SystemRoot', 'WINDIR', 'TEMP', 'TMP', 'PATH', 'COMSPEC'].filter(key => process.env[key]).map(key => [key, process.env[key]]));
  const command = (file, args) => execute(file, args, { windowsHide: true, env, timeout: 30_000, maxBuffer: 1024 * 1024 });
  const clients = new Set();
  let startAttempted = false;
  let stopped = false;
  let failure;
  try {
    const port = await new Promise((resolve, reject) => {
      const socket = createServer(); socket.once('error', reject);
      socket.listen(0, '127.0.0.1', () => {
        const assigned = socket.address().port;
        socket.close(error => error ? reject(error) : resolve(assigned));
      });
    });
    await writeFile(passwordFile, password, { mode: 0o600, flag: 'wx' });
    await command(initdb, ['-D', data, '-U', 'postgres', '--auth=scram-sha-256', `--pwfile=${passwordFile}`, '--encoding=UTF8', '--locale=C']);
    await rm(passwordFile);
    startAttempted = true;
    await command(pg_ctl, ['-D', data, '-l', path.join(directory, 'server.log'), '-w', '-t', '20', '-o',
      `-h 127.0.0.1 -p ${port} -c max_connections=10 -c log_statement=none -c log_min_error_statement=panic`, 'start']);
    const connect = async () => {
      const client = new pg.Client({ host: '127.0.0.1', port, user: 'postgres', password, database: 'postgres', ssl: false,
        connectionTimeoutMillis: 5000, query_timeout: 10_000, application_name: 'jozor-local-billing-test' });
      clients.add(client); await client.connect(); return client;
    };
    return await run({ connect });
  } catch (error) {
    failure = error;
    throw error;
  } finally {
    for (const client of clients) await client.end().catch(() => {});
    // Also attempt to stop after a start timeout; pg_ctl may have spawned the server.
    try { await command(pg_ctl, ['-D', data, '-m', 'fast', '-w', '-t', '20', 'stop']); stopped = true; }
    catch { if (startAttempted) throw new Error('Local PostgreSQL cleanup requires attention; data retained', { cause: failure }); }
    if (stopped || !startAttempted) {
      const actual = await realpath(directory);
      if (path.dirname(actual) !== realRoot || !path.basename(actual).startsWith('run-')) throw new Error('Unsafe local cleanup path');
      await rm(actual, { recursive: true, force: false });
    }
  }
}
