import React, { useCallback, useEffect, useMemo, useState, useRef } from 'react';
import {
  X, Cloud, ShieldCheck, Users, BarChart3, Lock, FolderTree, ArrowLeft,
  type LucideIcon,
} from 'lucide-react';

import { useAppStore } from '../../../store/useAppStore';
import { useTranslation } from '../../../context/TranslationContext';
import { OverlayPrimitive } from '../../../context/OverlayContext';
import type { AuthProps, ExportActionsProps, GoogleSyncStateAndActions, TreeSettings, ToolsActionsProps } from '../../../types';
import { useTreePermissions } from '../../../hooks/tree/useTreePermissions';
import { useVaultTreeManagement } from '../hooks/useVaultTreeManagement';
import { ConfirmationModal } from '../../../components/ConfirmationModal';
import { VaultDesktopNavigation, VaultMobileNavigation } from './VaultNavigation';
import { VaultDesktopContent } from './VaultDesktopContent';
import { VaultMobileContent } from './VaultMobileContent';
import type { VaultRenderContext, VaultStats, VaultTab } from '../types';

interface TheVaultDrawerProps {
  googleSync: GoogleSyncStateAndActions;
  auth: AuthProps;
  exportActions: ExportActionsProps;
  toolsActions: ToolsActionsProps;
  onOpenDiagnostics: () => void;
  onOpenActivityLog: () => void;
  onOpenCleanTree: () => void;
}

const TRANSITION_STYLE = `
  @keyframes vault-tab-in {
    from { opacity: 0; transform: translateY(8px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  .vault-tab-content { animation: vault-tab-in 0.2s ease forwards; }
`;

interface VaultDesktopNavItem {
  id: VaultTab;
  icon: LucideIcon;
  label: string;
}

