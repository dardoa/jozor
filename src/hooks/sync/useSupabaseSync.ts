import { useEffect, useCallback } from 'react';
import { useAppStore } from '../../store/useAppStore';
import { deltaSyncService } from '../../services/deltaSyncService';
import { logInfo, logWarn } from '../../utils/errorLogger';
import { showToast } from '../../utils/showToast';
import type { DeltaOperation } from '../../services/sync/SyncTypes';

type PermissionCollaboratorEvent = {
    eventType?: 'INSERT' | 'UPDATE' | 'DELETE';
    email?: string;
    collaborator_uid?: string;
    role?: 'editor' | 'viewer';
    tree_id?: string;
};

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
    // Use supabaseToken (Supabase JWT) as the subscription guard — supabaseAccessToken is the backup.
    const supabaseToken = user?.supabaseToken ?? null;

    const handleRemoteOperation = useCallback((op: DeltaOperation) => {
        logInfo('SYNC', 'SUPABASE_REMOTE_OPERATION_RECEIVED', { op });
        deltaSyncService.applyOperation(op);
    }, []);

    // Realtime Delta Sync Lifecycle
    useEffect(() => {
        if (!currentTreeId || isDemoMode || !supabaseToken || syncState !== 'synced') return;

        logInfo('SYNC', 'SUPABASE_REALTIME_SUBSCRIBED', { treeId: currentTreeId });
        const channel = deltaSyncService.subscribeToTreeOperations(currentTreeId, handleRemoteOperation);

        return () => {
            if (channel) {
                logInfo('SYNC', 'SUPABASE_REALTIME_UNSUBSCRIBED', { treeId: currentTreeId });
                channel.unsubscribe();
            }
        };
    }, [currentTreeId, isDemoMode, supabaseToken, handleRemoteOperation, syncState]);

    // Realtime Permission/RoleSync
    useEffect(() => {
        if (!currentTreeId || isDemoMode || !supabaseToken || syncState !== 'synced' || (!user?.email && !user?.uid)) return;

        logInfo('SYNC', 'SUPABASE_PERMISSION_SUBSCRIBED', { treeId: currentTreeId });
        const channel = deltaSyncService.subscribeToPermissions(currentTreeId, (permissionEvent: unknown) => {
            if (!permissionEvent) return;

            const payload = permissionEvent as PermissionCollaboratorEvent;
            const normalizedEmail = user.email?.toLowerCase();
            const matchesCurrentUser =
                (!!payload.collaborator_uid && payload.collaborator_uid === user.uid) ||
                (!!payload.email && !!normalizedEmail && payload.email.toLowerCase() === normalizedEmail);

            if (!matchesCurrentUser) {
                return;
            }

            if (payload.eventType === 'DELETE') {
                logWarn('SYNC', 'SUPABASE_ROLE_REVOKED', { metadata: { treeId: currentTreeId, email: user.email } });
                deltaSyncService.handlePermissionRevoked(currentTreeId);
                setCurrentUserRole(null);
                setCurrentTreeId(null);
                localStorage.removeItem('lastActiveTreeId');
                showToast.error('Your access to this tree was removed.');
                return;
            }

            if (payload.role === 'editor' || payload.role === 'viewer') {
                logInfo('SYNC', 'SUPABASE_ROLE_UPDATED', { treeId: currentTreeId, role: payload.role });
                if (payload.role === 'viewer' && (currentUserRole === 'owner' || currentUserRole === 'editor')) {
                    deltaSyncService.handlePermissionReadOnly(currentTreeId);
                    showToast.error('Your access is now view-only. Editing has been disabled.');
                } else {
                    deltaSyncService.handlePermissionGranted(currentTreeId);
                }
                setCurrentUserRole(payload.role);
            } else {
                logWarn('SYNC', 'SUPABASE_ROLE_MISSING_FOR_USER', { metadata: { treeId: currentTreeId, email: user.email, payload } });
            }
        });

        return () => {
            if (channel) {
                logInfo('SYNC', 'SUPABASE_PERMISSION_UNSUBSCRIBED', { treeId: currentTreeId });
                channel.unsubscribe();
            }
        };
    }, [currentTreeId, isDemoMode, supabaseToken, user?.uid, user?.email, currentUserRole, setCurrentUserRole, setCurrentTreeId, syncState]);
};
