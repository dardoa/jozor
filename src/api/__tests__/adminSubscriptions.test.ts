import { beforeEach, describe, expect, it, vi } from 'vitest';

const { createClientMock } = vi.hoisted(() => ({
  createClientMock: vi.fn(),
}));

vi.mock('@supabase/supabase-js', () => ({
  createClient: (...args: unknown[]) => createClientMock(...args),
}));

import handler from '../../../api/admin/subscriptions';

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

const createAuthClient = () => ({
  auth: {
    getUser: vi.fn(async () => ({
      data: { user: { id: 'admin-1', email: 'owner@example.com' } },
      error: null,
    })),
  },
});

const createAdminClientMock = () => {
  const queryChain: Record<string, any> = {};

  queryChain.select = vi.fn(() => queryChain);
  queryChain.eq = vi.fn(() => queryChain);
  queryChain.maybeSingle = vi.fn(async () => ({
    data: { user_id: 'admin-1', is_active: true },
    error: null,
  }));
  queryChain.is = vi.fn(() => queryChain);
  queryChain.upsert = vi.fn(async () => ({ error: null }));
  queryChain.update = vi.fn(() => queryChain);
  queryChain.insert = vi.fn(() => queryChain);
  queryChain.single = vi.fn(async () => ({
    data: { id: 'new-override-id', reason: 'mocked-reason', expires_at: '2026-12-31T23:59:59Z' },
    error: null,
  }));

  return {
    from: vi.fn((table: string) => {
      queryChain._table = table;
      return queryChain;
    }),
  };
};

