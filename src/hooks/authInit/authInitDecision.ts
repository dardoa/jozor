import { isUuid } from '../../utils/isUuid';

export interface AuthInitContext {
    userUid: string | undefined;
    isSyncing: boolean;
    isSharedMode: boolean;
    currentTreeId: string | null;
    routeTreeId: string | null | undefined;
    routePersonId: string | null | undefined;
    peopleCount: number;
    hasMeaningfulLocalTree: boolean;
    hasPersonInTree: (personId: string) => boolean;
    lastActiveTreeId: string | null;
    hasSharedTreePromptModal: boolean;
}

export type AuthInitPlan = 
    | { type: 'WAIT' }
    | { type: 'MIGRATE_INVALID_TREE_ID'; invalidTreeId: string }
    | { type: 'APPLY_ROUTE_FOCUS_ONLY'; focusId: string }
    | { type: 'HIDE_WELCOME_ONLY' }
    | { type: 'BOOTSTRAP_ROUTE_TREE'; treeId: string }
    | { type: 'RESOLVE_ROUTE_PERSON'; personId: string }
    | { type: 'RESTORE_LAST_ACTIVE'; treeId: string }
    | { type: 'PROMPT_LOCAL_TREE_PROMOTION' }
    | { type: 'FETCH_SHARED_TREES_PROMPT' };

/**
 * Pure function that determines the initial load / authentication sequence plan.
 * It replaces complex nested branches in the useAuthInit hook.
 */
export function getAuthInitPlan(ctx: AuthInitContext): AuthInitPlan {
    // 1. Wait conditions
    if (!ctx.userUid || ctx.isSyncing || ctx.isSharedMode) {
        return { type: 'WAIT' };
    }

    // 2. Migration check
    if (ctx.currentTreeId && !isUuid(ctx.currentTreeId)) {
        return { type: 'MIGRATE_INVALID_TREE_ID', invalidTreeId: ctx.currentTreeId };
    }

    // 3. Explicit Route Tree ID
    if (ctx.routeTreeId) {
        if (ctx.currentTreeId === ctx.routeTreeId && ctx.peopleCount > 0) {
            if (ctx.routePersonId && ctx.hasPersonInTree(ctx.routePersonId)) {
                return { type: 'APPLY_ROUTE_FOCUS_ONLY', focusId: ctx.routePersonId };
            }
            return { type: 'HIDE_WELCOME_ONLY' };
        }
        return { type: 'BOOTSTRAP_ROUTE_TREE', treeId: ctx.routeTreeId };
    }

    // 4. Explicit Route Person ID (without Tree ID)
    if (ctx.routePersonId && (!ctx.currentTreeId || !ctx.hasPersonInTree(ctx.routePersonId))) {
        return { type: 'RESOLVE_ROUTE_PERSON', personId: ctx.routePersonId };
    }

    // 5. Valid Tree already loaded
    if (ctx.currentTreeId) {
        if (ctx.routePersonId && ctx.hasPersonInTree(ctx.routePersonId)) {
            return { type: 'APPLY_ROUTE_FOCUS_ONLY', focusId: ctx.routePersonId };
        }
        return { type: 'HIDE_WELCOME_ONLY' };
    }

    // 6. Logged-in user has a meaningful guest/local tree but no cloud tree selected.
    // This must run before restoring the last cloud tree so a guest draft is not hidden.
    if (ctx.hasMeaningfulLocalTree) {
        return { type: 'PROMPT_LOCAL_TREE_PROMOTION' };
    }

    // 7. Restore last active tree
    if (ctx.lastActiveTreeId) {
        return { type: 'RESTORE_LAST_ACTIVE', treeId: ctx.lastActiveTreeId };
    }

    // 8. Fallback to shared trees prompt or just hide welcome
    if (ctx.peopleCount <= 1 && ctx.hasSharedTreePromptModal) {
        return { type: 'FETCH_SHARED_TREES_PROMPT' };
    }

    return { type: 'HIDE_WELCOME_ONLY' };
}
