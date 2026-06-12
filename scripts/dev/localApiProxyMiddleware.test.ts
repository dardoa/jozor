import type { IncomingMessage, ServerResponse } from 'node:http';
import { describe, expect, it, vi } from 'vitest';
import { createLocalApiProxyMiddleware } from './localApiProxyMiddleware';

const authenticateUserMock = vi.fn();
const createSupabaseClientForUserMock = vi.fn();

vi.mock('../../src/utils/authUtils', () => ({
  authenticateUser: (...args: unknown[]) => authenticateUserMock(...args),
  createSupabaseClientForUser: (...args: unknown[]) => createSupabaseClientForUserMock(...args),
}));

vi.mock('../../src/utils/errorLogger', () => ({
  logError: vi.fn((_context: string, error: unknown) => ({
    message: error instanceof Error ? error.message : 'Unknown error',
  })),
  logInfo: vi.fn(),
}));

const createResponse = () => {
  const response = {
    statusCode: 200,
    headers: {} as Record<string, unknown>,
    body: '',
    setHeader(name: string, value: unknown) {
      this.headers[name] = value;
    },
    writeHead(code: number, headers?: Record<string, unknown>) {
      this.statusCode = code;
      Object.assign(this.headers, headers);
      return this;
    },
    end(payload?: string) {
      this.body = payload || '';
    },
  };

  return response;
};

