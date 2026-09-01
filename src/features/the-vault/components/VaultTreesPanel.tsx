import React from 'react';
import { AlertCircle, Loader2, RotateCcw } from 'lucide-react';
import type { SharedTreeSummary, TreeSummary } from '../../../services/supabaseTreeTypes';
import { ActiveTreeCard } from './ActiveTreeCard';
import { TreeGridList } from './TreeGridList';
import type { TreeListLabels, TreeRow } from './TreeListItem';

export interface VaultTreesPanelLabels {
  activeTree: string;
  createTree: string;
  importTree: string;
  importTreeHint: string;
  refreshTrees: string;
  ownedTitle: string;
  sharedTitle: string;
  ownedEmpty: string;
  sharedEmpty: string;
  ownedCount: string;
  sharedCount: string;
  loading: string;
  list: Partial<TreeListLabels>;
}

interface VaultTreesPanelProps {
  treeName: string;
  treeId: string | null;
  roleLabel: string;
  ownedTrees: TreeSummary[];
  sharedTrees: SharedTreeSummary[];
  busyTreeId: string | null;
  isTreeLoading: boolean;
  loadError: string | null;
  editingTreeId: string | null;
  editTreeName: string;
  compact?: boolean;
  labels: VaultTreesPanelLabels;
  retryLabel: string;
  maintenanceLabels: {
    title: string;
    hint: string;
    action: string;
  };
  onCreateTree: () => void;
  onImportTree: () => void;
  onRefreshTrees: () => void;
  onOpenTree: (treeId: string, role?: 'owner' | 'editor' | 'viewer') => void;
  onStartRename: (tree: TreeRow) => void;
  onConfirmRename: (treeId: string) => void;
  onCancelRename: () => void;
  onEditTreeNameChange: (value: string) => void;
  onDeleteTree: (treeId: string) => void;
  onOpenMaintenance: () => void;
}

export const VaultTreesPanel: React.FC<VaultTreesPanelProps> = ({
  treeName,
  treeId,
  roleLabel,
  ownedTrees,
  sharedTrees,
  busyTreeId,
  isTreeLoading,
  loadError,
  editingTreeId,
  editTreeName,
  compact = false,
  labels,
  retryLabel,
  maintenanceLabels,
  onCreateTree,
  onImportTree,
  onRefreshTrees,
  onOpenTree,
  onStartRename,
  onConfirmRename,
  onCancelRename,
  onEditTreeNameChange,
  onDeleteTree,
  onOpenMaintenance,
}) => {
  const ownedTreeRows: TreeRow[] = ownedTrees.map((tree) => ({
    ...tree,
    role: 'owner',
  }));

  return (
  <div className={compact ? 'space-y-5' : 'space-y-6'}>
    {compact && (
      <div className="space-y-0.5 px-1">
        <p className="text-xs font-medium text-[var(--text-muted)]">
          {`${labels.ownedCount}: ${ownedTrees.length} | ${labels.sharedCount}: ${sharedTrees.length}`}
        </p>
      </div>
    )}
    {loadError && (
      <div role="alert" className="flex flex-col gap-3 rounded-lg border border-[var(--danger-500)]/25 bg-[var(--danger-500)]/8 p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-start gap-3">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-[var(--danger-600)]" />
          <p className="text-xs font-semibold leading-5 text-[var(--text-secondary)]">{loadError}</p>
        </div>
        <button
          type="button"
          onClick={onRefreshTrees}
          disabled={isTreeLoading}
          className="min-h-11 shrink-0 rounded-lg border border-[var(--danger-500)]/30 px-3 py-2 text-sm font-semibold text-[var(--danger-600)] transition-colors hover:bg-[var(--danger-500)]/10 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {retryLabel}
        </button>
      </div>
    )}
    <ActiveTreeCard
      treeName={treeName}
      treeId={treeId}
      roleLabel={roleLabel}
      ownedCount={ownedTrees.length}
      sharedCount={sharedTrees.length}
      isBusy={isTreeLoading || busyTreeId !== null}
      labels={{
        activeTree: labels.activeTree,
        createTree: labels.createTree,
        importTree: labels.importTree,
        importTreeHint: labels.importTreeHint,
        refreshTrees: labels.refreshTrees,
      }}
      onCreate={onCreateTree}
      onImport={onImportTree}
      onRefresh={onRefreshTrees}
    />
    {isTreeLoading && ownedTrees.length === 0 && sharedTrees.length === 0 ? (
      <div role="status" aria-live="polite" className="flex min-h-28 items-center justify-center gap-3 rounded-lg border border-[var(--border-soft)] bg-[var(--surface-panel)] p-5 text-sm font-semibold text-[var(--text-muted)]">
        <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
        {labels.loading}
      </div>
    ) : !(loadError && ownedTrees.length === 0 && sharedTrees.length === 0) ? (
      <>
        <TreeGridList
          title={labels.ownedTitle}
          items={ownedTreeRows}
          activeTreeId={treeId}
          busyId={busyTreeId}
          editingId={editingTreeId}
          editName={editTreeName}
          onEditNameChange={onEditTreeNameChange}
          onStartRename={onStartRename}
          onConfirmRename={onConfirmRename}
          onCancelRename={onCancelRename}
          onSelect={(selectedTreeId) => onOpenTree(selectedTreeId, 'owner')}
          onDelete={onDeleteTree}
          emptyText={labels.ownedEmpty}
          labels={labels.list}
          compact={compact}
          hideTitle={false}
        />
        <TreeGridList
          title={labels.sharedTitle}
          items={sharedTrees}
          activeTreeId={treeId}
          busyId={busyTreeId}
          editingId={null}
          editName=""
          onEditNameChange={() => {}}
          onSelect={(selectedTreeId, treeRole) => onOpenTree(selectedTreeId, treeRole || 'viewer')}
          emptyText={labels.sharedEmpty}
          labels={labels.list}
          compact={compact}
          hideTitle={false}
        />
      </>
    ) : null}
    <section className="flex flex-col gap-3 border-t border-[var(--border-soft)] px-1 pt-5 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0">
        <h4 className="text-sm font-semibold text-[var(--text-main)]">{maintenanceLabels.title}</h4>
        <p className="mt-1 max-w-2xl text-xs leading-relaxed text-[var(--text-muted)]">{maintenanceLabels.hint}</p>
      </div>
      <button
        type="button"
        onClick={onOpenMaintenance}
        className="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-lg border border-[var(--danger-500)]/30 px-3 py-2 text-sm font-semibold text-[var(--danger-600)] transition-colors hover:bg-[var(--danger-500)]/10"
      >
        <RotateCcw className="h-4 w-4" />
        {maintenanceLabels.action}
      </button>
    </section>
  </div>
  );
};
