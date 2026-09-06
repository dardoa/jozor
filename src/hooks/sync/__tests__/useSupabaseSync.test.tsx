import { act, cleanup, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useAppStore } from '../../../store/useAppStore';
import { useSupabaseSync } from '../useSupabaseSync';
import { deltaSyncService } from '../../../services/deltaSyncService';
import { fetchTreeAccessRole } from '../../../services/supabaseTreeAccessService';
import { defaultPersonMediaAssetResolver } from '../../../services/personMediaAssetService';
import { storageService } from '../../../services/storageService';
import type { Person } from '../../../types';
import { createPerson } from '../../../utils/familyLogic';

const { disconnectOperations, disconnectPermissions } = vi.hoisted(() => ({ disconnectOperations: vi.fn(), disconnectPermissions: vi.fn() }));
vi.mock('../../../services/deltaSyncService', () => ({ deltaSyncService: {
  subscribeToTreeOperations: vi.fn(() => ({ unsubscribe: disconnectOperations })),
  subscribeToPermissions: vi.fn((_tree: string, _callback: (event: unknown) => void) => ({ unsubscribe: disconnectPermissions })),
  handlePermissionRevoked: vi.fn(), handlePermissionReadOnly: vi.fn(), handlePermissionGranted: vi.fn(),
  reconcileTree: vi.fn().mockResolvedValue(undefined),
} }));
vi.mock('../../../utils/errorLogger', () => ({ logInfo: vi.fn(), logWarn: vi.fn() }));
vi.mock('../../../services/supabaseTreeAccessService', () => ({ fetchTreeAccessRole: vi.fn() }));
vi.mock('../../../services/personMediaAssetService', () => ({ defaultPersonMediaAssetResolver: { clear: vi.fn() } }));
vi.mock('../../../services/storageService', () => ({ storageService: { setRole: vi.fn(), clearActiveTreeCache: vi.fn().mockResolvedValue(undefined) } }));
vi.mock('../../../utils/showToast', () => ({ showToast: { error: vi.fn() } }));

const flush = () => act(async () => { await Promise.resolve(); });
const permissionEvent = (event: unknown = {}) => act(async () => {
  const calls = vi.mocked(deltaSyncService.subscribeToPermissions).mock.calls;
  calls[calls.length - 1][1](event);
  await Promise.resolve();
});

