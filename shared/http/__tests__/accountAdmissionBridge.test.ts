import { afterEach, describe, expect, it, vi } from 'vitest';
import bridge from '../accountAdmissionBridge';

const response = () => ({
  statusCode: 200, body: undefined as unknown, headers: {} as Record<string, unknown>,
  setHeader(key: string, value: unknown) { this.headers[key] = value; },
  status(code: number) { this.statusCode = code; return this; },
  json(body: unknown) { this.body = body; return this; },
  end() { return this; },
});

afterEach(() => { vi.unstubAllEnvs(); vi.restoreAllMocks(); });
describe('isolated pre-migration bridge', () => {
  it.each([undefined, 'false', 'true', 'invalid'])('cannot reopen legacy mutation handlers with pause flag %s', async flag => {
    vi.stubEnv('ACCOUNT_ADMISSION_PAUSED', flag);
    const fetch = vi.spyOn(globalThis, 'fetch');
    const req = { method: 'POST', headers: {},
      get body() { throw new Error('Body must not be read'); },
      on() { throw new Error('Stream must not be consumed'); } };
    const res = response(); await bridge(req as never, res as never);
    expect(res.statusCode).toBe(503); expect(res.body).toMatchObject({ code: 'ACCOUNT_ADMISSION_PAUSED' });
    expect(res.headers).toMatchObject({ 'Cache-Control': 'no-store', 'Retry-After': '300', 'X-Jozor-Admission-Gate': 'bridge-v1' });
    expect(fetch).not.toHaveBeenCalled();
  });
  it('stays closed with no app origin, credentials or database configuration', async () => {
    for (const name of ['APP_ORIGIN', 'VITE_APP_ORIGIN', 'SUPABASE_URL', 'VITE_SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY', 'PADDLE_API_KEY']) vi.stubEnv(name, undefined);
    vi.stubEnv('VERCEL_ENV', 'production');
    const res = response(); await bridge({ method: 'POST', headers: {} } as never, res as never);
    expect(res.statusCode).toBe(503); expect(res.headers).not.toHaveProperty('Access-Control-Allow-Origin');
  });
  it.each(['http://localhost:3000', 'https://untrusted.test'])('uses only the configured CORS origin for %s', async origin => {
    vi.stubEnv('APP_ORIGIN', 'http://localhost:3000');
    const res = response(); await bridge({ method: 'OPTIONS', headers: { origin } } as never, res as never);
    expect(res.statusCode).toBe(204); expect(res.headers['Access-Control-Allow-Origin']).toBe('http://localhost:3000');
  });
  it.each(['GET', 'PUT', 'DELETE'])('rejects %s without invoking the old handler', async method => {
    const res = response(); await bridge({ method, headers: {} } as never, res as never);
    expect(res.statusCode).toBe(405); expect(res.body).toEqual({ error: 'Method Not Allowed' });
  });
});
