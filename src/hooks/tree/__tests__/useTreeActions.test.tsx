
import { renderHook, act } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useTreeActions } from '../useTreeActions';
import { useAppStore } from '../../../store/useAppStore';
import { DEFAULT_PERSON_TEMPLATE } from '../../../constants';
import type { Person } from '../../../types';

const {
  saveFullTreeMock,
  deleteStoredPersonMock,
  debouncedPushMock,
  pushOperationMock,
  pushOperationsMock,
  flushPendingChangesMock,
  updateSearchIndexMock,
} = vi.hoisted(() => ({
  saveFullTreeMock: vi.fn().mockResolvedValue(undefined),
  deleteStoredPersonMock: vi.fn().mockResolvedValue(undefined),
  debouncedPushMock: vi.fn(),
  pushOperationMock: vi.fn().mockResolvedValue(undefined),
  pushOperationsMock: vi.fn().mockResolvedValue(undefined),
  flushPendingChangesMock: vi.fn().mockResolvedValue(undefined),
  updateSearchIndexMock: vi.fn(),
}));

vi.mock('../../../services/storageService', () => ({
  storageService: {
    saveFullTree: saveFullTreeMock,
    deletePerson: deleteStoredPersonMock,
  },
}));

vi.mock('../../../services/deltaSyncService', () => ({
  deltaSyncService: {
    debouncedPush: debouncedPushMock,
    pushOperation: pushOperationMock,
    pushOperations: pushOperationsMock,
    flushPendingChanges: flushPendingChangesMock,
  },
}));

vi.mock('../../../features/activity-log', () => ({
  activityService: {
    logAction: vi.fn(),
  },
}));

vi.mock('../../../services/searchService', () => ({
  searchService: {
    updateSearchIndex: updateSearchIndexMock,
  },
}));

vi.mock('../../../utils/throttle', () => ({
  throttle: <T extends (...args: never[]) => unknown>(fn: T) => fn,
}));

const buildPerson = (overrides: Partial<Person> = {}): Person => ({
  id: 'person-1',
  ...DEFAULT_PERSON_TEMPLATE,
  firstName: 'Before',
  lastName: 'User',
  profession: 'Writer',
  bio: 'Old bio',
  ...overrides,
} as any);

describe('useTreeActions', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    useAppStore.setState({
      people: {
        'person-1': buildPerson(),
      },
      focusId: 'person-1',
      currentTreeId: 'tree-1',
      user: {
        uid: 'user-1',
        displayName: 'User One',
        email: 'user@example.com',
        photoURL: '',
        supabaseToken: 'token-1',
      },
      history: [],
      future: [],
    } as any);
  });

  it('updates the person locally and persists the merged record to sync layers', async () => {
    const { result } = renderHook(() => useTreeActions());

    await act(async () => {
      await result.current.updatePerson('person-1', {
        firstName: 'After',
        bio: 'Fresh bio',
      });
    });

    const updated = useAppStore.getState().people['person-1'];

    expect(updated.firstName).toBe('After');
    expect(updated.bio).toBe('Fresh bio');

    expect(saveFullTreeMock).toHaveBeenCalledTimes(1);
    expect(debouncedPushMock).toHaveBeenCalledWith('tree-1', 'person-1', {
      firstName: 'After',
      bio: 'Fresh bio',
    });
  });

  it('rolls back a local update when the sync queue rejects it', async () => {
    debouncedPushMock.mockResolvedValueOnce(false);
    const { result } = renderHook(() => useTreeActions());

    let updateResult;
    await act(async () => {
      updateResult = await result.current.updatePerson('person-1', {
        firstName: 'After',
        bio: 'Fresh bio',
      });
    });

    const restored = useAppStore.getState().people['person-1'];
    expect(updateResult).toEqual({
      success: false,
      error: 'The change was applied locally, but could not be queued for sync.',
    });
    expect(restored.firstName).toBe('Before');
    expect(restored.bio).toBe('Old bio');
    expect(saveFullTreeMock).not.toHaveBeenCalled();
  });

  it('deletes the person locally, removes the IndexedDB record, and syncs the cloud deletion', async () => {
    const { result } = renderHook(() => useTreeActions());

    let deleteResult;
    await act(async () => {
      deleteResult = await result.current.deletePerson('person-1');
    });

    expect(deleteResult).toEqual({ success: true });
    expect(useAppStore.getState().people['person-1']).toBeUndefined();
    expect(deleteStoredPersonMock).toHaveBeenCalledWith('person-1');
    expect(updateSearchIndexMock).toHaveBeenCalledWith([]);
    expect(pushOperationMock).toHaveBeenCalledWith(
      'tree-1',
      'DELETE_NODE',
      { id: 'person-1' }
    );
  });

  it('rolls back a local delete when the sync queue rejects it', async () => {
    pushOperationMock.mockResolvedValueOnce(false);
    const { result } = renderHook(() => useTreeActions());

    let deleteResult;
    await act(async () => {
      deleteResult = await result.current.deletePerson('person-1');
    });

    expect(deleteResult).toEqual({
      success: false,
      error: 'The person was deleted locally, but could not be queued for sync.',
    });
    expect(useAppStore.getState().people['person-1']).toBeDefined();
    expect(useAppStore.getState().focusId).toBe('person-1');
    expect(saveFullTreeMock).not.toHaveBeenCalled();
  });

  it('adds the first person via sovereign delta operations only', async () => {
    useAppStore.setState({
      people: {},
      focusId: '',
    } as any);

    const { result } = renderHook(() => useTreeActions());

    let addResult;
    await act(async () => {
      addResult = await result.current.addFirstPerson('male');
    });

    const newFocusId = useAppStore.getState().focusId;
    const newPerson = useAppStore.getState().people[newFocusId];

    expect(addResult).toEqual({ success: true });
    expect(newPerson).toBeDefined();
    expect(pushOperationsMock).toHaveBeenCalledWith(
      'tree-1',
      [
        {
          type: 'ADD_NODE',
          payload: {
            person: newPerson,
            type: 'initial',
          },
        },
        {
          type: 'SET_TREE_METADATA',
          payload: {
            treeMetadata: {
              rootId: newPerson.id,
              focusId: newPerson.id,
            },
          },
        },
      ]
    );
  });
});

