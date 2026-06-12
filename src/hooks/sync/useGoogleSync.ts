import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { Person } from '../../types';
import { useDebouncedValue } from '../ui/useDebounce';
import { useGoogleAuth } from '../google/useGoogleAuth';
import { useDriveFiles } from '../google/useDriveFiles';
import { useDriveSnapshots } from '../google/useDriveSnapshots';
import { useDrivePersistence } from '../google/useDrivePersistence';
import { useAppStore } from '../../store/useAppStore';

/**
 * Hook for managing Google Drive synchronization.
 * Handles authentication, file listing, loading, saving, and auto-syncing.
 */
export const useGoogleSync = (
  people: Record<string, Person>,
  onOpenGoogleSyncChoice: (fileId: string) => void,
  onCloseGoogleSyncChoice: () => void,
  setShowWelcome: (show: boolean) => void,
  onOpenCloudBackups: () => void
) => {
  const currentActiveDriveFileId = useAppStore((state) => state.currentActiveDriveFileId);
  const setCurrentActiveDriveFileId = useAppStore((state) => state.setCurrentActiveDriveFileId);
  const isDemoMode = useAppStore((state) => state.isDemoMode);
  const isSyncing = useAppStore((state) => state.driveSyncUiStatus === 'syncing');
  const [fileOwnerUid, setFileOwnerUid] = useState<string | null>(null);
  const refreshDriveFilesRef = useRef<((allowPopup?: boolean) => Promise<void>) | null>(null);
  const cleanupAfterLogoutRef = useRef<(() => void) | null>(null);

  const cleanupOnLogout = useCallback(() => {
    setCurrentActiveDriveFileId(null);
    setFileOwnerUid(null);
    cleanupAfterLogoutRef.current?.();
  }, [setCurrentActiveDriveFileId]);

  const {
    user,
    runWithAuth,
    showGoogleError,
    onLogin,
    onLogout,
  } = useGoogleAuth({
    setShowWelcome,
    refreshDriveFilesRef,
    setCurrentActiveDriveFileId,
    onOpenGoogleSyncChoice,
    cleanupOnLogout,
  });

  const {
    driveFiles,
    clearDriveFiles,
    refreshDriveFiles,
    handleDeleteDriveFile,
    isListingDriveFiles,
    isDeletingDriveFile,
    hasSessionError,
    isAuthorized,
  } = useDriveFiles({
    user,
    runWithAuth,
    showGoogleError,
    currentActiveDriveFileId,
    setCurrentActiveDriveFileId,
    fileOwnerUid,
    setFileOwnerUid,
  });

  useEffect(() => {
    refreshDriveFilesRef.current = refreshDriveFiles;
  }, [refreshDriveFiles]);

  const {
    handleCreateSnapshot,
    handleRestoreSnapshot,
    cleanupSnapshotResources,
  } = useDriveSnapshots({
    user,
    currentActiveDriveFileId,
    runWithAuth,
    showGoogleError,
  });

  useEffect(() => {
    cleanupAfterLogoutRef.current = () => {
      cleanupSnapshotResources();
      clearDriveFiles();
    };
  }, [cleanupSnapshotResources, clearDriveFiles]);

  const debouncedPeople = useDebouncedValue(people, 5000);

  const {
    onLoadCloudData,
    onSaveNewCloudFile,
    handleLoadDriveFile,
    handleSaveAsNewDriveFile,
    handleOverwriteExistingDriveFile,
    handleClearSyncCache,
    onSaveToGoogleDrive,
    isSavingDriveFile,
  } = useDrivePersistence({
    user,
    currentActiveDriveFileId,
    setCurrentActiveDriveFileId,
    setFileOwnerUid,
    isListingDriveFiles,
    debouncedPeople,
    runWithAuth,
    showGoogleError,
    refreshDriveFiles,
    onCloseGoogleSyncChoice,
  });

  const stopSyncing = useCallback(() => {
    setCurrentActiveDriveFileId(null);
    setFileOwnerUid(null);
  }, [setCurrentActiveDriveFileId]);

  return useMemo(() => ({
    user,
    isSyncing,
    isDemoMode,
    onLogin,
    onLogout,
    stopSyncing,
    onLoadCloudData,
    onSaveNewCloudFile,
    driveFiles,
    currentActiveDriveFileId,
    fileOwnerUid,
    refreshDriveFiles,
    handleLoadDriveFile,
    handleSaveAsNewDriveFile,
    handleOverwriteExistingDriveFile,
    handleDeleteDriveFile,
    isSaving: isSavingDriveFile,
    isDeleting: isDeletingDriveFile,
    isListing: isListingDriveFiles,
    hasSessionError,
    isAuthorized,
    setShowWelcome,
    onOpenCloudBackups,
    handleCreateSnapshot,
    handleRestoreSnapshot,
    handleClearSyncCache,
    onSaveToGoogleDrive,
  }), [
    user,
    isSyncing,
    isDemoMode,
    onLogin,
    onLogout,
    stopSyncing,
    onLoadCloudData,
    onSaveNewCloudFile,
    driveFiles,
    currentActiveDriveFileId,
    fileOwnerUid,
    refreshDriveFiles,
    handleLoadDriveFile,
    handleSaveAsNewDriveFile,
    handleOverwriteExistingDriveFile,
    handleDeleteDriveFile,
    isSavingDriveFile,
    isDeletingDriveFile,
    isListingDriveFiles,
    hasSessionError,
    isAuthorized,
    setShowWelcome,
    onOpenCloudBackups,
    handleCreateSnapshot,
    handleRestoreSnapshot,
    handleClearSyncCache,
    onSaveToGoogleDrive,
  ]);
};
