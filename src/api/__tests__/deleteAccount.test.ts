import crypto from 'node:crypto';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { createClientMock } = vi.hoisted(() => ({
  createClientMock: vi.fn(),
}));

vi.mock('@supabase/supabase-js', () => ({
  createClient: (...args: unknown[]) => createClientMock(...args),
}));

import handler from '../../../api/auth/delete-account';

const createResponse = () => {
  const response = {
    statusCode: 200,
    body: undefined as unknown,
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

const createInternalJwt = () => {
  const secret = 'test-jwt-secret-with-at-least-32-chars';
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
  const payload = Buffer.from(JSON.stringify({
    sub: '11111111-1111-4111-8111-111111111111',
    email: 'user@example.com',
    exp: Math.floor(Date.now() / 1000) + 3600,
  })).toString('base64url');
  const signature = crypto
    .createHmac('sha256', secret)
    .update(`${header}.${payload}`)
    .digest('base64url');
  return `${header}.${payload}.${signature}`;
};

const createStorageBucket = () => ({
  list: vi.fn(async () => ({ data: [], error: null })),
  remove: vi.fn(async () => ({ error: null })),
});

describe('delete account API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.SUPABASE_JWT_SECRET = 'test-jwt-secret-with-at-least-32-chars';
    process.env.SUPABASE_URL = 'https://example.supabase.co';
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'service-role-key';
    process.env.VITE_SUPABASE_ANON_KEY = 'anon-key';
  });

  it('does not expose profile deletion RPC details to the client', async () => {
    const serviceClient = {
      from: vi.fn((table: string) => {
        if (table !== 'trees') throw new Error(`Unexpected table ${table}`);
        return {
          select: vi.fn(() => ({
            eq: vi.fn(async () => ({ data: [], error: null })),
          })),
        };
      }),
      storage: {
        from: vi.fn(() => createStorageBucket()),
      },
      auth: {
        admin: {
          deleteUser: vi.fn(async () => ({ error: null })),
        },
      },
    };
    const userClient = {
      rpc: vi.fn(async () => ({
        error: { message: 'private delete_my_profile_data detail' },
      })),
    };
    createClientMock
      .mockReturnValueOnce(serviceClient)
      .mockReturnValueOnce(userClient);

    const req = {
      method: 'POST',
      headers: {
        authorization: `Bearer ${createInternalJwt()}`,
      },
    };
    const res = createResponse();

    await handler(req as never, res as never);

    expect(res.statusCode).toBe(500);
    expect(res.body).toEqual({ error: 'Failed to delete account data' });
    expect(JSON.stringify(res.body)).not.toContain('private delete_my_profile_data detail');
  });
});
