import { beforeEach, describe, expect, it, vi } from 'vitest';
import crypto from 'node:crypto';

const { createClientMock } = vi.hoisted(() => ({
  createClientMock: vi.fn(),
}));

vi.mock('@supabase/supabase-js', () => ({
  createClient: (...args: unknown[]) => createClientMock(...args),
}));

import handler from '../../../api/billing/create-checkout-session';

const createRequest = (body: unknown, headers: Record<string, string>) => {
  const rawBody = Buffer.from(JSON.stringify(body));
  return {
    method: 'POST',
    headers,
    [Symbol.asyncIterator]: async function* () {
      yield rawBody;
    },
  };
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

describe('create checkout session API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.SUPABASE_JWT_SECRET = 'test-jwt-secret-with-at-least-32-chars';
    process.env.SUPABASE_URL = 'https://example.supabase.co';
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'service-role-key';
    process.env.PADDLE_API_KEY = 'paddle-api-key';
    process.env.PADDLE_PRO_PRICE_ID = 'pri_pro';
    process.env.PADDLE_FAMILY_PRICE_ID = 'pri_family';
    process.env.PADDLE_ENVIRONMENT = 'sandbox';
    process.env.APP_ORIGIN = 'http://localhost:3000';
    createClientMock.mockReturnValue({
      rpc: vi.fn(async () => ({ data: true, error: null })),
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
});
