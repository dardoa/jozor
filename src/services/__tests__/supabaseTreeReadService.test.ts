import { beforeEach, describe, expect, it, vi } from 'vitest';

const getTreeClientMock = vi.fn();

vi.mock('../supabaseTreeClient', () => ({
  getTreeClient: (...args: unknown[]) => getTreeClientMock(...args),
}));

// Mock logError so we don't clutter terminal logs and can assert on error logging
vi.mock('../../utils/errorLogger', () => ({
  logError: vi.fn(),
}));

import { fetchPeopleCountsForTrees } from '../supabaseTreeReadService';
import { logError } from '../../utils/errorLogger';

type PeopleQueryResult = {
  data: Array<{ id: string; tree_id: string }> | null;
  error: Error | null;
};

type PeopleQueryChain = {
  select: ReturnType<typeof vi.fn>;
  in: ReturnType<typeof vi.fn>;
  order: ReturnType<typeof vi.fn>;
  range: ReturnType<typeof vi.fn<(...args: number[]) => Promise<PeopleQueryResult>>>;
};

const createPeopleQueryChain = (): PeopleQueryChain => {
  const chain = {} as PeopleQueryChain;
  chain.select = vi.fn(() => chain);
  chain.in = vi.fn(() => chain);
  chain.order = vi.fn(() => chain);
  chain.range = vi.fn();
  return chain;
};

