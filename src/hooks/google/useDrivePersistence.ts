import { useCallback, useEffect, useState } from 'react';

import type { Person, UserProfile } from '../../types';
import { storageProvider } from '../../services/storageProvider';
import { loadFullState, useAppStore } from '../../store/useAppStore';
import { showToast } from '../../utils/showToast';
import { logError, logWarn } from '../../utils/errorLogger';
import { useSyncRetry } from './useSyncRetry';
import {
  buildCurrentDriveFullState,
  loadDrivePayloadIntoStore,
  saveCurrentDriveState,
  validateCurrentDriveIntegrity,
} from './drivePersistenceCommands';
import {
  getDriveErrorStatus,
  getOverwriteDriveErrorMessage,
  isMissingDriveFileError,
  shouldRunAutoDriveSync,
} from './drivePersistenceGuards';

const IS_DRIVE_BACKUP_ONLY = true;

interface UseDrivePersistenceParams {
  user: UserProfile | null;
  currentActiveDriveFileId: string | null;
  setCurrentActiveDriveFileId: (fileId: string | null) => void;
  setFileOwnerUid: (uid: string | null) => void;
  isListingDriveFiles: boolean;
  debouncedPeople: Record<string, Person>;
  runWithAuth: <T>(operation: () => Promise<T>, allowPopup?: boolean) => Promise<T>;
  showGoogleError: (error: unknown, fallback: string) => void;
  refreshDriveFiles: (allowPopup?: boolean) => Promise<void>;
  onCloseGoogleSyncChoice: () => void;
}


