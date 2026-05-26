import React, { useCallback, useEffect, useMemo, useState, useRef } from 'react';
import {
  X, Cloud, ShieldCheck, Users, BarChart3, Lock, FolderTree, ArrowLeft, Settings2, Wrench,
  type LucideIcon,
} from 'lucide-react';

import { useAppStore } from '../../../store/useAppStore';
import { useTranslation } from '../../../context/TranslationContext';
import { OverlayPrimitive } from '../../../context/OverlayContext';
import type { AuthProps, ExportActionsProps, GoogleSyncStateAndActions, TreeSettings, ToolsActionsProps } from '../../../types';
import { useTreePermissions } from '../../../hooks/tree/useTreePermissions';
import { showToast } from '../../../utils/showToast';
import { supabaseAuthService } from '../../../services/supabaseAuthService';
import { useVaultTreeManagement } from '../hooks/useVaultTreeManagement';
import { ConfirmationModal } from '../../../components/ConfirmationModal';
import { VaultDesktopNavigation, VaultMobileHubNavigation } from './VaultNavigation';
import { VaultDesktopContent } from './VaultDesktopContent';
import { VaultMobileContent } from './VaultMobileContent';
import type { MobileManagementSection, MobileVaultHub, VaultRenderContext, VaultStats, VaultTab } from '../types';

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
  const currentTreeId = useAppStore((state) => state.currentTreeId);
  const setCurrentTreeId = useAppStore((state) => state.setCurrentTreeId);
  const setCurrentUserRole = useAppStore((state) => state.setCurrentUserRole);
  const treeName = useAppStore((state) => state.treeName);
  const setTreeName = useAppStore((state) => state.setTreeName);
  const treeSettings = useAppStore((state) => state.treeSettings);
  const setTreeSettings = useAppStore((state) => state.setTreeSettings);
  const people = useAppStore((state) => state.people);
  const healthScore = useAppStore((state) => state.healthScore);

  const [isPasswordResetting, setIsPasswordResetting] = useState(false);
  const [canResetPassword, setCanResetPassword] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [mobileHub, setMobileHub] = useState<MobileVaultHub>('management');
  const [mobileManagementSection, setMobileManagementSection] = useState<MobileManagementSection>('trees');

  const {
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

  useEffect(() => {
    if (!isVaultOpen) {
      hasInitialRefreshed.current = false;
      return;
    }

    if (!currentUser?.uid || !currentUser?.email || !currentUser?.supabaseToken) {
      clearTrees();
      if (vaultTab === 'trees' || vaultTab === 'members' || vaultTab === 'security') {
        setVaultTab('stats');
      }
      return;
    }

    if (!hasInitialRefreshed.current) {
      hasInitialRefreshed.current = true;
      void googleSync.refreshDriveFiles();
      void loadTrees();
    }
  }, [clearTrees, currentUser, googleSync, isVaultOpen, loadTrees, vaultTab, setVaultTab]);

  useEffect(() => {
    if (currentUser?.supabaseToken) {
      resetSessionFailure();
    }
  }, [currentUser?.supabaseToken, resetSessionFailure]);

  useEffect(() => {
    let cancelled = false;

    const resolvePasswordResetCapability = async () => {
      if (!currentUser?.email) {
        setCanResetPassword(false);
        return;
      }

      try {
        const { data } = await supabaseAuthService.getSession();
        const metadata = data.session?.user?.app_metadata as { provider?: string; providers?: unknown } | undefined;
        const providers = Array.isArray(metadata?.providers) ? metadata.providers : [];
        const canReset = metadata?.provider === 'email' || providers.includes('email');
        if (!cancelled) {
          setCanResetPassword(canReset);
        }
      } catch {
        if (!cancelled) {
          setCanResetPassword(false);
        }
      }
    };

    void resolvePasswordResetCapability();
    return () => {
      cancelled = true;
    };
  }, [currentUser?.email, currentUser?.supabaseToken]);

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

  const handleResetPassword = useCallback(async () => {
    if (!currentUser?.email) return;
    if (!canResetPassword) {
      showToast.info('Password reset is available only for email/password accounts.');
      return;
    }
    try {
      setIsPasswordResetting(true);
      await supabaseAuthService.sendPasswordReset(currentUser.email);
      showToast.success('resetPasswordSent');
    } catch (error) {
      showToast.error(error instanceof Error ? error.message : 'Failed to send reset email.');
    } finally {
      setIsPasswordResetting(false);
    }
  }, [canResetPassword, currentUser]);

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
  const isGuest = !currentUser;

  const navItems: readonly VaultDesktopNavItem[] = useMemo(() => {
    if (isGuest) {
      return [
        { id: 'stats', icon: BarChart3, label: insightsLabel },
        { id: 'cloud', icon: Cloud, label: `${t.vaultExport} & ${t.vaultCloud}` },
      ];
    }

    const items: VaultDesktopNavItem[] = [
      { id: 'trees', icon: FolderTree, label: t.vaultTrees },
      { id: 'stats', icon: BarChart3, label: insightsLabel },
      { id: 'cloud', icon: Cloud, label: `${t.vaultExport} & ${t.vaultCloud}` },
    ];

    if (canManageMembers) {
      items.push({ id: 'members', icon: Users, label: t.vaultMembers });
    }
    if (canManageSecurity) {
      items.push({ id: 'security', icon: Lock, label: t.vaultSecurity });
    }

    return items;
  }, [
    canManageMembers,
    canManageSecurity,
    insightsLabel,
    isGuest,
    t.vaultCloud,
    t.vaultExport,
    t.vaultMembers,
    t.vaultSecurity,
    t.vaultTrees,
  ]);

  if (!isVaultOpen) return null;

  const managementLabel = t.vaultManagement;
  const toolsLabel = t.vaultTools;
  const treesLabel = t.vaultTrees;
  const membersLabel = t.vaultMembers;
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
    importTreeHint: t.vaultImportTreeHint,
    refreshTrees: t.vaultRefreshTrees,
    ownedCount: t.vaultTreeOwnedCount,
    sharedCount: t.vaultTreeSharedCount,
    ownedTitle: t.vaultTreeOwnedTitle,
    sharedTitle: t.vaultTreeSharedTitle,
    ownedEmpty: t.vaultTreeOwnedEmpty,
    sharedEmpty: t.vaultTreeSharedEmpty,
    list: treeListLabels,
  };
  const mobileHubItems = [
    { id: 'management', icon: Settings2, label: managementLabel },
    { id: 'insights', icon: BarChart3, label: t.vaultInsights },
    { id: 'tools', icon: Wrench, label: toolsLabel },
  ] as const;
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
    editingTreeId,
    editTreeName,
    isPasswordResetting,
    canResetPassword,
    treePanelLabels,
    onCloseVault: () => setVaultOpen(false),
    onOpenTool: handleOpenTool,
    onResetPassword: () => void handleResetPassword(),
    onUpdateVisibilitySetting: updateVisibilitySetting,
    onCreateTree: () => void handleCreateTree(),
    onImportTree: () => fileInputRef.current?.click(),
    onRefreshTrees: () => void loadTrees(),
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

  return (
    <>
      <style>{TRANSITION_STYLE}</style>
      <input ref={fileInputRef} type="file" accept=".json,.jozor,.zip,.ged" className="hidden" onChange={handleImportFile} />
      <OverlayPrimitive isOpen={isVaultOpen} onClose={() => setVaultOpen(false)} id="the-vault-drawer" withBackdrop={false}>
        <div
          className="fixed inset-0 z-[var(--z-index-drawer)] bg-[color:rgba(24,16,12,0.18)] backdrop-blur-[2px] transition-opacity"
          onClick={() => setVaultOpen(false)}
        />
        <div className={`fixed z-[calc(var(--z-index-drawer)+1)] flex flex-col overflow-hidden border border-[var(--border-main)] bg-[var(--theme-bg)] shadow-[0_30px_90px_rgba(44,24,16,0.18)] ${isMobile ? 'inset-0 h-[100dvh] w-full rounded-none border-0' : 'inset-x-4 top-[5vh] bottom-[5vh] rounded-[24px] sm:inset-x-auto sm:left-1/2 sm:w-[960px] sm:max-w-[calc(100vw-2rem)] sm:-translate-x-1/2'}`}>
          <div className={`ds-drawer-header flex shrink-0 items-center justify-between border-b border-[var(--border-soft)] ${isMobile ? 'px-4 py-4' : 'px-6 py-4'}`}>
            <div className="flex items-center gap-3">
              <div className="rounded-xl bg-[var(--surface-subtle)] p-2 text-[var(--primary-500)]"><ShieldCheck className="h-5 w-5" /></div>
              <div>
                <h2 className="text-base font-bold text-[var(--text-main)]">{t.vaultTitle}</h2>
                <p className="text-xs uppercase tracking-[0.16em] text-[var(--text-muted)]">{t.vaultSubtitle}</p>
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
              <VaultMobileHubNavigation
                items={mobileHubItems}
                activeHub={mobileHub}
                onSelect={setMobileHub}
              />
            ) : (
              <VaultDesktopNavigation
                items={navItems}
                activeTab={vaultTab}
                onSelect={setVaultTab}
              />
            )}
            <div className={`flex-1 overflow-y-auto overscroll-contain bg-[var(--surface-app)] ${isMobile ? 'px-4 py-4' : 'p-6'}`} style={{ WebkitOverflowScrolling: 'touch' }}>
              {isMobile ? (
                <VaultMobileContent
                  context={renderContext}
                  hub={mobileHub}
                  managementSection={mobileManagementSection}
                  onManagementSectionChange={setMobileManagementSection}
                  labels={{ management: managementLabel, trees: treesLabel, members: membersLabel }}
                />
              ) : (
                <VaultDesktopContent context={renderContext} tab={vaultTab} />
              )}
            </div>
          </div>
        </div>
      </OverlayPrimitive>
      <ConfirmationModal isOpen={Boolean(deleteTreeId)} onClose={() => setDeleteTreeId(null)} onConfirm={() => void handleDeleteTree()} title={t.vaultTreeDeleteTitle} message={t.vaultTreeDeleteMessage} type="danger" overlayId="vault-delete-tree-confirm" />
    </>
  );
};
