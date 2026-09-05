import * as React from 'react';
import { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAppStore } from '../../../store/useAppStore';
import { useAuthInit } from '../../auth/useAuthInit';
import { supabaseAuthService } from '../../../services/supabaseAuthService';
import type { Person } from '../../../types';
import type { SharedTreeSummary } from '../../../services/supabaseTreeTypes';
import { usePersonMediaCleanupLifecycle } from '../../utils/usePersonMediaCleanupLifecycle';

interface UseAuthCoordinatorParams {
  isSharedMode?: boolean;
  routeTreeId?: string | null;
  routePersonId?: string | null;
  people: Record<string, Person>;
  setShowWelcome: (value: boolean) => void;
  setSharedTreePromptModal?: (value: { isOpen: boolean; sharedTrees: SharedTreeSummary[] }) => void;
  onGoogleSyncLogin: () => Promise<void>;
}

const RETURN_TO_KEY = 'jozor:return_to';
const LEGACY_RETURN_TO_KEY = 'jozor:post-login-redirect';

const getStoredReturnTo = () =>
  sessionStorage.getItem(RETURN_TO_KEY) ?? sessionStorage.getItem(LEGACY_RETURN_TO_KEY) ?? undefined;

const clearStoredReturnTo = () => {
  sessionStorage.removeItem(RETURN_TO_KEY);
  sessionStorage.removeItem(LEGACY_RETURN_TO_KEY);
};

export const useAuthCoordinator = ({
  isSharedMode = false,
  routeTreeId = null,
  routePersonId = null,
  people,
  setShowWelcome,
  setSharedTreePromptModal,
  onGoogleSyncLogin,
}: UseAuthCoordinatorParams) => {
  const user = useAppStore((state) => state.user);
  const isDemoMode = useAppStore((state) => state.isDemoMode);
  const navigate = useNavigate();
  const location = useLocation();

  usePersonMediaCleanupLifecycle();

  const { handleLogout } = useAuthInit({
    isSharedMode,
    routeTreeId,
    routePersonId,
    people,
    setShowWelcome,
    setSharedTreePromptModal,
  });

  const handleAuthAction = React.useCallback(async (returnTo?: string) => {
    if (user) {
      await onGoogleSyncLogin();
    } else {
      const resolvedReturnTo = returnTo ?? getStoredReturnTo();
      await supabaseAuthService.startGoogleSignIn(resolvedReturnTo);
    }
  }, [user, onGoogleSyncLogin]);

  useEffect(() => {
    if (!user) return;

    const returnTo = getStoredReturnTo();
    if (!returnTo) return;

    const currentPath = `${location.pathname}${location.search}${location.hash}`;
    if (currentPath === returnTo) {
      clearStoredReturnTo();
      return;
    }

    if (location.pathname.startsWith('/shared/') && !returnTo.startsWith('/shared/')) {
      return;
    }

    clearStoredReturnTo();
    navigate(returnTo, { replace: true });
  }, [location.hash, location.pathname, location.search, navigate, user]);

  return {
    user,
    isDemoMode,
    onLogin: handleAuthAction,
    onLogout: handleLogout,
  };
};
