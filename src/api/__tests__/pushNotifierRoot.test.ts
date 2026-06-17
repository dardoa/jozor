import { beforeEach, describe, expect, it, vi } from 'vitest';

const verifyInternalTokenMock = vi.fn();
const getUserMock = vi.fn();

vi.mock('../../../shared/auth/internalJwt.js', () => ({
  verifyInternalToken: (...args: unknown[]) => verifyInternalTokenMock(...args),
}));

vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => ({
    auth: {
      getUser: (...args: unknown[]) => getUserMock(...args),
    },
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          order: vi.fn(() => Promise.resolve({ data: [], error: null })),
        })),
      })),
    })),
  })),
}));

vi.mock('web-push', () => ({
  default: {
    setVapidDetails: vi.fn(),
    sendNotification: vi.fn(() => Promise.resolve('sent')),
  },
}));

import rootHandler, { sendPushNotificationToUser as rootSendPushNotificationToUser } from '../../../api/push-notifier';

const createResponse = () => {
  const response = {
    statusCode: 200,
    headers: {} as Record<string, string | string[]>,
    body: undefined as unknown,
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

describe('root push notifier API function', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.clearAllMocks();
    process.env = {
      ...originalEnv,
      VAPID_PUBLIC_KEY: 'public-key',
      VAPID_PRIVATE_KEY: 'private-key',
      VAPID_SUBJECT: 'mailto:test@example.com',
      CRON_SECRET: 'cron-secret',
      APP_ORIGIN: 'http://localhost:5173',
    };
  });

  it('exports Vercel push notifier handlers', () => {
    expect(rootHandler).toEqual(expect.any(Function));
    expect(rootSendPushNotificationToUser).toEqual(expect.any(Function));
  });

  it('returns 204 No Content and sets CORS headers for OPTIONS requests', async () => {
    const req = {
      method: 'OPTIONS',
      headers: {},
    };
    const res = createResponse();

    await rootHandler(req as never, res as never);

    expect(res.statusCode).toBe(204);
    expect(res.headers['Access-Control-Allow-Origin']).toContain('http://localhost:5173');
    expect(res.headers['Access-Control-Allow-Methods']).toContain('POST, OPTIONS');
    expect(res.headers['Access-Control-Allow-Headers']).toContain('Content-Type, Authorization');
  });

  it('accepts POST requests with allowed Origin and sets correct Access-Control-Allow-Origin header', async () => {
    getUserMock.mockResolvedValue({ data: { user: { id: 'user-1', email: 'user@example.com' } }, error: null });

    const req = {
      method: 'POST',
      headers: {
        authorization: 'Bearer token',
        origin: 'http://localhost:5173',
      },
      body: { title: 'Hello', body: 'World' },
    };
    const res = createResponse();

    await rootHandler(req as never, res as never);

    expect(res.statusCode).toBe(200);
    expect(res.headers['Access-Control-Allow-Origin']).toContain('http://localhost:5173');
  });

  it('rejects POST requests with invalid Origin with 400 Bad Request', async () => {
    const req = {
      method: 'POST',
      headers: {
        authorization: 'Bearer token',
        origin: 'https://malicious-site.com',
      },
      body: { title: 'Hello', body: 'World' },
    };
    const res = createResponse();

    await rootHandler(req as never, res as never);

    expect(res.statusCode).toBe(400);
    expect(res.body).toEqual({ error: 'Invalid request origin.' });
  });

  it('accepts POST requests with no Origin header', async () => {
    getUserMock.mockResolvedValue({ data: { user: { id: 'user-1', email: 'user@example.com' } }, error: null });

    const req = {
      method: 'POST',
      headers: {
        authorization: 'Bearer token',
      },
      body: { title: 'Hello', body: 'World' },
    };
    const res = createResponse();

    await rootHandler(req as never, res as never);

    expect(res.statusCode).toBe(200);
  });

  it('fails closed in production/preview if no valid APP_ORIGIN or VITE_APP_ORIGIN is configured', async () => {
    process.env.NODE_ENV = 'production';
    delete process.env.APP_ORIGIN;
    delete process.env.VITE_APP_ORIGIN;

    const req = {
      method: 'POST',
      headers: {
        authorization: 'Bearer token',
      },
      body: { title: 'Hello', body: 'World' },
    };
    const res = createResponse();

    await rootHandler(req as never, res as never);

    expect(res.statusCode).toBe(500);
    expect(res.body).toEqual({ error: 'Server configuration error: APP_ORIGIN is not configured.' });
  });
});
