import { describe, expect, it, vi, beforeEach } from 'vitest';

const { getSupabaseWithAuthMock } = vi.hoisted(() => ({
  getSupabaseWithAuthMock: vi.fn(),
}));

vi.mock('../supabaseClient', () => ({
  supabase: {},
  getSupabaseWithAuth: getSupabaseWithAuthMock,
}));

vi.mock('../../utils/errorLogger', () => ({
  logError: vi.fn(),
  logInfo: vi.fn(),
  logWarn: vi.fn(),
}));

import { fetchTree } from '../supabaseTreeService';

type QueryResult<T> = { data: T; error: unknown };

const createQueryBuilder = <T>(result: QueryResult<T>) => {
  const builder = {
    select: vi.fn(() => builder),
    eq: vi.fn(() => builder),
    gt: vi.fn(() => builder),
    order: vi.fn(() => builder),
    limit: vi.fn(() => builder),
    in: vi.fn(() => builder),
    single: vi.fn(async () => result),
    maybeSingle: vi.fn(async () => result),
    then: <TReturn, TError = never>(resolve?: ((value: QueryResult<T>) => TReturn | PromiseLike<TReturn>) | null, reject?: ((reason: unknown) => TError | PromiseLike<TError>) | null) => Promise.resolve(result).then(resolve ?? undefined, reject ?? undefined),
  };
  return builder;
};

