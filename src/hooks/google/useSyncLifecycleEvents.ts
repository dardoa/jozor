import { useEffect, useRef } from 'react';
import { logError } from '../../utils/errorLogger';

interface GoogleSyncEvents {
  currentActiveDriveFileId: string | null;
  handleOverwriteExistingDriveFile: (fileId: string) => Promise<void>;
  onSaveNewCloudFile: () => Promise<void>;
  onSaveToGoogleDrive: () => Promise<void>;
  handleClearSyncCache: () => Promise<void>;
}

/**
 * Hook to manage global event listeners for sync lifecycle events
 * (periodic backups, forced syncs, cache clearing).
 */
export const useSyncLifecycleEvents = (googleSync: GoogleSyncEvents) => {
  const googleSyncRef = useRef(googleSync);

  useEffect(() => {
    googleSyncRef.current = googleSync;
  }, [googleSync]);

  useEffect(() => {
    const handleBackupRequest = async () => {
      const currentGoogleSync = googleSyncRef.current;

      console.warn('Periodic backup requested (50 operations reached)');
      try {
        if (currentGoogleSync.currentActiveDriveFileId) {
          await currentGoogleSync.handleOverwriteExistingDriveFile(
            currentGoogleSync.currentActiveDriveFileId
          );
        } else {
          await currentGoogleSync.onSaveNewCloudFile();
        }
      } catch (error) {
        logError('PERIODIC_BACKUP_ERROR', error, { showToast: false });
      }
    };

    window.addEventListener('jozor-backup-requested', handleBackupRequest);
    return () => window.removeEventListener('jozor-backup-requested', handleBackupRequest);
  }, []);

  useEffect(() => {
    const handleForceSync = () => {
      const currentGoogleSync = googleSyncRef.current;

      console.warn('Force sync to Drive triggered');
      if (currentGoogleSync.onSaveToGoogleDrive) {
        currentGoogleSync
          .onSaveToGoogleDrive()
          .catch((error) => logError('SYNC_FORCE_SAVE_ERROR', error, { showToast: false }));
      }
    };

    const handleClearCache = () => {
      const currentGoogleSync = googleSyncRef.current;

      console.warn('Emergency sync reset triggered');
      if (currentGoogleSync.handleClearSyncCache) {
        currentGoogleSync
          .handleClearSyncCache()
          .catch((error) => logError('SYNC_CLEAR_CACHE_ERROR', error, { showToast: false }));
      }
    };

    window.addEventListener('force-drive-sync', handleForceSync);
    window.addEventListener('clear-vault-sync-cache', handleClearCache);

    return () => {
      window.removeEventListener('force-drive-sync', handleForceSync);
      window.removeEventListener('clear-vault-sync-cache', handleClearCache);
    };
  }, []);
};