describe('admin subscriptions API', () => {
  beforeEach(() => {
    createClientMock.mockReset();
    vi.clearAllMocks();
    process.env.SUPABASE_URL = 'https://example.supabase.co';
    process.env.SUPABASE_ANON_KEY = 'anon-key';
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'service-role-key';
  });

  it('rejects unsupported methods', async () => {
    const req = { method: 'PUT', headers: {}, query: {}, body: {} };
    const res = createResponse();

    await handler(req as never, res as never);

    expect(res.statusCode).toBe(405);
    expect(res.headers.Allow).toEqual(['GET', 'POST']);
    expect(res.body).toEqual({
      error: { code: 'METHOD_NOT_ALLOWED', message: 'Method not allowed.' },
    });
  });

  it('does not expose internal server error details to the client', async () => {
    const adminQueryChain: Record<string, any> = {};
    adminQueryChain.select = vi.fn(() => adminQueryChain);
    adminQueryChain.eq = vi.fn(() => adminQueryChain);
    adminQueryChain.maybeSingle = vi.fn(async () => ({
      data: null,
      error: { message: 'private admin_users policy detail' },
    }));

    const clientMock = {
      from: vi.fn((table: string) => {
        if (table === 'admin_users') return adminQueryChain;
        throw new Error(`Unexpected table ${table}`);
      }),
    };

    createClientMock.mockReturnValueOnce(createAuthClient()).mockReturnValueOnce(clientMock);

    const req = {
      method: 'GET',
      headers: { authorization: 'Bearer token-1' },
      query: {},
    };
    const res = createResponse();

    await handler(req as never, res as never);

    expect(res.statusCode).toBe(500);
    expect(res.body).toEqual({
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Admin subscription request failed.',
      },
    });
  });

  it('performs a single bulk insert of audit events in grantOverride containing both replace and grant actions', async () => {
    const clientMock = createAdminClientMock();
    const queryChain = clientMock.from('admin_users');

    // We mock replacedOverrides returning 1 active override
    const selectReplacedPromise = Promise.resolve({
      data: [
        {
          id: 'old-override-id',
          tier: 'pro',
          source: 'manual_comp',
          reason: 'legacy compensation',
          expires_at: '2026-06-30T00:00:00Z',
        },
      ],
      error: null,
    });

    // We mock the update call for revoking
    const updatePromise = Promise.resolve({ error: null });

    // Custom select chain behavior to mock different tables
    clientMock.from = vi.fn((table: string) => {
      if (table === 'admin_users') {
        return {
          select: () => ({
            eq: () => ({
              eq: () => ({
                maybeSingle: async () => ({
                  data: { user_id: 'admin-1', is_active: true },
                  error: null,
                }),
              }),
            }),
          }),
        };
      }
      if (table === 'user_profiles') {
        return {
          upsert: async () => ({ error: null }),
        };
      }
      if (table === 'subscription_overrides') {
        return {
          select: () => ({
            eq: () => ({
              eq: () => ({
                is: async () => selectReplacedPromise,
              }),
            }),
          }),
          update: () => ({
            eq: () => ({
              eq: () => ({
                is: async () => updatePromise,
              }),
            }),
          }),
          insert: () => ({
            select: () => ({
              single: async () => ({
                data: {
                  id: 'new-override-id',
                  reason: 'new grant reason',
                  expires_at: '2027-01-01T00:00:00Z',
                },
                error: null,
              }),
            }),
          }),
        };
      }
      if (table === 'subscription_override_audit_events') {
        return {
          insert: queryChain.insert,
        };
      }
      throw new Error(`Unexpected table ${table}`);
    });

    createClientMock.mockReturnValueOnce(createAuthClient()).mockReturnValueOnce(clientMock);

    const req = {
      method: 'POST',
      headers: { authorization: 'Bearer token-1' },
      body: {
        action: 'grant',
        userId: 'target-user-1',
        tier: 'family',
        source: 'sandbox_test',
        reason: 'testing batch audit',
        expiresAt: '2027-01-01T00:00:00Z',
      },
    };
    const res = createResponse();

    await handler(req as never, res as never);

    expect(res.statusCode).toBe(200);

    // Verify insert on audit events was called once with an array of two audit events
    expect(queryChain.insert).toHaveBeenCalledTimes(1);
    const bulkInsertArg = queryChain.insert.mock.calls[0][0];
    expect(Array.isArray(bulkInsertArg)).toBe(true);
    expect(bulkInsertArg).toHaveLength(2);

    // Assert the replace event is mapped correctly
    expect(bulkInsertArg[0]).toEqual({
      target_user_id: 'target-user-1',
      actor_user_id: 'admin-1',
      action: 'replace',
      override_id: 'old-override-id',
      tier: 'pro',
      source: 'manual_comp',
      reason: 'legacy compensation',
      expires_at: '2026-06-30T00:00:00Z',
      metadata: { replacedByTier: 'family', replacedBySource: 'sandbox_test' },
    });

    // Assert the grant event is mapped correctly
    expect(bulkInsertArg[1]).toEqual({
      target_user_id: 'target-user-1',
      actor_user_id: 'admin-1',
      action: 'grant',
      override_id: 'new-override-id',
      tier: 'family',
      source: 'sandbox_test',
      reason: 'new grant reason',
      expires_at: '2027-01-01T00:00:00Z',
      metadata: {},
    });
  });

  it('performs a single bulk insert of audit events in revokeOverride containing all revoked overrides', async () => {
    const clientMock = createAdminClientMock();
    const queryChain = clientMock.from('admin_users');

    const selectRevokedPromise = Promise.resolve({
      data: [
        {
          id: 'override-a',
          tier: 'pro',
          source: 'manual_comp',
          reason: 'comp A',
          expires_at: null,
        },
        {
          id: 'override-b',
          tier: 'family',
          source: 'sandbox_test',
          reason: 'comp B',
          expires_at: '2026-10-10T00:00:00Z',
        },
      ],
      error: null,
    });

    clientMock.from = vi.fn((table: string) => {
      if (table === 'admin_users') {
        return {
          select: () => ({
            eq: () => ({
              eq: () => ({
                maybeSingle: async () => ({
                  data: { user_id: 'admin-1', is_active: true },
                  error: null,
                }),
              }),
            }),
          }),
        };
      }
      if (table === 'subscription_overrides') {
        return {
          update: () => ({
            eq: () => ({
              eq: () => ({
                is: () => ({
                  select: async () => selectRevokedPromise,
                }),
              }),
            }),
          }),
        };
      }
      if (table === 'subscription_override_audit_events') {
        return {
          insert: queryChain.insert,
        };
      }
      throw new Error(`Unexpected table ${table}`);
    });

    createClientMock.mockReturnValueOnce(createAuthClient()).mockReturnValueOnce(clientMock);

    const req = {
      method: 'POST',
      headers: { authorization: 'Bearer token-1' },
      body: {
        action: 'revoke',
        userId: 'target-user-1',
      },
    };
    const res = createResponse();

    await handler(req as never, res as never);

    expect(res.statusCode).toBe(200);

    // Verify insert on audit events was called once with two revoked events
    expect(queryChain.insert).toHaveBeenCalledTimes(1);
    const bulkInsertArg = queryChain.insert.mock.calls[0][0];
    expect(Array.isArray(bulkInsertArg)).toBe(true);
    expect(bulkInsertArg).toHaveLength(2);

    expect(bulkInsertArg[0]).toEqual({
      target_user_id: 'target-user-1',
      actor_user_id: 'admin-1',
      action: 'revoke',
      override_id: 'override-a',
      tier: 'pro',
      source: 'manual_comp',
      reason: 'comp A',
      expires_at: null,
      metadata: {},
    });

    expect(bulkInsertArg[1]).toEqual({
      target_user_id: 'target-user-1',
      actor_user_id: 'admin-1',
      action: 'revoke',
      override_id: 'override-b',
      tier: 'family',
      source: 'sandbox_test',
      reason: 'comp B',
      expires_at: '2026-10-10T00:00:00Z',
      metadata: {},
    });
  });

  it('fails and returns 500 when insertAuditEvents fails', async () => {
    const clientMock = createAdminClientMock();

    clientMock.from = vi.fn((table: string) => {
      if (table === 'admin_users') {
        return {
          select: () => ({
            eq: () => ({
              eq: () => ({
                maybeSingle: async () => ({
                  data: { user_id: 'admin-1', is_active: true },
                  error: null,
                }),
              }),
            }),
          }),
        };
      }
      if (table === 'subscription_overrides') {
        return {
          update: () => ({
            eq: () => ({
              eq: () => ({
                is: () => ({
                  select: async () => ({
                    data: [
                      {
                        id: 'override-a',
                        tier: 'pro',
                        source: 'manual_comp',
                        reason: null,
                        expires_at: null,
                      },
                    ],
                    error: null,
                  }),
                }),
              }),
            }),
          }),
        };
      }
      if (table === 'subscription_override_audit_events') {
        return {
          insert: vi.fn(async () => ({
            error: { message: 'Database insert failed' },
          })),
        };
      }
      throw new Error(`Unexpected table ${table}`);
    });

    createClientMock.mockReturnValueOnce(createAuthClient()).mockReturnValueOnce(clientMock);

    const req = {
      method: 'POST',
      headers: { authorization: 'Bearer token-1' },
      body: {
        action: 'revoke',
        userId: 'target-user-1',
      },
    };
    const res = createResponse();

    await handler(req as never, res as never);

    expect(res.statusCode).toBe(500);
    expect(res.body).toEqual({
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Admin subscription request failed.',
      },
    });
  });
});
