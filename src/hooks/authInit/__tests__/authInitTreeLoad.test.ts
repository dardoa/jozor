import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useAppStore } from '../../../store/useAppStore';
import { createAuthInitTreeLoadHandlers } from '../authInitTreeLoad';
import type { Person } from '../../../types';
import { DEFAULT_PERSON_TEMPLATE } from '../../../constants';

const { getDeletedPersonIdsMock, reconcileTreeMock, recoverPendingOperationsMock } = vi.hoisted(() => ({
  getDeletedPersonIdsMock: vi.fn(),
  reconcileTreeMock: vi.fn(),
  recoverPendingOperationsMock: vi.fn(),
}));

vi.mock('../../../services/storageService', () => ({
  storageService: {
    getDeletedPersonIds: (...args: unknown[]) => getDeletedPersonIdsMock(...args),
  },
}));

vi.mock('../../../services/deltaSyncService', () => ({
  deltaSyncService: {
    reconcileTree: (...args: unknown[]) => reconcileTreeMock(...args),
    recoverPendingOperations: (...args: unknown[]) => recoverPendingOperationsMock(...args),
  },
}));

const buildPerson = (id: string): Person => ({
  id,
  ...DEFAULT_PERSON_TEMPLATE,
  firstName: id,
  lastName: '',
  gender: 'male',
  parents: [],
  children: [],
  spouses: [],
});

describe('authInitTreeLoad', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getDeletedPersonIdsMock.mockResolvedValue([]);
    localStorage.clear();

    useAppStore.setState((state) => ({
      ...state,
      people: {},
      focusId: '',
      deletedPersonIds: new Set(['shared-id']),
      currentTreeId: null,
      currentUserRole: null,
      treeName: 'Family Lineage',
    }));
  });

  it('does not let deleted ids from a previous tree hide people in the newly loaded tree', async () => {
    const setCurrentTreeId = vi.fn((treeId: string | null) => useAppStore.getState().setCurrentTreeId(treeId));
    const setCurrentUserRole = vi.fn((role: 'owner' | 'editor' | 'viewer' | null) =>
      useAppStore.getState().setCurrentUserRole(role)
    );
    const setShowWelcome = vi.fn();

    const handlers = createAuthInitTreeLoadHandlers({
      setCurrentTreeId,
      setCurrentUserRole,
      setShowWelcome,
    });

    handlers.handleTreeLoadSuccess(
      {
        people: {
          'shared-id': buildPerson('shared-id'),
          'other-id': buildPerson('other-id'),
        },
        focusId: 'shared-id',
        name: 'New Tree',
      },
      'owner',
      'tree-new'
    );

    expect(useAppStore.getState().people['shared-id']).toBeDefined();
    expect(useAppStore.getState().focusId).toBe('shared-id');

    await vi.waitFor(() => {
      expect(getDeletedPersonIdsMock).toHaveBeenCalledWith('tree-new');
      expect(reconcileTreeMock).toHaveBeenCalledWith('tree-new');
      expect(recoverPendingOperationsMock).toHaveBeenCalledWith('tree-new');
    });
  });
});
