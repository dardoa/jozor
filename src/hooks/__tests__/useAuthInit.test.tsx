// @ts-nocheck
import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useAuthInit } from '../useAuthInit';
import { useAppStore } from '../../store/useAppStore';
import { DEFAULT_PERSON_TEMPLATE } from '../../constants';
import type { Person } from '../../types';

const {
  reconcileTreeMock,
  recoverPendingOperationsMock,
  flushPendingChangesMock,
  fetchTreeMock,
  fetchSharedTreesMock,
  fetchTreeAccessRoleMock,
  resolveTreeByPersonMock,
  showErrorMock,
  logErrorMock,
} = vi.hoisted(() => ({
  reconcileTreeMock: vi.fn().mockResolvedValue(undefined),
  recoverPendingOperationsMock: vi.fn().mockResolvedValue(undefined),
  flushPendingChangesMock: vi.fn().mockResolvedValue(undefined),
  fetchTreeMock: vi.fn(),
  fetchSharedTreesMock: vi.fn(),
  fetchTreeAccessRoleMock: vi.fn(),
  resolveTreeByPersonMock: vi.fn(),
  showErrorMock: vi.fn(),
  logErrorMock: vi.fn(),
}));

vi.mock('../../services/deltaSyncService', () => ({
  deltaSyncService: {
    reconcileTree: reconcileTreeMock,
    recoverPendingOperations: recoverPendingOperationsMock,
    flushPendingChanges: flushPendingChangesMock,
  },
}));

vi.mock('../../services/supabaseTreeReadService', () => ({
  fetchTree: fetchTreeMock,
}));

vi.mock('../../services/supabaseTreeAccessService', () => ({
  fetchSharedTrees: fetchSharedTreesMock,
  fetchTreeAccessRole: fetchTreeAccessRoleMock,
}));

vi.mock('../../services/treeService', () => ({
  resolveTreeByPerson: resolveTreeByPersonMock,
}));

vi.mock('../../utils/errorLogger', () => ({
  logError: logErrorMock,
  logInfo: vi.fn(),
  logWarn: vi.fn(),
}));

vi.mock('../../utils/showToast', () => ({
  showToast: Object.assign(
    vi.fn(),
    {
      error: showErrorMock,
      success: vi.fn(),
      promise: vi.fn(),
    }
  )
}));

const buildPerson = (overrides: Partial<Person> = {}): Person => ({
  id: 'person-1',
  ...DEFAULT_PERSON_TEMPLATE,
  firstName: 'Saved',
  lastName: 'Person',
  ...overrides,
});

