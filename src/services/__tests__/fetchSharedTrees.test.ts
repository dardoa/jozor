
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { getSupabaseWithAuthMock } = vi.hoisted(() => {
  return { getSupabaseWithAuthMock: vi.fn() };
});

vi.mock('../supabaseClient', () => ({
  supabase: {},
  getSupabaseWithAuth: getSupabaseWithAuthMock,
}));

vi.mock('../../utils/errorLogger', () => ({
  logError: vi.fn(),
  logInfo: vi.fn(),
  logWarn: vi.fn(),
}));

import { fetchSharedTrees } from '../supabaseTreeAccessService';

type QueryResult<T> = { data: T; error: unknown };

const createQueryBuilder = <T>(result: QueryResult<T>) => {
  const builder = {
    select: vi.fn(() => builder),
    eq: vi.fn(() => builder),
    or: vi.fn(() => builder),
    in: vi.fn(() => builder),
    order: vi.fn(() => builder),
    single: vi.fn(async () => result),
    maybeSingle: vi.fn(async () => result),
    then: <TReturn, TError = never>(
      resolve?: ((value: QueryResult<T>) => TReturn | PromiseLike<TReturn>) | null,
      reject?: ((reason: unknown) => TError | PromiseLike<TError>) | null
    ) => Promise.resolve(result).then(resolve ?? undefined, reject ?? undefined),
  };
  return builder;
};

describe('fetchSharedTrees', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('builds shared tree summaries from tree_collaborators and trees only', async () => {
    const fromMock = vi.fn((table: string) => {
      if (table === 'tree_collaborators') {
        return createQueryBuilder({
          data: [{ tree_id: 'tree-2', role: 'editor', collaborator_uid: 'user-1', email: 'editor@example.com' }],
          error: null,
        });
      }
      if (table === 'trees') {
        return createQueryBuilder({
          data: [
            {
              id: 'tree-2',
              owner_id: 'owner-2',
              name: 'Shared Tree',
              created_at: '2026-01-01T00:00:00Z',
              updated_at: '2026-01-02T00:00:00Z',
            },
          ],
          error: null,
        });
      }
      throw new Error(`Unexpected table ${table}`);
    });

    getSupabaseWithAuthMock.mockReturnValue({ from: fromMock });

    const result = await fetchSharedTrees('user-1', 'editor@example.com', 'token');

    expect(result).toEqual([
      {
        id: 'tree-2',
        name: 'Shared Tree',
        isPublic: false,
        createdAt: '2026-01-01T00:00:00Z',
        updatedAt: '2026-01-02T00:00:00Z',
        role: 'editor',
      },
    ]);
    expect(fromMock).not.toHaveBeenCalledWith('tree_shares');
  });

  it('supports collaborator_uid rows even when email is stale', async () => {
    const fromMock = vi.fn((table: string) => {
      if (table === 'tree_collaborators') {
        return createQueryBuilder({
          data: [{ tree_id: 'tree-2', role: 'viewer', collaborator_uid: 'user-1', email: 'old@example.com' }],
          error: null,
        });
      }
      if (table === 'trees') {
        return createQueryBuilder({
          data: [
            {
              id: 'tree-2',
              owner_id: 'owner-2',
              name: 'Shared Tree',
              created_at: '2026-01-01T00:00:00Z',
              updated_at: '2026-01-02T00:00:00Z',
            },
          ],
          error: null,
        });
      }
      throw new Error(`Unexpected table ${table}`);
    });

    getSupabaseWithAuthMock.mockReturnValue({ from: fromMock });

    const result = await fetchSharedTrees('user-1', 'current@example.com', 'token');

    expect(result[0]?.role).toBe('viewer');
    expect(result[0]?.id).toBe('tree-2');
  });
});

