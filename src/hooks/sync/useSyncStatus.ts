import { useCallback, useMemo } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { deriveCanonicalTreeSync } from '../../domain/sync/canonicalSyncState';
import { useAppStore } from '../../store/useAppStore';

export function useSyncStatus() {
    const {
        rawSyncStatus,
        pendingOperationsCount,
        syncingNodesCount,
    } = useAppStore(useShallow((state) => ({
        rawSyncStatus: state.syncStatus,
        pendingOperationsCount: state.pendingOperations.length,
        syncingNodesCount: state.syncingNodes.size,
    })));
    const setSyncStatus = useAppStore((state) => state.setSyncStatus);
    const syncStatus = useMemo(() => {
        const canonical = deriveCanonicalTreeSync({
            syncStatus: rawSyncStatus,
            pendingOperationsCount,
            syncingNodesCount,
        });

        return {
            ...rawSyncStatus,
            state: canonical.state,
            pendingCount: canonical.pendingCount,
        };
    }, [pendingOperationsCount, rawSyncStatus, syncingNodesCount]);

    const forceDriveSync = useCallback(() => {
        window.dispatchEvent(new CustomEvent('force-drive-sync'));
    }, []);

    const onClearSyncCache = useCallback(() => {
        window.dispatchEvent(new CustomEvent('clear-vault-sync-cache'));
    }, []);

    const resetError = useCallback(() => {
        setSyncStatus({
            ...useAppStore.getState().syncStatus,
            state: useAppStore.getState().pendingOperations.length > 0 ? 'saving' : 'synced',
            errorMessage: undefined,
            lastErrorCategory: undefined,
            lastErrorAt: null,
            lastErrorRetryable: undefined,
            supabaseStatus: useAppStore.getState().pendingOperations.length > 0 ? 'syncing' : 'idle',
            syncBlockedByPlan: false,
            retryPaused: false,
            retryAttempt: 0,
            nextRetryAt: null,
        });
        import('../../services/deltaSyncService').then(({ deltaSyncService }) => {
            deltaSyncService.retryPendingChanges();
        });
    }, [setSyncStatus]);

    return {
        syncStatus,
        forceDriveSync,
        onClearSyncCache,
        resetError
    };
}
