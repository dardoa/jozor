import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import crypto from 'node:crypto';

const { createClientMock } = vi.hoisted(() => ({
  createClientMock: vi.fn(),
}));

vi.mock('@supabase/supabase-js', () => ({
  createClient: (...args: unknown[]) => createClientMock(...args),
}));

import { Readable } from 'stream';
import type { VercelRequest } from '@vercel/node';
import handler from '../../../shared/server/api/billing/create-checkout-session';
import { isAccountSessionActive } from '../../../shared/auth/accountSession';

const createRequest = (body: unknown, headers: Record<string, string>) => {
  const rawBody = Buffer.from(JSON.stringify(body));
  const req = Readable.from(rawBody) as unknown as VercelRequest;
  req.method = 'POST';
  req.headers = headers;
  return req;
};

const createResponse = () => {
  const response = {
    statusCode: 200,
    body: undefined as unknown,
    headers: {} as Record<string, unknown>,
    writeHead(code: number, headers?: Record<string, unknown>) {
      this.statusCode = code;
      if (headers) this.headers = { ...this.headers, ...headers };
      return this;
    },
    end(payload?: string) {
      this.body = payload ? JSON.parse(payload) : undefined;
      return this;
    },
  };

  return response;
};

const createInternalJwt = () => {
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
  const payload = Buffer.from(JSON.stringify({
    sub: 'user-1',
    email: 'user@example.com',
    exp: Math.floor(Date.now() / 1000) + 3600,
  })).toString('base64url');
  const signature = crypto
    .createHmac('sha256', 'test-jwt-secret-with-at-least-32-chars')
    .update(`${header}.${payload}`)
    .digest('base64url');
  return `${header}.${payload}.${signature}`;
};

// Session refusal is exercised with the real gate in accountSessionBoundary.test.ts.
vi.mock('../../../shared/auth/accountSession.js', () => ({ isAccountSessionActive: vi.fn(async () => true) }));

