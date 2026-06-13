import { useCallback } from 'react';
import type { RefObject } from 'react';

import { googleApiService, googleAuthService } from '../../services/googleService';
import { storageProvider } from '../../services/storageProvider';
import { useAppStore } from '../../store/useAppStore';
import { showToast } from '../../utils/showToast';
import { getUserFacingErrorInfo, logError, logWarn } from '../../utils/errorLogger';

const IS_DRIVE_BACKUP_ONLY = true;

interface UseGoogleAuthParams {
  setShowWelcome: (show: boolean) => void;
  refreshDriveFilesRef: RefObject<((allowPopup?: boolean) => Promise<void>) | null>;
  setCurrentActiveDriveFileId: (fileId: string | null) => void;
  onOpenGoogleSyncChoice: (fileId: string) => void;
  cleanupOnLogout: () => void;
}

export const useGoogleAuth = ({
  setShowWelcome,
  refreshDriveFilesRef,
  setCurrentActiveDriveFileId,
  onOpenGoogleSyncChoice,
  cleanupOnLogout,
}: UseGoogleAuthParams) => {
  const user = useAppStore((state) => state.user);
  const isDemoMode = useAppStore((state) => state.isDemoMode);
  const driveSyncUiStatus = useAppStore((state) => state.driveSyncUiStatus);
  const setDriveSyncUiStatus = useAppStore((state) => state.setDriveSyncUiStatus);
  const setIsDemoMode = useAppStore((state) => state.setIsDemoMode);

  const showGoogleError = useCallback((error: unknown, fallback: string) => {
    const userFacing = getUserFacingErrorInfo(error, fallback);
    showToast.error(userFacing.message);
  }, []);

  const runWithAuth = useCallback(async <T>(
    operation: () => Promise<T>,
    allowPopup: boolean = false
  ): Promise<T> => {
    await googleApiService.initialize();

    if (!((window as Window & { gapi?: { client?: { drive?: unknown } } }).gapi?.client?.drive)) {
      logWarn('useGoogleSync runWithAuth', 'GAPI Drive client is still missing after initialization.', {
        category: 'AUTH',
        metadata: { operationType: 'google_auth_guard' }
      });
    }

    const isAuthValid = await googleAuthService.ensureTokenValid(allowPopup);
    if (!isAuthValid) {
      throw new Error('Missing authentication');
    }

    try {
      return await operation();
    } catch (e: unknown) {
      const err = e as { status?: number; result?: { error?: { code?: number } } };
      const status = err.status || (err.result?.error?.code);
      if (status === 401) {
        logWarn('useGoogleSync runWithAuth', '401 from Google Drive detected. Triggering re-authentication.', {
          category: 'AUTH',
          metadata: { status, operationType: 'google_auth_refresh' }
        });
        await googleAuthService.login();
        return await operation();
      }
      throw e;
    }
  }, []);

  const onLogin = useCallback(async (): Promise<void> => {
    setDriveSyncUiStatus('syncing');
    try {
      await googleAuthService.login();
      setIsDemoMode(false);
      setShowWelcome(false);
      await refreshDriveFilesRef.current?.(true);

      if (!IS_DRIVE_BACKUP_ONLY) {
        try {
          const existingFileId = await runWithAuth(() => storageProvider.findLatestFile(), true);
          if (existingFileId) {
            setCurrentActiveDriveFileId(existingFileId);
            onOpenGoogleSyncChoice(existingFileId);
          } else {
            setCurrentActiveDriveFileId(null);
          }
        } catch (driveErr) {
          logError('useGoogleSync login driveSetup', driveErr, {
            category: 'NETWORK',
            severity: 'MEDIUM',
            metadata: { operationType: 'login_drive_setup' }
          });
          showGoogleError(driveErr, 'Logged in, but failed to access Google Drive.');
        }
      }
    } catch (e: unknown) {
      const err = e as Error;
      logError('useGoogleSync login', err, {
        category: 'AUTH',
        severity: 'HIGH',
        metadata: { operationType: 'google_login' }
      });
      showGoogleError(err, 'Login failed. Please ensure your Google Client ID is configured correctly.');
      throw err;
    } finally {
      setDriveSyncUiStatus('idle');
    }
  }, [
    onOpenGoogleSyncChoice,
    refreshDriveFilesRef,
    runWithAuth,
    setCurrentActiveDriveFileId,
    setDriveSyncUiStatus,
    setIsDemoMode,
    setShowWelcome,
    showGoogleError,
  ]);

  const onLogout = useCallback(async (): Promise<void> => {
    try {
      await googleAuthService.logout();
    } catch {
      // Ignore logout errors if session is already gone.
    }
    cleanupOnLogout();
    setIsDemoMode(false);
    showToast.success('Logged out successfully.');
  }, [cleanupOnLogout, setIsDemoMode]);

  return {
    user,
    isSyncing: driveSyncUiStatus === 'syncing',
    isDemoMode,
    setIsDemoMode,
    runWithAuth,
    showGoogleError,
    onLogin,
    onLogout,
  };
};
