import type { MutableRefObject } from 'react';
import { fetchSharedTrees, fetchTreeAccessRole } from '../../services/supabaseTreeAccessService';
import { fetchTree } from '../../services/supabaseTreeReadService';
import { resolveTreeByPerson } from '../../services/treeService';
import { treeMigrationService } from '../../services/treeMigrationService';
import { logError } from '../../utils/errorLogger';
import type { Person, UserProfile } from '../../types';
import type { SharedTreeSummary } from '../../services/supabaseTreeTypes';
import type { AuthInitPlan } from './authInitDecision';
import type { AuthInitTreeLoadHandlers } from './authInitTreeLoad';

interface RoutePersonBranchRefs {
  inFlightRef: MutableRefObject<string | null>;
  completedRef: MutableRefObject<string | null>;
}

interface ExecuteAuthInitPlanParams {
  plan: AuthInitPlan;
  user: UserProfile | null;
  people: Record<string, Person>;
  setCurrentTreeId: (treeId: string | null) => void;
  setFocusId: (personId: string) => void;
  setAuthLoading: (value: boolean) => void;
  setShowWelcome: (value: boolean) => void;
  setSharedTreePromptModal?: (value: { isOpen: boolean; sharedTrees: SharedTreeSummary[] }) => void;
  treeLoadHandlers: AuthInitTreeLoadHandlers;
  routePersonBranchRefs: RoutePersonBranchRefs;
}

export const executeAuthInitPlan = ({
  plan,
  user,
  people,
  setCurrentTreeId,
  setFocusId,
  setAuthLoading,
  setShowWelcome,
  setSharedTreePromptModal,
  treeLoadHandlers,
  routePersonBranchRefs,
}: ExecuteAuthInitPlanParams): void => {
  switch (plan.type) {
    case 'WAIT':
      return;

    case 'MIGRATE_INVALID_TREE_ID':
      if (user) {
        void treeMigrationService.migrateLocalTreeToCloud(
          user.uid,
          user.email || '',
          user.supabaseToken,
          plan.invalidTreeId,
          people,
          setCurrentTreeId
        );
      }
      return;

    case 'APPLY_ROUTE_FOCUS_ONLY':
      setFocusId(plan.focusId);
      setShowWelcome(false);
      return;

    case 'HIDE_WELCOME_ONLY':
      setShowWelcome(false);
      return;

    case 'BOOTSTRAP_ROUTE_TREE':
      if (user) {
        Promise.all([
          fetchTree(plan.treeId, user.uid, user.email || '', user.supabaseToken),
          fetchTreeAccessRole(plan.treeId, user.uid, user.email || '', user.supabaseToken),
        ])
          .then(([full, role]) => {
            if (role === null) throw new Error('No access to the requested tree.');
            treeLoadHandlers.handleTreeLoadSuccess(full, role, plan.treeId);
          })
          .catch((err) => treeLoadHandlers.handleTreeLoadError(err, 'SUPABASE_FETCH_ROUTE_TREE_ERROR'));
      }
      return;

    case 'RESOLVE_ROUTE_PERSON':
      if (user) {
        const routePersonRequestKey = `${user.uid}:${plan.personId}`;

        if (
          routePersonBranchRefs.inFlightRef.current === routePersonRequestKey ||
          routePersonBranchRefs.completedRef.current === routePersonRequestKey
        ) {
          return;
        }

        routePersonBranchRefs.inFlightRef.current = routePersonRequestKey;
        setAuthLoading(true);

        resolveTreeByPerson(plan.personId)
          .then((resolved) => {
            return fetchTree(resolved.treeId, user.uid, user.email || '', user.supabaseToken)
              .then((full) => ({ full, resolved }));
          })
          .then(({ full, resolved }) => {
            treeLoadHandlers.handleTreeLoadSuccess(full, resolved.role, resolved.treeId);
            routePersonBranchRefs.completedRef.current = routePersonRequestKey;
          })
          .catch((err) => {
            routePersonBranchRefs.completedRef.current = null;
            routePersonBranchRefs.inFlightRef.current = null;
            treeLoadHandlers.handleTreeLoadError(err, 'SUPABASE_RESOLVE_ROUTE_PERSON_TREE_ERROR');
          })
          .finally(() => {
            if (routePersonBranchRefs.inFlightRef.current === routePersonRequestKey) {
              routePersonBranchRefs.inFlightRef.current = null;
            }
            setAuthLoading(false);
          });
      }
      return;

    case 'RESTORE_LAST_ACTIVE':
      if (user) {
        Promise.all([
          fetchTree(plan.treeId, user.uid, user.email || '', user.supabaseToken),
          fetchTreeAccessRole(plan.treeId, user.uid, user.email || '', user.supabaseToken),
        ])
          .then(([full, role]) => {
            if (role === null) throw new Error('No access to the last active tree.');
            treeLoadHandlers.handleTreeLoadSuccess(full, role, plan.treeId);
          })
          .catch((err) => treeLoadHandlers.handleTreeLoadError(err, 'SUPABASE_FETCH_TREE_ERROR'));
      }
      return;

    case 'FETCH_SHARED_TREES_PROMPT':
      if (user && user.email && setSharedTreePromptModal) {
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
        return;
      }

      setShowWelcome(false);
      return;
  }
};

