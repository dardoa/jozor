import { beforeEach, describe, expect, it, vi } from 'vitest';

const getTreeClientMock = vi.fn();

vi.mock('../supabaseTreeClient', () => ({
  getTreeClient: (...args: unknown[]) => getTreeClientMock(...args),
}));

import { fetchPeopleCountsForTrees } from '../supabaseTreeReadService';

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
    expect(selectMock).toHaveBeenCalledWith('id, people(count)');
    expect(inMock).toHaveBeenCalledWith('id', ['tree-1', 'tree-2']);
    expect(counts).toEqual({ 'tree-1': 2, 'tree-2': 0 });
  });

  it('falls back to batch query on people if embedded counts are unavailable', async () => {
    const fallbackCounts = new Map([
      ['tree-1', 3],
      ['tree-2', 7],
    ]);
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

      if (table === 'people') {
        return {
          select: vi.fn(() => ({
            in: vi.fn(async (_column: string, treeIds: string[]) => {
              const data: { tree_id: string }[] = [];
              for (const tId of treeIds) {
                const count = fallbackCounts.get(tId) ?? 0;
                for (let i = 0; i < count; i++) {
                  data.push({ tree_id: tId });
                }
              }
              return { data, error: null };
            }),
          })),
        };
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
    expect(fromMock).toHaveBeenCalledWith('people');
    expect(counts).toEqual({ 'tree-1': 3, 'tree-2': 7 });
  });

  it('falls back to individual count queries if batch query on people fails', async () => {
    const fallbackCounts = new Map([
      ['tree-1', 3],
      ['tree-2', 7],
    ]);
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

      if (table === 'people') {
        return {
          select: vi.fn(() => ({
            in: vi.fn(async () => ({
              data: null,
              error: new Error('batch query failed'),
            })),
            eq: vi.fn(async (_column: string, treeId: string) => ({
              count: fallbackCounts.get(treeId) ?? 0,
              error: null,
            })),
          })),
        };
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
    expect(fromMock).toHaveBeenCalledWith('people');
    expect(counts).toEqual({ 'tree-1': 3, 'tree-2': 7 });
  });
});
