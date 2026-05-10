import type { SyncStatus } from '../types';

type SyncText = Record<string, string | undefined>;

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