describe('supabaseTreeService.fetchTree', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('replays operation log entries over the current people snapshot on login restore', async () => {
    const treeRow = {
      id: 'tree-1',
      owner_id: 'user-1',
      name: 'Snapshot Cedar',
      focus_id: 'person-1',
      settings: {},
    };

    const peopleRows = [
      {
        id: 'person-1',
        first_name: 'Snapshot',
        last_name: 'Name',
        middle_name: null,
        birth_name: null,
        nick_name: null,
        suffix: null,
        gender: 'male',
        birth_date: null,
        death_date: null,
        birth_place: null,
        death_place: null,
        bio: 'fresh snapshot bio',
        profession: 'Engineer',
        company: 'OpenAI',
        interests: 'Testing',
        photo_url: null,
        email: null,
        website: null,
        blog: null,
        address: null,
        custom_fields: {
          title: 'Mr',
          birthSource: 'registry',
          deathSource: '',
          burialPlace: '',
          residence: 'Riyadh',
          gallery: [],
          voiceNotes: [],
          sources: [],
          events: [],
          partnerDetails: {},
          isPrivate: false,
        },
        metadata: {},
      },
    ];

    const relationshipRows: Array<never> = [];
    const operationRows = [
      {
        tree_id: 'tree-1',
        user_id: 'user-1',
        type: 'UPDATE_PROP',
        payload: { id: 'person-1', updates: { bio: 'replayed operation bio' } },
        version_seq: 8,
      },
    ];

    const fromMock = vi.fn((table: string) => {
      if (table === 'tree_checkpoints') return createQueryBuilder({ data: null, error: null }); // no checkpoint
      if (table === 'trees') return createQueryBuilder({ data: treeRow, error: null });
      if (table === 'people') return createQueryBuilder({ data: peopleRows, error: null });
      if (table === 'relationships') return createQueryBuilder({ data: relationshipRows, error: null });
      if (table === 'tree_operations') return createQueryBuilder({ data: operationRows, error: null });
      throw new Error(`Unexpected table ${table}`);
    });

    getSupabaseWithAuthMock.mockReturnValue({ from: fromMock });

    const result = await fetchTree('tree-1', 'user-1', 'user@example.com', 'token');

    expect(result.ownerId).toBe('user-1');
    expect(result.name).toBe('Snapshot Cedar');
    expect(result.focusId).toBe('person-1');
    expect(result.lastVersion).toBe(8);
    expect(result.people['person-1']).toMatchObject({
      firstName: 'Snapshot',
      lastName: 'Name',
      bio: 'replayed operation bio',
      profession: 'Engineer',
      company: 'OpenAI',
      residence: 'Riyadh',
    });
  });

  it('falls back to an untitled label when the tree name is missing', async () => {
    const treeRow = {
      id: 'tree-2',
      owner_id: 'user-2',
      name: null,
      focus_id: null,
      settings: {},
    };

    const peopleRows = [
      {
        id: 'person-2',
        first_name: 'Fallback',
        last_name: 'Root',
        middle_name: null,
        birth_name: null,
        nick_name: null,
        suffix: null,
        gender: 'female',
        birth_date: null,
        death_date: null,
        birth_place: null,
        death_place: null,
        bio: '',
        profession: '',
        company: '',
        interests: '',
        photo_url: null,
        email: null,
        website: null,
        blog: null,
        address: null,
        custom_fields: {
          title: '',
          birthSource: '',
          deathSource: '',
          burialPlace: '',
          residence: '',
          gallery: [],
          voiceNotes: [],
          sources: [],
          events: [],
          partnerDetails: {},
          isPrivate: false,
        },
        metadata: {},
      },
    ];

    const fromMock = vi.fn((table: string) => {
      if (table === 'tree_checkpoints') return createQueryBuilder({ data: null, error: null }); // no checkpoint
      if (table === 'trees') return createQueryBuilder({ data: treeRow, error: null });
      if (table === 'people') return createQueryBuilder({ data: peopleRows, error: null });
      if (table === 'relationships') return createQueryBuilder({ data: [], error: null });
      if (table === 'tree_operations') return createQueryBuilder({ data: null, error: null });
      throw new Error(`Unexpected table ${table}`);
    });

    getSupabaseWithAuthMock.mockReturnValue({ from: fromMock });

    const result = await fetchTree('tree-2', 'user-2', 'user2@example.com', 'token');

    expect(result.name).toBe('Untitled tree');
    expect(result.focusId).toBe('person-2');
  });

  it('loads from checkpoint and replays trailing operations', async () => {
    const treeRow = {
      id: 'tree-3',
      owner_id: 'user-3',
      name: 'Checkpoint Tree',
      focus_id: 'person-3',
      settings: {},
    };

    const checkpointRow = {
      id: 'cp-1',
      tree_id: 'tree-3',
      version_seq: 10,
      people: {
        'person-3': {
          id: 'person-3',
          firstName: 'Checkpoint',
          lastName: 'User',
          gender: 'female',
          parents: [],
          children: [],
          spouses: [],
          bio: 'original bio',
        },
      },
    };

    const operationRows = [
      {
        tree_id: 'tree-3',
        user_id: 'user-3',
        type: 'UPDATE_PROP',
        payload: { id: 'person-3', updates: { bio: 'updated bio' } },
        version_seq: 12,
      },
    ];

    const fromMock = vi.fn((table: string) => {
      if (table === 'tree_checkpoints') return createQueryBuilder({ data: checkpointRow, error: null });
      if (table === 'trees') return createQueryBuilder({ data: treeRow, error: null });
      if (table === 'tree_operations') return createQueryBuilder({ data: operationRows, error: null });
      throw new Error(`Should not access table ${table} when checkpoint is present`);
    });

    getSupabaseWithAuthMock.mockReturnValue({ from: fromMock });

    const result = await fetchTree('tree-3', 'user-3', 'user3@example.com', 'token');

    expect(result.ownerId).toBe('user-3');
    expect(result.name).toBe('Checkpoint Tree');
    expect(result.focusId).toBe('person-3');
    expect(result.lastVersion).toBe(12);
    expect(result.people['person-3']).toMatchObject({
      firstName: 'Checkpoint',
      lastName: 'User',
      bio: 'updated bio',
    });

    expect(fromMock).toHaveBeenCalledWith('tree_checkpoints');
    expect(fromMock).toHaveBeenCalledWith('tree_operations');
    expect(fromMock).not.toHaveBeenCalledWith('people');
    expect(fromMock).not.toHaveBeenCalledWith('relationships');
  });
});
