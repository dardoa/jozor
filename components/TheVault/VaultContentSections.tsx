import React, { lazy, Suspense } from 'react';
import { VaultTabLoader } from './VaultTabLoader';
import type { VaultRenderContext } from './vaultDrawerTypes';

const CollaborationPanel = lazy(() =>
  import('./CollaborationPanel').then((module) => ({ default: module.CollaborationPanel }))
);
const InsightsPanel = lazy(() =>
  import('./InsightsPanel').then((module) => ({ default: module.InsightsPanel }))
);
const VaultTreesPanel = lazy(() =>
  import('./VaultTreesPanel').then((module) => ({ default: module.VaultTreesPanel }))
);
const VaultBackupsTab = lazy(() => import('./VaultBackupsTab'));
const VaultSettingsTab = lazy(() => import('./VaultSettingsTab'));

export const VaultTreesContent = ({ context, compact = false }: { context: VaultRenderContext; compact?: boolean }) => (
  <Suspense fallback={<VaultTabLoader />}>
    <VaultTreesPanel
      treeName={context.treeName?.trim() || context.t.untitledTree}
      treeId={context.currentTreeId}
      roleLabel={context.roleLabel}
      ownedTrees={context.ownedTrees}
      sharedTrees={context.sharedTrees}
      busyTreeId={context.busyTreeId}
      isTreeLoading={context.isTreeLoading}
      editingTreeId={context.editingTreeId}
      editTreeName={context.editTreeName}
      labels={context.treePanelLabels}
      compact={compact}
      onCreateTree={context.onCreateTree}
      onImportTree={context.onImportTree}
      onRefreshTrees={context.onRefreshTrees}
      onOpenTree={context.onOpenTree}
      onStartRename={context.onStartRename}
      onConfirmRename={context.onConfirmRename}
      onCancelRename={context.onCancelRename}
      onEditTreeNameChange={context.onEditTreeNameChange}
      onDeleteTree={context.onDeleteTree}
    />
  </Suspense>
);

export const VaultMembersContent = ({ context }: { context: VaultRenderContext }) => (
  <Suspense fallback={<VaultTabLoader />}>
    <CollaborationPanel
      treeId={context.currentTreeId}
      currentUser={context.currentUser}
      canManageMembers={context.canManageMembers}
    />
  </Suspense>
);

export const VaultInsightsContent = ({ context }: { context: VaultRenderContext }) => (
  <Suspense fallback={<VaultTabLoader />}>
    <InsightsPanel
      treeName={context.treeName}
      healthScore={context.healthScore}
      stats={context.stats}
      t={context.t}
      onOpenTool={context.onOpenTool}
    />
  </Suspense>
);

export const VaultBackupsContent = ({ context }: { context: VaultRenderContext }) => (
  <Suspense fallback={<VaultTabLoader />}>
    <VaultBackupsTab
      canManageCloud={context.canManageCloud}
      files={context.googleSync.driveFiles || []}
      t={context.t}
      onCloseVault={context.onCloseVault}
      onBackupNow={() => context.auth.onSaveToGoogleDrive?.()}
      onManageDriveFiles={() => context.auth.onOpenDriveFileManager()}
      onOpenActivityLog={context.onOpenActivityLog}
      onRefreshDriveFiles={() => context.googleSync.refreshDriveFiles()}
      onOpenDriveFile={(fileId) => context.auth.handleLoadDriveFile(fileId)}
      onRunExport={(type) => context.exportActions.handleExport(type)}
      hasSessionError={context.auth.hasSessionError}
      isAuthorized={context.auth.isAuthorized}
      onGoogleLogin={() => context.auth.onLogin()}
    />
  </Suspense>
);

export const VaultSettingsContent = ({ context }: { context: VaultRenderContext }) => (
  <Suspense fallback={<VaultTabLoader />}>
    <VaultSettingsTab
      currentTreeId={context.currentTreeId}
      currentUser={context.currentUser}
      treeSettings={context.treeSettings}
      treeIsPrivate={context.treeIsPrivate}
      canManageSecurity={context.canManageSecurity}
      isPasswordResetting={context.isPasswordResetting}
      onResetPassword={context.onResetPassword}
      onOpenDiagnostics={context.onOpenDiagnostics}
      onOpenCleanTree={context.onOpenCleanTree}
      onUpdateSetting={context.onUpdateVisibilitySetting}
      t={context.t}
    />
  </Suspense>
);
