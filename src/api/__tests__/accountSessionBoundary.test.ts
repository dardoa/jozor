import crypto from 'node:crypto';
import { Readable } from 'node:stream';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import deletion from '../../../api/auth/delete-account';
import checkout from '../../../shared/server/api/billing/create-checkout-session';
import portal from '../../../shared/server/api/billing/customer-portal';
import subscriptions from '../../../api/admin/subscriptions';
import diagnostics from '../../../api/admin/billing-diagnostics';
import maintenance from '../../../api/maintenance';
import push from '../../../api/push-notifier';
import pdf from '../../../api/publishing/render-manuscript-pdf';
import { authenticateUser } from '../../utils/authUtils';

const { createClientMock, getUserMock } = vi.hoisted(() => ({ createClientMock: vi.fn(), getUserMock: vi.fn() }));
vi.mock('@supabase/supabase-js', () => ({ createClient: createClientMock }));
vi.mock('../../services/supabaseConfig.js', () => ({ resolvedSupabaseUrl: 'https://project.supabase.co', resolvedSupabaseKey: 'anon-key' }));

const secret = 'test-session-secret-at-least-32-characters';
const jwt = () => {
  const header = Buffer.from('{"alg":"HS256","typ":"JWT"}').toString('base64url');
  const body = Buffer.from(JSON.stringify({ sub: 'deleted-user', email: 'user@example.test', role: 'authenticated', exp: Math.floor(Date.now() / 1000) + 3600 })).toString('base64url');
  return `${header}.${body}.${crypto.createHmac('sha256', secret).update(`${header}.${body}`).digest('base64url')}`;
};

describe('revoked sessions cannot enter privileged server handlers', () => {
  beforeEach(() => {
    createClientMock.mockReset().mockReturnValue({ auth: { getUser: getUserMock } });
    getUserMock.mockReset();
    vi.stubEnv('APP_ORIGIN', 'http://localhost:3000');
    vi.stubEnv('SUPABASE_URL', 'https://project.supabase.co');
    vi.stubEnv('SUPABASE_ANON_KEY', 'anon-key');
    vi.stubEnv('SUPABASE_JWT_SECRET', secret);
    vi.stubEnv('CRON_SECRET', 'different-server-only-secret');
  });
  afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals(); });

  for (const [name, handler] of Object.entries({ deletion, checkout, portal, subscriptions, diagnostics, maintenance, push, pdf })) {
    it.each([200, 401, 503])(`${name} refuses a revoked/unverifiable unexpired signed JWT (HTTP %s) before any service client`, async status => {
      const fetchMock = vi.fn().mockResolvedValue(new Response('false', { status }));
      vi.stubGlobal('fetch', fetchMock);
      const token = jwt();
      const req = Object.assign(Readable.from([JSON.stringify({ tier: 'pro', action: 'overview' })]), {
        method: name === 'diagnostics' ? 'GET' : 'POST',
        headers: { authorization: `Bearer ${token}`, origin: 'http://localhost:3000' },
        body: {}, query: {},
      });
      const res = {
        statusCode: 200, body: undefined as unknown,
        setHeader: vi.fn(),
        status(code: number) { this.statusCode = code; return this; },
        writeHead(code: number) { this.statusCode = code; return this; },
        json(body: unknown) { this.body = body; return this; },
        end(body?: string) { this.body = body; return this; },
      };
      await handler(req as never, res as never);
      expect(res.statusCode).toBe(401);
      expect(createClientMock).not.toHaveBeenCalled();
      expect(fetchMock).toHaveBeenCalledTimes(1);
      expect(fetchMock.mock.calls[0][0]).toBe('https://project.supabase.co/rest/v1/rpc/is_my_account_session_active');
    });
  }

  it('also guards shared proxy/media/AI authentication without falling back to getUser on revocation', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('false')));
    expect(await authenticateUser(`Bearer ${jwt()}`)).toBeNull();
    expect(createClientMock).not.toHaveBeenCalled();
  });

  it('preserves a valid signed session after the durable check succeeds', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('true')));
    const token = jwt();
    expect(await authenticateUser(`Bearer ${token}`)).toEqual({
      uid: 'deleted-user', email: 'user@example.test', token, type: 'internal',
    });
    expect(createClientMock).not.toHaveBeenCalled();
    expect(getUserMock).not.toHaveBeenCalled();
  });

  it('does not accept the lookup boolean as a substitute for identity verification', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('true')));
    getUserMock.mockResolvedValue({ data: { user: null }, error: { message: 'Invalid signature' } });
    expect(await authenticateUser('Bearer invalid-signature')).toBeNull();
    expect(getUserMock).toHaveBeenCalledWith('invalid-signature');
  });

  it('preserves the native Supabase identity path after both checks succeed', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('true')));
    getUserMock.mockResolvedValue({ data: { user: { id: 'native-user', email: 'native@example.test' } }, error: null });
    expect(await authenticateUser('Bearer native-token')).toEqual({
      uid: 'native-user', email: 'native@example.test', token: 'native-token', type: 'internal',
    });
    expect(getUserMock).toHaveBeenCalledWith('native-token');
  });
});
