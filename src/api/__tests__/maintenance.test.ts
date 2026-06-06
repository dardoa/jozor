import { beforeEach, describe, expect, it, vi } from 'vitest';

const { authenticateUserMock, createClientMock, logErrorMock, logInfoMock } = vi.hoisted(() => ({
  authenticateUserMock: vi.fn(),
  createClientMock: vi.fn(),
  logErrorMock: vi.fn((..._args: unknown[]) => ({ message: 'Logged server error' })),
  logInfoMock: vi.fn((..._args: unknown[]) => undefined),
}));

vi.mock('../../utils/authUtils', () => ({
  authenticateUser: (...args: unknown[]) => authenticateUserMock(...args),
}));

vi.mock('@supabase/supabase-js', () => ({
  createClient: (...args: unknown[]) => createClientMock(...args),
}));

vi.mock('../../utils/errorLogger', () => ({
  logError: (...args: unknown[]) => logErrorMock(...args),
  logInfo: (...args: unknown[]) => logInfoMock(...args),
}));

import handler from '../maintenance';

const createResponse = () => {
  const response = {
    statusCode: 200,
    body: undefined as unknown,
    headers: {} as Record<string, unknown>,
    setHeader(name: string, value: unknown) {
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
  };

  return response;
};

describe('maintenance API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.SUPABASE_URL = 'https://example.supabase.co';
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'service-role-key';
    authenticateUserMock.mockResolvedValue({
      uid: 'owner-1',
      email: 'owner@example.com',
      token: 'token',
      type: 'internal',
    });
  });

  it('requires POST', async () => {
    const req = { method: 'GET', headers: {}, body: {} };
    const res = createResponse();

    await handler(req as never, res as never);

    expect(res.statusCode).toBe(405);
    expect(res.headers.Allow).toEqual(['POST']);
  });

  it('rejects unauthenticated maintenance requests', async () => {
    authenticateUserMock.mockResolvedValue(null);
    const req = { method: 'POST', headers: {}, body: { treeId: 'tree-1', mode: 'operations' } };
    const res = createResponse();

    await handler(req as never, res as never);

    expect(res.statusCode).toBe(401);
    expect(createClientMock).not.toHaveBeenCalled();
  });

  it('rejects non-owner maintenance requests before deleting rows', async () => {
    const fromMock = vi.fn((table: string) => {
      if (table === 'trees') {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              maybeSingle: vi.fn(async () => ({ data: { owner_id: 'other-owner' }, error: null })),
            })),
          })),
        };
      }
      throw new Error(`Unexpected table ${table}`);
    });
    createClientMock.mockReturnValue({ from: fromMock });

    const req = {
      method: 'POST',
      headers: { authorization: 'Bearer token' },
      body: { treeId: 'tree-1', mode: 'operations', keepLatest: 2000 },
    };
    const res = createResponse();

    await handler(req as never, res as never);

    expect(res.statusCode).toBe(403);
    expect(fromMock).toHaveBeenCalledTimes(1);
  });

  it('prunes old tree operations for the owner with the service role client', async () => {
    const staleRows = [{ id: 'op-1' }, { id: 'op-2' }];
    const fromMock = vi.fn((table: string) => {
      if (table === 'trees') {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              maybeSingle: vi.fn(async () => ({ data: { owner_id: 'owner-1' }, error: null })),
            })),
          })),
        };
      }
      if (table === 'tree_operations') {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              order: vi.fn(() => ({
                range: vi.fn(async () => ({ data: staleRows, error: null })),
              })),
            })),
          })),
          delete: vi.fn(() => ({
            in: vi.fn(() => ({
              select: vi.fn(async () => ({ data: staleRows, error: null })),
            })),
          })),
        };
      }
      throw new Error(`Unexpected table ${table}`);
    });
    createClientMock.mockReturnValue({ from: fromMock });

    const req = {
      method: 'POST',
      headers: { authorization: 'Bearer token' },
      body: { treeId: 'tree-1', mode: 'operations', keepLatest: 2000 },
    };
    const res = createResponse();

    await handler(req as never, res as never);

    expect(createClientMock).toHaveBeenCalledWith('https://example.supabase.co', 'service-role-key', expect.any(Object));
    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual({ deletedCount: 2 });
    expect(logInfoMock).toHaveBeenCalledWith(
      'API_MAINTENANCE',
      'Maintenance completed.',
      expect.objectContaining({
        treeId: 'tree-1',
        userId: 'owner-1',
        mode: 'operations',
        deletedCount: 2,
      })
    );
  });

  it('prunes old activity logs for the owner', async () => {
    const deletedRows = [{ id: 'log-1' }, { id: 'log-2' }, { id: 'log-3' }];
    const fromMock = vi.fn((table: string) => {
      if (table === 'trees') {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              maybeSingle: vi.fn(async () => ({ data: { owner_id: 'owner-1' }, error: null })),
            })),
          })),
        };
      }
      if (table === 'activity_logs') {
        return {
          delete: vi.fn(() => ({
            eq: vi.fn(() => ({
              lt: vi.fn(() => ({
                select: vi.fn(async () => ({ data: deletedRows, error: null })),
              })),
            })),
          })),
        };
      }
      throw new Error(`Unexpected table ${table}`);
    });
    createClientMock.mockReturnValue({ from: fromMock });

    const req = {
      method: 'POST',
      headers: { authorization: 'Bearer token' },
      body: { treeId: 'tree-1', mode: 'activity', keepDays: 180 },
    };
    const res = createResponse();

    await handler(req as never, res as never);

    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual({ deletedCount: 3 });
  });

  it('hides internal maintenance failure details', async () => {
    const fromMock = vi.fn((table: string) => {
      if (table === 'trees') {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              maybeSingle: vi.fn(async () => ({ data: { owner_id: 'owner-1' }, error: null })),
            })),
          })),
        };
      }
      if (table === 'tree_operations') {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              order: vi.fn(() => ({
                range: vi.fn(async () => ({ data: null, error: new Error('private database detail') })),
              })),
            })),
          })),
        };
      }
      throw new Error(`Unexpected table ${table}`);
    });
    createClientMock.mockReturnValue({ from: fromMock });

    const req = {
      method: 'POST',
      headers: { authorization: 'Bearer token' },
      body: { treeId: 'tree-1', mode: 'operations', keepLatest: 2000 },
    };
    const res = createResponse();

    await handler(req as never, res as never);

    expect(res.statusCode).toBe(500);
    expect(res.body).toEqual({
      error: {
        message: 'Maintenance request failed.',
        code: 'INTERNAL_SERVER_ERROR',
      },
    });
    expect(JSON.stringify(res.body)).not.toContain('private database detail');
    expect(logErrorMock).toHaveBeenCalledWith(
      'API_MAINTENANCE',
      expect.objectContaining({ message: 'private database detail' }),
      expect.objectContaining({ showToast: false })
    );
  });
});
