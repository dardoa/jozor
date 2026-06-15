import type { SyncState, SyncStatus } from '../../types';

export interface CanonicalTreeSyncSnapshot {
  state: SyncState;
  pendingCount: number;
  isSynced: boolean;
  isSyncing: boolean;
  hasPendingWork: boolean;
  requiresAction: boolean;
}

interface CanonicalTreeSyncInput {
  syncStatus: SyncStatus;
  pendingOperationsCount?: number;
  syncingNodesCount?: number;
}

export const deriveCanonicalTreeSync = ({
  syncStatus,
  pendingOperationsCount = 0,
  syncingNodesCount = 0,
}: CanonicalTreeSyncInput): CanonicalTreeSyncSnapshot => {
  const pendingCount = Math.max(syncStatus.pendingCount, pendingOperationsCount);
  const hasPendingWork = pendingCount > 0 || syncingNodesCount > 0;

  let state: SyncState;
  if (syncStatus.state === 'offline') {
    state = 'offline';
  } else if (syncStatus.state === 'checking') {
    state = 'checking';
  } else if (
    syncStatus.state === 'error'
    || syncStatus.supabaseStatus === 'error'
    || syncStatus.retryPaused
  ) {
    state = 'error';
  } else if (
    syncStatus.state === 'saving'
    || syncStatus.supabaseStatus === 'syncing'
    || hasPendingWork
  ) {
    state = 'saving';
  } else {
    state = 'synced';
  }

  return {
    state,
    pendingCount,
    isSynced: state === 'synced',
    isSyncing: state === 'saving',
    hasPendingWork,
    requiresAction: state === 'error' || state === 'offline',
  };
};
