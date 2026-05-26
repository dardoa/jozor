import * as React from 'react';
import type { Person } from '../../../types';
import { useGoogleSync } from '../../sync/useGoogleSync';
import { useSyncStatus } from '../../sync/useSyncStatus';
import { useSupabaseSync } from '../../sync/useSupabaseSync';
import { useSyncLifecycleEvents } from '../../google/useSyncLifecycleEvents';

interface UseSyncCoordinatorParams {
  people: Record<string, Person>;
  onOpenGoogleSyncChoice: (fileId: string) => void;
  onCloseGoogleSyncChoice: () => void;
  setShowWelcome: (value: boolean) => void;
  onOpenCloudBackups: () => void;
}

export const useSyncCoordinator = ({
  people,
  onOpenGoogleSyncChoice,
  onCloseGoogleSyncChoice,
  setShowWelcome,
  onOpenCloudBackups,
}: UseSyncCoordinatorParams) => {
  const { syncStatus } = useSyncStatus();

  // Initialize Google Sync
  const googleSync = useGoogleSync(
    people,
    onOpenGoogleSyncChoice,
    onCloseGoogleSyncChoice,
    setShowWelcome,
    onOpenCloudBackups
  );

  // Initialize Supabase Sync Channel
  useSupabaseSync();

  // Handle periodic backups and sync events
  const lifecycleEvents = React.useMemo(() => ({
    currentActiveDriveFileId: googleSync.currentActiveDriveFileId,
    handleOverwriteExistingDriveFile: googleSync.handleOverwriteExistingDriveFile,
    onSaveNewCloudFile: googleSync.onSaveNewCloudFile,
    onSaveToGoogleDrive: googleSync.onSaveToGoogleDrive,
    handleClearSyncCache: googleSync.handleClearSyncCache,
  }), [
    googleSync.currentActiveDriveFileId,
    googleSync.handleOverwriteExistingDriveFile,
    googleSync.onSaveNewCloudFile,
    googleSync.onSaveToGoogleDrive,
    googleSync.handleClearSyncCache,
  ]);

  useSyncLifecycleEvents(lifecycleEvents);

  return {
    googleSync,
    syncStatus,
  };
};
