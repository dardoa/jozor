import * as React from 'react';
import { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

import type { Person, AuthProps, ExportType } from '../types';
import { useAppStore } from '../store/useAppStore';
import { useGoogleSync } from './useGoogleSync';
import { useSyncStatus } from './useSyncStatus';
import { logError } from '../utils/errorLogger';
import { useAuthInit } from './useAuthInit';
import { useSupabaseSync } from './useSupabaseSync';
import type { SharedTreeSummary } from '../services/supabaseTreeTypes';
import { supabaseAuthService } from '../services/supabaseAuthService';
import { useSyncLifecycleEvents } from './google/useSyncLifecycleEvents';

interface UseAuthAndSyncOrchestratorParams {
  isSharedMode?: boolean;
  routeTreeId?: string | null;
  routePersonId?: string | null;
  people: Record<string, Person>;
  setShowWelcome: (value: boolean) => void;
  onOpenGoogleSyncChoice: (fileId: string) => void;
  onCloseGoogleSyncChoice: () => void;
  onOpenDriveFileManager: () => void;
  onOpenTreeManager: () => void;
  // Setter from modal orchestrator to show the shared tree prompt
  setSharedTreePromptModal?: (value: { isOpen: boolean; sharedTrees: SharedTreeSummary[] }) => void;
  onOpenLoginModal: (returnTo?: string) => Promise<void>;
  onExport: (type: ExportType) => Promise<void>;
}

const RETURN_TO_KEY = 'jozor:return_to';
const LEGACY_RETURN_TO_KEY = 'jozor:post-login-redirect';

const getStoredReturnTo = () =>
  sessionStorage.getItem(RETURN_TO_KEY) ?? sessionStorage.getItem(LEGACY_RETURN_TO_KEY) ?? undefined;

const clearStoredReturnTo = () => {
  sessionStorage.removeItem(RETURN_TO_KEY);
  sessionStorage.removeItem(LEGACY_RETURN_TO_KEY);
};

export const useAuthAndSyncOrchestrator = (
  params: UseAuthAndSyncOrchestratorParams
): {
  auth: AuthProps;
  googleSync: ReturnType<typeof useGoogleSync>;
  syncStatus: ReturnType<typeof useSyncStatus>['syncStatus'];
} => {
  const {
    isSharedMode = false,
    routeTreeId = null,
    routePersonId = null,
    people,
    setShowWelcome,
    onOpenGoogleSyncChoice,
    onCloseGoogleSyncChoice,
    onOpenDriveFileManager,
    onOpenTreeManager,
    setSharedTreePromptModal,
    onOpenLoginModal,
    onExport,
  } = params;

  // Core auth / sync state from Zustand
  const user = useAppStore((state) => state.user);
  const isDemoMode = useAppStore((state) => state.isDemoMode);
  const { syncStatus } = useSyncStatus();
  const navigate = useNavigate();
  const location = useLocation();

  const isActivityLogOpen = useAppStore((state) => state.isActivityLogOpen);
  const setActivityLogOpen = useAppStore((state) => state.setActivityLogOpen);

  // Bridge for circular dependency with welcome screen (stopSyncing injected later)
  const stopSyncingRef = React.useRef<() => void>(() => { });

  // Initialize Google Sync
  const googleSync = useGoogleSync(
    people,
    onOpenGoogleSyncChoice,
    onCloseGoogleSyncChoice,
    setShowWelcome,
    onOpenDriveFileManager
  );

  // Keep stopSyncing ref up to date
  useEffect(() => {
    stopSyncingRef.current = googleSync.stopSyncing;
  }, [googleSync.stopSyncing]);

  const { handleLogout } = useAuthInit({
    isSharedMode,
    routeTreeId,
    routePersonId,
    people,
    setShowWelcome,
    setSharedTreePromptModal,
  });

  useSupabaseSync();

  const handleAuthAction = React.useCallback(async (returnTo?: string) => {
    if (user) {
      // User is already logged into Supabase, so "Login" in the Vault context
      // means connecting/re-authenticating Google Drive.
      await googleSync.onLogin();
    } else {
      // User is not logged in, so perform full Supabase Google Sign-In.
      const resolvedReturnTo = returnTo ?? getStoredReturnTo();
      await supabaseAuthService.startGoogleSignIn(resolvedReturnTo);
    }
  }, [user, googleSync]);

  useEffect(() => {
    if (!user) {
      return;
    }

    const returnTo = getStoredReturnTo();
    if (!returnTo) {
      return;
    }

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

  // Handle periodic backups (every 50 ops) - STABILIZED DEPENDENCIES
  const lifecycleEvents = React.useMemo(() => ({
    currentActiveDriveFileId: googleSync.currentActiveDriveFileId,
    handleOverwriteExistingDriveFile: googleSync.handleOverwriteExistingDriveFile,
    onSaveNewCloudFile: googleSync.onSaveNewCloudFile,
    onSaveToGoogleDrive: googleSync.onSaveToGoogleDrive,
    handleClearSyncCache: googleSync.handleClearSyncCache,
  }), [
    googleSync.currentActiveDriveFileId,
    googleSync.handleOverwriteExistingDriveFile,
    googleSync.onSaveNewCloudFile,
    googleSync.onSaveToGoogleDrive,
    googleSync.handleClearSyncCache,
  ]);

  useSyncLifecycleEvents(lifecycleEvents);

  const auth = {
    user,
    isDemoMode,
    isSyncing: (googleSync as any).isSyncing,
    onLogin: handleAuthAction,
    onLogout: handleLogout,
    stopSyncing: googleSync.stopSyncing,
    onLoadCloudData: googleSync.onLoadCloudData,
    onSaveNewCloudFile: googleSync.onSaveNewCloudFile,
    driveFiles: googleSync.driveFiles,
    currentActiveDriveFileId: googleSync.currentActiveDriveFileId,
    fileOwnerUid: googleSync.fileOwnerUid,
    refreshDriveFiles: googleSync.refreshDriveFiles,
    handleLoadDriveFile: googleSync.handleLoadDriveFile,
    handleSaveAsNewDriveFile: googleSync.handleSaveAsNewDriveFile,
    handleOverwriteExistingDriveFile: googleSync.handleOverwriteExistingDriveFile,
    handleDeleteDriveFile: googleSync.handleDeleteDriveFile,
    isSavingDriveFile: googleSync.isSaving,
    isDeletingDriveFile: googleSync.isDeleting,
    isListingDriveFiles: googleSync.isListing,
    hasSessionError: googleSync.hasSessionError,
    isAuthorized: googleSync.isAuthorized,
    handleCreateSnapshot: googleSync.handleCreateSnapshot,
    handleRestoreSnapshot: googleSync.handleRestoreSnapshot,
    onOpenDriveFileManager,
    onOpenTreeManager,
    onOpenLoginModal,
    syncStatus,
    onExport,
    onSaveToGoogleDrive: googleSync.onSaveToGoogleDrive,
    onOpenActivityLog: () => setActivityLogOpen(true),
  } as any;

  return {
    auth,
    googleSync,
    syncStatus,
  };
};
