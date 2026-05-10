import { loadFullState } from '../../store/useAppStore';
import { deltaSyncService } from '../../services/deltaSyncService';
import { logError } from '../../utils/errorLogger';
import type { Person } from '../../types';
import {
  clearLastActiveTreeId,
  measureAuthToTreeLoaded,
  setLastActiveTreeId,
} from './authInitSideEffects';

type AuthInitTreeRole = 'owner' | 'editor' | 'viewer';

export interface AuthInitTreeSnapshot {
  people: Record<string, Person>;
  settings?: Record<string, unknown>;
  focusId?: string;
  lastVersion?: number;
  name?: string;
}

export interface AuthInitTreeLoadHandlers {
  handleTreeLoadSuccess: (
    full: AuthInitTreeSnapshot,
    role: AuthInitTreeRole,
    targetTreeId: string
  ) => void;
  handleTreeLoadError: (err: unknown, errorKey: string) => void;
}

interface CreateAuthInitTreeLoadHandlersParams {
  routePersonId?: string | null;
  setCurrentTreeId: (treeId: string | null) => void;
  setCurrentUserRole: (role: AuthInitTreeRole | null) => void;
  setShowWelcome: (value: boolean) => void;
}

export const createAuthInitTreeLoadHandlers = ({
  routePersonId,
  setCurrentTreeId,
  setCurrentUserRole,
  setShowWelcome,
}: CreateAuthInitTreeLoadHandlersParams): AuthInitTreeLoadHandlers => {
  const applyRouteFocus = (treePeople: Record<string, Person>, fallbackFocusId?: string) =>
    routePersonId && treePeople[routePersonId] ? routePersonId : fallbackFocusId;

  const handleTreeLoadSuccess = (
    full: AuthInitTreeSnapshot,
    role: AuthInitTreeRole,
    targetTreeId: string
  ) => {
    loadFullState({
      version: 1,
      people: full.people,
      settings: full.settings || {},
      focusId: applyRouteFocus(full.people, full.focusId),
      lastSyncedVersion: full.lastVersion,
      treeName: full.name,
    });
    setCurrentTreeId(targetTreeId);
    setCurrentUserRole(role);
    setLastActiveTreeId(targetTreeId);
    setShowWelcome(false);

    void deltaSyncService.reconcileTree(targetTreeId);
    void deltaSyncService.recoverPendingOperations(targetTreeId);
    measureAuthToTreeLoaded();
  };

  const handleTreeLoadError = (err: unknown, errorKey: string) => {
    logError(errorKey, err, { showToast: false });
    clearLastActiveTreeId();
    setCurrentTreeId(null);
    setCurrentUserRole(null);
    setShowWelcome(false);
  };

  return { handleTreeLoadSuccess, handleTreeLoadError };
};

