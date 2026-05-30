import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { useTranslation } from '../../../context/TranslationContext';
import { fetchSharedTrees } from '../../../services/supabaseTreeAccessService';
import { createTreeWithRootAtomic } from '../../../services/supabaseTreeMutationService';
import { fetchPeopleCountsForTrees, fetchTree, fetchTreesForUser } from '../../../services/supabaseTreeReadService';
import type { SharedTreeSummary, TreeSummary } from '../../../services/supabaseTreeTypes';
import { loadFullState, useAppStore } from '../../../store/useAppStore';
import { createPerson } from '../../../utils/familyLogic';
import { getUserFacingErrorInfo, logError } from '../../../utils/errorLogger';
import { showToast } from '../../../utils/showToast';
import { hydrateTreeTombstonesAndResumeSync } from '../../../hooks/authInit/treeActivationSync';
import {
  buildTreeSettingsWithAdminDefaults,
  fetchAdminDefaultTreeSettings,
} from '../../admin';

interface UseTreeSelectorControllerArgs {
  ownerId: string;
  userEmail: string;
  supabaseToken?: string;
  onTreeSelected: (treeId: string, role: 'owner' | 'editor' | 'viewer') => void;
}

export const useTreeSelectorController = ({
  ownerId,
  userEmail,
  supabaseToken,
  onTreeSelected,
}: UseTreeSelectorControllerArgs) => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [trees, setTrees] = useState<TreeSummary[]>([]);
  const [sharedTrees, setSharedTrees] = useState<SharedTreeSummary[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [creating, setCreating] = useState<boolean>(false);
  const [importing, setImporting] = useState<boolean>(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        setLoading(true);
        const [owned, shared] = await Promise.all([
          fetchTreesForUser(ownerId, userEmail, supabaseToken).catch(e => {
            logError('TreeSelector fetchTreesForUser', e, {
              category: 'DATABASE',
              severity: 'MEDIUM',
              metadata: { ownerId }
            });
            showToast.error(getUserFacingErrorInfo(e, t.messages.error.load).message);
            return [] as TreeSummary[];
          }),
          fetchSharedTrees(ownerId, userEmail, supabaseToken).catch(e => {
            logError('TreeSelector fetchSharedTrees', e, {
              category: 'DATABASE',
              severity: 'MEDIUM',
              metadata: { ownerId }
            });
            showToast.error(getUserFacingErrorInfo(e, t.messages.error.collaborators).message);
            return [] as SharedTreeSummary[];
          })
        ]);
        if (!cancelled) {
          const treeIds = [...owned, ...shared].map((tree) => tree.id);
          const peopleCounts: Record<string, number> = await fetchPeopleCountsForTrees(
            treeIds,
            ownerId,
            userEmail,
            supabaseToken
          ).catch(() => ({}));
          if (cancelled) return;
          setTrees(owned.map((tree) => ({ ...tree, peopleCount: peopleCounts[tree.id] })));
          setSharedTrees(shared.map((tree) => ({ ...tree, peopleCount: peopleCounts[tree.id] })));
        }
      } catch (e) {
        logError('TreeSelector loadTrees', e, {
          category: 'DATABASE',
          severity: 'MEDIUM',
          metadata: { ownerId }
        });
        if (!cancelled) showToast.error(getUserFacingErrorInfo(e, t.messages.error.load).message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, [ownerId, supabaseToken, t.messages.error.collaborators, t.messages.error.load, userEmail]);

  const handleOpenTree = async (treeId: string, role: 'owner' | 'editor' | 'viewer' = 'owner') => {
    try {
      setLoading(true);
      const full = await fetchTree(treeId, ownerId, userEmail, supabaseToken);

      localStorage.setItem('lastActiveTreeId', treeId);

      useAppStore.getState().setDeletedPersonIds([]);
      loadFullState({
        version: 1,
        people: full.people,
        settings: full.settings || {},
        focusId: full.focusId,
        lastSyncedVersion: full.lastVersion,
        treeName: full.name,
      });
      onTreeSelected(treeId, role);
      hydrateTreeTombstonesAndResumeSync(treeId);
      navigate(`/tree/${treeId}`);
      showToast.success('messages.success.load');
    } catch (e) {
      logError('TreeSelector openTree', e, {
        category: 'DATABASE',
        severity: 'MEDIUM',
        metadata: { treeId, ownerId }
      });
      showToast.error(getUserFacingErrorInfo(e, t.messages.error.open).message);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateTree = async () => {
    try {
      setCreating(true);
      const rootPerson = {
        ...createPerson('male'),
        firstName: 'Me',
        lastName: '',
      };
      const defaultSettings = await fetchAdminDefaultTreeSettings({
        uid: ownerId,
        email: userEmail,
        displayName: userEmail,
        photoURL: '',
        supabaseToken,
      }).catch(() => null);
      const settings = defaultSettings
        ? buildTreeSettingsWithAdminDefaults(defaultSettings)
        : undefined;
      const newTreeId = await createTreeWithRootAtomic(
        ownerId,
        userEmail,
        t.newTreeName,
        rootPerson,
        supabaseToken,
        settings as Record<string, unknown> | undefined
      );
      await handleOpenTree(newTreeId);
    } catch (e) {
      logError('TreeSelector createTree', e, {
        category: 'DATABASE',
        severity: 'HIGH',
        metadata: { ownerId }
      });
      showToast.error(getUserFacingErrorInfo(e, t.messages.error.load).message);
    } finally {
      setCreating(false);
    }
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      setImporting(true);
      const { importTreeFromFileItem } = await import('../services/importTreeService');

      const newTreeId = await importTreeFromFileItem(ownerId, userEmail, file, supabaseToken);
      await handleOpenTree(newTreeId);
    } catch (e) {
      logError('TreeSelector importTree', e, {
        category: 'VALIDATION',
        severity: 'MEDIUM',
        metadata: { ownerId, fileName: file.name }
      });
      showToast.error(getUserFacingErrorInfo(e, 'Import failed. Please check the file and try again.').message);
    } finally {
      setImporting(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  return {
    t,
    trees,
    sharedTrees,
    loading,
    creating,
    importing,
    fileInputRef,
    handleOpenTree,
    handleCreateTree,
    handleImportClick,
    handleFileChange,
  };
};