describe('supabaseTreeReadService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('fetches people counts for multiple trees with one embedded query', async () => {
    const inMock = vi.fn(async () => ({
      data: [
        { id: 'tree-1', people: [{ count: 2 }] },
        { id: 'tree-2', people: [{ count: 0 }] },
      ],
      error: null,
    }));
    const selectMock = vi.fn(() => ({ in: inMock }));
    const fromMock = vi.fn((table: string) => {
      expect(table).toBe('trees');
      return { select: selectMock };
    });
    getTreeClientMock.mockReturnValue({ from: fromMock });

    const counts = await fetchPeopleCountsForTrees(
      ['tree-1', 'tree-2', 'tree-1'],
      'owner-1',
      'owner@example.com',
      'token'
    );

    expect(getTreeClientMock).toHaveBeenCalledWith('owner-1', 'owner@example.com', 'token');
    expect(fromMock).toHaveBeenCalledTimes(1);
    expect(selectMock).toHaveBeenCalledWith('id, people_secure!people_tree_id_fkey(count)');
    expect(inMock).toHaveBeenCalledWith('id', ['tree-1', 'tree-2']);
    expect(counts).toEqual({ 'tree-1': 2, 'tree-2': 0 });
  });

  it('falls back to batch query on people if embedded counts are unavailable (less than 1000 rows)', async () => {
    const peopleChain = createPeopleQueryChain();
    peopleChain.range = vi.fn(async () => ({
      data: [
        { id: 'p1', tree_id: 'tree-1' },
        { id: 'p2', tree_id: 'tree-1' },
        { id: 'p3', tree_id: 'tree-2' },
      ],
      error: null,
    }));

    const fromMock = vi.fn((table: string) => {
      if (table === 'trees') {
        return {
          select: vi.fn(() => ({
            in: vi.fn(async () => ({
              data: null,
              error: new Error('embedded relation unavailable'),
            })),
          })),
        };
      }

      if (table === 'people_secure') {
        return peopleChain;
      }

      throw new Error(`Unexpected table ${table}`);
    });
    getTreeClientMock.mockReturnValue({ from: fromMock });

    const counts = await fetchPeopleCountsForTrees(
      ['tree-1', 'tree-2'],
      'owner-1',
      'owner@example.com'
    );

    expect(fromMock).toHaveBeenCalledWith('trees');
    expect(fromMock).toHaveBeenCalledWith('people_secure');
    expect(peopleChain.range).toHaveBeenCalledWith(0, 999);
    expect(counts).toEqual({ 'tree-1': 2, 'tree-2': 1 });
  });

  it('requests subsequent pages when exactly 1000 rows are returned in the first page', async () => {
    const peopleChain = createPeopleQueryChain();

    // Page 1 returns exactly 1000 rows of tree-1
    const page1Data = Array.from({ length: 1000 }, (_, i) => ({ id: `p-${i}`, tree_id: 'tree-1' }));

    peopleChain.range = vi
      .fn()
      .mockImplementationOnce(async () => ({ data: page1Data, error: null }))
      .mockImplementationOnce(async () => ({ data: [], error: null })); // Page 2 empty

    const fromMock = vi.fn((table: string) => {
      if (table === 'trees') {
        return {
          select: vi.fn(() => ({
            in: vi.fn(async () => ({ data: null, error: new Error('fallback') })),
          })),
        };
      }
      if (table === 'people_secure') {
        return peopleChain;
      }
      throw new Error(`Unexpected table ${table}`);
    });
    getTreeClientMock.mockReturnValue({ from: fromMock });

    const counts = await fetchPeopleCountsForTrees(['tree-1'], 'owner-1', 'owner@example.com');

    expect(peopleChain.range).toHaveBeenCalledTimes(2);
    expect(peopleChain.range).toHaveBeenNthCalledWith(1, 0, 999);
    expect(peopleChain.range).toHaveBeenNthCalledWith(2, 1000, 1999);
    expect(counts).toEqual({ 'tree-1': 1000 });
  });

  it('aggregates counts across multiple pages (> 1000 rows)', async () => {
    const peopleChain = createPeopleQueryChain();

    const page1Data = Array.from({ length: 1000 }, (_, i) => ({ id: `p-${i}`, tree_id: 'tree-1' }));
    const page2Data = [
      { id: 'p-1000', tree_id: 'tree-1' },
      { id: 'p-1001', tree_id: 'tree-2' },
    ];

    peopleChain.range = vi
      .fn()
      .mockImplementationOnce(async () => ({ data: page1Data, error: null }))
      .mockImplementationOnce(async () => ({ data: page2Data, error: null })); // Page 2 has 2 rows (length < 1000, terminates)

    const fromMock = vi.fn((table: string) => {
      if (table === 'trees') {
        return {
          select: vi.fn(() => ({
            in: vi.fn(async () => ({ data: null, error: new Error('fallback') })),
          })),
        };
      }
      if (table === 'people_secure') {
        return peopleChain;
      }
      throw new Error(`Unexpected table ${table}`);
    });
    getTreeClientMock.mockReturnValue({ from: fromMock });

    const counts = await fetchPeopleCountsForTrees(
      ['tree-1', 'tree-2'],
      'owner-1',
      'owner@example.com'
    );

    expect(peopleChain.range).toHaveBeenCalledTimes(2);
    expect(counts).toEqual({ 'tree-1': 1001, 'tree-2': 1 });
  });

  it('fails safely and returns {} immediately on query error or page failure', async () => {
    const peopleChain = createPeopleQueryChain();

    // Page 1 succeeds, page 2 fails
    const page1Data = Array.from({ length: 1000 }, (_, i) => ({ id: `p-${i}`, tree_id: 'tree-1' }));
    peopleChain.range = vi
      .fn()
      .mockImplementationOnce(async () => ({ data: page1Data, error: null }))
      .mockImplementationOnce(async () => ({
        data: null,
        error: new Error('Page 2 database timeout'),
      }));

    const fromMock = vi.fn((table: string) => {
      if (table === 'trees') {
        return {
          select: vi.fn(() => ({
            in: vi.fn(async () => ({ data: null, error: new Error('fallback') })),
          })),
        };
      }
      if (table === 'people_secure') {
        return peopleChain;
      }
      throw new Error(`Unexpected table ${table}`);
    });
    getTreeClientMock.mockReturnValue({ from: fromMock });

    const counts = await fetchPeopleCountsForTrees(['tree-1'], 'owner-1', 'owner@example.com');

    expect(counts).toEqual({});
    expect(logError).toHaveBeenCalledTimes(1);
    expect(logError).toHaveBeenCalledWith('fetchPeopleCountsPaginated', expect.any(Error), {
      category: 'DATABASE',
      severity: 'LOW',
    });
  });
});
