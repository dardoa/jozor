import crypto from 'node:crypto';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import handler from '../../../api/auth/exchange';
import localHandler from '../auth/exchange';

const { rpc, from } = vi.hoisted(() => ({ rpc: vi.fn(), from: vi.fn() }));
vi.mock('@supabase/supabase-js', () => ({ createClient: () => ({ rpc, from }) }));
const generation = '11111111-1111-4111-8111-111111111111';
const secret = 'session-issuance-secret-at-least-32-chars';
const response = () => ({
  statusCode: 200, body: {} as Record<string, unknown>, setHeader: vi.fn(),
  status(code: number) { this.statusCode = code; return this; },
  json(body: Record<string, unknown>) { this.body = body; return this; },
});

describe('verified Google account generation issuance', () => {
  beforeEach(() => {
    rpc.mockReset(); from.mockReset();
    for (const [key, value] of Object.entries({
      APP_ORIGIN: 'http://localhost:3000', SUPABASE_URL: 'https://project.supabase.co',
      SUPABASE_SERVICE_ROLE_KEY: 'service-key', SUPABASE_JWT_SECRET: secret,
      ENCRYPTION_SECRET: 'encryption-key', GOOGLE_CLIENT_ID: 'client-id', GOOGLE_CLIENT_SECRET: 'client-secret',
    })) vi.stubEnv(key, value);
    vi.stubGlobal('fetch', vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ access_token: 'google-access-token' })))
      .mockResolvedValueOnce(new Response(JSON.stringify({ sub: 'google-user', email: 'verified@example.test', name: 'Verified', email_verified: true }))));
  });
  afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals(); vi.restoreAllMocks(); });

  it('uses one canonical issuer locally and in production', () => expect(localHandler).toBe(handler));

  it('signs the database generation and obtains it only after profile initialization', async () => {
    rpc.mockResolvedValueOnce({ error: null }).mockResolvedValueOnce({ data: generation, error: null });
    const res = response();
    await handler({ method: 'POST', headers: {}, body: { code: 'verified-google-code', uid: 'spoofed-user', account_session: 'spoofed-generation' } } as never, res as never);
    expect(res.statusCode).toBe(200);
    expect(rpc.mock.calls).toEqual([
      ['ensure_user_profile', { p_user_id: 'google-user', p_display_name: 'Verified', p_photo_url: '' }],
      ['issue_account_session', { p_user_id: 'google-user' }],
    ]);
    const token = String(res.body.supabase_token);
    const [header, body, signature] = token.split('.');
    expect(signature).toBe(crypto.createHmac('sha256', secret).update(`${header}.${body}`).digest('base64url'));
    const claims = JSON.parse(Buffer.from(body, 'base64url').toString());
    expect(claims).toMatchObject({ sub: 'google-user', email: 'verified@example.test', account_session: generation, role: 'authenticated' });
    expect(claims.exp - claims.iat).toBe(86400);
    expect(JSON.stringify(res.body)).not.toContain('spoofed');
  });

  it.each([
    { data: null, error: { message: 'private session database detail' } },
    { data: null, error: null },
    { data: 'invalid-generation', error: null },
  ])('does not issue a bearer if the durable session cannot be established: %j', async result => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    rpc.mockResolvedValueOnce({ error: null }).mockResolvedValueOnce(result);
    const res = response();
    await handler({ method: 'POST', headers: {}, body: { code: 'code' } } as never, res as never);
    expect(res.statusCode).toBe(500);
    expect(res.body).not.toHaveProperty('supabase_token');
    expect(res.body).not.toHaveProperty('access_token');
    expect(JSON.stringify(res.body)).not.toContain('private session');
    expect(from).not.toHaveBeenCalled();
  });

  it('does not try to revive a generation when profile onboarding fails', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    rpc.mockResolvedValueOnce({ error: { message: 'profile unavailable' } });
    const res = response();
    await handler({ method: 'POST', headers: {}, body: { code: 'code' } } as never, res as never);
    expect(res.statusCode).toBe(500);
    expect(rpc).toHaveBeenCalledTimes(1);
    expect(res.body).not.toHaveProperty('supabase_token');
  });

  it.each([
    { status: 401, identity: { sub: 'google-user', email: 'x@example.test', email_verified: true } },
    { status: 200, identity: { sub: '', email: 'x@example.test', email_verified: true } },
    { status: 200, identity: { sub: 'google-user', email: 'x@example.test', email_verified: false } },
    { status: 200, identity: { sub: 'google-user', email: '', email_verified: true } },
  ])('does not initialize a session from unverified provider identity %j', async ({ status, identity }) => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    vi.stubGlobal('fetch', vi.fn()
      .mockResolvedValueOnce(new Response('{"access_token":"google-token"}'))
      .mockResolvedValueOnce(new Response(JSON.stringify(identity), { status })));
    const res = response();
    await handler({ method: 'POST', headers: {}, body: { code: 'code' } } as never, res as never);
    expect(res.statusCode).toBe(500);
    expect(rpc).not.toHaveBeenCalled();
    expect(res.body).not.toHaveProperty('supabase_token');
  });
});
