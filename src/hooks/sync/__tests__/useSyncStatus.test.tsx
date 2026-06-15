
import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useSyncStatus } from '../useSyncStatus';
import { useAppStore } from '../../../store/useAppStore';

describe('useSyncStatus', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    act(() => {
      useAppStore.setState({
        pendingOperations: [],
        syncingNodes: new Set(),
      });
    });
  });

  it('dispatches force and clear maintenance events', () => {
    const dispatchSpy = vi.spyOn(window, 'dispatchEvent');
    const { result } = renderHook(() => useSyncStatus());

    act(() => {
      result.current.forceDriveSync();
      result.current.onClearSyncCache();
    });

    expect(dispatchSpy).toHaveBeenCalledWith(expect.any(CustomEvent));
    expect(dispatchSpy.mock.calls[0][0].type).toBe('force-drive-sync');
    expect(dispatchSpy.mock.calls[1][0].type).toBe('clear-vault-sync-cache');
  });

  it('resets error state correctly', () => {
    const { result } = renderHook(() => useSyncStatus());
    act(() => {
      result.current.resetError();
    });
    expect(result.current.syncStatus.state).toBe('synced');
    expect(result.current.syncStatus.errorMessage).toBeUndefined();
  });

  it('exposes saving state when pending operations contradict raw synced state', () => {
    act(() => {
      useAppStore.setState({
        syncStatus: {
          ...useAppStore.getState().syncStatus,
          state: 'synced',
          supabaseStatus: 'idle',
          pendingCount: 0,
        },
        pendingOperations: [{
          tree_id: 'tree-1',
          user_id: 'user-1',
          type: 'UPDATE_PROP',
          payload: { id: 'person-1', updates: { firstName: 'Updated' } },
          created_at: '2026-06-15T00:00:00.000Z',
        }],
      });
    });

    const { result } = renderHook(() => useSyncStatus());

    expect(result.current.syncStatus.state).toBe('saving');
    expect(result.current.syncStatus.pendingCount).toBe(1);
  });
});

