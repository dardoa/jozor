
import { beforeEach, describe, expect, it, vi } from 'vitest';

const authenticateUserMock = vi.fn();
const createSupabaseClientForUserMock = vi.fn();
const logErrorMock = vi.fn();

vi.mock('../../utils/authUtils', () => ({
  authenticateUser: (...args: unknown[]) => authenticateUserMock(...args),
  createSupabaseClientForUser: (...args: unknown[]) => createSupabaseClientForUserMock(...args),
}));

vi.mock('../../utils/errorLogger', () => ({
  logError: (...args: unknown[]) => logErrorMock(...args),
  logInfo: vi.fn(),
}));

import handler from '../proxy';

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

describe('proxy API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    authenticateUserMock.mockResolvedValue({
      type: 'internal',
      token: 'supabase-token',
      uid: 'user-1',
      email: 'user@example.com',
    });
    createSupabaseClientForUserMock.mockReturnValue({});
  });

  it('rejects legacy Drive fileId proxy reads', async () => {
    const req = {
      method: 'GET',
      headers: { authorization: 'Bearer token' },
      query: { fileId: 'drive-file-1' },
    };
    const res = createResponse();

    await handler(req as never, res as never);

    expect(res.statusCode).toBe(410);
    expect(res.body).toEqual({
      error: {
        message: 'Legacy Google Drive proxy sharing has been disabled. Use a database-backed shared tree link.',
        code: 'LEGACY_DRIVE_SHARING_DISABLED',
      },
    });
  });

  it('rejects malformed write payloads before checking tree access', async () => {
    const fromMock = vi.fn();
    const rpcMock = vi.fn();
    createSupabaseClientForUserMock.mockReturnValue({ from: fromMock, rpc: rpcMock });

    const req = {
      method: 'POST',
      headers: { authorization: 'Bearer token' },
      body: {
        treeId: 'tree-1',
        content: 'not-a-person-map',
      },
    };
    const res = createResponse();

    await handler(req as never, res as never);

    expect(res.statusCode).toBe(400);
    expect(res.body).toEqual({ error: 'content must be a person map' });
    expect(fromMock).not.toHaveBeenCalled();
    expect(rpcMock).not.toHaveBeenCalled();
  });

  it('rejects missing write bodies without calling replace_tree_content', async () => {
    const rpcMock = vi.fn();
    createSupabaseClientForUserMock.mockReturnValue({ rpc: rpcMock });

    const req = {
      method: 'POST',
      headers: { authorization: 'Bearer token' },
    };
    const res = createResponse();

    await handler(req as never, res as never);

    expect(res.statusCode).toBe(400);
    expect(res.body).toEqual({ error: 'treeId and content are required' });
    expect(rpcMock).not.toHaveBeenCalled();
  });

  it('replaces tree content for the tree owner only after checking ownership', async () => {
    const rpcMock = vi.fn(async () => ({ data: null, error: null }));
    const fromMock = vi.fn((table: string) => {
      if (table === 'trees') {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              maybeSingle: vi.fn(async () => ({ data: { owner_id: 'user-1' }, error: null })),
            })),
          })),
        };
      }
      throw new Error(`Unexpected table ${table}`);
    });
    createSupabaseClientForUserMock.mockReturnValue({ from: fromMock, rpc: rpcMock });

    const req = {
      method: 'POST',
      headers: { authorization: 'Bearer token' },
      body: {
        treeId: 'tree-1',
        content: {
          'person-1': {
            id: 'person-1',
            firstName: 'Sara',
            lastName: 'Haddad',
            gender: 'female',
            parents: ['person-2'],
            spouses: ['person-3'],
          },
        },
      },
    };
    const res = createResponse();

    await handler(req as never, res as never);

    expect(res.statusCode).toBe(200);
    expect(rpcMock).toHaveBeenCalledWith('replace_tree_content', {
      p_tree_id: 'tree-1',
      p_people: [
        expect.objectContaining({
          id: 'person-1',
          tree_id: 'tree-1',
          first_name: 'Sara',
          last_name: 'Haddad',
          gender: 'female',
        }),
      ],
      p_relationships: [
        { tree_id: 'tree-1', person_id: 'person-1', relative_id: 'person-2', type: 'parent' },
        { tree_id: 'tree-1', person_id: 'person-1', relative_id: 'person-3', type: 'spouse' },
      ],
    });
  });

  it('allows editor collaborators to replace tree content after checking tree_collaborators', async () => {
    const rpcMock = vi.fn(async () => ({ data: null, error: null }));
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
      if (table === 'tree_collaborators') {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              eq: vi.fn(() => ({
                maybeSingle: vi.fn(async () => ({ data: { role: 'editor' }, error: null })),
              })),
            })),
          })),
        };
      }
      throw new Error(`Unexpected table ${table}`);
    });
    createSupabaseClientForUserMock.mockReturnValue({ from: fromMock, rpc: rpcMock });

    const req = {
      method: 'POST',
      headers: { authorization: 'Bearer token' },
      body: {
        treeId: 'tree-1',
        content: {
          'person-1': {
            id: 'person-1',
            firstName: 'Sara',
            lastName: 'Haddad',
            gender: 'female',
          },
        },
      },
    };
    const res = createResponse();

    await handler(req as never, res as never);

    expect(res.statusCode).toBe(200);
    expect(rpcMock).toHaveBeenCalledWith('replace_tree_content', expect.objectContaining({
      p_tree_id: 'tree-1',
    }));
  });

  it('rejects viewer collaborators before calling replace_tree_content', async () => {
    const rpcMock = vi.fn();
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
      if (table === 'tree_collaborators') {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              eq: vi.fn(() => ({
                maybeSingle: vi.fn(async () => ({ data: { role: 'viewer' }, error: null })),
              })),
            })),
          })),
        };
      }
      throw new Error(`Unexpected table ${table}`);
    });
    createSupabaseClientForUserMock.mockReturnValue({ from: fromMock, rpc: rpcMock });

    const req = {
      method: 'POST',
      headers: { authorization: 'Bearer token' },
      body: {
        treeId: 'tree-1',
        content: {
          'person-1': {
            id: 'person-1',
            firstName: 'Sara',
            lastName: 'Haddad',
            gender: 'female',
          },
        },
      },
    };
    const res = createResponse();

    await handler(req as never, res as never);

    expect(res.statusCode).toBe(403);
    expect(res.body).toEqual({ error: 'Insufficient permissions to update this tree' });
    expect(rpcMock).not.toHaveBeenCalled();
  });

  it('hides internal failure details from unexpected proxy errors', async () => {
    authenticateUserMock.mockRejectedValue(new Error('private auth backend detail'));

    const req = {
      method: 'GET',
      headers: { authorization: 'Bearer token' },
      query: {},
    };
    const res = createResponse();

    await handler(req as never, res as never);

    expect(res.statusCode).toBe(500);
    expect(res.body).toEqual({
      error: {
        message: 'Internal server error',
        code: 'INTERNAL_SERVER_ERROR',
      },
    });
    expect(JSON.stringify(res.body)).not.toContain('private auth backend detail');
    expect(logErrorMock).toHaveBeenCalledWith(
      'API_PROXY',
      expect.objectContaining({ message: 'private auth backend detail' }),
      { showToast: false }
    );
  });

  describe('ProxyPerson payload validation', () => {
    let rpcMock: any;
    let fromMock: any;

    beforeEach(() => {
      rpcMock = vi.fn(async () => ({ data: null, error: null }));
      fromMock = vi.fn((table: string) => {
        if (table === 'trees') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                maybeSingle: vi.fn(async () => ({ data: { owner_id: 'user-1' }, error: null })),
              })),
            })),
          };
        }
        throw new Error(`Unexpected table ${table}`);
      });
      createSupabaseClientForUserMock.mockReturnValue({ from: fromMock, rpc: rpcMock });
    });

    it('rejects null person entries with 400', async () => {
      const req = {
        method: 'POST',
        headers: { authorization: 'Bearer token' },
        body: {
          treeId: 'tree-1',
          content: {
            'person-1': null,
          },
        },
      };
      const res = createResponse();

      await handler(req as never, res as never);

      expect(res.statusCode).toBe(400);
      expect(res.body).toEqual({ error: 'Invalid person data in content' });
      expect(rpcMock).not.toHaveBeenCalled();
    });

    it('rejects non-object person entries with 400', async () => {
      const req = {
        method: 'POST',
        headers: { authorization: 'Bearer token' },
        body: {
          treeId: 'tree-1',
          content: {
            'person-1': 'not-an-object',
          },
        },
      };
      const res = createResponse();

      await handler(req as never, res as never);

      expect(res.statusCode).toBe(400);
      expect(res.body).toEqual({ error: 'Invalid person data in content' });
      expect(rpcMock).not.toHaveBeenCalled();
    });

    it('rejects missing or non-string person ids with 400', async () => {
      const req = {
        method: 'POST',
        headers: { authorization: 'Bearer token' },
        body: {
          treeId: 'tree-1',
          content: {
            'person-1': {
              firstName: 'John',
            },
          },
        },
      };
      const res = createResponse();

      await handler(req as never, res as never);

      expect(res.statusCode).toBe(400);
      expect(res.body).toEqual({ error: 'Invalid person data in content' });
      expect(rpcMock).not.toHaveBeenCalled();
    });

    it('rejects non-array parents with 400', async () => {
      const req = {
        method: 'POST',
        headers: { authorization: 'Bearer token' },
        body: {
          treeId: 'tree-1',
          content: {
            'person-1': {
              id: 'person-1',
              firstName: 'John',
              parents: 123,
            },
          },
        },
      };
      const res = createResponse();

      await handler(req as never, res as never);

      expect(res.statusCode).toBe(400);
      expect(res.body).toEqual({ error: 'Invalid person data in content' });
      expect(rpcMock).not.toHaveBeenCalled();
    });

    it('rejects non-string-array parents (e.g. array containing numbers) with 400', async () => {
      const req = {
        method: 'POST',
        headers: { authorization: 'Bearer token' },
        body: {
          treeId: 'tree-1',
          content: {
            'person-1': {
              id: 'person-1',
              firstName: 'John',
              parents: [123],
            },
          },
        },
      };
      const res = createResponse();

      await handler(req as never, res as never);

      expect(res.statusCode).toBe(400);
      expect(res.body).toEqual({ error: 'Invalid person data in content' });
      expect(rpcMock).not.toHaveBeenCalled();
    });

    it('allows valid payloads and processes them successfully', async () => {
      const req = {
        method: 'POST',
        headers: { authorization: 'Bearer token' },
        body: {
          treeId: 'tree-1',
          content: {
            'person-1': {
              id: 'person-1',
              firstName: 'Sara',
              lastName: 'Haddad',
              gender: 'female',
              parents: ['person-2'],
            },
          },
        },
      };
      const res = createResponse();

      await handler(req as never, res as never);

      expect(res.statusCode).toBe(200);
      expect(rpcMock).toHaveBeenCalledOnce();
    });
  });
});