describe('stable realtime subscriptions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    vi.spyOn(document, 'visibilityState', 'get').mockReturnValue('visible');
    vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(true);
    vi.mocked(fetchTreeAccessRole).mockImplementation(async () => useAppStore.getState().currentUserRole);
    useAppStore.setState({
      currentTreeId: 'synthetic-tree', currentUserRole: 'viewer', isDemoMode: false,
      user: { uid: 'synthetic-user', email: 'synthetic@example.test', displayName: 'Test', photoURL: '', supabaseToken: 'synthetic-token' },
      syncStatus: { ...useAppStore.getState().syncStatus, state: 'synced' },
      people: {}, confirmedPeople: {}, past: [], future: [], pendingOperations: [], sources: {}, citations: {}, language: 'ar',
    });
  });
  afterEach(() => { cleanup(); vi.useRealTimers(); vi.restoreAllMocks(); });
  it('keeps both subscriptions through saving, error and recovery, then closes on unmount', async () => {
    const hook = renderHook(() => useSupabaseSync());
    await flush();
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
  it('recreates the feed on role change and disconnects on logout', async () => {
    renderHook(() => useSupabaseSync());
    await flush();
    act(() => useAppStore.setState({ currentUserRole: 'editor' }));
    await flush();
    expect(deltaSyncService.subscribeToTreeOperations).toHaveBeenCalledTimes(2);
    expect(disconnectOperations).toHaveBeenCalledTimes(1);
    act(() => useAppStore.setState({ user: null }));
    expect(disconnectOperations).toHaveBeenCalledTimes(2);
    expect(disconnectPermissions).toHaveBeenCalledTimes(2);
  });
  it('revalidates an identity-less event and immediately masks loaded private data on downgrade', async () => {
    const privatePerson: Person = { ...createPerson(), id: 'private', firstName: 'Private sentinel', lastName: 'Name', isPrivate: true };
    useAppStore.setState({ currentUserRole: 'editor', people: { private: privatePerson }, confirmedPeople: { private: privatePerson }, past: [{ private: privatePerson }] });
    renderHook(() => useSupabaseSync());
    await flush();
    vi.mocked(fetchTreeAccessRole).mockResolvedValue('viewer');
    await permissionEvent({ eventType: 'UPDATE', id: 'membership' });
    expect(deltaSyncService.handlePermissionReadOnly).toHaveBeenCalledWith('synthetic-tree');
    expect(useAppStore.getState().currentUserRole).toBe('viewer');
    expect(JSON.stringify([useAppStore.getState().people, useAppStore.getState().confirmedPeople])).not.toContain('Private sentinel');
    expect(useAppStore.getState().past).toEqual([]);
    expect(defaultPersonMediaAssetResolver.clear).toHaveBeenCalledOnce();
    expect(storageService.clearActiveTreeCache).toHaveBeenCalledWith('synthetic-tree');
    expect(deltaSyncService.reconcileTree).toHaveBeenCalledWith('synthetic-tree', true);
  });
  it('requests a fresh snapshot on promotion even without an operation event', async () => {
    renderHook(() => useSupabaseSync());
    await flush();
    vi.mocked(fetchTreeAccessRole).mockResolvedValue('editor');
    await permissionEvent();
    expect(useAppStore.getState().currentUserRole).toBe('editor');
    expect(deltaSyncService.handlePermissionGranted).toHaveBeenCalledWith('synthetic-tree');
    expect(deltaSyncService.reconcileTree).toHaveBeenCalledWith('synthetic-tree', true);
  });
  it.each([null, 'no-row'] as const)('clears tree memory and history after authoritative revocation (%s)', async result => {
    renderHook(() => useSupabaseSync());
    await flush();
    localStorage.setItem('lastActiveTreeId', 'synthetic-tree');
    if (result === null) vi.mocked(fetchTreeAccessRole).mockResolvedValue(null);
    else vi.mocked(fetchTreeAccessRole).mockRejectedValue({ code: 'PGRST116' });
    await permissionEvent({ eventType: 'DELETE', id: 'membership' });
    expect(deltaSyncService.handlePermissionRevoked).toHaveBeenCalledWith('synthetic-tree');
    const state = useAppStore.getState();
    expect(state.currentUserRole).toBeNull();
    expect(state.currentTreeId).toBeNull();
    for (const value of [state.people, state.confirmedPeople, state.relationships, state.sources, state.citations, state.locations]) expect(value).toEqual({});
    expect(state.past).toEqual([]);
    expect(state.pendingOperations).toEqual([]);
    expect(localStorage.getItem('lastActiveTreeId')).toBeNull();
    expect(defaultPersonMediaAssetResolver.clear).toHaveBeenCalledOnce();
  });
  it('does not trust a role in the notification or revoke on a transient network error', async () => {
    renderHook(() => useSupabaseSync());
    await flush();
    await permissionEvent({ role: 'editor', collaborator_uid: 'synthetic-user' });
    expect(useAppStore.getState().currentUserRole).toBe('viewer');
    vi.mocked(fetchTreeAccessRole).mockRejectedValue(new TypeError('network unavailable'));
    await permissionEvent({ eventType: 'DELETE' });
    expect(deltaSyncService.handlePermissionRevoked).not.toHaveBeenCalled();
    expect(useAppStore.getState().currentTreeId).toBe('synthetic-tree');
  });
  it.each(['tree', 'account', 'token', 'unmount'] as const)('ignores an in-flight verdict after %s changes', async change => {
    let resolve!: (value: null) => void;
    vi.mocked(fetchTreeAccessRole).mockImplementationOnce(() => new Promise<null>(done => { resolve = done; }));
    const hook = renderHook(() => useSupabaseSync());
    act(() => {
      const user = useAppStore.getState().user!;
      if (change === 'tree') useAppStore.setState({ currentTreeId: 'new-tree' });
      else if (change === 'account') useAppStore.setState({ user: { ...user, uid: 'new-user' } });
      else if (change === 'token') useAppStore.setState({ user: { ...user, supabaseToken: 'new-token' } });
      else hook.unmount();
    });
    await act(async () => { resolve(null); await Promise.resolve(); });
    expect(deltaSyncService.handlePermissionRevoked).not.toHaveBeenCalled();
    expect(useAppStore.getState().currentUserRole).toBe('viewer');
  });
  it('checks on reconnect, focus and bounded visible polling even if no table event arrives', async () => {
    const hook = renderHook(() => useSupabaseSync());
    await flush();
    expect(fetchTreeAccessRole).toHaveBeenCalledTimes(1);
    await act(async () => { window.dispatchEvent(new Event('online')); await Promise.resolve(); });
    await act(async () => { window.dispatchEvent(new Event('focus')); await Promise.resolve(); });
    await act(async () => { await vi.advanceTimersByTimeAsync(30_000); });
    expect(fetchTreeAccessRole).toHaveBeenCalledTimes(4);
    vi.spyOn(document, 'visibilityState', 'get').mockReturnValue('hidden');
    await act(async () => { await vi.advanceTimersByTimeAsync(30_000); });
    expect(fetchTreeAccessRole).toHaveBeenCalledTimes(4);
    hook.unmount();
    await act(async () => { window.dispatchEvent(new Event('online')); await vi.advanceTimersByTimeAsync(30_000); });
    expect(fetchTreeAccessRole).toHaveBeenCalledTimes(4);
  });
  it('coalesces concurrent invalidations and reruns once to avoid losing an event during a request', async () => {
    let resolve!: (value: 'viewer') => void;
    vi.mocked(fetchTreeAccessRole).mockImplementationOnce(() => new Promise<'viewer'>(done => { resolve = done; }));
    renderHook(() => useSupabaseSync());
    await permissionEvent();
    await permissionEvent();
    expect(fetchTreeAccessRole).toHaveBeenCalledTimes(1);
    await act(async () => { resolve('viewer'); await Promise.resolve(); });
    expect(fetchTreeAccessRole).toHaveBeenCalledTimes(2);
  });
});