export const useDrivePersistence = ({
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
}: UseDrivePersistenceParams) => {
  const isSyncing = useAppStore((state) => state.driveSyncUiStatus === 'syncing');
  const setDriveSyncUiStatus = useAppStore((state) => state.setDriveSyncUiStatus);
  const [isSavingDriveFile, setIsSavingDriveFile] = useState(false);

  const onLoadCloudData = useCallback(
    async (fileId: string) => {
      setDriveSyncUiStatus('syncing');
      try {
        const cloudData = await runWithAuth(() => storageProvider.loadFile(fileId), true);

        if (!cloudData) {
          throw new Error('File is empty or corrupted');
        }

        loadDrivePayloadIntoStore(cloudData);

        setCurrentActiveDriveFileId(fileId);
        showToast.success('File loaded successfully from Google Drive.');
      } catch (e: unknown) {
        const err = e as Error;
        logError('useGoogleSync onLoadCloudData', err, {
          category: 'NETWORK',
          severity: 'MEDIUM',
          metadata: { fileId, operationType: 'load_drive_file' }
        });
        const errorMessage = err.message || 'Unknown error occurred';

        if (isMissingDriveFileError(err)) {
          setCurrentActiveDriveFileId(null);
          showToast.error('The file no longer exists in Google Drive. You can start with a fresh tree or create a new file.');
        } else {
          showGoogleError(err, `Failed to load file: ${errorMessage}`);
        }
      } finally {
        setDriveSyncUiStatus('idle');
        onCloseGoogleSyncChoice();
      }
    },
    [onCloseGoogleSyncChoice, runWithAuth, setCurrentActiveDriveFileId, setDriveSyncUiStatus, showGoogleError]
  );

  const onSaveNewCloudFile = useCallback(async () => {
    setDriveSyncUiStatus('syncing');
    try {
      const fullState = buildCurrentDriveFullState();
      const newId = await runWithAuth(() => storageProvider.saveFile(fullState, null), true);
      setCurrentActiveDriveFileId(newId);
      showToast.success('Tree saved as a new file to Google Drive!');
      refreshDriveFiles(true);
    } catch (e) {
      logError('useGoogleSync onSaveNewCloudFile', e, {
        category: 'NETWORK',
        severity: 'MEDIUM',
        metadata: { operationType: 'save_new_drive_file' }
      });
      showGoogleError(e, 'Failed to save new file to Google Drive.');
    } finally {
      setDriveSyncUiStatus('idle');
      onCloseGoogleSyncChoice();
    }
  }, [onCloseGoogleSyncChoice, refreshDriveFiles, runWithAuth, setCurrentActiveDriveFileId, setDriveSyncUiStatus, showGoogleError]);

  const handleSaveAsNewDriveFile = useCallback(
    async (fileName: string) => {
      setIsSavingDriveFile(true);
      try {
        const fullState = buildCurrentDriveFullState();
        const newId = await runWithAuth(() => storageProvider.saveFile(fullState, null, fileName), true);
        setCurrentActiveDriveFileId(newId);
        showToast.success(`Tree saved as '${fileName}' to Google Drive!`);
        await refreshDriveFiles(true);
      } catch (e) {
        logError('useGoogleSync handleSaveAsNewDriveFile', e, {
          category: 'NETWORK',
          severity: 'MEDIUM',
          metadata: { fileName, operationType: 'save_as_new_drive_file' }
        });
        showGoogleError(e, 'Failed to save as new file to Google Drive.');
      } finally {
        setIsSavingDriveFile(false);
      }
    },
    [refreshDriveFiles, runWithAuth, setCurrentActiveDriveFileId, showGoogleError]
  );

  const handleOverwriteExistingDriveFile = useCallback(
    async (fileId: string | null, silent: boolean = false, allowPopup: boolean = false, forceNew: boolean = false) => {
      setIsSavingDriveFile(true);

      if (!validateCurrentDriveIntegrity(silent)) {
        setIsSavingDriveFile(false);
        return;
      }

      try {
        const newId = await saveCurrentDriveState({ fileId, forceNew, user, runWithAuth, allowPopup });

        setCurrentActiveDriveFileId(newId);
        localStorage.setItem('jozor_gdrive_file_id', newId);

        localStorage.removeItem('pending_google_sync');

        if (!silent) {
          showToast.success('File synchronized successfully on Google Drive!');
          await refreshDriveFiles(allowPopup);
        }
      } catch (e: unknown) {
        const err = e as { message?: string; status?: number; result?: { error?: { code?: number } } };
        const status = getDriveErrorStatus(err);
        logError('useGoogleSync handleOverwriteExistingDriveFile', e, {
          category: err.message === 'Offline' || !navigator.onLine ? 'NETWORK' : status === 401 ? 'AUTH' : status === 403 ? 'PERMISSION' : 'SYNC',
          severity: 'HIGH',
          metadata: { fileId, status, operationType: 'overwrite_drive_file', silent, forceNew }
        });

        if (err.message === 'Offline' || !navigator.onLine) {
          localStorage.setItem('pending_google_sync', 'true');
          if (!silent) showToast.error('Offline. Changes will sync when connection is restored.');
        } else if (err.message === 'Missing authentication') {
          if (!silent) showToast.error('Your session has expired. Please click "Login" and try again.');
        } else {
          const errorMessage = getOverwriteDriveErrorMessage(err, status);
          if (!silent) showGoogleError(err, errorMessage);
        }
      } finally {
        setIsSavingDriveFile(false);
      }
    },
    [refreshDriveFiles, runWithAuth, setCurrentActiveDriveFileId, showGoogleError, user]
  );

  const handleLoadDriveFile = useCallback(
    async (fileId: string, ownerUid?: string) => {
      setDriveSyncUiStatus('syncing');
      try {
        const cloudData = await runWithAuth(() => storageProvider.loadFile(fileId), true);
        loadFullState(cloudData);
        setCurrentActiveDriveFileId(fileId);
        setFileOwnerUid(ownerUid || user?.uid || null);
        showToast.success('File loaded successfully from Google Drive.');
      } catch (e) {
        logError('useGoogleSync handleLoadDriveFile', e, {
          category: 'NETWORK',
          severity: 'MEDIUM',
          metadata: { fileId, ownerUid, operationType: 'load_drive_file' }
        });
        showGoogleError(e, 'Failed to load file from Google Drive.');
      } finally {
        setDriveSyncUiStatus('idle');
      }
    },
    [runWithAuth, setCurrentActiveDriveFileId, setFileOwnerUid, setDriveSyncUiStatus, showGoogleError, user]
  );

  useSyncRetry({
    currentActiveDriveFileId,
    isSyncing,
    onRetry: (fileId) => handleOverwriteExistingDriveFile(fileId),
    enabled: !IS_DRIVE_BACKUP_ONLY,
  });

  useEffect(() => {
    const guard = shouldRunAutoDriveSync({
      isDriveBackupOnly: IS_DRIVE_BACKUP_ONLY,
      user,
      currentActiveDriveFileId,
      isSyncing,
      isSavingDriveFile,
      isListingDriveFiles,
      debouncedPeople,
    });

    if (!guard.shouldRun) {
      if (guard.reason !== 'emptyTree') return;
      logWarn('useGoogleSync autoSyncGuard', 'Auto-sync skipped because people data is empty.', {
        category: 'VALIDATION',
        metadata: { operationType: 'auto_drive_sync' }
      });
      return;
    }

    handleOverwriteExistingDriveFile(currentActiveDriveFileId!, true);
  }, [currentActiveDriveFileId, debouncedPeople, handleOverwriteExistingDriveFile, isListingDriveFiles, isSavingDriveFile, isSyncing, user]);

  const handleClearSyncCache = useCallback(async () => {
    if (!user) {
      showToast.error('Cannot reset sync: No active tree or session found.');
      return;
    }

    setDriveSyncUiStatus('syncing');
    try {
      logWarn('useGoogleSync handleClearSyncCache', 'Purging local Google Drive sync metadata.', {
        category: 'SYNC',
        metadata: { operationType: 'clear_sync_cache' }
      });

      setCurrentActiveDriveFileId(null);
      localStorage.removeItem('jozor_gdrive_file_id');

      showToast.success('Sync cache cleared. Creating fresh backup...');
      await handleOverwriteExistingDriveFile(null, false, true, true);
    } catch (e: unknown) {
      logError('useGoogleSync handleClearSyncCache', e, {
        category: 'SYNC',
        severity: 'HIGH',
        metadata: { operationType: 'clear_sync_cache' }
      });
      const message = e instanceof Error ? e.message : 'Unknown error';
      showGoogleError(e, `Reset failed: ${message}`);
    } finally {
      setDriveSyncUiStatus('idle');
    }
  }, [handleOverwriteExistingDriveFile, setCurrentActiveDriveFileId, setDriveSyncUiStatus, showGoogleError, user]);

  const onSaveToGoogleDrive = useCallback(() => {
    if (!currentActiveDriveFileId) {
      return onSaveNewCloudFile();
    }
    return handleOverwriteExistingDriveFile(currentActiveDriveFileId, false, true);
  }, [currentActiveDriveFileId, handleOverwriteExistingDriveFile, onSaveNewCloudFile]);

  return {
    onLoadCloudData,
    onSaveNewCloudFile,
    handleLoadDriveFile,
    handleSaveAsNewDriveFile,
    handleOverwriteExistingDriveFile,
    handleClearSyncCache,
    onSaveToGoogleDrive,
    isSavingDriveFile,
  };
};
