import { describe, expect, it, vi } from 'vitest';
import { inspectPersonMediaReadiness, REQUIRED_MEDIA_API_PATHS } from '../personMediaReadiness.mjs';

const config = { mode: 'staging', supabaseUrl: 'https://abcdefghijklmnopqrst.supabase.co',
  serviceRoleKey: 'private-key-sentinel' };
const catalog = () => ({ paths: Object.fromEntries(REQUIRED_MEDIA_API_PATHS.map(path =>
  [path, { [path.startsWith('/rpc/') ? 'post' : 'get']: {} }])) });
const bucket = { id: 'person-media', public: false, file_size_limit: 5242880,
  allowed_mime_types: ['image/jpeg', 'image/png', 'image/webp'] };
const json = (body: unknown) => new Response(JSON.stringify(body), { status: 200 });

describe('read-only person media staging metadata', () => {
  it('uses exactly two bounded GETs, forbids redirects, and never claims runtime approval', async () => {
    const request = vi.fn<typeof fetch>().mockResolvedValueOnce(json(catalog())).mockResolvedValueOnce(json(bucket));
    const report = await inspectPersonMediaReadiness(config, request);
    expect(report).toMatchObject({ status: 'prerequisites-present', runtimeVerified: false, mutationsPerformed: false });
    expect(report.pendingGates).toContain('role-and-realtime-behavior');
    expect(request.mock.calls.map(([url]) => url)).toEqual([
      `${config.supabaseUrl}/rest/v1/`, `${config.supabaseUrl}/storage/v1/bucket/person-media`,
    ]);
    for (const [, options] of request.mock.calls) {
      expect(options).toMatchObject({ method: 'GET', redirect: 'error', cache: 'no-store' });
      expect(options?.signal).toBeInstanceOf(AbortSignal);
      expect(options?.body).toBeUndefined();
    }
    expect(JSON.stringify(report)).not.toContain(config.serviceRoleKey);
    expect(JSON.stringify(report)).not.toContain(config.supabaseUrl);
  });

  it.each(REQUIRED_MEDIA_API_PATHS)('blocks missing endpoint %s', async path => {
    const missing = catalog();
    delete missing.paths[path];
    const request = vi.fn<typeof fetch>().mockResolvedValueOnce(json(missing)).mockResolvedValueOnce(json(bucket));
    const report = await inspectPersonMediaReadiness(config, request);
    expect(report.status).toBe('blocked');
    expect(report.checks.find(check => check.id === path)?.present).toBe(false);
  });

  it.each([
    { ...bucket, public: true }, { ...bucket, file_size_limit: null },
    { ...bucket, allowed_mime_types: [...bucket.allowed_mime_types, 'image/svg+xml'] },
    { ...bucket, id: 'avatars' }, null,
  ])('rejects unsafe or missing bucket metadata %j', async metadata => {
    const request = vi.fn<typeof fetch>().mockResolvedValueOnce(json(catalog())).mockResolvedValueOnce(json(metadata));
    expect((await inspectPersonMediaReadiness(config, request)).status).toBe('blocked');
  });

  it.each([null, [], { paths: [] }, { paths: null }])('rejects malformed API catalogs %j', async metadata => {
    const request = vi.fn<typeof fetch>().mockResolvedValueOnce(json(metadata)).mockResolvedValueOnce(json(bucket));
    const report = await inspectPersonMediaReadiness(config, request);
    expect(report.status).toBe('blocked');
    expect(report.checks.find(check => check.id === 'api-catalog')?.present).toBe(false);
  });

  it('redacts HTTP bodies, network errors and non-JSON failures', async () => {
    for (const failure of [
      () => Promise.resolve(new Response(config.serviceRoleKey, { status: 403 })),
      () => Promise.resolve(new Response(config.serviceRoleKey, { status: 200 })),
      () => Promise.reject(new Error(`${config.supabaseUrl} ${config.serviceRoleKey}`)),
    ]) {
      const report = await inspectPersonMediaReadiness(config, vi.fn<typeof fetch>(failure));
      expect(report.status).toBe('blocked');
      expect(JSON.stringify(report)).not.toContain(config.serviceRoleKey);
      expect(JSON.stringify(report)).not.toContain(config.supabaseUrl);
    }
  });
});
