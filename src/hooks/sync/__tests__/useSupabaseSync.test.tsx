import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useAppStore } from '../../../store/useAppStore';
import { useSupabaseSync } from '../useSupabaseSync';
import { deltaSyncService } from '../../../services/deltaSyncService';

const { disconnectOperations, disconnectPermissions } = vi.hoisted(() => ({ disconnectOperations: vi.fn(), disconnectPermissions: vi.fn() }));
vi.mock('../../../services/deltaSyncService', () => ({ deltaSyncService: {
  subscribeToTreeOperations: vi.fn(() => ({ unsubscribe: disconnectOperations })),
  subscribeToPermissions: vi.fn(() => ({ unsubscribe: disconnectPermissions })),
} }));
vi.mock('../../../utils/errorLogger', () => ({ logInfo: vi.fn(), logWarn: vi.fn() }));

describe('stable realtime subscriptions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useAppStore.setState({
      currentTreeId: 'synthetic-tree', currentUserRole: 'viewer', isDemoMode: false,
      user: { uid: 'synthetic-user', email: 'synthetic@example.test', displayName: 'Test', photoURL: '', supabaseToken: 'synthetic-token' },
      syncStatus: { ...useAppStore.getState().syncStatus, state: 'synced' },
    });
  });
  it('keeps both subscriptions through saving, error and recovery, then closes on unmount', () => {
    const hook = renderHook(() => useSupabaseSync());
    for (const state of ['saving', 'error', 'synced'] as const) act(() => {
      useAppStore.setState({ syncStatus: { ...useAppStore.getState().syncStatus, state } });
    });
    expect(deltaSyncService.subscribeToTreeOperations).toHaveBeenCalledTimes(1);
    expect(deltaSyncService.subscribeToPermissions).toHaveBeenCalledTimes(1);
    expect(disconnectOperations).not.toHaveBeenCalled();
    expect(disconnectPermissions).not.toHaveBeenCalled();
    hook.unmount();
    expect(disconnectOperations).toHaveBeenCalledOnce();
    expect(disconnectPermissions).toHaveBeenCalledOnce();
  });
  it('recreates the feed on role change and disconnects on logout', () => {
    renderHook(() => useSupabaseSync());
    act(() => useAppStore.setState({ currentUserRole: 'editor' }));
    expect(deltaSyncService.subscribeToTreeOperations).toHaveBeenCalledTimes(2);
    expect(disconnectOperations).toHaveBeenCalledTimes(1);
    act(() => useAppStore.setState({ user: null }));
    expect(disconnectOperations).toHaveBeenCalledTimes(2);
    expect(disconnectPermissions).toHaveBeenCalledTimes(2);
  });
});
