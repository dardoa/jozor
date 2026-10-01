import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import crypto from 'node:crypto';
import { Readable } from 'node:stream';
import type { VercelRequest } from '@vercel/node';

const { createClientMock } = vi.hoisted(() => ({
  createClientMock: vi.fn(),
}));

vi.mock('@supabase/supabase-js', () => ({
  createClient: (...args: unknown[]) => createClientMock(...args),
}));

import handler from '../../../shared/server/api/billing/customer-portal';

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

const createSubscriptionQuery = (result: { data: unknown[]; error: unknown; count?: number }) => {
  const query = {
    select: vi.fn(() => query),
    eq: vi.fn(() => query),
    in: vi.fn(() => query),
    order: vi.fn(() => query),
    limit: vi.fn(() => query),
    then: (resolve: (value: unknown) => unknown) => Promise.resolve({ count: result.data.length, ...result }).then(resolve),
  };

  return query;
};

// Session refusal is exercised with the real gate in accountSessionBoundary.test.ts.
vi.mock('../../../shared/auth/accountSession.js', () => ({ isAccountSessionActive: vi.fn(async () => true) }));

describe('customer portal API', () => {
  afterEach(() => { vi.restoreAllMocks(); });
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.SUPABASE_JWT_SECRET = 'test-jwt-secret-with-at-least-32-chars';
    process.env.SUPABASE_URL = 'https://example.supabase.co';
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'service-role-key';
    process.env.PADDLE_API_KEY = 'paddle-api-key';
    process.env.PADDLE_ENVIRONMENT = 'sandbox';
    process.env.APP_ORIGIN = 'http://localhost:3000';
  });

  it.each(['active', 'paused'])('returns a Paddle cancel portal for an authenticated %s subscriber', async status => {
    const subscriptionQuery = createSubscriptionQuery({
      data: [{
        id: 'sub_123',
        user_id: 'user-1',
        status,
        paddle_customer_id: 'ctm_123',
      }],
      error: null,
    });
    createClientMock.mockReturnValue({ from: vi.fn(() => subscriptionQuery) });

    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      json: vi.fn(async () => ({
        data: {
          urls: {
            general: { overview: 'https://customer-portal.paddle.com/overview' },
            subscriptions: [
              {
                id: 'sub_123',
                cancel_subscription: 'https://customer-portal.paddle.com/cancel',
                update_subscription_payment_method: 'https://customer-portal.paddle.com/payment',
              },
            ],
          },
        },
      })),
    } as never);

    const req = createRequest(
      { action: 'cancel' },
      {
        authorization: `Bearer ${createInternalJwt()}`,
        origin: 'http://localhost:3000',
      }
    );
    const res = createResponse();

    await handler(req as never, res as never);

    expect(fetchMock).toHaveBeenCalledWith(
      'https://sandbox-api.paddle.com/customers/ctm_123/portal-sessions',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ subscription_ids: ['sub_123'] }),
      })
    );
    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual({ portalUrl: 'https://customer-portal.paddle.com/cancel' });
    expect(subscriptionQuery.eq).toHaveBeenCalledWith('user_id', 'user-1');
    expect(subscriptionQuery.in).toHaveBeenCalledWith('status', ['active', 'trialing', 'past_due', 'paused']);

    fetchMock.mockRestore();
  });

  it('does not expose Paddle API error details to the client', async () => {
    const errorLog = vi.spyOn(console, 'error').mockImplementation(() => {});
    const subscriptionQuery = createSubscriptionQuery({
      data: [{
        id: 'sub_123',
        user_id: 'user-1',
        status: 'active',
        paddle_customer_id: 'ctm_123',
      }],
      error: null,
    });
    createClientMock.mockReturnValue({ from: vi.fn(() => subscriptionQuery) });

    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: false,
      status: 403,
      text: vi.fn(async () => '{"error":{"detail":"private portal credential detail"}}'),
    } as never);

    const req = createRequest(
      { action: 'overview' },
      {
        authorization: `Bearer ${createInternalJwt()}`,
        origin: 'http://localhost:3000',
      }
    );
    const res = createResponse();

    await handler(req as never, res as never);

    expect(res.statusCode).toBe(500);
    expect(res.body).toEqual({ error: 'Failed to open subscription management.' });
    expect(JSON.stringify(res.body)).not.toContain('private portal credential detail');
    expect(JSON.stringify(errorLog.mock.calls)).not.toContain('private portal credential detail');

    fetchMock.mockRestore();
  });

  it.each(['overview', 'cancel', 'payment'])('opens the general portal for multiple subscriptions, including a %s request', async action => {
    const query = createSubscriptionQuery({ data: ['sub_a', 'sub_b'].map(id => ({
      id, user_id: 'user-1', status: 'active', paddle_customer_id: 'ctm_owner',
    })), error: null });
    createClientMock.mockReturnValue({ from: vi.fn(() => query) });
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue({ ok: true, json: async () => ({ data: { urls: {
      general: { overview: 'https://customer-portal.paddle.com/overview' },
      subscriptions: [{ id: 'sub_a', cancel_subscription: 'https://customer-portal.paddle.com/cancel-a' }],
    } } }) } as Response);
    const res = createResponse();
    await handler(createRequest({ action }, { authorization: `Bearer ${createInternalJwt()}`, origin: 'http://localhost:3000' }), res as never);
    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual({ portalUrl: 'https://customer-portal.paddle.com/overview' });
    expect(fetchMock).toHaveBeenCalledExactlyOnceWith('https://sandbox-api.paddle.com/customers/ctm_owner/portal-sessions',
      expect.objectContaining({ body: '{}', redirect: 'error', signal: expect.any(AbortSignal) }));
    expect(query.limit).toHaveBeenCalledWith(101);
    expect(query.eq).toHaveBeenCalledWith('user_id', 'user-1');
  });

  it.each([
    ['different customers', ['ctm_a', 'ctm_b']],
    ['missing customer', ['ctm_a', null]],
    ['incomplete page', Array.from({ length: 101 }, () => 'ctm_a')],
  ] as const)('refuses ambiguous billing records: %s', async (_name, customers) => {
    createClientMock.mockReturnValue({ from: () => createSubscriptionQuery({ data: customers.map((customer, index) => ({
      id: `sub_${index}`, user_id: 'user-1', status: 'active', paddle_customer_id: customer,
    })), error: null }) });
    const fetchMock = vi.spyOn(globalThis, 'fetch');
    const res = createResponse();
    await handler(createRequest({ action: 'cancel' }, { authorization: `Bearer ${createInternalJwt()}`, origin: 'http://localhost:3000' }), res as never);
    expect(res.statusCode).toBe(409);
    expect(res.body).toMatchObject({ code: 'BILLING_REVIEW_REQUIRED' });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('does not call Paddle when no eligible subscriptions exist', async () => {
    createClientMock.mockReturnValue({ from: () => createSubscriptionQuery({ data: [], error: null }) });
    const fetchMock = vi.spyOn(globalThis, 'fetch');
    const res = createResponse();
    await handler(createRequest({}, { authorization: `Bearer ${createInternalJwt()}`, origin: 'http://localhost:3000' }), res as never);
    expect(res.statusCode).toBe(404);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('refuses a server-capped query instead of treating one returned row as the only subscription', async () => {
    createClientMock.mockReturnValue({ from: () => createSubscriptionQuery({ count: 2, data: [
      { id: 'sub_first', user_id: 'user-1', status: 'active', paddle_customer_id: 'ctm_one' },
    ], error: null }) });
    const fetchMock = vi.spyOn(globalThis, 'fetch');
    const res = createResponse();
    await handler(createRequest({ action: 'cancel' }, { authorization: `Bearer ${createInternalJwt()}`, origin: 'http://localhost:3000' }), res as never);
    expect(res.statusCode).toBe(409);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it.each([null, [], 'cancel'])('rejects non-object request bodies: %j', async body => {
    const fetchMock = vi.spyOn(globalThis, 'fetch');
    const res = createResponse();
    await handler(createRequest(body, { authorization: `Bearer ${createInternalJwt()}`, origin: 'http://localhost:3000' }), res as never);
    expect(res.statusCode).toBe(400);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
