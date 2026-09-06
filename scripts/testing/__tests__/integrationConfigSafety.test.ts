import { execFileSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { describe, expect, it } from 'vitest';

function readConfig(file: string, mode: 'staging' | 'local' | 'prelaunch') {
  const directory = mkdtempSync(path.join(os.tmpdir(), 'jozor-suite-target-'));
  const envFile = path.join(directory, '.env.integration');
  try {
    writeFileSync(envFile, Object.entries({
      ALLOW_INTEGRATION_MUTATIONS: 'true', SUPABASE_INTEGRATION_TARGET: mode,
      SUPABASE_INTEGRATION_PROJECT_REF: 'abcdefghijklmnopqrst',
      SUPABASE_PRODUCTION_PROJECT_REF: 'b'.repeat(20),
      SUPABASE_PRELAUNCH_APPROVED_PROJECT_REF: 'abcdefghijklmnopqrst',
      SUPABASE_PRELAUNCH_ACKNOWLEDGEMENT: 'owner-approved-test-data',
      VITE_SUPABASE_URL: mode === 'local' ? 'http://127.0.0.1:55321' : 'https://abcdefghijklmnopqrst.supabase.co',
      VITE_SUPABASE_ANON_KEY: 'test-anon', SUPABASE_SERVICE_ROLE_KEY: 'test-service',
    }).map(([key, value]) => `${key}=${value}`).join('\n'));
    if (mode === 'prelaunch') {
      writeFileSync(path.join(directory, '.env'), 'VITE_SUPABASE_URL=https://abcdefghijklmnopqrst.supabase.co');
      mkdirSync(path.join(directory, 'supabase/.temp'), { recursive: true });
      writeFileSync(path.join(directory, 'supabase/.temp/project-ref'), 'abcdefghijklmnopqrst');
    }
    // Configs execute in Node, not the component suite's JSDOM realm. Exercise
    // the real loader without creating clients or contacting a project.
    const script = `globalThis.fetch = () => { throw new Error('Unexpected network'); };
      const { default: config } = await import(${JSON.stringify(pathToFileURL(path.resolve(file)).href)});
      console.log(JSON.stringify({ include: config.test.include, exclude: config.test.exclude, envDir: config.envDir }));`;
    return JSON.parse(execFileSync(process.execPath, ['--experimental-strip-types', '--input-type=module', '-e', script], {
      cwd: directory, stdio: ['ignore', 'pipe', 'pipe'],
      env: { ...process.env, SUPABASE_INTEGRATION_ENV_FILE: envFile }, encoding: 'utf8', timeout: 15000,
    })) as { include: string[]; exclude?: string[]; envDir: boolean };
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
}

describe('integration suite target isolation', () => {
  it('excludes local fault injection from general integration runs', () => {
    expect(readConfig('vitest.integration.config.ts', 'staging').exclude)
      .toContain('tests/integration/personMediaLifecycle.integration.test.ts');
  });

  it('rejects prelaunch from the general integration configuration', () => {
    expect(() => readConfig('vitest.integration.config.ts', 'prelaunch')).toThrow('restricted to the reviewed');
  });

  it.each(['staging', 'local', 'prelaunch'] as const)('selects only suitable media suites for %s', mode => {
    const config = readConfig('vitest.media-integration.config.ts', mode);
    expect(config.include).toEqual([
      'tests/integration/privatePersonMedia.integration.test.ts',
      ...(mode === 'local' ? ['tests/integration/personMediaLifecycle.integration.test.ts'] : []),
    ]);
    expect(config.envDir).toBe(false);
  });
});
