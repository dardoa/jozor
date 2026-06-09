import { useState } from 'react';
import { deleteWholeTree } from '../../../../services/supabaseTreeMutationService';
import { useAppStore } from '../../../../store/useAppStore';
import { logError } from '../../../../utils/errorLogger';
import type { TreeSettingsText } from './treeSettingsTypes';
import { showToast } from '../../../../utils/showToast';

interface UseTreeDangerZoneStateArgs {
  treeId: string;
  ownerId: string;
  ownerEmail: string;
  canManageTreeSettings: boolean;
  text: TreeSettingsText;
  onTreeDeleted?: () => void;
}

export const useTreeDangerZoneState = ({
  treeId,
  ownerId,
  ownerEmail,
  canManageTreeSettings,
  onTreeDeleted,
}: UseTreeDangerZoneStateArgs) => {
  const token = useAppStore.getState().user?.supabaseToken;
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);

  const isDeleteConfirmed = deleteConfirmText === 'DELETE';

  const openDeleteConfirm = () => {
    if (!canManageTreeSettings) return;
    setShowDeleteConfirm(true);
  };

  const closeDeleteConfirm = () => {
    setShowDeleteConfirm(false);
    setDeleteConfirmText('');
  };

  const handleDelete = async () => {
    if (!canManageTreeSettings) return;
    if (!isDeleteConfirmed) return;

    try {
      setIsDeleting(true);

      await deleteWholeTree(treeId, ownerId, ownerEmail, token);

      showToast.success('adminHub.treeSettings.deleteSuccess');
      window.setTimeout(() => {
        onTreeDeleted?.();
      }, 900);
    } catch (err) {
      logError('TREE_DANGER_ZONE_DELETE_ERROR', err, {
        category: 'DATABASE',
        severity: 'HIGH',
        metadata: { treeId },
      });
      showToast.error('adminHub.treeSettings.deleteError');
      setIsDeleting(false);
      setShowDeleteConfirm(false);
    }
  };

  return {
    showDeleteConfirm,
    deleteConfirmText,
    setDeleteConfirmText,
    isDeleting,
    isDeleteConfirmed,
    openDeleteConfirm,
    closeDeleteConfirm,
    handleDelete,
  };
};
