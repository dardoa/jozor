import React from 'react';
import type { SharedTreeSummary, TreeSummary } from '../../services/supabaseTreeTypes';
import { ActiveTreeCard } from './ActiveTreeCard';
import { TreeGridList } from './TreeGridList';
import type { TreeListLabels, TreeRow } from './TreeListItem';

export interface VaultTreesPanelLabels {
  activeTree: string;
  createTree: string;
  importTree: string;
  refreshTrees: string;
  ownedTitle: string;
  sharedTitle: string;
  ownedEmpty: string;
  sharedEmpty: string;
  ownedCount: string;
  sharedCount: string;
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
  editingTreeId: string | null;
  editTreeName: string;
  compact?: boolean;
  labels: VaultTreesPanelLabels;
  onCreateTree: () => void;
  onImportTree: () => void;
  onRefreshTrees: () => void;
  onOpenTree: (treeId: string, role?: 'owner' | 'editor' | 'viewer') => void;
  onStartRename: (tree: TreeRow) => void;
  onConfirmRename: (treeId: string) => void;
  onCancelRename: () => void;
  onEditTreeNameChange: (value: string) => void;
  onDeleteTree: (treeId: string) => void;
}

export const VaultTreesPanel: React.FC<VaultTreesPanelProps> = ({
  treeName,
  treeId,
  roleLabel,
  ownedTrees,
  sharedTrees,
  busyTreeId,
  isTreeLoading,
  editingTreeId,
  editTreeName,
  compact = false,
  labels,
  onCreateTree,
  onImportTree,
  onRefreshTrees,
  onOpenTree,
  onStartRename,
  onConfirmRename,
  onCancelRename,
  onEditTreeNameChange,
  onDeleteTree,
}) => (
  <div className={compact ? 'mt-4 space-y-8 px-4' : 'space-y-6'}>
    {compact && (
      <div className="mt-4 space-y-0.5">
        <p className="text-xs font-medium text-slate-500">
          {`${labels.ownedCount}: ${ownedTrees.length} | ${labels.sharedCount}: ${sharedTrees.length}`}
        </p>
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
        refreshTrees: labels.refreshTrees,
      }}
      onCreate={onCreateTree}
      onImport={onImportTree}
      onRefresh={onRefreshTrees}
    />
    <TreeGridList
      title={labels.ownedTitle}
      items={ownedTrees}
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
      hideTitle={compact}
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
      hideTitle={compact}
    />
  </div>
);
