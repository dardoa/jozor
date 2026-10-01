import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { build } from 'esbuild';

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const outputArgument = process.argv.find(argument => argument.startsWith('--outfile='));
const outputPath = outputArgument
  ? path.resolve(repositoryRoot, outputArgument.slice('--outfile='.length))
  : path.join(repositoryRoot, 'generated', 'server', 'push-reminder-cron.mjs');

await mkdir(path.dirname(outputPath), { recursive: true });
await build({
  entryPoints: [path.join(repositoryRoot, 'src', 'api', 'push-reminder-cron.ts')],
  bundle: true,
  platform: 'node',
  format: 'esm',
  target: 'node22',
  packages: 'external',
  outfile: outputPath,
  legalComments: 'none',
  logLevel: 'info',
});
