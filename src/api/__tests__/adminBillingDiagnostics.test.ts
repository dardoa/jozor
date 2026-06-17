import { beforeEach, describe, expect, it, vi } from 'vitest';
import crypto from 'node:crypto';

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

const createInternalJwt = (user = { id: 'admin-1', email: 'owner@example.com' }) => {
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
  const payload = Buffer.from(
    JSON.stringify({
      sub: user.id,
      email: user.email,
      exp: Math.floor(Date.now() / 1000) + 3600,
    })
  ).toString('base64url');
  const signature = crypto
    .createHmac('sha256', 'test-jwt-secret-with-at-least-32-chars')
    .update(`${header}.${payload}`)
    .digest('base64url');
  return `${header}.${payload}.${signature}`;
};

const setupMockClient = (input: {
  user?: { id: string; email?: string } | null;
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

  const client = {
    auth: {
      getUser: vi.fn(async () => ({
        data: { user: input.user ?? null },
        error: input.user ? null : { message: 'Invalid token' },
      })),
    },
    from: vi.fn((table: string) => {
      if (table === 'admin_users') return adminUsersQuery;
      if (table === 'billing_webhook_diagnostics') return diagnosticsQuery;
      throw new Error(`Unexpected table ${table}`);
    }),
  };

  createClientMock.mockReturnValue(client);
  return client;
};

describe('admin billing diagnostics API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.SUPABASE_JWT_SECRET = 'test-jwt-secret-with-at-least-32-chars';
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
    setupMockClient({
      user: { id: 'user-1', email: 'user@example.com' },
      isAdmin: false,
    });

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
    setupMockClient({
      user: { id: 'admin-1', email: 'owner@example.com' },
      isAdmin: true,
      diagnostics,
      onDiagnosticsBuilder: (builder) => {
        diagnosticsBuilder = builder;
      },
    });

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
      'event_id.ilike.%evt\\_123 price\\_id.ilike. pri\\_999%,target_user_id.ilike.%evt\\_123 price\\_id.ilike. pri\\_999%,subscription_id.ilike.%evt\\_123 price\\_id.ilike. pri\\_999%,customer_id.ilike.%evt\\_123 price\\_id.ilike. pri\\_999%,price_id.ilike.%evt\\_123 price\\_id.ilike. pri\\_999%'
    );
  });

  it('does not expose internal server error details to the client', async () => {
    setupMockClient({
      user: { id: 'admin-1', email: 'owner@example.com' },
      isAdmin: true,
      adminError: { message: 'private database policy detail' },
    });

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

  it('escapes underscore wildcards in search query to ensure they are treated literally', async () => {
    let diagnosticsBuilder: Record<string, unknown> | undefined;
    setupMockClient({
      user: { id: 'admin-1', email: 'owner@example.com' },
      isAdmin: true,
      onDiagnosticsBuilder: (builder) => {
        diagnosticsBuilder = builder;
      },
    });

    const req = {
      method: 'GET',
      headers: { authorization: 'Bearer token-1' },
      query: { q: 'my_test_event' },
    };
    const res = createResponse();

    await handler(req as never, res as never);

    expect(res.statusCode).toBe(200);
    expect(diagnosticsBuilder?.or).toHaveBeenCalledWith(
      'event_id.ilike.%my\\_test\\_event%,target_user_id.ilike.%my\\_test\\_event%,subscription_id.ilike.%my\\_test\\_event%,customer_id.ilike.%my\\_test\\_event%,price_id.ilike.%my\\_test\\_event%'
    );
  });

  it('authenticates request with valid locally verified JWT', async () => {
    const client = setupMockClient({
      user: null, // should not be used as it is verified locally
      isAdmin: true,
    });

    const req = {
      method: 'GET',
      headers: { authorization: `Bearer ${createInternalJwt({ id: 'admin-1', email: 'owner@example.com' })}` },
      query: {},
    };
    const res = createResponse();

    await handler(req as never, res as never);

    expect(res.statusCode).toBe(200);
    expect(client.auth.getUser).not.toHaveBeenCalled();
  });

  it('falls back to Supabase getUser when local verification fails', async () => {
    const client = setupMockClient({
      user: { id: 'admin-1', email: 'owner@example.com' },
      isAdmin: true,
    });

    const req = {
      method: 'GET',
      headers: { authorization: 'Bearer token-1' },
      query: {},
    };
    const res = createResponse();

    await handler(req as never, res as never);

    expect(res.statusCode).toBe(200);
    expect(client.auth.getUser).toHaveBeenCalledWith('token-1');
  });

  it('rejects invalid token (fails local verification and Supabase getUser)', async () => {
    setupMockClient({
      user: null,
      isAdmin: false,
    });

    const req = {
      method: 'GET',
      headers: { authorization: 'Bearer invalid-token' },
      query: {},
    };
    const res = createResponse();

    await handler(req as never, res as never);

    expect(res.statusCode).toBe(401);
  });
});
