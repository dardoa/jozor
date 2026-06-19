import React from 'react';
import { TreeListItem, type TreeListLabels, type TreeRow } from './TreeListItem';

interface TreeGridListProps {
  title: string;
  items: TreeRow[];
  activeTreeId: string | null;
  busyId: string | null;
  editingId: string | null;
  editName: string;
  onEditNameChange: (value: string) => void;
  onStartRename?: (tree: TreeRow) => void;
  onConfirmRename?: (treeId: string) => void;
  onCancelRename?: () => void;
  onSelect: (treeId: string, role?: 'owner' | 'editor' | 'viewer') => void;
  onDelete?: (treeId: string) => void;
  emptyText: string;
  labels?: Partial<TreeListLabels>;
  compact?: boolean;
  hideTitle?: boolean;
}

const DEFAULT_TREE_LIST_LABELS: TreeListLabels = {
  active: 'Active',
  openTree: 'Open tree',
  renameTree: 'Rename tree',
  deleteTree: 'Delete tree',
  updated: 'Updated',
  justNow: 'Just now',
  sharedAccessNote: 'Shared tree access is managed from the collaboration tab.',
  ownerRole: 'Owner',
  editorRole: 'Editor',
  viewerRole: 'Viewer',
};

export const TreeGridList: React.FC<TreeGridListProps> = ({
  title,
  items,
  activeTreeId,
  busyId,
  editingId,
  editName,
  onEditNameChange,
  onStartRename,
  onConfirmRename,
  onCancelRename,
  onSelect,
  onDelete,
  emptyText,
  labels,
  compact = false,
  hideTitle = false,
}) => {
  const resolvedLabels = { ...DEFAULT_TREE_LIST_LABELS, ...labels };

  if (items.length === 0) {
    return (
      <section className={`${compact ? 'rounded-[14px] border border-[var(--border-soft)] bg-[var(--surface-panel)] px-4 py-6 shadow-none' : 'rounded-2xl border border-[var(--border-soft)] bg-[var(--surface-panel)] px-5 py-8 text-sm text-[var(--text-muted)] shadow-[var(--shadow-xs)]'}`}>
        {!hideTitle && <h4 className="mb-2 text-[16px] font-bold tracking-tight text-[var(--text-main)]">{title}</h4>}
        <p>{emptyText}</p>
      </section>
    );
  }

  return (
    <section className="space-y-4">
      {!hideTitle && <h4 className="px-1 text-[16px] font-bold tracking-tight text-[var(--text-main)]">{title}</h4>}
      <div className={compact ? 'space-y-3' : 'grid grid-cols-2 gap-4'}>
        {items.map((tree) => {
          return (
            <TreeListItem
              key={tree.id}
              tree={tree}
              labels={resolvedLabels}
              activeTreeId={activeTreeId}
              busyId={busyId}
              editingId={editingId}
              editName={editName}
              compact={compact}
              onEditNameChange={onEditNameChange}
              onStartRename={onStartRename}
              onConfirmRename={onConfirmRename}
              onCancelRename={onCancelRename}
              onSelect={onSelect}
              onDelete={onDelete}
            />
          );
        })}
      </div>
    </section>
  );
};
