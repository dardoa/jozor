import { describe, expect, it } from 'vitest';
import type { SyncStatus } from '../../../types';
import { deriveCanonicalTreeSync } from '../canonicalSyncState';

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

describe('deriveCanonicalTreeSync', () => {
  it('does not report synced while local operations remain pending', () => {
    const result = deriveCanonicalTreeSync({
      syncStatus: buildStatus(),
      pendingOperationsCount: 3,
    });

    expect(result.state).toBe('saving');
    expect(result.pendingCount).toBe(3);
    expect(result.isSynced).toBe(false);
    expect(result.hasPendingWork).toBe(true);
  });

  it('uses the largest known pending count', () => {
    const result = deriveCanonicalTreeSync({
      syncStatus: buildStatus({ pendingCount: 4 }),
      pendingOperationsCount: 2,
    });

    expect(result.pendingCount).toBe(4);
    expect(result.state).toBe('saving');
  });

  it('keeps errors authoritative even when work is pending', () => {
    const result = deriveCanonicalTreeSync({
      syncStatus: buildStatus({
        state: 'error',
        supabaseStatus: 'error',
        pendingCount: 2,
      }),
      pendingOperationsCount: 2,
    });

    expect(result.state).toBe('error');
    expect(result.requiresAction).toBe(true);
    expect(result.isSyncing).toBe(false);
  });

  it('preserves bootstrap and offline states', () => {
    expect(deriveCanonicalTreeSync({
      syncStatus: buildStatus({ state: 'checking' }),
      pendingOperationsCount: 1,
    }).state).toBe('checking');

    expect(deriveCanonicalTreeSync({
      syncStatus: buildStatus({ state: 'offline' }),
      pendingOperationsCount: 1,
    }).state).toBe('offline');
  });

  it('reports synced only when no local or remote confirmation work remains', () => {
    const result = deriveCanonicalTreeSync({
      syncStatus: buildStatus(),
      pendingOperationsCount: 0,
      syncingNodesCount: 0,
    });

    expect(result.state).toBe('synced');
    expect(result.isSynced).toBe(true);
    expect(result.hasPendingWork).toBe(false);
  });
});
