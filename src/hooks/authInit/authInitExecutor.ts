import type { MutableRefObject } from 'react';
import { fetchSharedTrees, fetchTreeAccessRole } from '../../services/supabaseTreeAccessService';
import { fetchTree } from '../../services/supabaseTreeReadService';
import { resolveTreeByPerson } from '../../services/treeService';
import { treeMigrationService } from '../../services/treeMigrationService';
import { logError } from '../../utils/errorLogger';
import { showToast } from '../../utils/showToast';
import type { Person, UserProfile } from '../../types';
import type { SharedTreeSummary } from '../../services/supabaseTreeTypes';
import type { AuthInitPlan } from './authInitDecision';
import type { AuthInitTreeLoadHandlers } from './authInitTreeLoad';
import { dismissNativeSplash } from '../../utils/nativeSplash';

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

// Utility: dismiss native splash + wait at least 1500ms before releasing authLoading.
const dismissLoadingWithDelay = (setAuthLoading: (value: boolean) => void) => {
  dismissNativeSplash();
  setTimeout(() => setAuthLoading(false), 1500);
};

const buildLocalTreePromotionPromptKey = (uid: string) => `jozor:local-tree-promotion-prompted:${uid}`;

const shouldShowLocalTreePromotionPrompt = (uid: string) => {
  try {
    const key = buildLocalTreePromotionPromptKey(uid);
    if (sessionStorage.getItem(key) === '1') return false;
    sessionStorage.setItem(key, '1');
    return true;
  } catch {
    return true;
  }
};

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
        ).finally(() => dismissLoadingWithDelay(setAuthLoading));
      }
      return;

    case 'APPLY_ROUTE_FOCUS_ONLY':
      setFocusId(plan.focusId);
      setShowWelcome(false);
      dismissLoadingWithDelay(setAuthLoading);
      return;

    case 'HIDE_WELCOME_ONLY':
      setShowWelcome(false);
      dismissLoadingWithDelay(setAuthLoading);
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
          .catch((err) => treeLoadHandlers.handleTreeLoadError(err, 'SUPABASE_FETCH_ROUTE_TREE_ERROR'))
          .finally(() => dismissLoadingWithDelay(setAuthLoading));
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
            dismissLoadingWithDelay(setAuthLoading);
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
          .catch((err) => treeLoadHandlers.handleTreeLoadError(err, 'SUPABASE_FETCH_TREE_ERROR'))
          .finally(() => dismissLoadingWithDelay(setAuthLoading));
      }
      return;

    case 'PROMPT_LOCAL_TREE_PROMOTION':
      if (user) {
        setShowWelcome(false);
        if (shouldShowLocalTreePromotionPrompt(user.uid)) {
          showToast.info('You have a local guest tree. Save it to your cloud account?', {
            duration: 12000,
            action: {
              label: 'Save to cloud',
              onClick: () => {
                void treeMigrationService.migrateLocalTreeToCloud(
                  user.uid,
                  user.email || '',
                  user.supabaseToken,
                  'guest-local-tree',
                  people,
                  (newTreeId) => {
                    localStorage.setItem('lastActiveTreeId', newTreeId);
                    setCurrentTreeId(newTreeId);
                  }
                );
              },
            },
          });
        }
        dismissLoadingWithDelay(setAuthLoading);
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
          })
          .finally(() => dismissLoadingWithDelay(setAuthLoading));
        return;
      }

      setShowWelcome(false);
      dismissLoadingWithDelay(setAuthLoading);
      return;
  }
};
