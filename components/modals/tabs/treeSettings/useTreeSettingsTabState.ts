import { useEffect, useMemo, useRef, useState } from 'react';
import { logError } from '../../../../utils/errorLogger';
import { renameTree, updateTreeRoot } from '../../../../services/supabaseTreeMutationService';
import { useAppStore } from '../../../../store/useAppStore';
import { showToast } from '../../../../utils/showToast';
import type { Person } from '../../../../types';
import type { TreeSettingsText } from './treeSettingsTypes';
import { getPersonFullName } from './treeSettingsUtils';

interface UseTreeSettingsTabStateArgs {
  treeId: string;
  treeName: string;
  ownerId: string;
  ownerEmail: string;
  people: Person[];
  currentRootId?: string;
  text: TreeSettingsText;
  onTreeRenamed?: (newName: string) => void;
  onRootChanged?: (newRootId: string) => void;
}

export const useTreeSettingsTabState = ({
  treeId,
  treeName,
  ownerId,
  ownerEmail,
  people,
  currentRootId,
  text,
  onTreeRenamed,
  onRootChanged,
}: UseTreeSettingsTabStateArgs) => {
  const token = useAppStore.getState().user?.supabaseToken;
  const flashTimerRef = useRef<number | null>(null);
  const [newTreeName, setNewTreeName] = useState(treeName);
  const [isSaving, setIsSaving] = useState(false);
  const [isConfirmRootChangeOpen, setIsConfirmRootChangeOpen] = useState(false);
  const [pendingRootId, setPendingRootId] = useState<string | null>(null);

  useEffect(() => {
    setNewTreeName(treeName);
  }, [treeName]);

  useEffect(
    () => () => {
      if (flashTimerRef.current !== null) {
        window.clearTimeout(flashTimerRef.current);
      }
    },
    []
  );

  const currentRootPerson = useMemo(
    () => people.find((person) => person.id === currentRootId) ?? null,
    [currentRootId, people]
  );

  const currentRootLabel = getPersonFullName(currentRootPerson) || text.rootNotSet;
  const canRename = Boolean(newTreeName.trim()) && newTreeName.trim() !== treeName && !isSaving;

  const handleRename = async () => {
    const trimmedName = newTreeName.trim();
    if (!trimmedName || trimmedName === treeName) return;

    try {
      setIsSaving(true);

      await renameTree(treeId, ownerId, ownerEmail, trimmedName, token);

      onTreeRenamed?.(trimmedName);
      showToast.success('messages.success.rename', { variables: { name: trimmedName } });
    } catch (err) {
      logError('TREE_SETTINGS_RENAME_ERROR', err, {
        category: 'DATABASE',
        severity: 'MEDIUM',
        metadata: { treeId },
      });
      showToast.error(text.renameError);
    } finally {
      setIsSaving(false);
    }
  };

  const requestRootChange = (newRootId: string) => {
    if (!newRootId || newRootId === currentRootId) return;
    setPendingRootId(newRootId);
    setIsConfirmRootChangeOpen(true);
  };

  const closeRootConfirmation = () => {
    setIsConfirmRootChangeOpen(false);
    setPendingRootId(null);
  };

  const confirmRootChange = async () => {
    if (!pendingRootId) return;

    try {
      setIsSaving(true);

      await updateTreeRoot(treeId, pendingRootId, ownerId, ownerEmail, token);

      onRootChanged?.(pendingRootId);
      showToast.success(text.rootChangedSuccess);
    } catch (err) {
      logError('TREE_SETTINGS_ROOT_CHANGE_ERROR', err, {
        category: 'DATABASE',
        severity: 'MEDIUM',
        metadata: { treeId, pendingRootId },
      });
      showToast.error(text.rootChangedError);
    } finally {
      setIsSaving(false);
      closeRootConfirmation();
    }
  };

  return {
    newTreeName,
    setNewTreeName,
    isSaving,
    canRename,
    error: null,
    success: null,
    currentRootLabel,
    isConfirmRootChangeOpen,
    handleRename,
    requestRootChange,
    closeRootConfirmation,
    confirmRootChange,
  };
};