describe('createLocalApiProxyMiddleware', () => {
  it('reports Paddle readiness without exposing secret values', async () => {
    let handler:
      | ((req: IncomingMessage, res: ServerResponse, next: () => void) => Promise<void>)
      | undefined;

    const plugin = createLocalApiProxyMiddleware({
      SUPABASE_URL: 'https://example.supabase.co',
      SUPABASE_SERVICE_ROLE_KEY: 'service-role',
      ENABLE_LOCAL_API_PROXY: 'true',
      PADDLE_API_KEY: 'paddle-api-key',
      PADDLE_PRO_PRICE_ID: 'pro-price',
      PADDLE_FAMILY_PRICE_ID: 'family-price',
      VITE_PADDLE_CLIENT_TOKEN: 'client-token',
    });

    plugin.configureServer?.({
      middlewares: {
        use: vi.fn((_prefix: string, callback: typeof handler) => {
          handler = callback;
        }),
      },
    } as never);

    const req = {
      method: 'GET',
      url: '/check-env',
      headers: { host: 'localhost:3000' },
      [Symbol.asyncIterator]: async function* () {},
    } as IncomingMessage;
    const res = createResponse();

    await handler?.(req, res as never, vi.fn());

    expect(JSON.parse(res.body)).toMatchObject({
      hasPaddleApiKey: true,
      hasPaddleWebhookSecret: false,
      hasPaddlePriceIds: true,
      hasPaddleClientToken: true,
    });
    expect(res.body).not.toContain('paddle-api-key');
    expect(res.body).not.toContain('client-token');
  });

  it('routes local billing checkout requests to the server-only handler', async () => {
    let handler:
      | ((req: IncomingMessage, res: ServerResponse, next: () => void) => Promise<void>)
      | undefined;

    const plugin = createLocalApiProxyMiddleware({
      SUPABASE_URL: 'https://example.supabase.co',
      SUPABASE_SERVICE_ROLE_KEY: 'service-role',
      ENABLE_LOCAL_API_PROXY: 'true',
    });

    plugin.configureServer?.({
      middlewares: {
        use: vi.fn((_prefix: string, callback: typeof handler) => {
          handler = callback;
        }),
      },
    } as never);

    let bodyReadCount = 0;
    const req = {
      method: 'POST',
      url: '/billing/create-checkout-session',
      headers: { host: 'localhost:3000' },
      [Symbol.asyncIterator]: async function* () {
        bodyReadCount += 1;
        yield Buffer.from('{}');
      },
    } as IncomingMessage;
    const res = createResponse();
    const next = vi.fn();

    await handler?.(req, res as never, next);

    expect(res.statusCode).toBe(401);
    expect(JSON.parse(res.body)).toEqual({ error: 'Unauthorized: Invalid session.' });
    expect(bodyReadCount).toBe(1);
    expect(next).not.toHaveBeenCalled();
  });

  it('routes Paddle webhooks before consuming their raw request body', async () => {
    let handler:
      | ((req: IncomingMessage, res: ServerResponse, next: () => void) => Promise<void>)
      | undefined;

    const plugin = createLocalApiProxyMiddleware({
      SUPABASE_URL: 'https://example.supabase.co',
      SUPABASE_SERVICE_ROLE_KEY: 'service-role',
      ENABLE_LOCAL_API_PROXY: 'true',
    });

    plugin.configureServer?.({
      middlewares: {
        use: vi.fn((_prefix: string, callback: typeof handler) => {
          handler = callback;
        }),
      },
    } as never);

    const req = {
      method: 'POST',
      url: '/billing/paddle-webhook',
      headers: { host: 'localhost:3000' },
      [Symbol.asyncIterator]: async function* () {
        yield Buffer.from('{"event_type":"subscription.created"}');
      },
    } as IncomingMessage;
    const res = createResponse();
    const next = vi.fn();

    await handler?.(req, res as never, next);

    expect(res.statusCode).toBe(400);
    expect(JSON.parse(res.body)).toEqual({ error: 'Missing paddle-signature header' });
    expect(next).not.toHaveBeenCalled();
  });

  it('allows Paddle webhook delivery through a temporary Cloudflare tunnel only', async () => {
    let handler:
      | ((req: IncomingMessage, res: ServerResponse, next: () => void) => Promise<void>)
      | undefined;

    const plugin = createLocalApiProxyMiddleware({
      SUPABASE_URL: 'https://example.supabase.co',
      SUPABASE_SERVICE_ROLE_KEY: 'service-role',
      ENABLE_LOCAL_API_PROXY: 'true',
    });

    plugin.configureServer?.({
      middlewares: {
        use: vi.fn((_prefix: string, callback: typeof handler) => {
          handler = callback;
        }),
      },
    } as never);

    const req = {
      method: 'POST',
      url: '/billing/paddle-webhook',
      headers: { host: 'checkout-test.trycloudflare.com' },
      [Symbol.asyncIterator]: async function* () {
        yield Buffer.from('{}');
      },
    } as IncomingMessage;
    const res = createResponse();

    await handler?.(req, res as never, vi.fn());

    expect(res.statusCode).toBe(400);
    expect(JSON.parse(res.body)).toEqual({ error: 'Missing paddle-signature header' });
  });

  it('returns 410 for disabled legacy Drive fileId sharing links', async () => {
    authenticateUserMock.mockResolvedValue({
      type: 'internal',
      token: 'supabase-token',
      uid: 'user-1',
      email: 'user@example.com',
    });
    createSupabaseClientForUserMock.mockReturnValue({});

    let handler:
      | ((req: IncomingMessage, res: ServerResponse, next: () => void) => Promise<void>)
      | undefined;

    const plugin = createLocalApiProxyMiddleware({
      SUPABASE_URL: 'https://example.supabase.co',
      SUPABASE_SERVICE_ROLE_KEY: 'service-role',
      ENABLE_LOCAL_API_PROXY: 'true',
    });

    plugin.configureServer?.({
      middlewares: {
        use: vi.fn((_prefix: string, callback: typeof handler) => {
          handler = callback;
        }),
      },
    } as never);

    const req = {
      method: 'GET',
      url: '/proxy?fileId=drive-file-1',
      headers: { host: 'localhost:3000', authorization: 'Bearer token' },
      [Symbol.asyncIterator]: async function* () {},
    } as IncomingMessage;
    const res = createResponse();
    const next = vi.fn();

    await handler?.(req, res as never, next);

    expect(res.statusCode).toBe(410);
    expect(JSON.parse(res.body)).toEqual({
      error: {
        message: 'Legacy Google Drive proxy sharing has been disabled. Use a database-backed shared tree link.',
        code: 'LEGACY_DRIVE_SHARING_DISABLED',
      },
    });
    expect(next).not.toHaveBeenCalled();
  });
});
