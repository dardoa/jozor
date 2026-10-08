import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

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
  afterEach(() => vi.unstubAllEnvs());
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

  it('processes subscription updates while new checkout and deletion admission is paused', async () => {
    vi.stubEnv('ACCOUNT_ADMISSION_PAUSED', 'true');
    const rpc = vi.fn().mockResolvedValue({ data: true, error: null });
    createClientMock.mockReturnValue({ rpc, from: vi.fn(() => ({ insert: vi.fn().mockResolvedValue({ error: null }) })) });
    const res = createResponse();
    await handler(createRequest({ event_id: 'evt_paused', event_type: 'subscription.updated', occurred_at: '2026-09-08T10:00:00Z',
      data: { id: 'sub_existing', status: 'active', customer_id: 'ctm_existing', custom_data: { userId: 'user-existing' },
        current_billing_period: { ends_at: '2026-10-08T10:00:00Z' }, items: [{ price: { id: 'pri_pro' } }] } }), res as never);
    expect(res.statusCode).toBe(200); expect(res.body).toMatchObject({ status: 'success' });
    expect(rpc).toHaveBeenCalledExactlyOnceWith('process_paddle_subscription_event', expect.objectContaining({ p_subscription_id: 'sub_existing' }));
  });

  it.each(['canceled', 'paused'])('sends an explicit null billing period for %s subscriptions', async status => {
    const rpc = vi.fn(async (_name: string, args: Record<string, unknown>) => {
      const serialized = JSON.parse(JSON.stringify(args));
      return Object.hasOwn(serialized, 'p_current_period_end')
        ? { data: true, error: null }
        : { data: null, error: { message: 'Required RPC parameter missing' } };
    });
    createClientMock.mockReturnValue({ rpc });
    const res = createResponse();
    await handler(createRequest({
      event_id: `evt_${status}`, event_type: `subscription.${status}`, occurred_at: '2026-09-10T05:00:00Z',
      data: { id: 'sub_test', status, customer_id: 'ctm_test', custom_data: { userId: 'user-test' },
        current_billing_period: null, items: [{ price: { id: 'pri_pro' } }] },
    }), res as never);
    expect(res.statusCode).toBe(200);
    expect(rpc).toHaveBeenCalledExactlyOnceWith('process_paddle_subscription_event', expect.objectContaining({ p_current_period_end: null }));
    expect(res.body).toEqual({ status: 'success', tier: 'free' });
  });

  it('records an ignored cancellation after its profile was deleted', async () => {
    vi.stubEnv('VITEST', 'false');
    const insert = vi.fn(async (row: Record<string, unknown>) => ({
      error: row.target_user_id ? {
        code: '23503',
        message: 'insert or update on table "billing_webhook_diagnostics" violates foreign key constraint "billing_webhook_diagnostics_target_user_id_fkey"',
        details: null,
        hint: null,
      } : null,
    }));
    const rpc = vi.fn().mockResolvedValue({ data: false, error: null });
    createClientMock.mockReturnValue({ rpc, from: vi.fn(() => ({ insert })) });

    const res = createResponse();
    await handler(createRequest({
      event_id: 'evt_late_cancellation', event_type: 'subscription.canceled', occurred_at: '2026-09-10T05:00:00Z',
      data: { id: 'sub_deleted', status: 'canceled', customer_id: 'ctm_deleted',
        custom_data: { userId: 'deleted-user' }, current_billing_period: null,
        items: [{ price: { id: 'pri_pro' } }] },
    }), res as never);

    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual({ status: 'ignored', reason: 'duplicate or out-of-order' });
    expect(rpc).toHaveBeenCalledTimes(1);
    expect(insert).toHaveBeenCalledTimes(2);
    expect(insert).toHaveBeenNthCalledWith(1, expect.objectContaining({ target_user_id: 'deleted-user' }));
    expect(insert).toHaveBeenNthCalledWith(2, expect.objectContaining({ target_user_id: null,
      event_id: 'evt_late_cancellation', processing_status: 'ignored' }));
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
