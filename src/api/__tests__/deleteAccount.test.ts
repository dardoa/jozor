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
  const payload = Buffer.from(
    JSON.stringify({
      sub: '11111111-1111-4111-8111-111111111111',
      email: 'user@example.com',
      exp: Math.floor(Date.now() / 1000) + 3600,
    })
  ).toString('base64url');
  const signature = crypto
    .createHmac('sha256', secret)
    .update(`${header}.${payload}`)
    .digest('base64url');
  return `${header}.${payload}.${signature}`;
};

describe('delete account API', () => {
  beforeEach(() => {
    createClientMock.mockReset();
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
        from: vi.fn(() => ({
          list: vi.fn(async () => ({ data: [], error: null })),
          remove: vi.fn(async () => ({ error: null })),
        })),
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
    createClientMock.mockReturnValueOnce(serviceClient).mockReturnValueOnce(userClient);

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
  });

  it('limits concurrent storage requests to 5', async () => {
    let activeStorageRequests = 0;
    let maxConcurrency = 0;

    const listMock = vi.fn().mockImplementation(async () => {
      activeStorageRequests++;
      maxConcurrency = Math.max(maxConcurrency, activeStorageRequests);
      await new Promise((resolve) => setTimeout(resolve, 15));
      activeStorageRequests--;
      return { data: [], error: null };
    });

    // We mock trees returning 10 tree IDs to trigger many parallel deletes
    const mockTrees = Array.from({ length: 10 }, (_, i) => ({ id: `tree-${i}` }));
    const serviceClient = {
      from: vi.fn((_table: string) => {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(async () => ({ data: mockTrees, error: null })),
          })),
        };
      }),
      storage: {
        from: vi.fn(() => ({
          list: listMock,
          remove: vi.fn(async (_files: string[]) => ({ error: null })),
        })),
      },
      auth: {
        admin: {
          deleteUser: vi.fn(async () => ({ error: null })),
        },
      },
    };
    const userClient = {
      rpc: vi.fn(async () => ({ data: null, error: null })),
    };

    createClientMock.mockReturnValueOnce(serviceClient).mockReturnValueOnce(userClient);

    const req = {
      method: 'POST',
      headers: { authorization: `Bearer ${createInternalJwt()}` },
    };
    const res = createResponse();

    await handler(req as never, res as never);

    expect(res.statusCode).toBe(200);
    expect(maxConcurrency).toBeLessThanOrEqual(5);
    expect(listMock).toHaveBeenCalled();
  });

  it('correctly paginates paths containing more than 100 items', async () => {
    const listMock = vi.fn();

    // Page 1 returns 100 files
    const page1Files = Array.from({ length: 100 }, (_, i) => ({
      id: `f-${i}`,
      name: `file-${i}.png`,
    }));
    // Page 2 returns 45 files
    const page2Files = Array.from({ length: 45 }, (_, i) => ({
      id: `f-${i + 100}`,
      name: `file-${i + 100}.png`,
    }));

    listMock
      .mockImplementationOnce(async () => ({ data: page1Files, error: null }))
      .mockImplementationOnce(async () => ({ data: page2Files, error: null }));

    const removeMock = vi.fn(async (_files: string[]) => ({ error: null }));

    const serviceClient = {
      from: vi.fn(() => ({
        select: vi.fn(() => ({
          eq: vi.fn(async () => ({ data: [], error: null })),
        })),
      })),
      storage: {
        from: vi.fn(() => ({
          list: listMock,
          remove: removeMock,
        })),
      },
      auth: {
        admin: {
          deleteUser: vi.fn(async () => ({ error: null })),
        },
      },
    };
    const userClient = {
      rpc: vi.fn(async () => ({ data: null, error: null })),
    };

    createClientMock.mockReturnValueOnce(serviceClient).mockReturnValueOnce(userClient);

    const req = {
      method: 'POST',
      headers: { authorization: `Bearer ${createInternalJwt()}` },
    };
    const res = createResponse();

    await handler(req as never, res as never);

    expect(res.statusCode).toBe(200);
    // Expect 2 page listings
    expect(listMock).toHaveBeenCalledTimes(2);
    expect(listMock).toHaveBeenNthCalledWith(1, expect.any(String), {
      limit: 100,
      offset: 0,
      sortBy: { column: 'name', order: 'asc' },
    });
    expect(listMock).toHaveBeenNthCalledWith(2, expect.any(String), {
      limit: 100,
      offset: 100,
      sortBy: { column: 'name', order: 'asc' },
    });

    // Total files = 145. Should chunk delete calls into 2 requests (100 and 45)
    expect(removeMock).toHaveBeenCalledTimes(2);
    expect(removeMock.mock.calls[0][0]).toHaveLength(100);
    expect(removeMock.mock.calls[1][0]).toHaveLength(45);
  });

  it('performs nested directory traversal and deletes files recursively', async () => {
    const listMock = vi.fn();

    // root level lists one subdir and one file
    listMock.mockImplementationOnce(async (dir) => {
      expect(dir).toBe('users/11111111-1111-4111-8111-111111111111');
      return {
        data: [
          { id: null, name: 'nested-dir' }, // Directory
          { id: 'file-1-id', name: 'root-file.png' }, // File
        ],
        error: null,
      };
    });

    // subdir level lists two files
    listMock.mockImplementationOnce(async (dir) => {
      expect(dir).toBe('users/11111111-1111-4111-8111-111111111111/nested-dir');
      return {
        data: [
          { id: 'file-2-id', name: 'nested-file-1.png' },
          { id: 'file-3-id', name: 'nested-file-2.png' },
        ],
        error: null,
      };
    });

    const removeMock = vi.fn(async (_files: string[]) => ({ error: null }));

    const serviceClient = {
      from: vi.fn(() => ({
        select: vi.fn(() => ({
          eq: vi.fn(async () => ({ data: [], error: null })),
        })),
      })),
      storage: {
        from: vi.fn(() => ({
          list: listMock,
          remove: removeMock,
        })),
      },
      auth: {
        admin: {
          deleteUser: vi.fn(async () => ({ error: null })),
        },
      },
    };
    const userClient = {
      rpc: vi.fn(async () => ({ data: null, error: null })),
    };

    createClientMock.mockReturnValueOnce(serviceClient).mockReturnValueOnce(userClient);

    const req = {
      method: 'POST',
      headers: { authorization: `Bearer ${createInternalJwt()}` },
    };
    const res = createResponse();

    await handler(req as never, res as never);

    expect(res.statusCode).toBe(200);
    expect(listMock).toHaveBeenCalledTimes(2);

    // Verify all collected files were passed to remove call
    expect(removeMock).toHaveBeenCalledTimes(1);
    const removedFiles = removeMock.mock.calls[0][0];
    expect(removedFiles).toContain('users/11111111-1111-4111-8111-111111111111/root-file.png');
    expect(removedFiles).toContain(
      'users/11111111-1111-4111-8111-111111111111/nested-dir/nested-file-1.png'
    );
    expect(removedFiles).toContain(
      'users/11111111-1111-4111-8111-111111111111/nested-dir/nested-file-2.png'
    );
  });

  it('fails safely and propagates listing errors to prevent user deletion', async () => {
    const listMock = vi.fn(async () => ({
      data: null,
      error: new Error('Storage network breakdown'),
    }));

    const serviceClient = {
      from: vi.fn(() => ({
        select: vi.fn(() => ({
          eq: vi.fn(async () => ({ data: [], error: null })),
        })),
      })),
      storage: {
        from: vi.fn(() => ({
          list: listMock,
          remove: vi.fn(async () => ({ error: null })),
        })),
      },
      auth: {
        admin: {
          deleteUser: vi.fn(async () => ({ error: null })),
        },
      },
    };
    const userClient = {
      rpc: vi.fn(async () => ({ data: null, error: null })),
    };

    createClientMock.mockReturnValueOnce(serviceClient).mockReturnValueOnce(userClient);

    const req = {
      method: 'POST',
      headers: { authorization: `Bearer ${createInternalJwt()}` },
    };
    const res = createResponse();

    await handler(req as never, res as never);

    expect(res.statusCode).toBe(500);
    expect(res.body).toEqual({ error: 'Failed to delete account' });

    // RPC or auth user delete should never be triggered
    expect(userClient.rpc).not.toHaveBeenCalled();
    expect(serviceClient.auth.admin.deleteUser).not.toHaveBeenCalled();
  });

  it('fails safely and propagates file removal errors to prevent user deletion', async () => {
    const listMock = vi.fn(async () => ({
      data: [{ id: 'file-1-id', name: 'avatar.png' }],
      error: null,
    }));
    const removeMock = vi.fn(async (_files: string[]) => ({
      error: new Error('Failed to delete avatar file'),
    }));

    const serviceClient = {
      from: vi.fn(() => ({
        select: vi.fn(() => ({
          eq: vi.fn(async () => ({ data: [], error: null })),
        })),
      })),
      storage: {
        from: vi.fn(() => ({
          list: listMock,
          remove: removeMock,
        })),
      },
      auth: {
        admin: {
          deleteUser: vi.fn(async () => ({ error: null })),
        },
      },
    };
    const userClient = {
      rpc: vi.fn(async () => ({ data: null, error: null })),
    };

    createClientMock.mockReturnValueOnce(serviceClient).mockReturnValueOnce(userClient);

    const req = {
      method: 'POST',
      headers: { authorization: `Bearer ${createInternalJwt()}` },
    };
    const res = createResponse();

    await handler(req as never, res as never);

    expect(res.statusCode).toBe(500);
    expect(res.body).toEqual({ error: 'Failed to delete account' });

    // RPC or auth user delete should never be triggered
    expect(userClient.rpc).not.toHaveBeenCalled();
    expect(serviceClient.auth.admin.deleteUser).not.toHaveBeenCalled();
  });

  it('waits for all chunk deletions to settle when some fail', async () => {
    // Generate 250 files to create 3 chunks (100, 100, 50)
    const files = Array.from({ length: 250 }, (_, i) => ({ id: `f-${i}`, name: `file-${i}.png` }));
    const listMock = vi.fn()
      .mockImplementationOnce(async () => ({ data: files, error: null }))
      .mockImplementation(async () => ({ data: [], error: null }));

    const removedChunks: string[][] = [];
    const removeMock = vi.fn().mockImplementation(async (chunk: string[]) => {
      removedChunks.push(chunk);
      // Simulate chunk 2 failing
      if (chunk.some((f) => f.includes('file-150.png'))) {
        return { error: new Error('Mocked chunk deletion failure') };
      }
      return { error: null };
    });

    const serviceClient = {
      from: vi.fn(() => ({
        select: vi.fn(() => ({
          eq: vi.fn(async () => ({ data: [], error: null })),
        })),
      })),
      storage: {
        from: vi.fn(() => ({
          list: listMock,
          remove: removeMock,
        })),
      },
      auth: {
        admin: {
          deleteUser: vi.fn(async () => ({ error: null })),
        },
      },
    };
    const userClient = {
      rpc: vi.fn(async () => ({ data: null, error: null })),
    };

    createClientMock.mockReturnValueOnce(serviceClient).mockReturnValueOnce(userClient);

    const req = {
      method: 'POST',
      headers: { authorization: `Bearer ${createInternalJwt()}` },
    };
    const res = createResponse();

    await handler(req as never, res as never);

    expect(res.statusCode).toBe(500);
    expect(res.body).toEqual({ error: 'Failed to delete account' });

    // Assert that removeMock was called for all 3 chunks (meaning they all settled)
    expect(removeMock).toHaveBeenCalledTimes(3);
    expect(removedChunks).toHaveLength(3);
  });

  it('stops scheduling new scans on scan failure but lets active scans finish, and does not proceed to deletion', async () => {
    const listMock = vi.fn().mockImplementation(async () => ({ data: [], error: null }));
    const removeMock = vi.fn(async () => ({ error: null }));

    // The root returns more directories than the scan concurrency ceiling.
    listMock.mockImplementationOnce(async (_dir) => {
      return {
        data: Array.from({ length: 8 }, (_, index) => ({
          id: null,
          name: `nested-${index + 1}`,
        })),
        error: null,
      };
    });

    // Call 2 (nested-1): fails
    listMock.mockImplementationOnce(async (_dir) => {
      return {
        data: null,
        error: new Error('Nested 1 listing failed'),
      };
    });

    // Call 3 (nested-2): succeeds, but its child must not be scheduled.
    listMock.mockImplementationOnce(async (_dir) => {
      return {
        data: [{ id: null, name: 'nested-child' }],
        error: null,
      };
    });

    // Calls 4-6 are the remaining scans that were already active.
    listMock.mockImplementationOnce(async () => ({ data: [], error: null }));
    listMock.mockImplementationOnce(async () => ({ data: [], error: null }));
    listMock.mockImplementationOnce(async () => ({ data: [], error: null }));

    const serviceClient = {
      from: vi.fn(() => ({
        select: vi.fn(() => ({
          eq: vi.fn(async () => ({ data: [], error: null })),
        })),
      })),
      storage: {
        from: vi.fn(() => ({
          list: listMock,
          remove: removeMock,
        })),
      },
      auth: {
        admin: {
          deleteUser: vi.fn(async () => ({ error: null })),
        },
      },
    };
    const userClient = {
      rpc: vi.fn(async () => ({ data: null, error: null })),
    };

    createClientMock.mockReturnValueOnce(serviceClient).mockReturnValueOnce(userClient);

    const req = {
      method: 'POST',
      headers: { authorization: `Bearer ${createInternalJwt()}` },
    };
    const res = createResponse();

    await handler(req as never, res as never);

    expect(res.statusCode).toBe(500);
    expect(res.body).toEqual({ error: 'Failed to delete account' });

    // Root + at most five active directory scans. The remaining directories and
    // nested-child must never be scheduled after the first failure.
    expect(listMock).toHaveBeenCalledTimes(6);
    // Verify remove was NEVER called
    expect(removeMock).not.toHaveBeenCalled();
  });
});
