import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { createClientMock } = vi.hoisted(() => ({
  createClientMock: vi.fn(),
}));

vi.mock('@supabase/supabase-js', () => ({
  createClient: (...args: unknown[]) => createClientMock(...args),
}));

const createResponse = () => {
  const response = {
    statusCode: 200,
    body: undefined as unknown,
    headers: {} as Record<string, string | string[]>,
    setHeader(name: string, value: string | string[]) {
      this.headers[name] = value;
    },
    status(code: number) {
      this.statusCode = code;
      return this;
    },
    json(payload: unknown) {
      this.body = payload;
      return this;
    },
    end() {
      return this;
    },
  };

  return response;
};

describe('auth exchange API', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
    process.env = {
      ...originalEnv,
      SUPABASE_JWT_SECRET: 'jwt-secret',
      ENCRYPTION_SECRET: 'encryption-secret',
      GOOGLE_CLIENT_ID: 'google-client-id',
      GOOGLE_CLIENT_SECRET: 'google-client-secret',
      APP_ORIGIN: 'http://localhost:5173',
    };
    delete process.env.SUPABASE_URL;
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('does not log raw Google token exchange responses when Google returns an error', async () => {
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    vi.stubGlobal('fetch', vi.fn(async () => ({
      status: 400,
      json: async () => ({
        error: 'invalid_grant',
        error_description: 'Bad code',
        access_token: 'raw-access-token',
        refresh_token: 'raw-refresh-token',
      }),
    })));

    const { default: handler } = await import('../auth/exchange');

    const req = { method: 'POST', body: { code: 'bad-code' } };
    const res = createResponse();

    await handler(req as never, res as never);

    expect(res.statusCode).toBe(500);
    expect(res.body).toEqual({ error: 'Failed to exchange Google authorization code' });
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      'Google Token Exchange Error:',
      {
        error: 'invalid_grant',
        hasDescription: true,
        status: 400,
      }
    );
    const loggedText = JSON.stringify(consoleErrorSpy.mock.calls);
    expect(loggedText).not.toContain('raw-access-token');
    expect(loggedText).not.toContain('raw-refresh-token');
    expect(JSON.stringify(res.body)).not.toContain('Bad code');

    consoleErrorSpy.mockRestore();
  });

  it('returns 204 No Content and sets CORS headers for OPTIONS requests', async () => {
    const { default: handler } = await import('../auth/exchange');
    const req = {
      method: 'OPTIONS',
      headers: {},
    };
    const res = createResponse();

    await handler(req as never, res as never);

    expect(res.statusCode).toBe(204);
    expect(res.headers['Access-Control-Allow-Origin']).toBe('http://localhost:5173');
    expect(res.headers['Access-Control-Allow-Methods']).toBe('POST, OPTIONS');
    expect(res.headers['Access-Control-Allow-Headers']).toBe('Content-Type, Authorization');
  });

  it('accepts POST requests with allowed Origin and sets correct Access-Control-Allow-Origin header', async () => {
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    vi.stubGlobal('fetch', vi.fn(async () => ({
      status: 200,
      json: async () => ({
        access_token: 'access-token',
        refresh_token: 'refresh-token',
      }),
    })));

    const { default: handler } = await import('../auth/exchange');
    const req = {
      method: 'POST',
      headers: {
        origin: 'http://localhost:5173',
      },
      body: { code: 'valid-code' },
    };
    const res = createResponse();

    await handler(req as never, res as never);

    expect(res.statusCode).not.toBe(400);
    expect(res.headers['Access-Control-Allow-Origin']).toBe('http://localhost:5173');
    consoleErrorSpy.mockRestore();
  });

  it('rejects POST requests with invalid Origin with 400 Bad Request', async () => {
    const { default: handler } = await import('../auth/exchange');
    const req = {
      method: 'POST',
      headers: {
        origin: 'https://malicious-site.com',
      },
      body: { code: 'valid-code' },
    };
    const res = createResponse();

    await handler(req as never, res as never);

    expect(res.statusCode).toBe(400);
    expect(res.body).toEqual({ error: 'Invalid request origin.' });
  });

  it('accepts POST requests with no Origin header', async () => {
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    vi.stubGlobal('fetch', vi.fn(async () => ({
      status: 200,
      json: async () => ({
        access_token: 'access-token',
        refresh_token: 'refresh-token',
      }),
    })));

    const { default: handler } = await import('../auth/exchange');
    const req = {
      method: 'POST',
      headers: {},
      body: { code: 'valid-code' },
    };
    const res = createResponse();

    await handler(req as never, res as never);

    expect(res.statusCode).not.toBe(400);
    consoleErrorSpy.mockRestore();
  });

  it('fails closed in production/preview if no valid APP_ORIGIN or VITE_APP_ORIGIN is configured', async () => {
    process.env.NODE_ENV = 'production';
    delete process.env.APP_ORIGIN;
    delete process.env.VITE_APP_ORIGIN;

    const { default: handler } = await import('../auth/exchange');
    const req = {
      method: 'POST',
      headers: {},
      body: { code: 'valid-code' },
    };
    const res = createResponse();

    await handler(req as never, res as never);

    expect(res.statusCode).toBe(500);
    expect(res.body).toEqual({ error: 'Server configuration error: APP_ORIGIN is not configured.' });
  });
});
