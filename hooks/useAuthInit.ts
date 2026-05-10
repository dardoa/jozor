import { useEffect, useCallback, useRef } from 'react';
import { selectIsSyncing, useAppStore } from '../store/useAppStore';
import { deltaSyncService } from '../services/deltaSyncService';
import { logError } from '../utils/errorLogger';
import { Person } from '../types';
import type { SharedTreeSummary } from '../services/supabaseTreeTypes';
import { getAuthInitPlan } from './authInit/authInitDecision';
import { executeAuthInitPlan } from './authInit/authInitExecutor';
import { createAuthInitTreeLoadHandlers } from './authInit/authInitTreeLoad';
import {
    clearLastActiveTreeId,
    getLastActiveTreeId,
    markTreeRestoreStart,
} from './authInit/authInitSideEffects';

export interface UseAuthInitParams {
    isSharedMode?: boolean;
    routeTreeId?: string | null;
    routePersonId?: string | null;
    people: Record<string, Person>;
    setShowWelcome: (value: boolean) => void;
    setSharedTreePromptModal?: (value: { isOpen: boolean; sharedTrees: SharedTreeSummary[] }) => void;
}

/**
 * Hook responsible for the initial session load, tree restoration,
 * and invalid tree migration logic upon login.
 * Refactored to act purely as an executor for `authInitDecision`.
 */
export const useAuthInit = ({
    isSharedMode,
    routeTreeId,
    routePersonId,
    people,
    setShowWelcome,
    setSharedTreePromptModal,
}: UseAuthInitParams) => {
    const user = useAppStore((state) => state.user);
    const isSyncing = useAppStore(selectIsSyncing);
    const currentTreeId = useAppStore((state) => state.currentTreeId);
    const setCurrentTreeId = useAppStore((state) => state.setCurrentTreeId);
    const setCurrentUserRole = useAppStore((state) => state.setCurrentUserRole);
    const setFocusId = useAppStore((state) => state.setFocusId);
    const setAuthLoading = useAppStore((state) => state.setAuthLoading);
    const logout = useAppStore((state) => state.logout);
    const syncState = useAppStore((state) => state.syncStatus.state);
    const authLoading = useAppStore((state) => state.authLoading);
    
    const routePersonBranchInFlightRef = useRef<string | null>(null);
    const routePersonBranchCompletedRef = useRef<string | null>(null);

    useEffect(() => {
        const routePersonAlreadyResolved =
            Boolean(routePersonId) && Boolean(currentTreeId) && Boolean(people[routePersonId!]);

        if (!routePersonId || routePersonAlreadyResolved) {
            routePersonBranchInFlightRef.current = null;
            routePersonBranchCompletedRef.current = null;
        }
    }, [routePersonId, currentTreeId, people]);

    // Session Persistence / Initial Load / Migration logic
    useEffect(() => {
        const plan = getAuthInitPlan({
            userUid: user?.uid,
            isSyncing,
            isSharedMode: Boolean(isSharedMode),
            currentTreeId,
            routeTreeId,
            routePersonId,
            peopleCount: Object.keys(people).length,
            hasPersonInTree: (id) => Boolean(people[id]),
            lastActiveTreeId: getLastActiveTreeId(),
            hasSharedTreePromptModal: Boolean(setSharedTreePromptModal),
        });

        if (plan.type === 'WAIT') return;

        markTreeRestoreStart();

        executeAuthInitPlan({
            plan,
            user,
            people,
            setCurrentTreeId,
            setFocusId,
            setAuthLoading,
            setShowWelcome,
            setSharedTreePromptModal,
            treeLoadHandlers: createAuthInitTreeLoadHandlers({
                routePersonId,
                setCurrentTreeId,
                setCurrentUserRole,
                setShowWelcome,
            }),
            routePersonBranchRefs: {
                inFlightRef: routePersonBranchInFlightRef,
                completedRef: routePersonBranchCompletedRef,
            },
        });
    }, [
        user,
        currentTreeId,
        isSyncing,
        isSharedMode,
        routeTreeId,
        routePersonId,
        setShowWelcome,
        setCurrentTreeId,
        setFocusId,
        setAuthLoading,
        authLoading,
        people,
        setSharedTreePromptModal,
        setCurrentUserRole,
        syncState,
    ]);

    const handleLogout = useCallback(async () => {
        try {
            await deltaSyncService.flushPendingChanges();
        } catch (error) {
            logError('SYNC_FLUSH_BEFORE_LOGOUT_FAILED', error, { showToast: false });
        }
        await logout();
        useAppStore.getState().startNewTree();
        setShowWelcome(true);
        clearLastActiveTreeId();
    }, [logout, setShowWelcome]);

    return { handleLogout };
};
