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
}));

import { claimCollaboratorMemberships, fetchTreeAccessRole } from '../supabaseTreeAccessService';

type QueryResult<T> = { data: T; error: unknown };

const createQueryBuilder = <T>(result: QueryResult<T>) => {
  const builder = {
    select: vi.fn(() => builder),
    eq: vi.fn(() => builder),
    or: vi.fn(() => builder),
    single: vi.fn(async () => result),
    maybeSingle: vi.fn(async () => result),
    then: <TReturn, TError = never>(resolve?: ((value: QueryResult<T>) => TReturn | PromiseLike<TReturn>) | null, reject?: ((reason: unknown) => TError | PromiseLike<TError>) | null) => Promise.resolve(result).then(resolve ?? undefined, reject ?? undefined),
  };
  return builder;
};

describe('fetchTreeAccessRole', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns editor when tree_collaborators contains the current user as editor', async () => {
    const fromMock = vi.fn((table: string) => {
      if (table === 'trees') {
        return createQueryBuilder({ data: { owner_id: 'owner-1' }, error: null });
      }
      if (table === 'tree_collaborators') {
        return createQueryBuilder({ data: { role: 'editor' }, error: null });
      }
      throw new Error(`Unexpected table ${table}`);
    });

    getSupabaseWithAuthMock.mockReturnValue({ from: fromMock });

    const role = await fetchTreeAccessRole('tree-1', 'user-1', 'editor@example.com', 'token');

    expect(role).toBe('editor');
  });

  it('returns editor when tree_collaborators contains the current user by collaborator_uid', async () => {
    const fromMock = vi.fn((table: string) => {
      if (table === 'trees') {
        return createQueryBuilder({ data: { owner_id: 'owner-1' }, error: null });
      }
      if (table === 'tree_collaborators') {
        return createQueryBuilder({ data: { role: 'editor', collaborator_uid: 'user-1' }, error: null });
      }
      throw new Error(`Unexpected table ${table}`);
    });

    getSupabaseWithAuthMock.mockReturnValue({ from: fromMock });

    const role = await fetchTreeAccessRole('tree-1', 'user-1', 'stale@example.com', 'token');

    expect(role).toBe('editor');
  });

  it('returns null when no collaborator row exists', async () => {
    const fromMock = vi.fn((table: string) => {
      if (table === 'trees') {
        return createQueryBuilder({ data: { owner_id: 'owner-1' }, error: null });
      }
      if (table === 'tree_collaborators') {
        return createQueryBuilder({ data: null, error: null });
      }
      throw new Error(`Unexpected table ${table}`);
    });

    getSupabaseWithAuthMock.mockReturnValue({ from: fromMock });

    const role = await fetchTreeAccessRole('tree-1', 'user-1', 'viewer@example.com', 'token');

    expect(role).toBeNull();
  });
});

describe('claimCollaboratorMemberships', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('calls claim_collaborator_memberships rpc for authenticated users', async () => {
    const rpcMock = vi.fn(async () => ({ data: 2, error: null }));
    getSupabaseWithAuthMock.mockReturnValue({ rpc: rpcMock });

    const claimed = await claimCollaboratorMemberships('user-1', 'user@example.com', 'token');

    expect(claimed).toBe(2);
    expect(rpcMock).toHaveBeenCalledWith('claim_collaborator_memberships');
  });
});
