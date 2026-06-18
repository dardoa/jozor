import { useCallback, useEffect, useRef } from 'react';

import type { DriveFile, FullState, UserProfile } from '../../types';
import { storageProvider } from '../../services/storageProvider';
import { loadFullState, useAppStore } from '../../store/useAppStore';
import { showToast } from '../../utils/showToast';
import { logError, logInfo, logWarn } from '../../utils/errorLogger';
import { DriveSerializationService } from '../../services/google/DriveSerializationService';

const IS_DRIVE_BACKUP_ONLY = true;

interface UseDriveSnapshotsParams {
  user: UserProfile | null;
  currentActiveDriveFileId: string | null;
  runWithAuth: <T>(operation: () => Promise<T>, allowPopup?: boolean) => Promise<T>;
  showGoogleError: (error: unknown, fallback: string) => void;
}

export const useDriveSnapshots = ({
  user,
  currentActiveDriveFileId,
  runWithAuth,
  showGoogleError,
}: UseDriveSnapshotsParams) => {
  const setDriveSyncUiStatus = useAppStore((state) => state.setDriveSyncUiStatus);
  const archiveRestoreCleanupRef = useRef<(() => void) | null>(null);
  const isMountedRef = useRef(false);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const buildSnapshotArchive = useCallback(async (fullState: FullState, label: string): Promise<Blob> => {
    const { buildBlueprintArchive } = await import('../../services/archiveService');
    const { blob } = await buildBlueprintArchive(fullState, { label });
    return blob;
  }, []);

  const handleCreateSnapshot = useCallback(async (label: string) => {
    if (!currentActiveDriveFileId) return;
    setDriveSyncUiStatus('syncing');
    try {
      const fullState = DriveSerializationService.buildCurrentFullState(user?.email || 'unknown');
      const state = useAppStore.getState();

      const treeId = state.currentTreeId;

      if (!treeId) {
        setDriveSyncUiStatus('idle');
        if (isMountedRef.current) {
          showToast.error('Cannot create snapshot: Tree ID undefined.');
        }
        return;
      }

      await runWithAuth(() => storageProvider.cleanupSnapshots(treeId, 2), true);
      if (!isMountedRef.current) return;

      const snapshotArchive = await buildSnapshotArchive(fullState, label);
      await runWithAuth(() => storageProvider.saveSnapshot(snapshotArchive, treeId, label), true);
      if (!isMountedRef.current) return;

      showToast.success('Snapshot saved successfully!');
    } catch (e) {
      if (!isMountedRef.current) return;

      logError('useGoogleSync handleCreateSnapshot', e, {
        category: 'NETWORK',
        severity: 'MEDIUM',
        metadata: { label, operationType: 'save_snapshot' }
      });
      showGoogleError(e, 'Failed to save snapshot.');
    } finally {
      setDriveSyncUiStatus('idle');
    }
  }, [buildSnapshotArchive, currentActiveDriveFileId, runWithAuth, setDriveSyncUiStatus, showGoogleError, user]);

  const handleRestoreSnapshot = useCallback(async (snapshot: DriveFile) => {
    if (!currentActiveDriveFileId) return;
    setDriveSyncUiStatus('syncing');
    try {
      const fullState = DriveSerializationService.buildCurrentFullState(user?.email || 'unknown');
      const treeId = useAppStore.getState().currentTreeId;

      if (treeId) {
        const safetySnapshotArchive = await buildSnapshotArchive(
          fullState,
          'Safety_Before_Restore'
        );
        await runWithAuth(
          () => storageProvider.saveSnapshot(safetySnapshotArchive, treeId, 'Safety_Before_Restore'),
          true
        );
      }
      if (!isMountedRef.current) return;

      const archiveBlob = await runWithAuth(
        () => storageProvider.loadSnapshotFileRaw(snapshot.id),
        true
      );
      if (!isMountedRef.current) return;

      const { restoreBlueprintArchive } = await import('../../services/archiveRestoreService');
      const restoredArchive = await restoreBlueprintArchive(archiveBlob);
      if (!isMountedRef.current) return;

      archiveRestoreCleanupRef.current?.();
      archiveRestoreCleanupRef.current = restoredArchive.revokeObjectUrls;

      if (restoredArchive.warnings.length > 0) {
        logWarn('useGoogleSync handleRestoreSnapshot archiveWarnings', 'Blueprint snapshot restored with warnings.', {
          category: 'SYNC',
          metadata: {
            snapshotId: snapshot.id,
            snapshotName: snapshot.name,
            warningCount: restoredArchive.warnings.length,
            warnings: restoredArchive.warnings,
            operationType: 'restore_snapshot_archive'
          }
        });
      }
      const restoredData = restoredArchive.state;

      loadFullState(restoredData);

      await runWithAuth(
        () => storageProvider.saveFile(restoredData, currentActiveDriveFileId),
        true
      );

      showToast.success(`Restored version '${snapshot.name}' successfully!`);
    } catch (e) {
      if (!isMountedRef.current) return;

      logError('useGoogleSync handleRestoreSnapshot', e, {
        category: 'SYNC',
        severity: 'MEDIUM',
        metadata: { snapshotId: snapshot.id, operationType: 'restore_snapshot' }
      });
      showGoogleError(e, 'Failed to restore version.');
    } finally {
      setDriveSyncUiStatus('idle');
    }
  }, [buildSnapshotArchive, currentActiveDriveFileId, runWithAuth, setDriveSyncUiStatus, showGoogleError, user]);

  useEffect(() => {
    if (IS_DRIVE_BACKUP_ONLY) return;
    if (!currentActiveDriveFileId || !user) return;

    const checkAndCreateDaily = async () => {
      try {
        const state = useAppStore.getState();
        const treeId = state.currentTreeId;
        if (!treeId) return;

        const snapshots = await storageProvider.listSnapshots(treeId);
        const today = new Date().toISOString().split('T')[0];
        const dailyLabel = `Auto_Daily_${today}`;
        const hasTodaySnapshot = snapshots.some(s => s.name.includes(dailyLabel));

        if (!hasTodaySnapshot) {
          logInfo('useGoogleSync dailySnapshot', 'Creating daily auto-snapshot.', {
            treeId,
            operationType: 'auto_snapshot'
          });
          if (Object.keys(state.people).length > 0) {
            await handleCreateSnapshot(dailyLabel);
          }
        }
      } catch {
        logWarn('useGoogleSync dailySnapshotCheck', 'Failed to check or create daily snapshot.', {
          category: 'NETWORK',
          metadata: { operationType: 'auto_snapshot_check' }
        });
      }
    };

    checkAndCreateDaily();
  }, [currentActiveDriveFileId, user, handleCreateSnapshot]);

  const cleanupSnapshotResources = useCallback(() => {
    archiveRestoreCleanupRef.current?.();
    archiveRestoreCleanupRef.current = null;
  }, []);

  return {
    handleCreateSnapshot,
    handleRestoreSnapshot,
    cleanupSnapshotResources,
  };
};
