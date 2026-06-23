import { useCallback, useEffect, useRef, useState } from 'react';

import type { DriveFile, UserProfile } from '../../types';
import { storageProvider } from '../../services/storageProvider';
import { showToast } from '../../utils/showToast';
import { logError, logWarn } from '../../utils/errorLogger';
import { useAppStore } from '../../store/useAppStore';

const SESSION_ERROR_TOAST_ID = 'session-error';

interface UseDriveFilesParams {
  user: UserProfile | null;
  runWithAuth: <T>(operation: () => Promise<T>, allowPopup?: boolean) => Promise<T>;
  showGoogleError: (error: unknown, fallback: string) => void;
  currentActiveDriveFileId: string | null;
  setCurrentActiveDriveFileId: (fileId: string | null) => void;
  fileOwnerUid: string | null;
  setFileOwnerUid: (uid: string | null) => void;
}

export const useDriveFiles = ({
  user,
  runWithAuth,
  showGoogleError,
  currentActiveDriveFileId,
  setCurrentActiveDriveFileId,
  fileOwnerUid,
  setFileOwnerUid,
}: UseDriveFilesParams) => {
  const [driveFiles, setDriveFiles] = useState<DriveFile[]>([]);
  const [isListingDriveFiles, setIsListingDriveFiles] = useState(false);
  const [isDeletingDriveFile, setIsDeletingDriveFile] = useState(false);
  const [hasSessionError, setHasSessionError] = useState(false);
  const [isAuthorized, setIsAuthorized] = useState(false);
  const isRefreshingDriveFilesRef = useRef(false);
  const isMountedRef = useRef(false);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    if (user?.supabaseToken || user?.uid) {
      setHasSessionError(false);
    }
  }, [user?.supabaseToken, user?.uid]);

  const refreshDriveFiles = useCallback(async (allowPopup: boolean = false) => {
    if (!user) {
      if (isMountedRef.current) {
        setDriveFiles([]);
        setIsAuthorized(false);
      }
      return;
    }
    if (isRefreshingDriveFilesRef.current && !allowPopup) {
      return;
    }

    isRefreshingDriveFilesRef.current = true;
    if (isMountedRef.current) {
      setIsListingDriveFiles(true);
    }
    try {
      const files = await runWithAuth(() => storageProvider.listFiles(), allowPopup);
      if (!isMountedRef.current) return;

      setHasSessionError(false);
      setIsAuthorized(true);
      setDriveFiles(files);
    } catch (e: unknown) {
      if (!isMountedRef.current) return;

      const err = e as Error;
      if (err.message === 'Missing authentication') {
        const hasPreviousToken = !!localStorage.getItem('jozor_google_access_token');
        if (hasPreviousToken) {
          logError('useGoogleSync refreshDriveFiles', err, {
            category: 'NETWORK',
            severity: 'MEDIUM',
            metadata: { operationType: 'list_drive_files' }
          });
          setHasSessionError(true);
          showToast.error('Your session has expired. Please reconnect your account in the Cloud tab.', { id: SESSION_ERROR_TOAST_ID });
        } else {
          // Not an error, just not connected yet.
          setHasSessionError(false);
        }
      } else {
        logError('useGoogleSync refreshDriveFiles', err, {
          category: 'NETWORK',
          severity: 'MEDIUM',
          metadata: { operationType: 'list_drive_files' }
        });
        showGoogleError(err, 'Failed to list files from Google Drive.');
      }
      setIsAuthorized(false);
    } finally {
      isRefreshingDriveFilesRef.current = false;
      if (isMountedRef.current) {
        setIsListingDriveFiles(false);
      }
    }
  }, [showGoogleError, user, runWithAuth]);

  const handleDeleteDriveFile = useCallback(
    async (fileId: string) => {
      const role = useAppStore.getState().currentUserRole;
      if (role === 'viewer') {
        showToast.error('Read-only users cannot delete files from Google Drive.');
        return;
      }
      if (fileOwnerUid && user && fileOwnerUid !== user.uid) {
        showToast.error('Only the owner can delete this file.');
        return;
      }

      setIsDeletingDriveFile(true);
      try {
        await runWithAuth(() => storageProvider.deleteFile(fileId), true);
        if (!isMountedRef.current) return;

        showToast.success('File deleted from Google Drive.');
        if (currentActiveDriveFileId === fileId) {
          setCurrentActiveDriveFileId(null);
          setFileOwnerUid(null);
        }
        await refreshDriveFiles(true);
      } catch (e) {
        if (!isMountedRef.current) return;

        logError('useGoogleSync handleDeleteDriveFile', e, {
          category: 'NETWORK',
          severity: 'MEDIUM',
          metadata: { fileId, operationType: 'delete_drive_file' }
        });
        showGoogleError(e, 'Failed to delete file from Google Drive.');
      } finally {
        if (isMountedRef.current) {
          setIsDeletingDriveFile(false);
        }
      }
    },
    [
      currentActiveDriveFileId,
      fileOwnerUid,
      refreshDriveFiles,
      runWithAuth,
      setCurrentActiveDriveFileId,
      setFileOwnerUid,
      showGoogleError,
      user,
    ]
  );

  const clearDriveFiles = useCallback(() => {
    setDriveFiles([]);
  }, []);

  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'jozor_gdrive_file_id') {
        logWarn('useGoogleSync multiTabFileId', 'Detected Google Drive file id change in another tab.', {
          category: 'SYNC',
          metadata: { fileId: e.newValue, operationType: 'multi_tab_sync' }
        });
        setCurrentActiveDriveFileId(e.newValue);
      }
    };
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [setCurrentActiveDriveFileId]);

  return {
    driveFiles,
    clearDriveFiles,
    refreshDriveFiles,
    handleDeleteDriveFile,
    isListingDriveFiles,
    isDeletingDriveFile,
    hasSessionError,
    isAuthorized,
  };
};
