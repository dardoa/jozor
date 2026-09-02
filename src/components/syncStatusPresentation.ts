import type { SyncStatus } from '../types';

type SyncText = Record<string, string | undefined>;

export type DriveConnectionState = 'connected' | 'disconnected' | 'expired';
export type SyncPrimaryAction = 'retry-database' | 'open-backups' | 'backup-now' | 'reset-backup' | null;

export interface SyncStatusPresentationSnapshot {
  databaseState: 'checking' | 'offline' | 'syncing' | 'error' | 'synced';
  queueState: 'pending' | 'clear';
  driveConnectionState: DriveConnectionState;
  backupState: 'disconnected' | 'expired' | 'unlinked' | 'uploading' | 'error' | 'ready' | 'backed-up';
  primaryAction: SyncPrimaryAction;
}

export const deriveSyncStatusPresentation = ({
  syncStatus,
  driveConnectionState,
  hasLinkedBackup,
}: {
  syncStatus: SyncStatus;
  driveConnectionState: DriveConnectionState;
  hasLinkedBackup: boolean;
}): SyncStatusPresentationSnapshot => {
  const databaseState = syncStatus.state === 'offline'
    ? 'offline'
    : syncStatus.state === 'checking'
      ? 'checking'
      : syncStatus.state === 'error' || syncStatus.supabaseStatus === 'error' || syncStatus.retryPaused
        ? 'error'
        : syncStatus.state === 'saving' || syncStatus.supabaseStatus === 'syncing' || syncStatus.pendingCount > 0
          ? 'syncing'
          : 'synced';

  const backupState = driveConnectionState === 'expired'
    ? 'expired'
    : driveConnectionState === 'disconnected'
      ? 'disconnected'
      : !hasLinkedBackup
        ? 'unlinked'
        : syncStatus.driveStatus === 'uploading'
          ? 'uploading'
          : syncStatus.driveStatus === 'error'
            ? 'error'
            : syncStatus.lastSyncDrive
              ? 'backed-up'
              : 'ready';

  const primaryAction: SyncPrimaryAction = databaseState === 'error'
    ? 'retry-database'
    : databaseState === 'offline' || databaseState === 'checking' || databaseState === 'syncing'
      ? null
      : backupState === 'disconnected' || backupState === 'expired' || backupState === 'unlinked'
        ? 'open-backups'
        : backupState === 'error'
          ? 'reset-backup'
          : backupState === 'ready' || backupState === 'backed-up'
            ? 'backup-now'
            : null;

  return {
    databaseState,
    queueState: syncStatus.pendingCount > 0 ? 'pending' : 'clear',
    driveConnectionState,
    backupState,
    primaryAction,
  };
};

export const getSyncStatusDotClass = (state: SyncStatus['state']) => {
  switch (state) {
    case 'checking':
      return 'bg-gray-400 animate-pulse';
    case 'synced':
      return 'bg-green-500';
    case 'saving':
      return 'bg-yellow-500 animate-pulse';
    case 'error':
      return 'bg-red-500';
    case 'offline':
      return 'bg-gray-500';
    default:
      return 'bg-gray-400';
  }
};

export const getSyncStatusText = (state: SyncStatus['state'], syncText: SyncText) => {
  switch (state) {
    case 'checking':
      return syncText.checking || 'Checking session...';
    case 'synced':
      return syncText.allChangesSaved || 'All changes saved';
    case 'saving':
      return syncText.syncing || 'Syncing...';
    case 'error':
      return syncText.attentionNeeded || 'Attention needed';
    case 'offline':
      return syncText.offline || 'Offline';
  }
};

export const getSupabaseStatusClass = (status: SyncStatus['supabaseStatus']) => {
  switch (status) {
    case 'idle':
      return 'text-green-600 dark:text-green-400';
    case 'syncing':
      return 'text-yellow-600 dark:text-yellow-400';
    case 'error':
      return 'text-red-600 dark:text-red-400';
  }
};

export const getDriveStatusClass = (status: SyncStatus['driveStatus']) => {
  switch (status) {
    case 'idle':
      return 'text-green-600 dark:text-green-400';
    case 'uploading':
      return 'text-yellow-600 dark:text-yellow-400';
    case 'error':
      return 'text-red-600 dark:text-red-400';
  }
};

export const getSupabaseStatusLabel = (status: SyncStatus['supabaseStatus'], syncText: SyncText) => {
  switch (status) {
    case 'idle':
      return syncText.online || 'Online';
    case 'syncing':
      return syncText.syncing || 'Syncing...';
    case 'error':
      return syncText.needsAttention || 'Needs attention';
  }
};

export const getDriveStatusLabel = (status: SyncStatus['driveStatus'], syncText: SyncText) => {
  switch (status) {
    case 'idle':
      return syncText.backedUp || 'Backed up';
    case 'uploading':
      return syncText.uploading || 'Uploading';
    case 'error':
      return syncText.needsAttention || 'Needs attention';
  }
};
