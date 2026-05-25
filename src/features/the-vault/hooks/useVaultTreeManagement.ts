import { useCallback, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { loadFullState } from '../../../store/useAppStore';
import type { UserProfile } from '../../../types';
import type { TranslationSchema } from '../../../utils/translationLoader';
import { showToast } from '../../../utils/showToast';
import type { SharedTreeSummary, TreeSummary } from '../../../services/supabaseTreeTypes';

const SESSION_ERROR_TOAST_ID = 'session-error';

const extractErrorText = (error: unknown): string => {
  if (error instanceof Error) return error.message;
  if (typeof error === 'string') return error;

  if (error && typeof error === 'object') {
    const record = error as Record<string, unknown>;
    const direct = [record.message, record.error_description, record.details, record.hint]
      .filter((value): value is string => typeof value === 'string');
    if (direct.length > 0) return direct.join(' ');

    try {
      return JSON.stringify(error);
    } catch {
      return String(error);
    }
  }

  return String(error ?? '');
};

const isSessionError = (error: unknown) => {
  const normalized = extractErrorText(error).toLowerCase();
  return normalized.includes('401')
    || normalized.includes('unauthorized')
    || normalized.includes('session')
    || normalized.includes('missing authentication')
    || normalized.includes('jwt')
    || normalized.includes('auth')
    || normalized.includes('expected 3 parts in jwt')
    || normalized.includes('row-level security')
    || normalized.includes('42501');
};

type VaultTreeRole = 'owner' | 'editor' | 'viewer';

interface UseVaultTreeManagementOptions {
  currentUser: UserProfile | null;
  currentTreeId: string | null;
  setCurrentTreeId: (treeId: string | null) => void;
  setCurrentUserRole: (role: VaultTreeRole | null) => void;
  setTreeName: (name: string) => void;
  setVaultOpen: (open: boolean) => void;
  onTreeOpened?: (treeId: string) => void;
  t: TranslationSchema;
}

export const useVaultTreeManagement = ({
  currentUser,
  currentTreeId,
  setCurrentTreeId,
  setCurrentUserRole,
  setTreeName,
  setVaultOpen,
  onTreeOpened,
  t,
}: UseVaultTreeManagementOptions) => {
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const isLoadingTreesRef = useRef(false);
  const hasSessionFailureRef = useRef(false);

  const [ownedTrees, setOwnedTrees] = useState<TreeSummary[]>([]);
  const [sharedTrees, setSharedTrees] = useState<SharedTreeSummary[]>([]);
  const [isTreeLoading, setIsTreeLoading] = useState(false);
  const [busyTreeId, setBusyTreeId] = useState<string | null>(null);
  const [editingTreeId, setEditingTreeId] = useState<string | null>(null);
  const [editTreeName, setEditTreeName] = useState('');
  const [deleteTreeId, setDeleteTreeId] = useState<string | null>(null);

  const clearTrees = useCallback(() => {
    setOwnedTrees([]);
    setSharedTrees([]);
  }, []);

  const resetSessionFailure = useCallback(() => {
    hasSessionFailureRef.current = false;
  }, []);

  const loadTrees = useCallback(async () => {
    if (!currentUser?.uid || !currentUser?.email) return;
    if (isLoadingTreesRef.current || hasSessionFailureRef.current) return;

    isLoadingTreesRef.current = true;
    setIsTreeLoading(true);

    const work = Promise.all([
      import('../../../services/supabaseTreeReadService'),
      import('../../../services/supabaseTreeAccessService'),
    ]).then(([readService, accessService]) => Promise.all([
      readService.fetchTreesForUser(currentUser.uid, currentUser.email, currentUser.supabaseToken),
      accessService.fetchSharedTrees(currentUser.uid, currentUser.email, currentUser.supabaseToken),
    ])).then(([owned, shared]) => {
      hasSessionFailureRef.current = false;
      setOwnedTrees(owned);
      setSharedTrees(shared);
    }).catch((error) => {
      if (isSessionError(error)) {
        hasSessionFailureRef.current = true;
        showToast.error(t.vaultSessionExpired, { id: SESSION_ERROR_TOAST_ID });
      } else {
        throw error;
      }
    }).finally(() => {
      isLoadingTreesRef.current = false;
      setIsTreeLoading(false);
    });

    await work.catch((err) => {
      showToast.error(extractErrorText(err) || 'messages.error.load');
    });
  }, [currentUser, t.vaultSessionExpired]);

  const handleOpenTree = useCallback(async (treeId: string, treeRole: VaultTreeRole = 'owner') => {
    if (!currentUser?.uid || !currentUser?.email) return;

    const work = async () => {
      const { fetchTree } = await import('../../../services/supabaseTreeReadService');
      const full = await fetchTree(treeId, currentUser.uid, currentUser.email, currentUser.supabaseToken);
      localStorage.setItem('lastActiveTreeId', treeId);
      loadFullState({
        version: 1,
        people: full.people,
        settings: full.settings || {},
        focusId: full.focusId,
        treeName: full.name,
      });
      setCurrentTreeId(treeId);
      setCurrentUserRole(treeRole);
      onTreeOpened?.(treeId);
      navigate(`/tree/${treeId}`);
      setVaultOpen(false);
    };

    setBusyTreeId(treeId);
    await showToast.promise(work(), {
      loading: 'messages.loading.open',
      success: 'messages.success.load',
      error: (err) => extractErrorText(err) || 'messages.error.open'
    }).unwrap().finally(() => {
      setBusyTreeId(null);
    });
  }, [currentUser, navigate, onTreeOpened, setCurrentTreeId, setCurrentUserRole, setVaultOpen]);

  const handleCreateTree = useCallback(async () => {
    if (!currentUser?.uid || !currentUser?.email) return;

    const work = async () => {
      const [{ createPerson }, { createTreeWithRootAtomic }] = await Promise.all([
        import('../../../utils/familyLogic'),
        import('../../../services/supabaseTreeMutationService'),
      ]);
      const rootPerson = { ...createPerson('male'), firstName: (t as any).general?.me || 'Me', lastName: '' };
      const newTreeId = await createTreeWithRootAtomic(
        currentUser.uid,
        currentUser.email,
        t.newTreeName,
        rootPerson,
        currentUser.supabaseToken
      );
      await handleOpenTree(newTreeId, 'owner');
    };

    setBusyTreeId('create');
    await showToast.promise(work(), {
      loading: 'messages.loading.save',
      success: 'messages.success.load',
      error: (err) => extractErrorText(err) || 'messages.error.load'
    }).unwrap().finally(() => {
      setBusyTreeId(null);
    });
  }, [currentUser, handleOpenTree, (t as any).general, t.newTreeName]);

  const handleImportFile = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !currentUser?.uid || !currentUser?.email) return;

    const work = async () => {
      const { importTreeFromFileItem } = await import('../../tree-manager');
      const importedTreeId = await importTreeFromFileItem(
        currentUser.uid,
        currentUser.email,
        file,
        currentUser.supabaseToken
      );
      await handleOpenTree(importedTreeId, 'owner');
    };

    setBusyTreeId('import');
    await showToast.promise(work(), {
      loading: 'messages.loading.import',
      success: 'messages.success.importSuccess',
      error: (err) => extractErrorText(err) || 'messages.error.import'
    }).unwrap().finally(() => {
      setBusyTreeId(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
    });
  }, [currentUser, handleOpenTree]);

  const handleRenameTree = useCallback(async (treeId: string) => {
    if (!currentUser?.uid || !currentUser?.email || !editTreeName.trim()) return;

    const trimmedName = editTreeName.trim();
    const work = async () => {
      const { renameTree } = await import('../../../services/supabaseTreeMutationService');
      await renameTree(treeId, currentUser.uid!, currentUser.email!, trimmedName, currentUser.supabaseToken);
      if (currentTreeId === treeId) setTreeName(trimmedName);
      setEditingTreeId(null);
      setEditTreeName('');
      await loadTrees();
    };

    setBusyTreeId(treeId);
    await showToast.promise(work(), {
      loading: 'messages.loading.rename',
      success: 'messages.success.rename',
      options: { variables: { name: trimmedName } },
      error: (err) => extractErrorText(err) || 'messages.error.rename'
    }).unwrap().finally(() => {
      setBusyTreeId(null);
    });
  }, [currentTreeId, currentUser, editTreeName, loadTrees, setTreeName]);

  const handleDeleteTree = useCallback(async () => {
    if (!deleteTreeId || !currentUser?.uid || !currentUser?.email) return;

    const work = async () => {
      const { deleteWholeTree } = await import('../../../services/supabaseTreeMutationService');
      await deleteWholeTree(deleteTreeId, currentUser.uid!, currentUser.email!, currentUser.supabaseToken);
      if (currentTreeId === deleteTreeId) {
        setCurrentTreeId(null);
        navigate('/', { replace: true });
      }
      setDeleteTreeId(null);
      await loadTrees();
    };

    setBusyTreeId(deleteTreeId);
    await showToast.promise(work(), {
      loading: 'messages.loading.delete',
      success: 'messages.success.delete',
      error: (err) => extractErrorText(err) || 'messages.error.delete'
    }).unwrap().finally(() => {
      setBusyTreeId(null);
    });
  }, [currentTreeId, currentUser, deleteTreeId, loadTrees, navigate, setCurrentTreeId]);

  return {
    fileInputRef,
    ownedTrees,
    sharedTrees,
    isTreeLoading,
    busyTreeId,
    editingTreeId,
    editTreeName,
    deleteTreeId,
    clearTrees,
    resetSessionFailure,
    loadTrees,
    handleOpenTree,
    handleCreateTree,
    handleImportFile,
    handleRenameTree,
    handleDeleteTree,
    setEditingTreeId,
    setEditTreeName,
    setDeleteTreeId,
  };
};
