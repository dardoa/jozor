import { lazy, Suspense, useState } from 'react';
import { VaultTabLoader } from './VaultTabLoader';
import { VaultTreesPanel } from './VaultTreesPanel';
import type { VaultRenderContext } from '../types';
import type { ExportPanelSection } from './ExportCloudPanel';

const CollaborationPanel = lazy(() =>
  import('./CollaborationPanel').then((module) => ({ default: module.CollaborationPanel }))
);
const InsightsPanel = lazy(() =>
  import('./InsightsPanel').then((module) => ({ default: module.InsightsPanel }))
);
const VaultBackupsTab = lazy(() => import('./VaultBackupsTab'));
const VaultSettingsTab = lazy(() => import('./VaultSettingsTab'));

export const VaultTreesContent = ({ context, compact = false }: { context: VaultRenderContext; compact?: boolean }) => (
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

export const VaultBackupsContent = ({ context }: { context: VaultRenderContext }) => {
  const [isBackingUp, setIsBackingUp] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [activeSection, setActiveSection] = useState<ExportPanelSection>('family-book');

  const runWithLoading = async (task: () => Promise<void> | void, setLoading: (value: boolean) => void) => {
    setLoading(true);
    try {
      await task();
    } finally {
      setLoading(false);
    }
  };

  return (
    <Suspense fallback={<VaultTabLoader />}>
      <VaultBackupsTab
        canManageCloud={context.canManageCloud}
        files={context.googleSync.driveFiles || []}
        t={context.t}
        onCloseVault={context.onCloseVault}
        onBackupNow={() => runWithLoading(() => context.auth.onSaveToGoogleDrive?.(), setIsBackingUp)}
        onOpenActivityLog={context.onOpenActivityLog}
        onRefreshDriveFiles={() => runWithLoading(() => context.googleSync.refreshDriveFiles(), setIsRefreshing)}
        onOpenDriveFile={(fileId) => context.auth.handleLoadDriveFile(fileId)}
        onSaveAsNewFile={(fileName) => context.auth.handleSaveAsNewDriveFile(fileName)}
        onOverwriteDriveFile={(fileId) => context.auth.handleOverwriteExistingDriveFile(fileId)}
        onDeleteDriveFile={(fileId) => context.auth.handleDeleteDriveFile(fileId)}
        onRunExport={(type) => context.exportActions.handleExport(type)}
        onRunPublishingExport={(options) => context.exportActions.handlePublishingExport ? context.exportActions.handlePublishingExport(options) : Promise.resolve()}
        onRunPublishingPreview={(options) => context.exportActions.handlePublishingPreview ? context.exportActions.handlePublishingPreview(options) : Promise.reject(new Error('Publishing preview is not available.'))}
        hasSessionError={context.auth.hasSessionError}
        isAuthorized={context.auth.isAuthorized}
        onGoogleLogin={() => context.auth.onLogin()}
        currentActiveDriveFileId={context.auth.currentActiveDriveFileId}
        isBackingUp={isBackingUp}
        isRefreshing={isRefreshing}
        isSaving={context.auth.isSavingDriveFile}
        isDeleting={context.auth.isDeletingDriveFile}
        activeSection={activeSection}
        onActiveSectionChange={setActiveSection}
      />
    </Suspense>
  );
};

export const VaultSettingsContent = ({
  context,
  section = 'all',
}: {
  context: VaultRenderContext;
  section?: 'all' | 'privacy' | 'maintenance';
}) => (
  <Suspense fallback={<VaultTabLoader />}>
    <VaultSettingsTab
      currentTreeId={context.currentTreeId}
      treeSettings={context.treeSettings}
      treeIsPrivate={context.treeIsPrivate}
      canManageSecurity={context.canManageSecurity}
      onOpenCleanTree={context.onOpenCleanTree}
      onUpdateSetting={context.onUpdateVisibilitySetting}
      section={section}
      t={context.t}
    />
  </Suspense>
);
