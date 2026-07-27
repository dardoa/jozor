import { beforeEach, describe, expect, it, vi } from 'vitest';

const { createClientMock, isSignatureValidMock } = vi.hoisted(() => ({
  createClientMock: vi.fn(),
  isSignatureValidMock: vi.fn(),
}));

vi.mock('@supabase/supabase-js', () => ({
  createClient: (...args: unknown[]) => createClientMock(...args),
}));

vi.mock('@paddle/paddle-node-sdk', () => ({
  Paddle: vi.fn(function PaddleMock(this: { webhooks?: unknown }) {
    this.webhooks = {
      isSignatureValid: (...args: unknown[]) => isSignatureValidMock(...args),
    };
  }),
}));

import { Readable } from 'stream';
import type { VercelRequest } from '@vercel/node';
import handler from '../../../shared/server/api/billing/paddle-webhook';

const createRequest = (body: unknown) => {
  const rawBody = JSON.stringify(body);
  const req = Readable.from(Buffer.from(rawBody)) as unknown as VercelRequest;
  req.method = 'POST';
  req.headers = {
    'paddle-signature': `ts=${Math.floor(Date.now() / 1000)};h1=test-signature`,
  };
  return req;
};

const createResponse = () => {
  const response = {
    statusCode: 200,
    body: undefined as unknown,
    headers: {} as Record<string, unknown>,
    setHeader(name: string, value: unknown) {
      this.headers[name] = value;
      return this;
    },
    status(code: number) {
      this.statusCode = code;
      return this;
    },
    json(payload: unknown) {
      this.body = payload;
      return this;
    },
  };

  return response;
};

describe('Paddle webhook API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.PADDLE_WEBHOOK_SECRET = 'webhook-secret';
    process.env.PADDLE_API_KEY = 'paddle-api-key';
    process.env.PADDLE_PRO_PRICE_ID = 'pri_pro';
    process.env.PADDLE_FAMILY_PRICE_ID = 'pri_family';
    process.env.SUPABASE_URL = 'https://example.supabase.co';
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'service-role-key';
    isSignatureValidMock.mockResolvedValue(true);
  });

  it('does not expose database error details when subscription processing fails', async () => {
    createClientMock.mockReturnValue({
      rpc: vi.fn(async () => ({
        data: null,
        error: { message: 'private database transaction detail' },
      })),
    });

    const req = createRequest({
      event_id: 'evt_123',
      event_type: 'subscription.created',
      occurred_at: '2026-06-05T10:00:00.000Z',
      data: {
        id: 'sub_123',
        status: 'active',
        customer_id: 'ctm_123',
        custom_data: { userId: 'user-1' },
        current_billing_period: { ends_at: '2026-07-05T10:00:00.000Z' },
        items: [{ price: { id: 'pri_pro' } }],
      },
    });
    const res = createResponse();

    await handler(req as never, res as never);

    expect(res.statusCode).toBe(500);
    expect(res.body).toEqual({ error: 'Database transaction failed' });
    expect(JSON.stringify(res.body)).not.toContain('private database transaction detail');
  });
});
