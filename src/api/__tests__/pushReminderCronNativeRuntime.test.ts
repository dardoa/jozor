import { execFileSync } from 'node:child_process';
import { copyFileSync, mkdirSync, mkdtempSync, rmSync } from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { expect, it } from 'vitest';

it('loads the Vercel-emitted push reminder cron in native Node ESM', () => {
  const runtimeRoot = path.resolve(process.cwd(), 'output');
  mkdirSync(runtimeRoot, { recursive: true });
  const directory = mkdtempSync(path.join(runtimeRoot, 'push-cron-runtime-'));
  const output = path.join(directory, 'api', 'push-reminder-cron.js');

  try {
    copyFileSync(path.resolve(process.cwd(), 'package.json'), path.join(directory, 'package.json'));
    execFileSync(process.execPath, [
      path.resolve(process.cwd(), 'scripts/buildPushReminderCron.mjs'),
      `--outfile=${path.join(directory, 'generated', 'server', 'push-reminder-cron.mjs')}`,
    ], { timeout: 20_000 });

    execFileSync(process.execPath, [
      path.resolve(process.cwd(), 'node_modules/typescript/bin/tsc'),
      path.resolve(process.cwd(), 'api/push-reminder-cron.ts'),
      '--target', 'ES2022',
      '--module', 'ESNext',
      '--moduleResolution', 'Bundler',
      '--rootDir', process.cwd(),
      '--outDir', directory,
      '--skipLibCheck',
      '--noCheck',
      '--pretty', 'false',
    ], { timeout: 20_000 });

    const entry = pathToFileURL(output).href;
    const script = `
      globalThis.fetch = () => { throw new Error('Cron import must not access the network'); };
      const { default: handler } = await import(${JSON.stringify(entry)});
      process.stdout.write(typeof handler);
    `;
    const result = execFileSync(process.execPath, ['--input-type=module', '-e', script], {
      encoding: 'utf8',
      timeout: 10_000,
      env: {
        ...process.env,
        NODE_ENV: 'production',
        VERCEL_ENV: 'production',
        SUPABASE_URL: 'https://project.supabase.co',
        SUPABASE_ANON_KEY: 'anon-key',
        VITE_SUPABASE_ANON_KEY: 'anon-key',
        SUPABASE_SERVICE_ROLE_KEY: 'service-role-key',
        CRON_SECRET: 'cron-secret',
      },
    });

    expect(result).toBe('function');
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
}, 30_000);
