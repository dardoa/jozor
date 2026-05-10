import { useCallback, useEffect, useState } from 'react';
import { storageProvider } from '../../services/storageProvider';
import { useAppStore } from '../../store/useAppStore';
import type { DriveFile, GoogleSyncStateAndActions } from '../../types';
import { showToast } from '../../utils/showToast';

interface UseSnapshotHistoryModalStateOptions {
  isOpen: boolean;
  onClose: () => void;
  googleSync: GoogleSyncStateAndActions;
}

export const useSnapshotHistoryModalState = ({
  isOpen,
  onClose,
  googleSync,
}: UseSnapshotHistoryModalStateOptions) => {
  const [snapshots, setSnapshots] = useState<DriveFile[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [newLabel, setNewLabel] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [isRestoreConfirmOpen, setRestoreConfirmOpen] = useState(false);
  const [pendingRestoreFile, setPendingRestoreFile] = useState<DriveFile | null>(null);
  const currentTreeId = useAppStore((state) => state.currentTreeId);

  const fetchSnapshots = useCallback(async () => {
    if (!currentTreeId) {
      console.warn('No currentTreeId available for listing snapshots');
      return;
    }

    setIsLoading(true);
    try {
      const files = await storageProvider.listSnapshots(currentTreeId);
      setSnapshots(files);
    } catch (error) {
      console.error('Failed to list snapshots', error);
      showToast.error('messages.error.load');
    } finally {
      setIsLoading(false);
    }
  }, [currentTreeId]);

  useEffect(() => {
    if (isOpen) {
      void fetchSnapshots();
    }
  }, [fetchSnapshots, isOpen]);

  const handleCreate = useCallback(async () => {
    if (!newLabel.trim()) return;

    setIsCreating(true);
    try {
      await googleSync.handleCreateSnapshot(newLabel);
      setNewLabel('');
      showToast.success('messages.success.load');
      await fetchSnapshots();
    } catch (error) {
      console.error('Create snapshot failed:', error);
      showToast.error('messages.error.snapshot');
    } finally {
      setIsCreating(false);
    }
  }, [fetchSnapshots, googleSync, newLabel]);

  const handleRestore = useCallback((file: DriveFile) => {
    setPendingRestoreFile(file);
    setRestoreConfirmOpen(true);
  }, []);

  const confirmRestore = useCallback(async () => {
    if (!pendingRestoreFile) return;

    try {
      await googleSync.handleRestoreSnapshot(pendingRestoreFile);
      onClose();
    } catch (error) {
      console.error('Restore failed:', error);
      showToast.error('messages.error.load');
    } finally {
      setRestoreConfirmOpen(false);
      setPendingRestoreFile(null);
    }
  }, [googleSync, onClose, pendingRestoreFile]);

  return {
    snapshots,
    isLoading,
    newLabel,
    setNewLabel,
    isCreating,
    isRestoreConfirmOpen,
    setRestoreConfirmOpen,
    handleCreate,
    handleRestore,
    confirmRestore,
  };
};

export type SnapshotHistoryModalState = ReturnType<typeof useSnapshotHistoryModalState>;
