// @ts-nocheck
import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useSyncStatus } from '../useSyncStatus';

describe('useSyncStatus', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
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
});

