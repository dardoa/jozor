import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { createHash } from 'node:crypto';
import { mkdir, mkdtemp, readFile, realpath, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import JSZip from 'jszip';

export const BASELINE = '0137d520b0cad43cee8a55827e9d21ffcebf78bd';
const execute = promisify(execFile);
const workspace = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const digest = data => createHash('sha256').update(data).digest('hex');
const runtimeChanges = ['api/auth/delete-account.ts', 'shared/server/api/billing/create-checkout-session.ts', 'shared/http/accountAdmissionBridge.ts'];

export function assertSafeBridgeEntry(name, seen) {
  if (!name || /[\\:\u0000-\u001f]/.test(name) || path.posix.isAbsolute(name)
    || name.split('/').some(segment => !segment || segment === '.' || segment === '..'
      || /[. ]$/.test(segment) || /^(?:con|prn|aux|nul|com[1-9]|lpt[1-9])(?:\.|$)/i.test(segment))
    || name.toLowerCase().startsWith('.git/') || name.toLowerCase() === '.git'
    || seen.has(name.toLowerCase())) throw new Error('Unsafe archive entry');
  seen.add(name.toLowerCase());
}

/** Builds a new ignored artifact from a fixed git tree, never from the dirty checkout. */
export async function prepareAccountAdmissionBridge() {
  const git = args => execute('git', args, { cwd: workspace, windowsHide: true, timeout: 60000, maxBuffer: 1024 * 1024 });
  if ((await git(['rev-parse', 'HEAD'])).stdout.trim() !== BASELINE) throw new Error('Bridge baseline changed; review a new baseline');
  const linked = JSON.parse(await readFile(path.join(workspace, '.vercel/project.json'), 'utf8'));
  if (!/^prj_[a-zA-Z0-9]+$/.test(linked.projectId ?? '') || !/^team_[a-zA-Z0-9]+$/.test(linked.orgId ?? '')) throw new Error('Vercel target unavailable');
  const root = path.join(workspace, 'output/account-admission-bridges');
  await mkdir(root, { recursive: true });
  const actualRoot = await realpath(root);
  const relativeRoot = path.relative(await realpath(workspace), actualRoot);
  if (!relativeRoot || relativeRoot.startsWith('..') || path.isAbsolute(relativeRoot)) throw new Error('Artifact root escaped workspace');
  const directory = await mkdtemp(path.join(actualRoot, 'bridge-'));
  const release = path.join(directory, 'release');
  await mkdir(release);
  const archivePath = path.join(directory, 'baseline.zip');
  await git(['-c', 'core.autocrlf=false', 'archive', '--format=zip', `--output=${archivePath}`, BASELINE]);
  const archive = await JSZip.loadAsync(await readFile(archivePath), { checkCRC32: true });
  const seen = new Set();
  const baselineFiles = {};
  for (const entry of Object.values(archive.files)) {
    if (entry.dir) continue;
    // JSZip may normalize traversal: check the original path as well as its result.
    if (entry.unsafeOriginalName && entry.unsafeOriginalName !== entry.name) throw new Error('Normalized archive path rejected');
    assertSafeBridgeEntry(entry.name, seen);
    if ((Number(entry.unixPermissions) & 0xf000) === 0xa000) throw new Error('Symlink archive entry rejected');
    if (/(?:^|\/)\.env(?:\.|$)/i.test(entry.name) && !['.env.example', '.env.integration.example'].includes(entry.name)) throw new Error('Secret environment file tracked');
    const data = await entry.async('nodebuffer');
    const destination = path.join(release, ...entry.name.split('/'));
    await mkdir(path.dirname(destination), { recursive: true });
    await writeFile(destination, data, { flag: 'wx' });
    baselineFiles[entry.name] = digest(data);
  }
  if (!baselineFiles[runtimeChanges[0]] || !baselineFiles[runtimeChanges[1]] || baselineFiles[runtimeChanges[2]]) throw new Error('Unexpected baseline routes');
  const overlays = {
    [runtimeChanges[0]]: "export { default } from '../../shared/http/accountAdmissionBridge.js';\nexport const config = { api: { bodyParser: false } };\n",
    [runtimeChanges[1]]: "export { default } from '../../../http/accountAdmissionBridge.js';\nexport const config = { api: { bodyParser: false } };\n",
    [runtimeChanges[2]]: await readFile(path.join(workspace, runtimeChanges[2]), 'utf8'),
    '.vercel/project.json': `${JSON.stringify({ projectId: linked.projectId, orgId: linked.orgId }, null, 2)}\n`,
  };
  const files = { ...baselineFiles };
  for (const [name, source] of Object.entries(overlays)) {
    await mkdir(path.dirname(path.join(release, name)), { recursive: true });
    await writeFile(path.join(release, name), source);
    files[name] = digest(source);
  }
  const manifest = { version: 1, baseline: BASELINE, preparedAt: new Date().toISOString(),
    target: { projectId: linked.projectId, orgId: linked.orgId }, deployed: false,
    runtimeChanges, unchangedBaselineFileCount: Object.keys(baselineFiles).length - 2,
    files, baselineFiles };
  await writeFile(path.join(directory, 'manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`, { flag: 'wx' });
  return { artifactDirectory: directory, releaseDirectory: release, baseline: BASELINE,
    runtimeChanges, unchangedBaselineFileCount: manifest.unchangedBaselineFileCount,
    baselineArchiveSha256: digest(await readFile(archivePath)), deployed: false };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    if (process.argv.length !== 2) throw new Error('No arguments accepted');
    console.log(JSON.stringify(await prepareAccountAdmissionBridge(), null, 2));
  } catch {
    console.error('Bridge preparation failed. No deployment or hosted changes requested; retain any partial local artifact for inspection.');
    process.exitCode = 1;
  }
}
