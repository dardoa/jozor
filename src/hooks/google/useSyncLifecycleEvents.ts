import { useEffect } from 'react';
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
  useEffect(() => {
    const handleBackupRequest = async () => {
      console.warn('Periodic backup requested (50 operations reached)');
      try {
        if (googleSync.currentActiveDriveFileId) {
          await googleSync.handleOverwriteExistingDriveFile(googleSync.currentActiveDriveFileId);
        } else {
          await googleSync.onSaveNewCloudFile();
        }
      } catch (error) {
        logError('PERIODIC_BACKUP_ERROR', error, { showToast: false });
      }
    };

    window.addEventListener('jozor-backup-requested', handleBackupRequest);
    return () => window.removeEventListener('jozor-backup-requested', handleBackupRequest);
  }, [googleSync]);

  useEffect(() => {
    const handleForceSync = () => {
      console.warn('Force sync to Drive triggered');
      if (googleSync.onSaveToGoogleDrive) {
        googleSync
          .onSaveToGoogleDrive()
          .catch((error) => logError('SYNC_FORCE_SAVE_ERROR', error, { showToast: false }));
      }
    };

    const handleClearCache = () => {
      console.warn('Emergency sync reset triggered');
      if (googleSync.handleClearSyncCache) {
        googleSync
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
  }, [googleSync]);
};