describe('create checkout session API', () => {
  afterEach(() => { vi.restoreAllMocks(); vi.unstubAllEnvs(); });
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv('ACCOUNT_ADMISSION_PAUSED', undefined);
    process.env.SUPABASE_JWT_SECRET = 'test-jwt-secret-with-at-least-32-chars';
    process.env.SUPABASE_URL = 'https://example.supabase.co';
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'service-role-key';
    process.env.PADDLE_API_KEY = 'paddle-api-key';
    process.env.PADDLE_PRO_PRICE_ID = 'pri_pro';
    process.env.PADDLE_FAMILY_PRICE_ID = 'pri_family';
    process.env.PADDLE_ENVIRONMENT = 'sandbox';
    process.env.APP_ORIGIN = 'http://localhost:3000';
    createClientMock.mockReturnValue({
      rpc: vi.fn(async (name: string) => ({ data: name === 'begin_account_checkout' ? '11111111-1111-4111-8111-111111111111' : true, error: null })),
    });
  });

  it('does not expose Paddle API error details to the client', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: false,
      status: 403,
      text: vi.fn(async () => '{"error":{"code":"authentication_malformed","detail":"private paddle detail"}}'),
    } as never);

    const req = createRequest(
      { tier: 'pro' },
      {
        authorization: `Bearer ${createInternalJwt()}`,
        origin: 'http://localhost:3000',
      }
    );
    const res = createResponse();

    await handler(req as never, res as never);

    expect(fetchMock).toHaveBeenCalledOnce();
    expect(res.statusCode).toBe(500);
    expect(res.body).toEqual({ error: 'Failed to initiate checkout session' });
    expect(JSON.stringify(res.body)).not.toContain('authentication_malformed');

    fetchMock.mockRestore();
  });

  it('normalizes a polluted configured origin in CORS responses', async () => {
    process.env.APP_ORIGIN = '%C3%AF%C2%BB%C2%BFhttps://jozor.vercel.app';
    delete process.env.VITE_APP_ORIGIN;
    const req = {
      method: 'OPTIONS',
      headers: {
        origin: 'https://jozor.vercel.app',
      },
    };
    const res = createResponse();

    await handler(req as never, res as never);

    expect(res.statusCode).toBe(204);
    expect(res.headers['Access-Control-Allow-Origin']).toBe('https://jozor.vercel.app');
  });

  it('rejects invalid request origins before creating checkout transactions', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch');
    const req = createRequest(
      { tier: 'pro' },
      {
        authorization: `Bearer ${createInternalJwt()}`,
        origin: 'https://evil.example',
      }
    );
    const res = createResponse();

    await handler(req as never, res as never);

    expect(res.statusCode).toBe(400);
    expect(res.body).toEqual({ error: 'Invalid request origin.' });
    expect(fetchMock).not.toHaveBeenCalled();

    fetchMock.mockRestore();
  });

  it.each(['true', '', 'invalid'])('rejects paused admission before body reads, session checks or any external effect: %s', async value => {
    vi.stubEnv('ACCOUNT_ADMISSION_PAUSED', value);
    const fetchMock = vi.spyOn(globalThis, 'fetch');
    const req = createRequest({ tier: 'pro' }, { authorization: `Bearer ${createInternalJwt()}`, origin: 'http://localhost:3000' });
    const on = vi.spyOn(req, 'on');
    const res = createResponse();
    await handler(req, res as never);
    expect(res.statusCode).toBe(503);
    expect(res.body).toMatchObject({ code: 'ACCOUNT_ADMISSION_PAUSED' });
    expect(res.headers).toMatchObject({ 'Cache-Control': 'no-store', 'Retry-After': '300' });
    expect(on).not.toHaveBeenCalled(); expect(isAccountSessionActive).not.toHaveBeenCalled();
    expect(createClientMock).not.toHaveBeenCalled(); expect(fetchMock).not.toHaveBeenCalled();
    req.destroy();
  });

  it('keeps OPTIONS and method validation available while paused', async () => {
    vi.stubEnv('ACCOUNT_ADMISSION_PAUSED', 'true');
    for (const [method, status] of [['OPTIONS', 204], ['GET', 405]] as const) {
      const res = createResponse();
      await handler({ method, headers: { origin: 'http://localhost:3000' } } as never, res as never);
      expect(res.statusCode).toBe(status);
    }
    expect(createClientMock).not.toHaveBeenCalled();
  });
  it('persists the checkout reservation before provider creation and the transaction before returning it', async () => {
    const rpc = createClientMock().rpc;
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response('{"data":{"id":"txn_created"}}'));
    const res = createResponse();
    await handler(createRequest({ tier: 'pro' }, { authorization: `Bearer ${createInternalJwt()}`, origin: 'http://localhost:3000' }), res as never);
    expect(res.statusCode).toBe(200); expect(res.body).toEqual({ transactionId: 'txn_created' });
    const attempt = '11111111-1111-4111-8111-111111111111';
    expect(rpc).toHaveBeenCalledWith('begin_account_checkout', { p_user_id: 'user-1' });
    expect(rpc).toHaveBeenCalledWith('record_account_checkout', { p_attempt_id: attempt, p_transaction_id: 'txn_created' });
    expect(rpc.mock.invocationCallOrder[1]).toBeLessThan(fetchMock.mock.invocationCallOrder[0]);
    expect(JSON.parse(fetchMock.mock.calls[0][1]!.body as string).custom_data).toEqual({ userId: 'user-1', checkoutAttemptId: attempt });
  });
  it.each(['reservation-denied', 'reply-lost', 'record-failed'])('does not expose a checkout when %s', async failure => {
    const rpc = vi.fn(async (name: string, _args?: Record<string, unknown>) => ({
      data: name === 'begin_account_checkout' ? (failure === 'reservation-denied' ? null : '11111111-1111-4111-8111-111111111111')
        : name === 'record_account_checkout' ? false : true,
      error: null,
    }));
    createClientMock.mockReturnValue({ rpc });
    const fetchMock = vi.spyOn(globalThis, 'fetch');
    if (failure === 'reply-lost') fetchMock.mockRejectedValue(new Error('network timeout'));
    else fetchMock.mockResolvedValue(new Response('{"data":{"id":"txn_created"}}'));
    const res = createResponse();
    await handler(createRequest({ tier: 'pro' }, { authorization: `Bearer ${createInternalJwt()}`, origin: 'http://localhost:3000' }), res as never);
    expect(res.statusCode).toBe(failure === 'reservation-denied' ? 409 : 500);
    expect(res.body).not.toHaveProperty('transactionId');
    if (failure === 'reservation-denied') expect(fetchMock).not.toHaveBeenCalled();
    // A transport failure never marks an unknown provider outcome canceled.
    expect(rpc.mock.calls.some(call => 'p_canceled' in (call[1] ?? {}))).toBe(false);
  });
});
