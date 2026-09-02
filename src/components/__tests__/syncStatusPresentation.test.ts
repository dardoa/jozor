import { describe, expect, it } from 'vitest';

import type { SyncStatus } from '../../types';
import { deriveSyncStatusPresentation } from '../syncStatusPresentation';

const buildStatus = (overrides: Partial<SyncStatus> = {}): SyncStatus => ({
  state: 'synced',
  lastSyncTime: null,
  lastSyncSupabase: null,
  lastSyncDrive: null,
  supabaseStatus: 'idle',
  driveStatus: 'idle',
  pendingCount: 0,
  ...overrides,
});

describe('deriveSyncStatusPresentation', () => {
  it('keeps database, queue, Drive connection, and backup link states independent', () => {
    expect(deriveSyncStatusPresentation({
      syncStatus: buildStatus(),
      driveConnectionState: 'connected',
      hasLinkedBackup: false,
    })).toEqual({
      databaseState: 'synced',
      queueState: 'clear',
      driveConnectionState: 'connected',
      backupState: 'unlinked',
      primaryAction: 'open-backups',
    });

    expect(deriveSyncStatusPresentation({
      syncStatus: buildStatus({ lastSyncDrive: new Date('2026-01-01T00:00:00.000Z') }),
      driveConnectionState: 'connected',
      hasLinkedBackup: true,
    }).backupState).toBe('backed-up');
  });

  it('prioritizes retrying database changes before backup actions', () => {
    const result = deriveSyncStatusPresentation({
      syncStatus: buildStatus({
        state: 'error',
        supabaseStatus: 'error',
        pendingCount: 3,
        driveStatus: 'error',
      }),
      driveConnectionState: 'connected',
      hasLinkedBackup: true,
    });

    expect(result.databaseState).toBe('error');
    expect(result.queueState).toBe('pending');
    expect(result.backupState).toBe('error');
    expect(result.primaryAction).toBe('retry-database');
  });

  it('does not offer network actions while offline or already syncing', () => {
    expect(deriveSyncStatusPresentation({
      syncStatus: buildStatus({ state: 'offline', pendingCount: 2 }),
      driveConnectionState: 'connected',
      hasLinkedBackup: true,
    }).primaryAction).toBeNull();

    expect(deriveSyncStatusPresentation({
      syncStatus: buildStatus({ state: 'saving', pendingCount: 1 }),
      driveConnectionState: 'connected',
      hasLinkedBackup: true,
    }).primaryAction).toBeNull();
  });
});
