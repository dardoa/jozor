import { useCallback, useEffect, useState } from 'react';
import { storageProvider } from '../../../../services/storageProvider';
import type { DriveFile } from '../../../../types';
import { showToast } from '../../../../utils/showToast';
import { getSnapshotPinnedName, isPinnedSnapshot } from './versionsTabUtils';

interface UseVersionsSnapshotsOptions {
  treeId: string;
  googleSync: {
    handleCreateSnapshot: (label: string) => Promise<void>;
    handleRestoreSnapshot: (snapshot: DriveFile) => Promise<void>;
  };
}

export const useVersionsSnapshots = ({
  treeId,
  googleSync,
}: UseVersionsSnapshotsOptions) => {
  const [snapshots, setSnapshots] = useState<DriveFile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [newLabel, setNewLabel] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  const fetchSnapshots = useCallback(async () => {
    try {
      setIsLoading(true);
      const files = await storageProvider.listSnapshots(treeId);
      setSnapshots(files);
    } catch {
      showToast.error('messages.error.snapshot');
    } finally {
      setIsLoading(false);
    }
  }, [treeId]);

  useEffect(() => {
    void fetchSnapshots();
  }, [fetchSnapshots]);

  const handleCreate = useCallback(async () => {
    const trimmedLabel = newLabel.trim();
    if (!trimmedLabel) return;

    try {
      setIsCreating(true);
      await googleSync.handleCreateSnapshot(trimmedLabel);
      setNewLabel('');
      showToast.success('messages.success.snapshot');
      void fetchSnapshots();
    } catch {
      showToast.error('messages.error.snapshot');
    } finally {
      setIsCreating(false);
    }
  }, [fetchSnapshots, googleSync, newLabel]);

  const restoreSnapshot = useCallback(async (snapshot: DriveFile) => {
    try {
      await googleSync.handleRestoreSnapshot(snapshot);
      showToast.success('messages.success.restore');
    } catch {
      showToast.error('messages.error.load');
    }
  }, [googleSync]);

  const handleTogglePin = useCallback(async (snapshot: DriveFile) => {
    const isPinned = isPinnedSnapshot(snapshot);

    try {
      await storageProvider.renameFile(snapshot.id, getSnapshotPinnedName(snapshot));
      showToast.success(isPinned ? 'versions.unpinned' : 'versions.pinned');
      void fetchSnapshots();
    } catch {
      showToast.error('messages.error.rename');
    }
  }, [fetchSnapshots]);

  const deleteSnapshot = useCallback(async (fileId: string) => {
    try {
      await storageProvider.deleteFile(fileId);
      showToast.success('messages.success.deleteSuccess');
      void fetchSnapshots();
    } catch {
      showToast.error('messages.error.delete');
    }
  }, [fetchSnapshots]);

  return {
    snapshots,
    isLoading,
    newLabel,
    setNewLabel,
    isCreating,
    handleCreate,
    restoreSnapshot,
    handleTogglePin,
    deleteSnapshot,
  };
};