export const TheVaultDrawer: React.FC<TheVaultDrawerProps> = ({
  googleSync,
  auth,
  exportActions,
  toolsActions,
  onOpenDiagnostics,
  onOpenActivityLog,
  onOpenCleanTree,
}) => {
  const { t } = useTranslation();
  const { role, canManageMembers, canManageCloud, canManageSecurity } = useTreePermissions();

  const isVaultOpen = useAppStore((state) => state.isVaultOpen);
  const setVaultOpen = useAppStore((state) => state.setVaultOpen);
  const vaultTab = useAppStore((state) => state.vaultTab) as VaultTab;
  const setVaultTab = useAppStore((state) => state.setVaultTab);
  const currentUser = useAppStore((state) => state.user);
  const isE2E = useAppStore((state) => state.isE2E);
  const currentTreeId = useAppStore((state) => state.currentTreeId);
  const setCurrentTreeId = useAppStore((state) => state.setCurrentTreeId);
  const setCurrentUserRole = useAppStore((state) => state.setCurrentUserRole);
  const treeName = useAppStore((state) => state.treeName);
  const setTreeName = useAppStore((state) => state.setTreeName);
  const treeSettings = useAppStore((state) => state.treeSettings);
  const setTreeSettings = useAppStore((state) => state.setTreeSettings);
  const people = useAppStore((state) => state.people);
  const healthScore = useAppStore((state) => state.healthScore);

  const [isMobile, setIsMobile] = useState(false);

  const {
    fileInputRef,
    ownedTrees,
    sharedTrees,
    isTreeLoading,
    treeLoadError,
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
  } = useVaultTreeManagement({
    currentUser,
    currentTreeId,
    setCurrentTreeId,
    setCurrentUserRole,
    setTreeName,
    setVaultOpen,
    t,
  });


  const activeTreeMeta = useMemo(
    () => ownedTrees.find((tree) => tree.id === currentTreeId) ?? sharedTrees.find((tree) => tree.id === currentTreeId) ?? null,
    [currentTreeId, ownedTrees, sharedTrees]
  );
  const treeIsPrivate = activeTreeMeta ? !activeTreeMeta.isPublic : true;

  const stats = useMemo(() => {
    const arr = Object.values(people);
    if (arr.length === 0) return null;
    const male = arr.filter((p) => p.gender === 'male').length;
    const female = arr.filter((p) => p.gender === 'female').length;
    const unknown = arr.length - male - female;
    const malePercent = Math.round((male / arr.length) * 100);
    const femalePercent = Math.round((female / arr.length) * 100);
    return { total: arr.length, male, female, unknown, malePercent, femalePercent } satisfies VaultStats;
  }, [people]);

  const roleLabel = role === 'owner' ? t.roles.owner : role === 'editor' ? t.roles.editor : role === 'viewer' ? t.roles.viewer : t.roles.unknown;
  const hasInitialRefreshed = useRef(false);
  const hasVaultSession = isE2E || Boolean(
    currentUser?.uid && currentUser.email && currentUser.supabaseToken
  );

  useEffect(() => {
    if (!isVaultOpen) {
      hasInitialRefreshed.current = false;
      return;
    }

    if (!hasVaultSession) {
      clearTrees();
      if (vaultTab === 'trees' || vaultTab === 'members' || vaultTab === 'security') {
        setVaultTab('stats');
      }
      return;
    }

    if (!hasInitialRefreshed.current) {
      hasInitialRefreshed.current = true;
      if (isE2E) return;
      void googleSync.refreshDriveFiles();
      void loadTrees();
    }
  }, [clearTrees, googleSync, hasVaultSession, isE2E, isVaultOpen, loadTrees, vaultTab, setVaultTab]);

  useEffect(() => {
    if (currentUser?.supabaseToken) {
      resetSessionFailure();
    }
  }, [currentUser?.supabaseToken, resetSessionFailure]);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const mediaQuery = window.matchMedia('(max-width: 767px)');
    const handleChange = (event: MediaQueryList | MediaQueryListEvent) => {
      setIsMobile(event.matches);
    };

    handleChange(mediaQuery);

    if (typeof mediaQuery.addEventListener === 'function') {
      mediaQuery.addEventListener('change', handleChange);
      return () => mediaQuery.removeEventListener('change', handleChange);
    }

    mediaQuery.addListener(handleChange);
    return () => mediaQuery.removeListener(handleChange);
  }, []);

  const updateVisibilitySetting = useCallback((key: keyof TreeSettings, value: boolean | string | number | null) => {
    setTreeSettings((prev) => ({ ...prev, [key]: value }));
  }, [setTreeSettings]);

  const handleOpenTool = useCallback((modalType: Parameters<ToolsActionsProps['onOpenModal']>[0]) => {
    setVaultOpen(false);
    window.setTimeout(() => {
      toolsActions.onOpenModal(modalType);
    }, 80);
  }, [setVaultOpen, toolsActions]);

  const insightsLabel = t.vaultInsightsTools;
  const isGuest = !hasVaultSession;

  const navItems: readonly VaultDesktopNavItem[] = useMemo(() => {
    if (isGuest) {
      return [
        { id: 'stats', icon: BarChart3, label: insightsLabel },
        { id: 'cloud', icon: Cloud, label: t.vaultPublishing },
      ];
    }

    const items: VaultDesktopNavItem[] = [
      { id: 'trees', icon: FolderTree, label: t.vaultTrees },
    ];

    if (canManageMembers) {
      items.push({ id: 'members', icon: Users, label: t.vaultMembers });
    }
    items.push({ id: 'stats', icon: BarChart3, label: insightsLabel });
    items.push({ id: 'cloud', icon: Cloud, label: t.vaultPublishing });
    if (canManageSecurity) {
      items.push({ id: 'security', icon: Lock, label: t.vaultSecurity });
    }

    return items;
  }, [
    canManageMembers,
    canManageSecurity,
    insightsLabel,
    isGuest,
    t.vaultMembers,
    t.vaultPublishing,
    t.vaultSecurity,
    t.vaultTrees,
  ]);

  useEffect(() => {
    if (navItems.some((item) => item.id === vaultTab)) return;
    const fallbackTab = navItems[0]?.id;
    if (fallbackTab) setVaultTab(fallbackTab);
  }, [navItems, setVaultTab, vaultTab]);

  if (!isVaultOpen) return null;

  const treeListLabels = {
    active: t.vaultTreeActive,
    openTree: t.vaultTreeOpen,
    renameTree: t.vaultTreeRename,
    deleteTree: t.vaultTreeDelete,
    updated: t.vaultTreeUpdated,
    justNow: t.vaultTreeJustNow,
    sharedAccessNote: t.vaultTreeSharedAccessNote,
    ownerRole: t.roles.owner,
    editorRole: t.roles.editor,
    viewerRole: t.roles.viewer,
  };
  const treePanelLabels = {
    activeTree: t.vaultActiveTreeLabel,
    createTree: t.vaultCreateTree,
    importTree: t.vaultImportTree,
    importTreeHint: t.vaultImportTreeHint,
    refreshTrees: t.vaultRefreshTrees,
    ownedCount: t.vaultTreeOwnedCount,
    sharedCount: t.vaultTreeSharedCount,
    loading: t.vaultTreesLoading,
    ownedTitle: t.vaultTreeOwnedTitle,
    sharedTitle: t.vaultTreeSharedTitle,
    ownedEmpty: t.vaultTreeOwnedEmpty,
    sharedEmpty: t.vaultTreeSharedEmpty,
    list: treeListLabels,
  };
  const pendingDeleteTree = deleteTreeId
    ? ownedTrees.find((tree) => tree.id === deleteTreeId) ?? null
    : null;
  const pendingDeleteTreeName = pendingDeleteTree?.name.trim() || null;
  const renderContext: VaultRenderContext = {
    auth,
    googleSync,
    exportActions,
    toolsActions,
    onOpenDiagnostics,
    onOpenActivityLog,
    onOpenCleanTree,
    t,
    canManageMembers,
    canManageCloud,
    canManageSecurity,
    currentUser,
    currentTreeId,
    treeName,
    treeSettings,
    treeIsPrivate,
    healthScore,
    stats,
    roleLabel,
    ownedTrees,
    sharedTrees,
    busyTreeId,
    isTreeLoading,
    treeLoadError,
    editingTreeId,
    editTreeName,
    treePanelLabels,
    onCloseVault: () => setVaultOpen(false),
    onOpenTool: handleOpenTool,
    onUpdateVisibilitySetting: updateVisibilitySetting,
    onCreateTree: () => void handleCreateTree(),
    onImportTree: () => fileInputRef.current?.click(),
    onRefreshTrees: () => {
      resetSessionFailure();
      void loadTrees();
    },
    onOpenTree: (treeId, treeRole) => void handleOpenTree(treeId, treeRole || 'viewer'),
    onStartRename: (tree) => {
      setEditingTreeId(tree.id);
      setEditTreeName(tree.name);
    },
    onConfirmRename: (treeId) => void handleRenameTree(treeId),
    onCancelRename: () => {
      setEditingTreeId(null);
      setEditTreeName('');
    },
    onEditTreeNameChange: setEditTreeName,
    onDeleteTree: setDeleteTreeId,
  };

  const desktopDrawerSize = 'sm:w-[calc(100vw-2rem)] sm:max-w-[1320px]';

  return (
    <>
      <style>{TRANSITION_STYLE}</style>
      <input ref={fileInputRef} type="file" accept=".json,.jozor,.zip,.ged" className="hidden" onChange={handleImportFile} />
      <OverlayPrimitive isOpen={isVaultOpen} onClose={() => setVaultOpen(false)} id="the-vault-drawer" withBackdrop={false}>
        <div
          className="fixed inset-0 z-[var(--z-index-drawer)] bg-[color:rgba(24,16,12,0.18)] backdrop-blur-[2px] transition-opacity"
          onClick={() => setVaultOpen(false)}
        />
        <div className={`fixed z-[calc(var(--z-index-drawer)+1)] flex flex-col overflow-hidden border border-[var(--border-main)] bg-[var(--theme-bg)] shadow-[0_30px_90px_rgba(44,24,16,0.18)] ${isMobile ? 'inset-0 h-[100dvh] w-full rounded-none border-0' : `inset-x-4 top-[5vh] bottom-[5vh] rounded-[24px] sm:inset-x-auto sm:left-1/2 sm:-translate-x-1/2 ${desktopDrawerSize}`}`}>
          <div className={`ds-drawer-header flex shrink-0 items-center justify-between border-b border-[var(--border-soft)] ${isMobile ? 'px-4 py-4' : 'px-6 py-4'}`}>
            <div className="flex items-center gap-3">
              <div className="rounded-xl bg-[var(--surface-subtle)] p-2 text-[var(--primary-500)]"><ShieldCheck className="h-5 w-5" /></div>
              <div>
                <h2 className="text-base font-bold text-[var(--text-main)]">{t.vaultTitle}</h2>
                <p className="text-[11px] text-[var(--text-muted)]">{t.vaultSubtitle}</p>
              </div>
            </div>
            <button
              onClick={() => setVaultOpen(false)}
              aria-label={t.common.close}
              className="min-h-11 min-w-11 rounded-full border border-[var(--border-soft)] bg-[var(--surface-app)] p-2 text-[var(--text-muted)] hover:bg-[var(--surface-subtle)]"
            >
              {isMobile ? <ArrowLeft className="h-5 w-5" /> : <X className="h-5 w-5" />}
            </button>
          </div>
          <div className={`flex min-h-0 flex-1 overflow-hidden ${isMobile ? 'flex-col' : 'flex-row'}`}>
            {isMobile ? (
              <VaultMobileNavigation
                items={navItems}
                activeTab={vaultTab}
                onSelect={setVaultTab}
                label={t.vaultTitle}
              />
            ) : (
              <VaultDesktopNavigation
                items={navItems}
                activeTab={vaultTab}
                onSelect={setVaultTab}
                label={t.vaultTitle}
              />
            )}
            <div className={`flex-1 overflow-y-auto overscroll-contain bg-[var(--surface-app)] [scrollbar-gutter:stable] ${isMobile ? 'px-3 py-4' : 'p-6'}`} style={{ WebkitOverflowScrolling: 'touch' }}>
              {isMobile ? (
                <VaultMobileContent
                  context={renderContext}
                  tab={vaultTab}
                />
              ) : (
                <VaultDesktopContent context={renderContext} tab={vaultTab} />
              )}
            </div>
          </div>
        </div>
      </OverlayPrimitive>
      <ConfirmationModal
        isOpen={Boolean(deleteTreeId && pendingDeleteTreeName)}
        onClose={() => setDeleteTreeId(null)}
        onConfirm={() => void handleDeleteTree()}
        title={t.vaultTreeDeleteTitle}
        message={pendingDeleteTreeName
          ? `${t.vaultTreeDeleteMessage} "${pendingDeleteTreeName}"`
          : t.vaultTreeDeleteMessage}
        type="danger"
        overlayId="vault-delete-tree-confirm"
        requiredConfirmText={pendingDeleteTreeName ?? undefined}
        confirmPlaceholder={pendingDeleteTreeName
          ? (t.deleteConfirmPlaceholder || '').replace('{name}', pendingDeleteTreeName)
          : undefined}
      />
    </>
  );
};
