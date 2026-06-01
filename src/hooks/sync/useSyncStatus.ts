import { useCallback } from 'react';
import { useAppStore } from '../../store/useAppStore';

export function useSyncStatus() {
    const syncStatus = useAppStore((state) => state.syncStatus);
    const setSyncStatus = useAppStore((state) => state.setSyncStatus);

    const forceDriveSync = useCallback(() => {
        window.dispatchEvent(new CustomEvent('force-drive-sync'));
    }, []);

    const onClearSyncCache = useCallback(() => {
        window.dispatchEvent(new CustomEvent('clear-vault-sync-cache'));
    }, []);

    const resetError = useCallback(() => {
        setSyncStatus({
            ...useAppStore.getState().syncStatus,
            state: 'synced',
            errorMessage: undefined,
            lastErrorCategory: undefined,
            lastErrorAt: null,
            lastErrorRetryable: undefined,
            supabaseStatus: 'idle',
            syncBlockedByPlan: false,
        });
        import('../../services/deltaSyncService').then(({ deltaSyncService }) => {
            deltaSyncService.flushPendingChanges();
        });
    }, [setSyncStatus]);

    return {
        syncStatus,
        forceDriveSync,
        onClearSyncCache,
        resetError
    };
}
