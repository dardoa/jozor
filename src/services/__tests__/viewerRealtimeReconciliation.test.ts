import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { deltaSyncService } from '../deltaSyncService';
import { useAppStore } from '../../store/useAppStore';
import { fetchTree } from '../supabaseTreeReadService';
import { DeltaRemoteSyncClient } from '../sync/DeltaRemoteSyncClient';
import { createPerson } from '../../utils/familyLogic';

vi.mock('../supabaseTreeReadService', () => ({ fetchTree: vi.fn() }));
vi.mock('../../utils/errorLogger', () => ({ logError: vi.fn(), logWarn: vi.fn(), logInfo: vi.fn() }));
const user = { uid: 'synthetic-viewer', email: 'viewer@example.test', displayName: 'Viewer', photoURL: '' };
const treeId = '11111111-1111-4111-8111-111111111111';
const snapshot = () => ({ people: { masked: { ...createPerson(), id: 'masked', firstName: 'Private person' } },
  lastVersion: 0, ownerId: 'synthetic-owner', name: 'Test', focusId: 'masked', settings: {} });

describe('viewer realtime snapshot reconciliation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useAppStore.setState({ user, currentTreeId: treeId, currentUserRole: 'viewer', people: {}, confirmedPeople: {}, pendingOperations: [], lastSyncedVersion: 0 });
  });
  afterEach(() => { vi.restoreAllMocks(); });

  it('reloads the secure snapshot instead of replaying raw deltas and clears saving state', async () => {
    const raw = vi.spyOn(DeltaRemoteSyncClient.prototype, 'fetchRemoteOperations');
    vi.mocked(fetchTree).mockResolvedValue(snapshot());
    await deltaSyncService.reconcileTree(treeId);
    expect(fetchTree).toHaveBeenCalledOnce();
    expect(raw).not.toHaveBeenCalled();
    // The store also enforces the viewer mask on incoming snapshots.
    expect(useAppStore.getState().people.masked.firstName).toBe('Private');
    expect(useAppStore.getState().syncStatus.state).toBe('synced');
  });

  it.each(['account', 'tree', 'role'] as const)('discards a snapshot after a %s change', async change => {
    let resolve!: (value: Awaited<ReturnType<typeof fetchTree>>) => void;
    vi.mocked(fetchTree).mockReturnValue(new Promise(done => { resolve = done; }));
    const request = deltaSyncService.reconcileTree(treeId);
    if (change === 'account') useAppStore.setState({ user: { ...user, uid: 'another-account' } });
    if (change === 'tree') useAppStore.setState({ currentTreeId: 'another-tree' });
    if (change === 'role') useAppStore.setState({ currentUserRole: 'editor' });
    resolve(snapshot());
    await request;
    expect(useAppStore.getState().people).toEqual({});
    expect(useAppStore.getState().confirmedPeople).toEqual({});
  });

  it('refetches once when several signals arrive while a snapshot is in flight', async () => {
    let resolve!: (value: Awaited<ReturnType<typeof fetchTree>>) => void;
    vi.mocked(fetchTree).mockReturnValueOnce(new Promise(done => { resolve = done; })).mockResolvedValue(snapshot());
    const first = deltaSyncService.reconcileTree(treeId);
    await deltaSyncService.reconcileTree(treeId);
    await deltaSyncService.reconcileTree(treeId);
    resolve(snapshot());
    await first;
    await vi.waitFor(() => expect(fetchTree).toHaveBeenCalledTimes(2));
    await vi.waitFor(() => expect(useAppStore.getState().syncStatus.state).toBe('synced'));
  });

  it('shows retryable failure instead of leaving the viewer stuck in saving state', async () => {
    vi.mocked(fetchTree).mockRejectedValue(new Error('Synthetic network outage'));
    await deltaSyncService.reconcileTree(treeId);
    expect(useAppStore.getState().syncStatus).toMatchObject({ state: 'error', lastErrorRetryable: true });
  });
  it('refreshes a promoted editor snapshot even when the operation log has not changed', async () => {
    useAppStore.setState({ currentUserRole: 'editor' });
    const raw = vi.spyOn(DeltaRemoteSyncClient.prototype, 'fetchRemoteOperations').mockResolvedValue([]);
    vi.mocked(fetchTree).mockResolvedValue(snapshot());
    await deltaSyncService.reconcileTree(treeId, true);
    expect(fetchTree).toHaveBeenCalledOnce();
    expect(raw).not.toHaveBeenCalled();
    expect(useAppStore.getState().people.masked.firstName).toBe('Private person');
  });
  it('preserves a queued permission refresh when ordinary reconciliation is already running', async () => {
    useAppStore.setState({ currentUserRole: 'editor' });
    let resolve!: (value: []) => void;
    vi.spyOn(DeltaRemoteSyncClient.prototype, 'fetchRemoteOperations').mockReturnValue(new Promise(done => { resolve = done; }));
    vi.mocked(fetchTree).mockResolvedValue(snapshot());
    const first = deltaSyncService.reconcileTree(treeId);
    await deltaSyncService.reconcileTree(treeId, true);
    await deltaSyncService.reconcileTree(treeId);
    resolve([]);
    await first;
    await vi.waitFor(() => expect(fetchTree).toHaveBeenCalledOnce());
    await vi.waitFor(() => expect(useAppStore.getState().syncStatus.state).toBe('synced'));
    expect(useAppStore.getState().people.masked.firstName).toBe('Private person');
  });
});

