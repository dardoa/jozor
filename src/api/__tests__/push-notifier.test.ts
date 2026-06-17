
import { beforeEach, describe, expect, it, vi } from 'vitest';

const authenticateUserMock = vi.fn();
const listSubscriptionsForUserServerMock = vi.fn();
const removeSubscriptionByEndpointServerMock = vi.fn();
const setVapidDetailsMock = vi.fn();
const sendNotificationMock = vi.fn();

vi.mock('../../utils/authUtils', () => ({
  authenticateUser: (...args: unknown[]) => authenticateUserMock(...args),
}));

vi.mock('../../services/pushSubscriptionService', () => ({
  listSubscriptionsForUserServer: (...args: unknown[]) => listSubscriptionsForUserServerMock(...args),
  removeSubscriptionByEndpointServer: (...args: unknown[]) => removeSubscriptionByEndpointServerMock(...args),
}));

vi.mock('web-push', () => ({
  default: {
    setVapidDetails: (...args: unknown[]) => setVapidDetailsMock(...args),
    sendNotification: (...args: unknown[]) => sendNotificationMock(...args),
  },
}));

import handler from '../push-notifier';

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

describe('push-notifier API', () => {
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

  it('sends notifications to all stored subscriptions for the authenticated user', async () => {
    authenticateUserMock.mockResolvedValue({ uid: 'user-1', email: 'user@example.com' });
    listSubscriptionsForUserServerMock.mockResolvedValue([
      {
        endpoint: 'https://push.example/1',
        keys: { p256dh: 'p256dh-1', auth: 'auth-1' },
      },
    ]);
    sendNotificationMock.mockResolvedValue(undefined);

    const req = {
      method: 'POST',
      headers: { authorization: 'Bearer token' },
      body: { title: 'Hello', body: 'World' },
    };
    const res = createResponse();

    await handler(req as never, res as never);

    expect(res.statusCode).toBe(200);
    expect(setVapidDetailsMock).toHaveBeenCalledWith(
      'mailto:test@example.com',
      'public-key',
      'private-key'
    );
    expect(sendNotificationMock).toHaveBeenCalledTimes(1);
    expect(res.body).toEqual({
      sent: 1,
      pruned: 0,
      totalSubscriptions: 1,
    });
  });

  it('prunes expired subscriptions when the push provider returns 410', async () => {
    authenticateUserMock.mockResolvedValue({ uid: 'user-1', email: 'user@example.com' });
    listSubscriptionsForUserServerMock.mockResolvedValue([
      {
        endpoint: 'https://push.example/expired',
        keys: { p256dh: 'p256dh-1', auth: 'auth-1' },
      },
    ]);
    sendNotificationMock.mockRejectedValue({ statusCode: 410 });

    const req = {
      method: 'POST',
      headers: { authorization: 'Bearer token' },
      body: { title: 'Hello', body: 'World' },
    };
    const res = createResponse();

    await handler(req as never, res as never);

    expect(removeSubscriptionByEndpointServerMock).toHaveBeenCalledWith('https://push.example/expired');
    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual({
      sent: 0,
      pruned: 1,
      totalSubscriptions: 1,
    });
  });

  it('allows an internal admin call to target a user via the cron secret', async () => {
    listSubscriptionsForUserServerMock.mockResolvedValue([
      {
        endpoint: 'https://push.example/internal',
        keys: { p256dh: 'p256dh-1', auth: 'auth-1' },
      },
    ]);
    sendNotificationMock.mockResolvedValue(undefined);

    const req = {
      method: 'POST',
      headers: { authorization: 'Bearer cron-secret' },
      body: { userId: 'user-2', title: 'System', body: 'Reminder' },
    };
    const res = createResponse();

    await handler(req as never, res as never);

    expect(authenticateUserMock).not.toHaveBeenCalled();
    expect(listSubscriptionsForUserServerMock).toHaveBeenCalledWith('user-2');
    expect(res.statusCode).toBe(200);
  });

  it('does not expose push provider error details to the client', async () => {
    authenticateUserMock.mockResolvedValue({ uid: 'user-1', email: 'user@example.com' });
    listSubscriptionsForUserServerMock.mockRejectedValue(new Error('private provider credential detail'));

    const req = {
      method: 'POST',
      headers: { authorization: 'Bearer token' },
      body: { title: 'Hello', body: 'World' },
    };
    const res = createResponse();

    await handler(req as never, res as never);

    expect(res.statusCode).toBe(500);
    expect(res.body).toEqual({ error: 'Push delivery failed.' });
    expect(JSON.stringify(res.body)).not.toContain('private provider credential detail');
  });

  it('returns 204 No Content and sets CORS headers for OPTIONS requests', async () => {
    const req = {
      method: 'OPTIONS',
      headers: {},
    };
    const res = createResponse();

    await handler(req as never, res as never);

    expect(res.statusCode).toBe(204);
    expect(res.headers['Access-Control-Allow-Origin']).toContain('http://localhost:5173');
    expect(res.headers['Access-Control-Allow-Methods']).toContain('POST, OPTIONS');
    expect(res.headers['Access-Control-Allow-Headers']).toContain('Content-Type, Authorization');
  });

  it('accepts POST requests with allowed Origin and sets correct Access-Control-Allow-Origin header', async () => {
    authenticateUserMock.mockResolvedValue({ uid: 'user-1', email: 'user@example.com' });
    listSubscriptionsForUserServerMock.mockResolvedValue([]);

    const req = {
      method: 'POST',
      headers: {
        authorization: 'Bearer token',
        origin: 'http://localhost:5173',
      },
      body: { title: 'Hello', body: 'World' },
    };
    const res = createResponse();

    await handler(req as never, res as never);

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

    await handler(req as never, res as never);

    expect(res.statusCode).toBe(400);
    expect(res.body).toEqual({ error: 'Invalid request origin.' });
  });

  it('accepts POST requests with no Origin header', async () => {
    authenticateUserMock.mockResolvedValue({ uid: 'user-1', email: 'user@example.com' });
    listSubscriptionsForUserServerMock.mockResolvedValue([]);

    const req = {
      method: 'POST',
      headers: {
        authorization: 'Bearer token',
      },
      body: { title: 'Hello', body: 'World' },
    };
    const res = createResponse();

    await handler(req as never, res as never);

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

    await handler(req as never, res as never);

    expect(res.statusCode).toBe(500);
    expect(res.body).toEqual({ error: 'Server configuration error: APP_ORIGIN is not configured.' });
  });
});

