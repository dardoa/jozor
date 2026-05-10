import type { Person, UserProfile } from '../../types';

interface AutoDriveSyncGuardInput {
  isDriveBackupOnly: boolean;
  user: UserProfile | null;
  currentActiveDriveFileId: string | null;
  isSyncing: boolean;
  isSavingDriveFile: boolean;
  isListingDriveFiles: boolean;
  debouncedPeople: Record<string, Person>;
}

export const getDriveErrorStatus = (error: unknown): number | undefined => {
  if (!error || typeof error !== 'object') return undefined;
  const driveError = error as { status?: number; result?: { error?: { code?: number } } };
  return driveError.status || driveError.result?.error?.code;
};

export const isMissingDriveFileError = (error: unknown): boolean => {
  const message = error instanceof Error ? error.message : String(error ?? '');
  return message.includes('not found') || message.includes('404');
};

export const getOverwriteDriveErrorMessage = (error: unknown, status?: number): string => {
  const message = error instanceof Error ? error.message : 'Unknown error';

  if (status === 403) {
    return 'Permission denied on Google Drive file. Try "Clear Sync Cache & Retry" in the sync popover.';
  }
  if (status === 404 || status === 410) {
    return 'The Drive file no longer exists. A new one will be created.';
  }
  return `Failed to sync: ${message}`;
};

export const shouldRunAutoDriveSync = ({
  isDriveBackupOnly,
  user,
  currentActiveDriveFileId,
  isSyncing,
  isSavingDriveFile,
  isListingDriveFiles,
  debouncedPeople,
}: AutoDriveSyncGuardInput): { shouldRun: true } | { shouldRun: false; reason?: 'backupOnly' | 'notReady' | 'emptyTree' } => {
  if (isDriveBackupOnly) return { shouldRun: false, reason: 'backupOnly' };
  if (!user || !currentActiveDriveFileId || isSyncing || isSavingDriveFile || isListingDriveFiles) {
    return { shouldRun: false, reason: 'notReady' };
  }
  if (Object.keys(debouncedPeople).length === 0) {
    return { shouldRun: false, reason: 'emptyTree' };
  }
  return { shouldRun: true };
};