describe('editor reconciliation after an operation history gap', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useAppStore.setState({ user, currentTreeId: treeId, currentUserRole: 'editor', people: {}, confirmedPeople: {}, pendingOperations: [], lastSyncedVersion: 10 });
    vi.spyOn(DeltaRemoteSyncClient.prototype, 'fetchRemoteOperations').mockResolvedValueOnce([{
      tree_id: treeId, user_id: user.uid, type: 'UPDATE_PROP',
      payload: { id: 'masked', updates: { firstName: 'Updated' } }, version_seq: 12,
    }]).mockResolvedValue([]);
  });
  afterEach(() => { vi.restoreAllMocks(); });

  it('finishes saving after a successful checkpoint reload', async () => {
    vi.mocked(fetchTree).mockResolvedValue({ ...snapshot(), lastVersion: 12 });
    await deltaSyncService.reconcileTree(treeId);
    expect(fetchTree).toHaveBeenCalledOnce();
    expect(useAppStore.getState().lastSyncedVersion).toBe(12);
    expect(useAppStore.getState().syncStatus.state).toBe('synced');
  });

  it('retains the reconciliation lock until the checkpoint reload settles', async () => {
    let resolve!: (value: Awaited<ReturnType<typeof fetchTree>>) => void;
    vi.mocked(fetchTree).mockReturnValueOnce(new Promise(done => { resolve = done; }));
    const first = deltaSyncService.reconcileTree(treeId);
    await vi.waitFor(() => expect(fetchTree).toHaveBeenCalledOnce());
    const next = deltaSyncService.reconcileTree(treeId);
    expect(DeltaRemoteSyncClient.prototype.fetchRemoteOperations).toHaveBeenCalledTimes(1);
    resolve({ ...snapshot(), lastVersion: 12 });
    await Promise.all([first, next]);
    await vi.waitFor(() => expect(DeltaRemoteSyncClient.prototype.fetchRemoteOperations).toHaveBeenCalledTimes(2));
    await vi.waitFor(() => expect(useAppStore.getState().syncStatus.state).toBe('synced'));
  });

  it.each(['account', 'tree', 'role'] as const)('does not mark a discarded checkpoint synced after a %s change', async change => {
    let resolve!: (value: Awaited<ReturnType<typeof fetchTree>>) => void;
    vi.mocked(fetchTree).mockReturnValueOnce(new Promise(done => { resolve = done; }));
    const request = deltaSyncService.reconcileTree(treeId);
    await vi.waitFor(() => expect(fetchTree).toHaveBeenCalledOnce());
    if (change === 'account') useAppStore.setState({ user: { ...user, uid: 'another-account' } });
    if (change === 'tree') useAppStore.setState({ currentTreeId: 'another-tree' });
    if (change === 'role') useAppStore.setState({ currentUserRole: 'viewer' });
    const status = { ...useAppStore.getState().syncStatus, state: 'error' as const };
    useAppStore.setState({ syncStatus: status });
    resolve({ ...snapshot(), lastVersion: 12 });
    await request;
    expect(useAppStore.getState().people).toEqual({});
    expect(useAppStore.getState().confirmedPeople).toEqual({});
    expect(useAppStore.getState().syncStatus).toBe(status);
  });
});
