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

const createAdminClientWithAdminError = () => {
  const adminUsersQuery = {
    select: vi.fn(() => adminUsersQuery),
    eq: vi.fn(() => adminUsersQuery),
    maybeSingle: vi.fn(async () => ({
      data: null,
      error: { message: 'private admin_users policy detail' },
    })),
  };

  return {
    from: vi.fn((table: string) => {
      if (table === 'admin_users') return adminUsersQuery;
      throw new Error(`Unexpected table ${table}`);
    }),
  };
};

describe('admin subscriptions API', () => {
  beforeEach(() => {
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
    createClientMock
      .mockReturnValueOnce(createAuthClient())
      .mockReturnValueOnce(createAdminClientWithAdminError());

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
});
