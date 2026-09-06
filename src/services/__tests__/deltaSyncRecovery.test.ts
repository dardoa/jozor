import { afterEach, describe, expect, it, vi } from 'vitest';
import { deltaSyncService } from '../deltaSyncService';
import { offlineCache } from '../sync/OfflineCache';
import { useAppStore } from '../../store/useAppStore';

vi.mock('../sync/OfflineCache', () => ({ offlineCache: { getPendingOperations: vi.fn() } }));
vi.mock('../../utils/showToast', () => ({ showToast: { error: vi.fn() } }));

describe('paused sync recovery', () => {
  afterEach(async () => { await deltaSyncService.clearOutgoingQueue(); });

  it('does not overwrite the retry pause emitted while hydrating persisted operations', async () => {
    const treeId = '11111111-1111-4111-8111-111111111111';
    useAppStore.setState({ confirmedPeople: {}, pendingOperations: [], syncStatus: {
      ...useAppStore.getState().syncStatus, state: 'synced', supabaseStatus: 'idle', pendingCount: 0, retryPaused: false,
    } });
    vi.mocked(offlineCache.getPendingOperations).mockResolvedValue([{ tree_id: treeId, user_id: 'test-user',
      type: 'UPDATE_PROP', payload: { id: 'test-person', updates: { photoAsset: null } },
      created_at: '2026-09-05T00:00:00Z', localId: 1, retryCount: 6,
    }]);
    await deltaSyncService.recoverPendingOperations(treeId);
    expect(useAppStore.getState().syncStatus).toMatchObject({ state: 'error', supabaseStatus: 'error', pendingCount: 1, retryPaused: true, retryAttempt: 6 });
    expect(useAppStore.getState().pendingOperations).toHaveLength(1);
  });
});
