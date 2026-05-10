// @ts-nocheck
import { beforeEach, describe, expect, it, vi } from 'vitest';

const invokeMock = vi.fn();

vi.mock('../supabaseClient', () => ({
  getSupabaseFull: vi.fn(() => ({
    functions: {
      invoke: invokeMock,
    },
  })),
}));

const loadModule = async () => import('../treeService');

describe('treeService.resolveTreeByPerson', () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    localStorage.clear();
    const { clearResolvedTreeContextCache } = await loadModule();
    clearResolvedTreeContextCache();
  });

  it('invokes the edge function and caches the resolution for the session', async () => {
    invokeMock.mockResolvedValue({
      data: {
        treeId: 'tree-1',
        ownerId: 'owner-1',
        role: 'owner',
        accessType: 'owner',
      },
      error: null,
    });

    const { resolveTreeByPerson } = await loadModule();

    const first = await resolveTreeByPerson('person-1');
    const second = await resolveTreeByPerson('person-1');

    expect(first.treeId).toBe('tree-1');
    expect(second.treeId).toBe('tree-1');
    expect(invokeMock).toHaveBeenCalledTimes(1);
    expect(invokeMock).toHaveBeenCalledWith('resolve-tree-context', {
      body: { personId: 'person-1' },
    });
  });
});

