import { beforeEach, describe, expect, it, vi } from 'vitest';

const { createClientMock } = vi.hoisted(() => ({
  createClientMock: vi.fn(),
}));

vi.mock('@supabase/supabase-js', () => ({
  createClient: (...args: unknown[]) => createClientMock(...args),
}));

import handler from '../../../api/admin/billing-diagnostics';

const createResponse = () => {
  const response = {
    statusCode: 200,
    body: undefined as unknown,
    headers: {} as Record<string, unknown>,
    ended: false,
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
    end() {
      this.ended = true;
      return this;
    },
  };

  return response;
};

const createAuthClient = (user: { id: string; email?: string } | null) => ({
  auth: {
    getUser: vi.fn(async () => ({
      data: { user },
      error: user ? null : { message: 'Invalid token' },
    })),
  },
});

const createAdminClient = (input: {
  isAdmin: boolean;
  diagnostics?: unknown[];
  adminError?: unknown;
  onDiagnosticsBuilder?: (builder: Record<string, unknown>) => void;
}) => {
  const adminUsersQuery = {
    select: vi.fn(() => adminUsersQuery),
    eq: vi.fn(() => adminUsersQuery),
    maybeSingle: vi.fn(async () => ({
      data: input.isAdmin ? { user_id: 'admin-1' } : null,
      error: input.adminError ?? null,
    })),
  };

  const diagnosticsQuery: Record<string, unknown> = {
    select: vi.fn(() => diagnosticsQuery),
    order: vi.fn(() => diagnosticsQuery),
    limit: vi.fn(() => diagnosticsQuery),
    eq: vi.fn(() => diagnosticsQuery),
    or: vi.fn(() => diagnosticsQuery),
    then: (resolve: (value: unknown) => void) => resolve({ data: input.diagnostics ?? [], error: null }),
  };

  input.onDiagnosticsBuilder?.(diagnosticsQuery);

  return {
    from: vi.fn((table: string) => {
      if (table === 'admin_users') return adminUsersQuery;
      if (table === 'billing_webhook_diagnostics') return diagnosticsQuery;
      throw new Error(`Unexpected table ${table}`);
    }),
  };
};

describe('admin billing diagnostics API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.SUPABASE_URL = 'https://example.supabase.co';
    process.env.SUPABASE_ANON_KEY = 'anon-key';
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'service-role-key';
  });

  it('rejects unsupported methods', async () => {
    const req = { method: 'POST', headers: {}, query: {} };
    const res = createResponse();

    await handler(req as never, res as never);

    expect(res.statusCode).toBe(405);
    expect(res.headers.Allow).toEqual(['GET']);
    expect(res.body).toEqual({
      error: { code: 'METHOD_NOT_ALLOWED', message: 'Method not allowed.' },
    });
  });

  it('rejects requests without a bearer token', async () => {
    const req = { method: 'GET', headers: {}, query: {} };
    const res = createResponse();

    await handler(req as never, res as never);

    expect(res.statusCode).toBe(401);
    expect(createClientMock).not.toHaveBeenCalled();
  });

  it('rejects authenticated non-admin users', async () => {
    createClientMock
      .mockReturnValueOnce(createAuthClient({ id: 'user-1', email: 'user@example.com' }))
      .mockReturnValueOnce(createAdminClient({ isAdmin: false }));

    const req = { method: 'GET', headers: { authorization: 'Bearer token-1' }, query: {} };
    const res = createResponse();

    await handler(req as never, res as never);

    expect(res.statusCode).toBe(403);
    expect(res.body).toEqual({
      error: { code: 'FORBIDDEN', message: 'Admin access is required.' },
    });
  });

  it('returns filtered diagnostic events for admins', async () => {
    let diagnosticsBuilder: Record<string, unknown> | undefined;
    const diagnostics = [{
      id: 'diag-1',
      provider: 'paddle',
      event_id: 'evt_123',
      event_type: 'subscription.created',
      processing_status: 'processed',
      reason: 'subscription updated',
      target_user_id: 'admin-1',
      subscription_id: 'sub_123',
      customer_id: 'ctm_123',
      price_id: 'pri_123',
      tier: 'pro',
      http_status: 200,
      occurred_at: '2026-06-05T10:00:00.000Z',
      received_at: '2026-06-05T10:00:05.000Z',
      metadata: {},
    }];
    createClientMock
      .mockReturnValueOnce(createAuthClient({ id: 'admin-1', email: 'owner@example.com' }))
      .mockReturnValueOnce(createAdminClient({
        isAdmin: true,
        diagnostics,
        onDiagnosticsBuilder: (builder) => {
          diagnosticsBuilder = builder;
        },
      }));

    const req = {
      method: 'GET',
      headers: { authorization: 'Bearer token-1' },
      query: {
        status: 'processed',
        q: 'evt_123,%(),price_id.ilike.%pri_999%',
        limit: '500',
      },
    };
    const res = createResponse();

    await handler(req as never, res as never);

    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual({ events: diagnostics });
    expect(diagnosticsBuilder?.limit).toHaveBeenCalledWith(100);
    expect(diagnosticsBuilder?.eq).toHaveBeenCalledWith('processing_status', 'processed');
    expect(diagnosticsBuilder?.or).toHaveBeenCalledWith(
      'event_id.ilike.%evt_123 price_id.ilike. pri_999%,target_user_id.ilike.%evt_123 price_id.ilike. pri_999%,subscription_id.ilike.%evt_123 price_id.ilike. pri_999%,customer_id.ilike.%evt_123 price_id.ilike. pri_999%,price_id.ilike.%evt_123 price_id.ilike. pri_999%'
    );
  });

  it('does not expose internal server error details to the client', async () => {
    createClientMock
      .mockReturnValueOnce(createAuthClient({ id: 'admin-1', email: 'owner@example.com' }))
      .mockReturnValueOnce(createAdminClient({
        isAdmin: true,
        adminError: { message: 'private database policy detail' },
      }));

    const req = { method: 'GET', headers: { authorization: 'Bearer token-1' }, query: {} };
    const res = createResponse();

    await handler(req as never, res as never);

    expect(res.statusCode).toBe(500);
    expect(res.body).toEqual({
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Admin billing diagnostics request failed.',
      },
    });
  });
});