describe('useAuthInit', () => {
  const validTreeId = '11111111-1111-4111-8111-111111111111';
  const anotherValidTreeId = '22222222-2222-4222-8222-222222222222';
  const routeTreeId = '33333333-3333-4333-8333-333333333333';
  const focusedTreeId = '44444444-4444-4444-8444-444444444444';
  const lockedTreeId = '55555555-5555-4555-8555-555555555555';

  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();

    useAppStore.setState((state) => ({
      ...state,
      user: {
        uid: 'user-1',
        email: 'user@example.com',
        displayName: 'User One',
        photoURL: '',
        supabaseToken: 'token-1',
      },
      isSyncing: false,
      currentTreeId: null,
      currentUserRole: null,
      people: {},
      focusId: 'person-1',
      lastSyncedVersion: 0,
      authLoading: false,
    }));
  });

  it('restores the last active tree from the authoritative snapshot and starts sync recovery', async () => {
    localStorage.setItem('lastActiveTreeId', validTreeId);

    fetchTreeMock.mockResolvedValue({
      people: {
        'person-1': buildPerson({ firstName: 'Restored' }),
      },
      settings: { layoutMode: 'vertical' },
      focusId: 'person-1',
      lastVersion: 8,
      name: 'Restored Tree',
    });
    fetchTreeAccessRoleMock.mockResolvedValue('editor');

    const setShowWelcome = vi.fn();

    renderHook(() =>
      useAuthInit({
        people: {},
        setShowWelcome,
      })
    );

    await waitFor(() => {
      expect(fetchTreeMock).toHaveBeenCalledWith(validTreeId, 'user-1', 'user@example.com', 'token-1');
    });

    await waitFor(() => {
      expect(useAppStore.getState().currentTreeId).toBe(validTreeId);
      expect(useAppStore.getState().currentUserRole).toBe('editor');
      expect(useAppStore.getState().people['person-1']?.firstName).toBe('Restored');
      expect(useAppStore.getState().lastSyncedVersion).toBe(8);
    });

    expect(setShowWelcome).toHaveBeenCalledWith(false);
    expect(reconcileTreeMock).toHaveBeenCalledWith(validTreeId);
    expect(recoverPendingOperationsMock).toHaveBeenCalledWith(validTreeId);
  });

  it('prioritizes routeTreeId over lastActiveTreeId during bootstrap', async () => {
    localStorage.setItem('lastActiveTreeId', anotherValidTreeId);

    fetchTreeMock.mockResolvedValue({
      people: {
        'person-1': buildPerson({ firstName: 'Route' }),
      },
      settings: {},
      focusId: 'person-1',
      lastVersion: 12,
      name: 'Route Tree',
    });
    fetchTreeAccessRoleMock.mockResolvedValue('owner');

    const setShowWelcome = vi.fn();

    renderHook(() =>
      useAuthInit({
        people: {},
        routeTreeId,
        setShowWelcome,
      })
    );

    await waitFor(() => {
      expect(fetchTreeMock).toHaveBeenCalledWith(
        routeTreeId,
        'user-1',
        'user@example.com',
        'token-1'
      );
    });

    expect(fetchTreeMock).not.toHaveBeenCalledWith(
      anotherValidTreeId,
      'user-1',
      'user@example.com',
      'token-1'
    );

    await waitFor(() => {
      expect(useAppStore.getState().currentTreeId).toBe(routeTreeId);
      expect(localStorage.getItem('lastActiveTreeId')).toBe(routeTreeId);
    });
  });

  it('hydrates person focus from routePersonId when the route person exists in the fetched tree', async () => {
    fetchTreeMock.mockResolvedValue({
      people: {
        'person-1': buildPerson({ firstName: 'Fallback' }),
        'person-2': buildPerson({ id: 'person-2', firstName: 'Target' }),
      },
      settings: {},
      focusId: 'person-1',
      lastVersion: 4,
      name: 'Focused Tree',
    });
    fetchTreeAccessRoleMock.mockResolvedValue('viewer');

    const setShowWelcome = vi.fn();

    renderHook(() =>
      useAuthInit({
        people: {},
        routeTreeId: focusedTreeId,
        routePersonId: 'person-2',
        setShowWelcome,
      })
    );

    await waitFor(() => {
      expect(useAppStore.getState().currentTreeId).toBe(focusedTreeId);
      expect(useAppStore.getState().focusId).toBe('person-2');
      expect(useAppStore.getState().currentUserRole).toBe('viewer');
    });
  });

  it('resolves the tree context first when cold-loading a person route without a preloaded tree', async () => {
    resolveTreeByPersonMock.mockResolvedValue({
      treeId: focusedTreeId,
      ownerId: 'owner-1',
      role: 'editor',
      accessType: 'collaborator',
    });
    fetchTreeMock.mockResolvedValue({
      people: {
        'person-1': buildPerson({ firstName: 'Fallback' }),
        'person-2': buildPerson({ id: 'person-2', firstName: 'Target' }),
      },
      settings: {},
      focusId: 'person-1',
      lastVersion: 9,
      name: 'Resolved Tree',
    });

    const setShowWelcome = vi.fn();

    renderHook(() =>
      useAuthInit({
        people: {},
        routePersonId: 'person-2',
        setShowWelcome,
      })
    );

    await waitFor(() => {
      expect(resolveTreeByPersonMock).toHaveBeenCalledWith('person-2');
    });

    await waitFor(() => {
      expect(fetchTreeMock).toHaveBeenCalledWith(
        focusedTreeId,
        'user-1',
        'user@example.com',
        'token-1'
      );
      expect(useAppStore.getState().currentTreeId).toBe(focusedTreeId);
      expect(useAppStore.getState().focusId).toBe('person-2');
      expect(useAppStore.getState().currentUserRole).toBe('editor');
      expect(useAppStore.getState().authLoading).toBe(false);
    });

    expect(localStorage.getItem('lastActiveTreeId')).toBe(focusedTreeId);
    expect(setShowWelcome).toHaveBeenCalledWith(false);
    expect(reconcileTreeMock).toHaveBeenCalledWith(focusedTreeId);
    expect(recoverPendingOperationsMock).toHaveBeenCalledWith(focusedTreeId);
  });

  it('clears stale lastActiveTreeId when restore fails', async () => {
    localStorage.setItem('lastActiveTreeId', validTreeId);
    fetchTreeMock.mockRejectedValue(new Error('not found'));
    fetchTreeAccessRoleMock.mockRejectedValue(new Error('not found'));

    const setShowWelcome = vi.fn();

    renderHook(() =>
      useAuthInit({
        people: {},
        setShowWelcome,
      })
    );

    await waitFor(() => {
      expect(localStorage.getItem('lastActiveTreeId')).toBeNull();
    });

    expect(setShowWelcome).toHaveBeenCalledWith(false);
    expect(logErrorMock).toHaveBeenCalled();
  });

  it('clears lastActiveTreeId when the user no longer has access to the tree', async () => {
    localStorage.setItem('lastActiveTreeId', lockedTreeId);
    fetchTreeMock.mockResolvedValue({
      people: {
        'person-1': buildPerson({ firstName: 'Locked' }),
      },
      settings: {},
      focusId: 'person-1',
      lastVersion: 2,
      name: 'Locked Tree',
    });
    fetchTreeAccessRoleMock.mockResolvedValue(null);

    const setShowWelcome = vi.fn();

    renderHook(() =>
      useAuthInit({
        people: {},
        setShowWelcome,
      })
    );

    await waitFor(() => {
      expect(localStorage.getItem('lastActiveTreeId')).toBeNull();
    });

    expect(setShowWelcome).toHaveBeenCalledWith(false);
    expect(logErrorMock).toHaveBeenCalled();
  });

  it('flushes pending changes before logout and resets local session state', async () => {
    localStorage.setItem('lastActiveTreeId', 'tree-1');

    const logoutMock = vi.fn().mockResolvedValue(undefined);
    const startNewTreeMock = vi.fn();
    const setShowWelcome = vi.fn();

    useAppStore.setState((state) => ({
      ...state,
      currentTreeId: validTreeId,
      logout: logoutMock,
      startNewTree: startNewTreeMock,
    }));

    const { result } = renderHook(() =>
      useAuthInit({
        people: {},
        setShowWelcome,
      })
    );

    await act(async () => {
      await result.current.handleLogout();
    });

    expect(flushPendingChangesMock).toHaveBeenCalledTimes(1);
    expect(logoutMock).toHaveBeenCalledTimes(1);
    expect(startNewTreeMock).toHaveBeenCalledTimes(1);
    expect(setShowWelcome).toHaveBeenCalledWith(true);
    expect(localStorage.getItem('lastActiveTreeId')).toBeNull();
  });
});

