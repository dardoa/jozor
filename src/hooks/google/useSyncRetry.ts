import { useEffect } from 'react';
import { logWarn } from '../../utils/errorLogger';

interface UseSyncRetryParams {
  currentActiveDriveFileId: string | null;
  isSyncing: boolean;
  onRetry: (fileId: string) => void;
  enabled?: boolean;
}

/**
 * Hook to manage offline-to-online sync retries and pending sync status.
 */
export const useSyncRetry = ({
  currentActiveDriveFileId,
  isSyncing,
  onRetry,
  enabled = true,
}: UseSyncRetryParams) => {
  useEffect(() => {
    if (!enabled) return;
    
    const pendingSync = localStorage.getItem('pending_google_sync');
    if (pendingSync === 'true' && currentActiveDriveFileId && !isSyncing && navigator.onLine) {
      logWarn('useSyncRetry', 'Detected pending offline Google Drive sync. Retrying now.', {
        category: 'SYNC',
        metadata: { fileId: currentActiveDriveFileId, operationType: 'retry_drive_sync' }
      });
      onRetry(currentActiveDriveFileId);
    }

    const handleOnline = () => {
      const pending = localStorage.getItem('pending_google_sync');
      if (pending === 'true' && currentActiveDriveFileId) {
        logWarn('useSyncRetry', 'Network restored. Retrying pending Google Drive sync.', {
          category: 'NETWORK',
          metadata: { fileId: currentActiveDriveFileId, operationType: 'retry_drive_sync' }
        });
        onRetry(currentActiveDriveFileId);
      }
    };

    window.addEventListener('online', handleOnline);
    return () => window.removeEventListener('online', handleOnline);
  }, [currentActiveDriveFileId, isSyncing, onRetry, enabled]);
};
