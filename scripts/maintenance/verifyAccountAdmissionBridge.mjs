import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { createHash } from 'node:crypto';
import { readFile, readdir, realpath, writeFile } from 'node:fs/promises';
import { createServer, request } from 'node:http';
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { build } from 'esbuild';
import JSZip from 'jszip';
import { BASELINE } from './prepareAccountAdmissionBridge.mjs';

const workspace = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const digest = data => createHash('sha256').update(data).digest('hex');
const execute = promisify(execFile);

async function listFiles(directory, prefix = '') {
  const files = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    assert(!entry.isSymbolicLink(), 'Artifact contains a link');
    const name = `${prefix}${entry.name}`;
    if (entry.isDirectory()) files.push(...await listFiles(path.join(directory, entry.name), `${name}/`));
    else { assert(entry.isFile(), 'Unexpected artifact entry'); files.push(name); }
  }
  return files.sort();
}

/** Local-only verification. Never loads env files, calls hosted APIs, or deploys. */
export async function verifyAccountAdmissionBridge(directory) {
  const root = await realpath(path.join(workspace, 'output/account-admission-bridges'));
  directory = await realpath(directory);
  assert.equal(path.dirname(directory), root, 'Expected a direct child of the bridge artifact directory');
  const release = path.join(directory, 'release');
  assert.equal(await realpath(release), release, 'Release directory must not be a link');
  const manifest = JSON.parse(await readFile(path.join(directory, 'manifest.json'), 'utf8'));
  assert.equal(manifest.baseline, BASELINE);
  assert.equal(manifest.deployed, false);
  const archive = await JSZip.loadAsync(await readFile(path.join(directory, 'baseline.zip')), { checkCRC32: true });
  const { stdout } = await execute('git', ['ls-tree', '-rz', '--full-tree', BASELINE], { cwd: workspace, windowsHide: true, maxBuffer: 4 * 1024 * 1024 });
  const tree = stdout.split('\0').filter(Boolean).map(line => {
    const [header, name] = line.split('\t'); const [mode, type, hash] = header.split(' ');
    assert.equal(type, 'blob'); assert(['100644', '100755'].includes(mode));
    return { name, hash };
  });
  assert.deepEqual(Object.keys(manifest.baselineFiles).sort(), tree.map(entry => entry.name).sort());
  const changes = ['api/auth/delete-account.ts', 'shared/server/api/billing/create-checkout-session.ts', 'shared/http/accountAdmissionBridge.ts'];
  assert.deepEqual(manifest.runtimeChanges, changes);
  assert.equal(manifest.unchangedBaselineFileCount, tree.length - 2);
  for (const { name, hash } of tree) {
    const archived = await archive.file(name).async('nodebuffer');
    const gitHash = createHash('sha1').update(`blob ${archived.length}\0`).update(archived).digest('hex');
    assert.equal(gitHash, hash, `Archive differs from pinned git tree: ${name}`);
    assert.equal(digest(archived), manifest.baselineFiles[name]);
    if (!changes.includes(name)) assert.equal(digest(await readFile(path.join(release, name))), digest(archived), `Unapproved change: ${name}`);
  }
  const overlays = {
    [changes[0]]: "export { default } from '../../shared/http/accountAdmissionBridge.js';\nexport const config = { api: { bodyParser: false } };\n",
    [changes[1]]: "export { default } from '../../../http/accountAdmissionBridge.js';\nexport const config = { api: { bodyParser: false } };\n",
    [changes[2]]: await readFile(path.join(workspace, changes[2]), 'utf8'),
  };
  for (const [name, expected] of Object.entries(overlays)) assert.equal(await readFile(path.join(release, name), 'utf8'), expected);
  const target = JSON.parse(await readFile(path.join(workspace, '.vercel/project.json'), 'utf8'));
  const linked = JSON.parse(await readFile(path.join(release, '.vercel/project.json'), 'utf8'));
  assert.deepEqual(linked, { projectId: target.projectId, orgId: target.orgId });
  assert.deepEqual(manifest.target, linked);
  const expectedFiles = [...tree.map(entry => entry.name), changes[2], '.vercel/project.json'].sort();
  assert.deepEqual(await listFiles(release), expectedFiles, 'Unmanifested or missing files in release');
  assert.deepEqual(Object.keys(manifest.files).sort(), expectedFiles);
  for (const name of expectedFiles) assert.equal(digest(await readFile(path.join(release, name))), manifest.files[name]);

  const handlers = {};
  const require = createRequire(import.meta.url);
  const packageJson = JSON.parse(await readFile(path.join(release, 'package.json'), 'utf8'));
  const external = Object.keys({ ...packageJson.dependencies, ...packageJson.devDependencies });
  for (const [name, entry] of Object.entries({ deletion: changes[0], billing: 'api/billing/[action].ts' })) {
    const outfile = path.join(directory, `${name}-probe.cjs`);
    const bundled = await build({ entryPoints: [path.join(release, entry)], outfile, bundle: true, external, platform: 'node', format: 'cjs', metafile: true, logLevel: 'silent' });
    for (const source of Object.keys(bundled.metafile.inputs)) {
      const relative = path.relative(release, path.resolve(source));
      assert(!relative.startsWith('..') && !path.isAbsolute(relative), 'Bundle imported dirty workspace source');
    }
    const module = require(outfile);
    assert.equal(module.config.api.bodyParser, false);
    handlers[name] = module.default;
  }
  const savedEnv = process.env; const savedFetch = globalThis.fetch;
  let outboundAttempts = 0; let bodyReads = 0; let probes = 0;
  const server = createServer((req, res) => {
    const url = new URL(req.url, 'http://localhost');
    req.query = { action: url.pathname.split('/').at(-1) };
    res.status = code => { res.statusCode = code; return res; };
    res.json = body => { res.setHeader('Content-Type', 'application/json'); res.end(JSON.stringify(body)); return res; };
    if (url.pathname.endsWith('delete-account') || url.pathname.endsWith('create-checkout-session')) {
      Object.defineProperty(req, 'body', { get() { bodyReads++; throw new Error('Unexpected body access'); } });
      const on = req.on;
      req.on = function (event, ...args) { if (event === 'data') { bodyReads++; throw new Error('Unexpected body stream read'); } return on.call(this, event, ...args); };
    }
    const handler = url.pathname.endsWith('delete-account') ? handlers.deletion : handlers.billing;
    Promise.resolve(handler(req, res)).catch(() => { res.statusCode = 500; res.end('Probe failure'); });
  });
  const probe = (route, method, expected, bridge = true) => new Promise((resolve, reject) => {
    const req = request({ hostname: '127.0.0.1', port: server.address().port, path: route, method, headers: { origin: 'https://bridge.invalid', authorization: 'Bearer invalid-test-only', 'Content-Type': 'application/json' } }, res => {
      let body = ''; res.setEncoding('utf8'); res.on('data', part => { body += part; });
      res.on('end', () => { try {
        assert.equal(res.statusCode, expected, `${method} ${route}`);
        assert.equal(res.headers['x-jozor-admission-gate'], bridge ? 'bridge-v1' : undefined);
        if (bridge) assert.equal(res.headers['cache-control'], 'no-store');
        if (expected === 503) { assert.equal(JSON.parse(body).code, 'ACCOUNT_ADMISSION_PAUSED'); assert.equal(res.headers['retry-after'], '300'); }
        probes++; resolve();
      } catch (error) { reject(error); } });
    });
    req.setTimeout(5000, () => req.destroy(new Error('Probe timeout'))); req.on('error', reject);
    req.end(method === 'POST' ? 'not-json' : undefined);
  });
  try {
    process.env = { NODE_ENV: 'production', ACCOUNT_ADMISSION_PAUSED: 'false' };
    globalThis.fetch = () => { outboundAttempts++; throw new Error('Network access forbidden during local bridge probes'); };
    await new Promise((resolve, reject) => { server.once('error', reject); server.listen(0, '127.0.0.1', resolve); });
    for (const origin of [undefined, 'https://bridge.invalid']) {
      if (origin) process.env.APP_ORIGIN = origin;
      for (const route of ['/api/auth/delete-account', '/api/billing/create-checkout-session']) {
        await probe(route, 'POST', 503); await probe(route, 'OPTIONS', 204); await probe(route, 'GET', 405);
      }
    }
    await probe('/api/billing/customer-portal', 'OPTIONS', 204, false);
    await probe('/api/billing/paddle-webhook', 'GET', 405, false);
    assert.equal(bodyReads, 0); assert.equal(outboundAttempts, 0);
  } finally {
    process.env = savedEnv; globalThis.fetch = savedFetch;
    server.closeAllConnections(); await new Promise(resolve => server.close(resolve));
  }
  const report = { baseline: BASELINE, verifiedAt: new Date().toISOString(), baselineFilesVerified: tree.length,
    unchangedBaselineFileCount: tree.length - 2, exactRuntimeChanges: changes, httpProbesPassed: probes,
    bodyReads, outboundFetchAttempts: outboundAttempts, credentialsUsed: false, deployed: false,
    manifestSha256: digest(await readFile(path.join(directory, 'manifest.json'))) };
  await writeFile(path.join(directory, 'verification.json'), `${JSON.stringify(report, null, 2)}\n`);
  return report;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    assert.equal(process.argv.length, 3, 'Expected one local artifact directory');
    console.log(JSON.stringify(await verifyAccountAdmissionBridge(path.resolve(process.argv[2])), null, 2));
  } catch (error) {
    console.error('Local bridge verification failed:', error instanceof Error ? error.message : 'Unknown error');
    process.exitCode = 1;
  }
}
