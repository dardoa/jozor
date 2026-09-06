import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  LOCAL_INTEGRATION_URL,
  loadSupabaseIntegrationEnvironment,
  resolvePersonMediaIntegrationHttpOrigin,
  validateSupabaseIntegrationEnvironment,
} from '../supabaseIntegrationEnvironment.mjs';

const ref = 'abcdefghijklmnopqrst';
const production = 'zyxwvutsrqponmlkjihg';
const config = {
  ALLOW_INTEGRATION_MUTATIONS: 'true',
  SUPABASE_INTEGRATION_PROJECT_REF: ref,
  SUPABASE_PRODUCTION_PROJECT_REF: production,
  VITE_SUPABASE_URL: `https://${ref}.supabase.co`,
  VITE_SUPABASE_ANON_KEY: 'test-anonymous-credential',
  SUPABASE_SERVICE_ROLE_KEY: 'private-sentinel-not-for-errors',
};

describe('Supabase integration target safety', () => {
  it('defaults to in-process media tests and accepts only the approved deployed HTTP origin', () => {
    expect(resolvePersonMediaIntegrationHttpOrigin({ mode: 'prelaunch', env: {} })).toBeNull();
    expect(resolvePersonMediaIntegrationHttpOrigin({ mode: 'prelaunch', env: {
      PERSON_MEDIA_INTEGRATION_HTTP_ORIGIN: 'https://jozor.vercel.app',
    } })).toBe('https://jozor.vercel.app');
    for (const origin of ['', 'http://jozor.vercel.app', 'https://jozor.vercel.app.evil.test',
      'https://jozor.vercel.app/', 'https://jozor.vercel.app/api', 'https://user:pass@jozor.vercel.app']) {
      expect(() => resolvePersonMediaIntegrationHttpOrigin({ mode: 'prelaunch', env: {
        PERSON_MEDIA_INTEGRATION_HTTP_ORIGIN: origin,
      } })).toThrow('approved prelaunch application origin');
    }
    for (const mode of ['local', 'staging']) {
      expect(() => resolvePersonMediaIntegrationHttpOrigin({ mode, env: {
        PERSON_MEDIA_INTEGRATION_HTTP_ORIGIN: 'https://jozor.vercel.app',
      } })).toThrow('approved prelaunch application origin');
    }
  });

  const prelaunch = {
    ...config, SUPABASE_INTEGRATION_TARGET: 'prelaunch',
    SUPABASE_PRELAUNCH_APPROVED_PROJECT_REF: ref,
    SUPABASE_PRELAUNCH_ACKNOWLEDGEMENT: 'owner-approved-test-data',
  };
  const mediaScope = { suite: 'private-person-media' as const, linkedProjectRef: ref };

  it('permits the reviewed person-route suite without relaxing target or mutation guards', () => {
    const scope = { suite: 'person-route-context' as const, linkedProjectRef: ref };
    expect(validateSupabaseIntegrationEnvironment(prelaunch, [config.VITE_SUPABASE_URL], scope).mode).toBe('prelaunch');
    expect(() => validateSupabaseIntegrationEnvironment({ ...prelaunch, ALLOW_INTEGRATION_MUTATIONS: 'false' },
      [config.VITE_SUPABASE_URL], scope)).toThrow('ALLOW_INTEGRATION_MUTATIONS=true');
    expect(() => validateSupabaseIntegrationEnvironment(prelaunch, [], scope)).toThrow('application project URL');
    expect(() => validateSupabaseIntegrationEnvironment(prelaunch, [config.VITE_SUPABASE_URL], {
      ...scope, linkedProjectRef: production,
    })).toThrow('exact linked project');
  });

  it('allows only explicitly approved prelaunch media tests on the exact app/linked target', () => {
    expect(validateSupabaseIntegrationEnvironment(prelaunch, [config.VITE_SUPABASE_URL], mediaScope))
      .toMatchObject({ mode: 'prelaunch', supabaseUrl: config.VITE_SUPABASE_URL });
    expect(() => validateSupabaseIntegrationEnvironment(prelaunch, [config.VITE_SUPABASE_URL]))
      .toThrow('restricted to the reviewed');
    expect(() => validateSupabaseIntegrationEnvironment(prelaunch, [], mediaScope)).toThrow('application project URL');
    expect(() => validateSupabaseIntegrationEnvironment(prelaunch, [config.VITE_SUPABASE_URL], {
      ...mediaScope, linkedProjectRef: production,
    })).toThrow('exact linked project');
  });

  it.each([
    { SUPABASE_PRELAUNCH_APPROVED_PROJECT_REF: '' },
    { SUPABASE_PRELAUNCH_APPROVED_PROJECT_REF: production },
    { SUPABASE_PRELAUNCH_ACKNOWLEDGEMENT: '' },
    { SUPABASE_PRELAUNCH_ACKNOWLEDGEMENT: 'true' },
    { VITE_SUPABASE_URL: `https://${ref}.supabase.co.evil.test` },
    { VITE_SUPABASE_URL: `https://${ref}.supabase.co:443` },
    { VITE_SUPABASE_URL: `http://${ref}.supabase.co` },
  ])('rejects incomplete or mismatched prelaunch approval: %j', change => {
    expect(() => validateSupabaseIntegrationEnvironment({ ...prelaunch, ...change }, [config.VITE_SUPABASE_URL], mediaScope))
      .toThrow(/^Integration safety guard:/);
  });

  it('keeps mutation opt-in and target checks separate for prelaunch metadata reads', () => {
    const env = { ...prelaunch, ALLOW_INTEGRATION_MUTATIONS: 'false' };
    expect(() => validateSupabaseIntegrationEnvironment(env, [config.VITE_SUPABASE_URL], mediaScope))
      .toThrow('ALLOW_INTEGRATION_MUTATIONS=true');
    expect(validateSupabaseIntegrationEnvironment(env, [config.VITE_SUPABASE_URL], { ...mediaScope, readOnly: true }).mode)
      .toBe('prelaunch');
    expect(() => validateSupabaseIntegrationEnvironment(env, [config.VITE_SUPABASE_URL], { readOnly: true }))
      .toThrow('restricted to the reviewed');
  });

  it('loads prelaunch approval without falling back to app credentials and detects relinking', () => {
    const root = mkdtempSync(path.join(os.tmpdir(), 'jozor-prelaunch-guard-'));
    try {
      const file = path.join(root, '.env.integration.prelaunch');
      const contents = Object.entries(prelaunch).map(([key, value]) => `${key}="${value}"`).join('\n');
      writeFileSync(file, contents);
      writeFileSync(path.join(root, '.env'), `VITE_SUPABASE_URL=${config.VITE_SUPABASE_URL}\nSUPABASE_SERVICE_ROLE_KEY=app-only-key`);
      const options = { rootDirectory: root, envFile: file, suite: 'private-person-media' as const };
      expect(() => loadSupabaseIntegrationEnvironment(options)).toThrow('CLI-linked project');
      mkdirSync(path.join(root, 'supabase/.temp'), { recursive: true });
      const link = path.join(root, 'supabase/.temp/project-ref');
      writeFileSync(link, ref);
      expect(loadSupabaseIntegrationEnvironment(options).mode).toBe('prelaunch');
      writeFileSync(link, production);
      expect(() => loadSupabaseIntegrationEnvironment(options)).toThrow('exact linked project');
      writeFileSync(link, ref);
      writeFileSync(file, contents.replace(config.SUPABASE_SERVICE_ROLE_KEY, ''));
      expect(() => loadSupabaseIntegrationEnvironment(options)).toThrow('credentials are required');
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it('accepts an explicitly enabled, separate staging target', () => {
    expect(validateSupabaseIntegrationEnvironment(config, [`https://${production}.supabase.co`]))
      .toMatchObject({ mode: 'staging', supabaseUrl: config.VITE_SUPABASE_URL });
  });

  it('permits metadata reads without authorizing integration mutations', () => {
    const readOnly = { ...config, ALLOW_INTEGRATION_MUTATIONS: 'false' };
    expect(validateSupabaseIntegrationEnvironment(readOnly, [], { readOnly: true }).mode).toBe('staging');
    expect(() => validateSupabaseIntegrationEnvironment(readOnly)).toThrow('ALLOW_INTEGRATION_MUTATIONS=true');
  });

  it('retains all target and credential boundaries for read-only probes', () => {
    for (const change of [
      { SUPABASE_PRODUCTION_PROJECT_REF: ref },
      { SUPABASE_PRODUCTION_PROJECT_REF: '' },
      { VITE_SUPABASE_URL: `${config.VITE_SUPABASE_URL}/rest/v1` },
      { VITE_SUPABASE_URL: `https://${ref}.supabase.co.evil.test` },
      { SUPABASE_SERVICE_ROLE_KEY: '' },
    ]) {
      expect(() => validateSupabaseIntegrationEnvironment({ ...config, ...change }, [], { readOnly: true }))
        .toThrow(/^Integration safety guard:/);
    }
    expect(() => validateSupabaseIntegrationEnvironment(config, [config.VITE_SUPABASE_URL], { readOnly: true }))
      .toThrow('also configured');
  });

  it.each([
    ['mutation opt-in', { ALLOW_INTEGRATION_MUTATIONS: 'false' }],
    ['missing production', { SUPABASE_PRODUCTION_PROJECT_REF: '' }],
    ['placeholder production', { SUPABASE_PRODUCTION_PROJECT_REF: '<production-project-ref>' }],
    ['same production', { SUPABASE_PRODUCTION_PROJECT_REF: ref }],
    ['host suffix', { VITE_SUPABASE_URL: `https://${ref}.supabase.co.evil.test` }],
    ['substring host', { VITE_SUPABASE_URL: `https://other-${ref}.supabase.co` }],
    ['credentials', { VITE_SUPABASE_URL: `https://user:password@${ref}.supabase.co` }],
    ['path', { VITE_SUPABASE_URL: `${config.VITE_SUPABASE_URL}/rest/v1` }],
    ['query', { VITE_SUPABASE_URL: `${config.VITE_SUPABASE_URL}?project=${ref}` }],
    ['fragment', { VITE_SUPABASE_URL: `${config.VITE_SUPABASE_URL}#${ref}` }],
    ['insecure cloud', { VITE_SUPABASE_URL: `http://${ref}.supabase.co` }],
    ['port', { VITE_SUPABASE_URL: `https://${ref}.supabase.co:443` }],
    ['invalid URL', { VITE_SUPABASE_URL: 'not-a-url' }],
    ['missing key', { SUPABASE_SERVICE_ROLE_KEY: '' }],
    ['unknown mode', { SUPABASE_INTEGRATION_TARGET: 'production' }],
    ['server mismatch', { SUPABASE_URL: `https://${production}.supabase.co` }],
  ])('rejects %s without exposing credentials', (_label, change) => {
    expect(() => validateSupabaseIntegrationEnvironment({ ...config, ...change }))
      .toThrow(/^Integration safety guard:/);
    try { validateSupabaseIntegrationEnvironment({ ...config, ...change }); } catch (error) {
      expect(String(error)).not.toContain(config.SUPABASE_SERVICE_ROLE_KEY);
    }
  });

  it('rejects a configured application target even with a different declared production ref', () => {
    expect(() => validateSupabaseIntegrationEnvironment(config, [config.VITE_SUPABASE_URL]))
      .toThrow('also configured for the application');
  });

  it('requires the dedicated local endpoint, not arbitrary localhost or remote URLs', () => {
    const local = { ...config, SUPABASE_INTEGRATION_TARGET: 'local', VITE_SUPABASE_URL: LOCAL_INTEGRATION_URL };
    expect(validateSupabaseIntegrationEnvironment(local)).toMatchObject({ mode: 'local' });
    for (const url of ['http://127.0.0.1:54321', 'http://127.1:55321', 'http://localhost:55321', config.VITE_SUPABASE_URL]) {
      expect(() => validateSupabaseIntegrationEnvironment({ ...local, VITE_SUPABASE_URL: url })).toThrow();
    }
  });

  it('parses quoted env values and denies configured deployment targets without fallback credentials', () => {
    const root = mkdtempSync(path.join(os.tmpdir(), 'jozor-integration-guard-'));
    try {
      const contents = Object.entries(config).map(([key, value]) => `${key}="${value}"`).join('\n');
      writeFileSync(path.join(root, '.env.integration'), contents);
      expect(loadSupabaseIntegrationEnvironment({ rootDirectory: root, envFile: '.env.integration' }).mode).toBe('staging');
      mkdirSync(path.join(root, '.vercel'));
      writeFileSync(path.join(root, '.vercel/.env.production.local'), `SUPABASE_URL="${config.VITE_SUPABASE_URL}"`);
      expect(() => loadSupabaseIntegrationEnvironment({ rootDirectory: root, envFile: '.env.integration' })).toThrow('also configured');
      expect(() => loadSupabaseIntegrationEnvironment({ rootDirectory: root, envFile: 'missing.env' })).toThrow('does not exist');
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });
});
