import * as React from 'react';
import { useEffect, useCallback } from 'react';

import type { Person, AuthProps, ExportType } from '../types';
import { useAppStore, loadFullState } from '../store/useAppStore';
import { useGoogleSync } from './useGoogleSync';
import { useSyncStatus } from './useSyncStatus';
import { showError } from '../utils/toast';
import { deltaSyncService } from '../services/deltaSyncService';
import { fetchTree, fetchSharedTrees } from '../services/supabaseTreeService';
import { logError } from '../utils/errorLogger';
import { useAuthInit } from './useAuthInit';
import { useSupabaseSync } from './useSupabaseSync';

interface UseAuthAndSyncOrchestratorParams {
  isSharedMode?: boolean;
  people: Record<string, Person>;
  setShowWelcome: (value: boolean) => void;
  onOpenGoogleSyncChoice: (fileId: string) => void;
  onCloseGoogleSyncChoice: () => void;
  onOpenDriveFileManager: () => void;
  onOpenTreeManager: () => void;
  // Setter from modal orchestrator to show the shared tree prompt
  setSharedTreePromptModal?: (value: { isOpen: boolean; sharedTrees: any[] }) => void;
  onOpenLoginModal: () => Promise<void>;
  onExport: (type: ExportType) => Promise<void>;
}

export const useAuthAndSyncOrchestrator = (
  params: UseAuthAndSyncOrchestratorParams
): {
  auth: AuthProps;
  googleSync: ReturnType<typeof useGoogleSync>;
  syncStatus: ReturnType<typeof useSyncStatus>['syncStatus'];
  isActivityLogOpen: boolean;
  setActivityLogOpen: React.Dispatch<React.SetStateAction<boolean>>;
} => {
  const {
    isSharedMode = false,
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
  const isSyncing = useAppStore((state) => state.isSyncing);
  const isDemoMode = useAppStore((state) => state.isDemoMode);
  const login = useAppStore((state) => state.login);
  const logout = useAppStore((state) => state.logout);
  const currentTreeId = useAppStore((state) => state.currentTreeId);
  const setCurrentTreeId = useAppStore((state) => state.setCurrentTreeId);
  const idToken = useAppStore((state) => state.idToken);
  const setCurrentUserRole = useAppStore((state) => state.setCurrentUserRole);

  const { syncStatus } = useSyncStatus();

  const [isActivityLogOpen, setActivityLogOpen] = React.useState(false);

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
    people,
    setShowWelcome,
    setSharedTreePromptModal,
  });

  useSupabaseSync();

  // Handle periodic backups (every 50 ops)
  useEffect(() => {
    const handleBackupRequest = () => {
      console.log('Periodic backup requested (50 operations reached)');
      // For Google Drive, we can trigger a save if we have a file ID
      if (googleSync.currentActiveDriveFileId) {
        googleSync.handleOverwriteExistingDriveFile(googleSync.currentActiveDriveFileId);
      }
    };

    window.addEventListener('jozor-backup-requested', handleBackupRequest);
    return () => window.removeEventListener('jozor-backup-requested', handleBackupRequest);
  }, [googleSync]);


  // Force Sync Event Listener
  useEffect(() => {
    const handleForceSync = () => {
      console.log('Force sync to Drive triggered');
      if (googleSync && googleSync.onSaveToGoogleDrive) {
        googleSync
          .onSaveToGoogleDrive()
          .catch((error) => logError('SYNC_FORCE_SAVE_ERROR', error, { showToast: false }));
      }
    };

    window.addEventListener('force-drive-sync', handleForceSync);

    const handleClearCache = () => {
      console.log('Emergency sync reset triggered');
      if (googleSync && googleSync.handleClearSyncCache) {
        googleSync
          .handleClearSyncCache()
          .catch((error) => logError('SYNC_CLEAR_CACHE_ERROR', error, { showToast: false }));
      }
    };
    window.addEventListener('clear-drive-sync-cache', handleClearCache);

    return () => {
      window.removeEventListener('force-drive-sync', handleForceSync);
      window.removeEventListener('clear-drive-sync-cache', handleClearCache);
    };
  }, [googleSync]);

  const auth: AuthProps = {
    user,
    isDemoMode,
    isSyncing,
    onLogin: login,
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
    handleCreateSnapshot: googleSync.handleCreateSnapshot,
    handleRestoreSnapshot: googleSync.handleRestoreSnapshot,
    onOpenDriveFileManager,
    onOpenTreeManager,
    onOpenLoginModal,
    syncStatus,
    onExport,
    onSaveToGoogleDrive: googleSync.onSaveToGoogleDrive,
    onOpenActivityLog: () => setActivityLogOpen(true),
  };

  return {
    auth,
    googleSync,
    syncStatus,
    isActivityLogOpen,
    setActivityLogOpen,
  };
};
