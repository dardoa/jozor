import { useEffect, useCallback } from 'react';
import { useAppStore } from '../store/useAppStore';
import { deltaSyncService } from '../services/deltaSyncService';

/**
 * Micro-hook responsible for managing Supabase Realtime subscriptions.
 * It listens for incoming operations and applies them securely,
 * and also listens for permission changes (e.g. role demotion/promotion).
 */
export const useSupabaseSync = () => {
    const currentTreeId = useAppStore((state) => state.currentTreeId);
    const isDemoMode = useAppStore((state) => state.isDemoMode);
    const idToken = useAppStore((state) => state.idToken);
    const user = useAppStore((state) => state.user);
    const setCurrentUserRole = useAppStore((state) => state.setCurrentUserRole);

    const handleRemoteOperation = useCallback((op: any) => {
        console.log('Remote operation received (via useSupabaseSync):', op);
        deltaSyncService.applyOperation(op);
    }, []);

    // Realtime Delta Sync Lifecycle
    useEffect(() => {
        if (!currentTreeId || isDemoMode || !idToken) return;

        console.log(`[useSupabaseSync] Subscribing to realtime updates for tree: ${currentTreeId}`);
        const channel = deltaSyncService.subscribeToTreeOperations(currentTreeId, handleRemoteOperation);

        return () => {
            if (channel) {
                console.log(`[useSupabaseSync] Unsubscribing from realtime updates for tree: ${currentTreeId}`);
                channel.unsubscribe();
            }
        };
    }, [currentTreeId, isDemoMode, idToken, handleRemoteOperation]);

    // Realtime Permission/RoleSync
    useEffect(() => {
        if (!currentTreeId || isDemoMode || !idToken || !user?.email) return;

        console.log(`[useSupabaseSync] Subscribing to permission updates for tree: ${currentTreeId}`);
        const channel = deltaSyncService.subscribeToPermissions(currentTreeId, (share: unknown) => {
            if (!share) return;

            const newShare = share as { collaborators?: any[]; owner_uid?: string };
            const normalizedEmail = user.email!.toLowerCase();
            const myCollab = newShare.collaborators?.find(
                (c: { email: string; role: 'owner' | 'editor' | 'viewer' }) => c.email.toLowerCase() === normalizedEmail
            );

            if (newShare.owner_uid === user.uid) {
                setCurrentUserRole('owner');
            } else if (myCollab) {
                console.log(`[useSupabaseSync] Role updated remotely to ${myCollab.role}`);
                setCurrentUserRole(myCollab.role);
            } else {
                console.warn('[useSupabaseSync] Current user not found in collaborators list of active tree.');
            }
        });

        return () => {
            if (channel) {
                console.log(`[useSupabaseSync] Unsubscribing from permission updates for tree: ${currentTreeId}`);
                channel.unsubscribe();
            }
        };
    }, [currentTreeId, isDemoMode, idToken, user?.uid, user?.email, setCurrentUserRole]);
};
