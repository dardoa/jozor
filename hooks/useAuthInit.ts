import { useEffect, useCallback } from 'react';
import { useAppStore, loadFullState } from '../store/useAppStore';
import { deltaSyncService } from '../services/deltaSyncService';
import { fetchTree, fetchSharedTrees } from '../services/supabaseTreeService';
import { logError } from '../utils/errorLogger';
import { showError } from '../utils/toast';
import { Person } from '../types';

export interface UseAuthInitParams {
    isSharedMode?: boolean;
    people: Record<string, Person>;
    setShowWelcome: (value: boolean) => void;
    setSharedTreePromptModal?: (value: { isOpen: boolean; sharedTrees: any[] }) => void;
}

/**
 * Micro-hook responsible for the initial session load, tree restoration,
 * and invalid tree migration logic upon login.
 */
export const useAuthInit = ({ isSharedMode, people, setShowWelcome, setSharedTreePromptModal }: UseAuthInitParams) => {
    const user = useAppStore((state) => state.user);
    const isSyncing = useAppStore((state) => state.isSyncing);
    const currentTreeId = useAppStore((state) => state.currentTreeId);
    const setCurrentTreeId = useAppStore((state) => state.setCurrentTreeId);
    const setCurrentUserRole = useAppStore((state) => state.setCurrentUserRole);
    const logout = useAppStore((state) => state.logout);

    // Session Persistence / Initial Load / Migration logic
    useEffect(() => {
        // Only proceed if user is logged in
        if (!user?.uid || isSyncing || isSharedMode) return;

        // Check if we have a tree loaded with an INVALID ID (e.g. "1" or "4")
        // This happens if the user was working on a local/demo tree and then logged in.
        // We must MIGRATE this tree to a valid UUID to allow syncing.
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        if (currentTreeId && !uuidRegex.test(currentTreeId)) {
            console.warn(
                `[useAuthInit] Detected invalid Tree ID "${currentTreeId}". Migrating to new UUID...`
            );
            const newTreeId = crypto.randomUUID();
            const baseName = user.email?.split('@')[0] || 'My';
            const treeName = `${baseName}'s Family Tree`;

            // 1. Create the tree in Supabase (async)
            import('../services/supabaseTreeService').then(({ createTree, bulkUpsertPeople }) => {
                createTree(user.uid, user.email || '', treeName, user.supabaseToken)
                    .then((createdId) => {
                        console.log(
                            `[useAuthInit] Migrated tree created. Old: ${currentTreeId}, New: ${createdId}`
                        );
                        // 2. Update local state to use the new ID
                        setCurrentTreeId(createdId);

                        // 3. Force push all people to the new tree
                        const peopleList = Object.values(people);
                        if (peopleList.length > 0) {
                            bulkUpsertPeople(createdId, user.uid, peopleList, user.email || '', user.supabaseToken)
                                .then(() => {
                                    console.log('[useAuthInit] Migration data sync complete.');
                                    showError('Your local tree has been migrated to the cloud.', { duration: 5000 });
                                })
                                .catch((err) => {
                                    logError('SYNC_MIGRATION_BULK_UPSERT_FAILED', err, { showToast: true, toastMessage: 'Migration failed. Please verify your connection.' });
                                });
                        }
                    })
                    .catch((err) => {
                        logError('SYNC_MIGRATION_CREATE_TREE_ERROR', err, { showToast: false });
                    });
            }).catch((err) => {
                logError('SYNC_MIGRATION_IMPORT_MODULE_FAILED', err, { showToast: false });
            });
            return;
        }

        // If we already have a valid tree loaded, ensure welcome screen is gone
        if (currentTreeId) {
            setShowWelcome(false);
            return;
        }

        const lastTreeId = localStorage.getItem('lastActiveTreeId');
        if (lastTreeId) {
            // Attempt to restore last active tree
            fetchTree(lastTreeId, user.uid, user.email || '', user.supabaseToken)
                .then((full) => {
                    loadFullState({
                        version: 1,
                        people: full.people,
                        settings: full.settings || {},
                        focusId: full.focusId,
                        lastSyncedVersion: full.lastVersion,
                    });
                    setCurrentTreeId(lastTreeId);
                    setCurrentUserRole(full.ownerId === user.uid ? 'owner' : 'editor'); // Default to editor if not owner but has access
                    setShowWelcome(false);

                    // Atomic Delta Sync: Reconcile tree after loading initial state
                    void deltaSyncService.reconcileTree(lastTreeId);
                    void deltaSyncService.recoverPendingOperations(lastTreeId);
                })
                .catch((err) => {
                    logError('SUPABASE_FETCH_TREE_ERROR', err, { showToast: false });
                    // If restoration fails, clear invalid ID and show selection
                    localStorage.removeItem('lastActiveTreeId');
                    setShowWelcome(false);
                });
        } else {
            // User logged in but no last tree? Check for shared trees if local is empty
            const isLocalEmpty = Object.keys(people).length <= 1; // Assuming 1 person is default Me
            if (isLocalEmpty && user.email && setSharedTreePromptModal) {
                fetchSharedTrees(user.uid, user.email, user.supabaseToken)
                    .then((shared) => {
                        if (shared && shared.length > 0) {
                            setSharedTreePromptModal({ isOpen: true, sharedTrees: shared });
                        }
                        setShowWelcome(false);
                    })
                    .catch((err) => {
                        logError('SUPABASE_FETCH_SHARED_TREES_ERROR', err, { showToast: false });
                        setShowWelcome(false);
                    });
            } else {
                setShowWelcome(false);
            }
        }
    }, [
        user,
        currentTreeId,
        isSyncing,
        isSharedMode,
        setShowWelcome,
        setCurrentTreeId,
        people,
        setSharedTreePromptModal,
    ]);

    const handleLogout = useCallback(async () => {
        await logout();
        useAppStore.getState().startNewTree();
        setShowWelcome(true);
        localStorage.removeItem('lastActiveTreeId');
    }, [logout, setShowWelcome]);

    return { handleLogout };
};
