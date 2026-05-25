import { useAppStore } from '../../store/useAppStore';
import { deltaSyncService } from '../../services/deltaSyncService';
import { storageService } from '../../services/storageService';
import { logError } from '../../utils/errorLogger';

export const hydrateTreeTombstonesAndResumeSync = (treeId: string) => {
  void storageService.getDeletedPersonIds(treeId)
    .then((deletedPersonIds) => {
      useAppStore.getState().setDeletedPersonIds(deletedPersonIds);
    })
    .catch((error) => {
      logError('TREE_TOMBSTONE_HYDRATION_FAILED', error, {
        showToast: false,
        metadata: { treeId },
      });
    })
    .finally(() => {
      void deltaSyncService.reconcileTree(treeId);
      void deltaSyncService.recoverPendingOperations(treeId);
    });
};
