import { useEffect, useMemo } from 'react';
import { useTranslation } from '../../../context/TranslationContext';
import { useAppStore } from '../../../store/useAppStore';
import type { UserProfile } from '../../../types';
import { useVaultTreeManagement } from '../../TheVault/useVaultTreeManagement';

interface UseTreeManagerModalStateOptions {
  isOpen: boolean;
  onClose: () => void;
  ownerId: string;
  userEmail: string;
  activeTreeId: string | null;
  onTreeSelected: (treeId: string) => void;
}

export const useTreeManagerModalState = ({
  isOpen,
  onClose,
  ownerId,
  userEmail,
  activeTreeId,
  onTreeSelected,
}: UseTreeManagerModalStateOptions) => {
  const { t } = useTranslation();
  const storeUser = useAppStore((state) => state.user);
  const setCurrentTreeId = useAppStore((state) => state.setCurrentTreeId);
  const setCurrentUserRole = useAppStore((state) => state.setCurrentUserRole);
  const setTreeName = useAppStore((state) => state.setTreeName);
  const treeName = useAppStore((state) => state.treeName);

  const currentUser = useMemo<UserProfile | null>(() => {
    if (!ownerId || !userEmail) return null;
    return {
      uid: ownerId,
      email: userEmail,
      displayName: storeUser?.displayName || '',
      photoURL: storeUser?.photoURL || '',
      supabaseToken: storeUser?.supabaseToken,
      metadata: storeUser?.metadata,
    };
  }, [ownerId, storeUser, userEmail]);

  const treeManagement = useVaultTreeManagement({
    currentUser,
    currentTreeId: activeTreeId,
    setCurrentTreeId,
    setCurrentUserRole,
    setTreeName,
    setVaultOpen: (open) => {
      if (!open) onClose();
    },
    onTreeOpened: onTreeSelected,
    t,
  });

  useEffect(() => {
    if (isOpen && currentUser?.uid && currentUser.email) {
      void treeManagement.loadTrees();
    }
  }, [currentUser, isOpen, treeManagement.loadTrees]);

  const treeListLabels = {
    active: t.vaultTreeActive,
    openTree: t.vaultTreeOpen,
    renameTree: t.vaultTreeRename,
    deleteTree: t.vaultTreeDelete,
    updated: t.vaultTreeUpdated,
    justNow: t.vaultTreeJustNow,
    sharedAccessNote: t.vaultTreeSharedAccessNote,
  };

  const treePanelLabels = {
    activeTree: t.vaultActiveTreeLabel,
    createTree: t.vaultCreateTree,
    importTree: t.vaultImportTree,
    refreshTrees: t.vaultRefreshTrees,
    ownedCount: t.vaultTreeOwnedCount,
    sharedCount: t.vaultTreeSharedCount,
    ownedTitle: t.treeManager.myTrees,
    sharedTitle: t.treeManager.sharedWithMe,
    ownedEmpty: t.vaultTreeOwnedEmpty,
    sharedEmpty: t.vaultTreeSharedEmpty,
    list: treeListLabels,
  };

  return {
    t,
    treeName,
    treePanelLabels,
    ...treeManagement,
  };
};

export type TreeManagerModalState = ReturnType<typeof useTreeManagerModalState>;
