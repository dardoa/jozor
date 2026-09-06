import { useEffect, useCallback } from 'react';
import { useAppStore } from '../../store/useAppStore';
import { deltaSyncService } from '../../services/deltaSyncService';
import { logInfo, logWarn } from '../../utils/errorLogger';
import { showToast } from '../../utils/showToast';
import type { DeltaOperation } from '../../services/sync/SyncTypes';
import { fetchTreeAccessRole } from '../../services/supabaseTreeAccessService';
import { storageService } from '../../services/storageService';
import { defaultPersonMediaAssetResolver } from '../../services/personMediaAssetService';

/**
 * Micro-hook responsible for managing Supabase Realtime subscriptions.
 * It listens for incoming operations and applies them securely,
 * and also listens for permission changes (e.g. role demotion/promotion).
 */
export const useSupabaseSync = () => {
    const currentTreeId = useAppStore((state) => state.currentTreeId);
    const isDemoMode = useAppStore((state) => state.isDemoMode);
    const user = useAppStore((state) => state.user);
    const currentUserRole = useAppStore((state) => state.currentUserRole);
    const setCurrentUserRole = useAppStore((state) => state.setCurrentUserRole);
    const setCurrentTreeId = useAppStore((state) => state.setCurrentTreeId);
    const syncState = useAppStore((state) => state.syncStatus.state);
    const isSyncInitialized = syncState !== 'checking';
    // Use supabaseToken (Supabase JWT) as the subscription guard — supabaseAccessToken is the backup.
    const supabaseToken = user?.supabaseToken ?? null;

    const handleRemoteOperation = useCallback((op: DeltaOperation) => {
        logInfo('SYNC', 'SUPABASE_REMOTE_OPERATION_RECEIVED', { op });
        deltaSyncService.applyOperation(op);
    }, []);

    // Realtime Delta Sync Lifecycle
    useEffect(() => {
        if (!currentTreeId || isDemoMode || !supabaseToken || !isSyncInitialized) return;

        logInfo('SYNC', 'SUPABASE_REALTIME_SUBSCRIBED', { treeId: currentTreeId });
        const channel = deltaSyncService.subscribeToTreeOperations(currentTreeId, handleRemoteOperation);

        return () => {
            if (channel) {
                logInfo('SYNC', 'SUPABASE_REALTIME_UNSUBSCRIBED', { treeId: currentTreeId });
                channel.unsubscribe();
            }
        };
    }, [currentTreeId, isDemoMode, supabaseToken, handleRemoteOperation, isSyncInitialized, currentUserRole]);

    // Realtime Permission/RoleSync
    useEffect(() => {
        if (!currentTreeId || isDemoMode || !supabaseToken || !isSyncInitialized || (!user?.email && !user?.uid)) return;

        logInfo('SYNC', 'SUPABASE_PERMISSION_SUBSCRIBED', { treeId: currentTreeId });
        let disposed = false;
        let checking = false;
        let checkAgain = false;
        const isCurrent = () => {
            const state = useAppStore.getState();
            return !disposed && state.currentTreeId === currentTreeId && state.user?.uid === user.uid
                && state.user?.supabaseToken === supabaseToken && !state.isDemoMode;
        };
        const revalidate = async () => {
            if (!isCurrent() || !navigator.onLine) return;
            if (checking) { checkAgain = true; return; }
            checking = true;
            try {
                let role;
                try {
                    role = await fetchTreeAccessRole(currentTreeId, user.uid, user.email || '', supabaseToken);
                } catch (error) {
                    // A no-longer-visible tree produces no row under RLS. Network
                    // failures must not be confused with an authoritative revocation.
                    if (typeof error === 'object' && error !== null && 'code' in error && error.code === 'PGRST116') {
                        role = null;
                    } else { throw error; }
                }
                if (!isCurrent()) return;
                const state = useAppStore.getState();
                const isArabic = state.language === 'ar';
                if (role === null) {
                    deltaSyncService.handlePermissionRevoked(currentTreeId);
                    defaultPersonMediaAssetResolver.clear();
                    state.clearHistory();
                    useAppStore.setState({ people: {}, confirmedPeople: {}, relationships: {}, sources: {}, citations: {},
                        locations: {}, focusId: '', pendingOperations: [], syncingNodes: new Set(), peopleVersion: state.peopleVersion + 1 });
                    setCurrentUserRole(null);
                    setCurrentTreeId(null);
                    void storageService.clearActiveTreeCache(currentTreeId);
                    localStorage.removeItem('lastActiveTreeId');
                    showToast.error(isArabic ? 'أُزيل وصولك إلى هذه الشجرة.' : 'Your access to this tree was removed.');
                } else if (role !== state.currentUserRole) {
                    if (role === 'viewer') {
                        deltaSyncService.handlePermissionReadOnly(currentTreeId);
                        defaultPersonMediaAssetResolver.clear();
                        state.clearHistory();
                        showToast.error(isArabic ? 'أصبح وصولك للمشاهدة فقط. تم تعطيل التعديل.' : 'Your access is now view-only. Editing has been disabled.');
                    } else {
                        deltaSyncService.handlePermissionGranted(currentTreeId);
                    }
                    setCurrentUserRole(role);
                    // Role promotion can reveal data absent from the viewer
                    // snapshot, even when there are no new operation deltas.
                    void deltaSyncService.reconcileTree(currentTreeId, true);
                }
            } catch {
                if (isCurrent()) logWarn('SYNC', 'SUPABASE_ROLE_REVALIDATION_FAILED', { metadata: { treeId: currentTreeId } });
            } finally {
                checking = false;
                if (checkAgain && isCurrent()) { checkAgain = false; void revalidate(); }
            }
        };
        // DELETE payloads can omit identity under RLS; treat every scoped event
        // (including reconnect) as invalidation, never as permission authority.
        const channel = deltaSyncService.subscribeToPermissions(currentTreeId, () => { void revalidate(); });
        const checkWhenVisible = () => { if (document.visibilityState === 'visible') void revalidate(); };
        window.addEventListener('online', checkWhenVisible);
        window.addEventListener('focus', checkWhenVisible);
        document.addEventListener('visibilitychange', checkWhenVisible);
        // Revoked members may receive no table event at all under RLS.
        const timer = window.setInterval(checkWhenVisible, 30_000);
        void revalidate();

        return () => {
            disposed = true;
            window.clearInterval(timer);
            window.removeEventListener('online', checkWhenVisible);
            window.removeEventListener('focus', checkWhenVisible);
            document.removeEventListener('visibilitychange', checkWhenVisible);
            if (channel) {
                logInfo('SYNC', 'SUPABASE_PERMISSION_UNSUBSCRIBED', { treeId: currentTreeId });
                channel.unsubscribe();
            }
        };
    }, [currentTreeId, isDemoMode, supabaseToken, user?.uid, user?.email, currentUserRole, setCurrentUserRole, setCurrentTreeId, isSyncInitialized]);
};
