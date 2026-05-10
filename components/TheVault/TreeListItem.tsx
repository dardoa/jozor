import React from 'react';
import { Check, Edit2, Loader2, Play, Trash2, Users } from 'lucide-react';

export type TreeRow = {
  id: string;
  name: string;
  createdAt: string;
  updatedAt?: string;
  role?: 'owner' | 'editor' | 'viewer';
  isShared?: boolean;
};

export interface TreeListLabels {
  active: string;
  openTree: string;
  renameTree: string;
  deleteTree: string;
  updated: string;
  justNow: string;
  sharedAccessNote: string;
}

interface TreeListItemProps {
  tree: TreeRow;
  labels: TreeListLabels;
  activeTreeId: string | null;
  busyId: string | null;
  editingId: string | null;
  editName: string;
  compact: boolean;
  onEditNameChange: (value: string) => void;
  onStartRename?: (tree: TreeRow) => void;
  onConfirmRename?: (treeId: string) => void;
  onCancelRename?: () => void;
  onSelect: (treeId: string, role?: 'owner' | 'editor' | 'viewer') => void;
  onDelete?: (treeId: string) => void;
}

const formatDateLabel = (tree: TreeRow, justNowLabel: string) => {
  const raw = tree.updatedAt || tree.createdAt;
  if (!raw) return justNowLabel;
  try {
    return new Date(raw).toLocaleDateString();
  } catch {
    return raw;
  }
};

export const TreeListItem: React.FC<TreeListItemProps> = ({
  tree,
  labels,
  activeTreeId,
  busyId,
  editingId,
  editName,
  compact,
  onEditNameChange,
  onStartRename,
  onConfirmRename,
  onCancelRename,
  onSelect,
  onDelete,
}) => {
  const isActive = activeTreeId === tree.id;
  const isEditing = editingId === tree.id;
  const isBusy = busyId === tree.id;

  return (
    <div
      className={`${compact ? 'rounded-[14px]' : 'rounded-2xl'} p-4 transition-all duration-300 ease-in-out ${
        isActive
          ? 'bg-[#a67c37] text-white shadow-sm'
          : compact
            ? 'bg-[#f9f7f3] text-slate-600 hover:bg-[#f5f1e9]'
            : 'border border-black/[0.03] bg-white/40 text-slate-600 hover:bg-white'
      }`}
    >
      <div className="flex h-full flex-col gap-4">
        <div className="min-w-0 flex-1">
          {isEditing ? (
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <input
                autoFocus
                value={editName}
                onChange={(event) => onEditNameChange(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') onConfirmRename?.(tree.id);
                  if (event.key === 'Escape') onCancelRename?.();
                }}
                className="min-h-11 w-full rounded-xl border border-[var(--primary-300)] bg-white px-3 py-2 text-sm font-semibold text-[var(--text-main)] outline-none ring-2 ring-[var(--primary-200)]"
              />
              <button
                type="button"
                onClick={() => onConfirmRename?.(tree.id)}
                className="min-h-11 min-w-11 rounded-xl bg-[var(--primary-600)] p-2 text-white"
                title={labels.renameTree}
              >
                <Check className="h-4 w-4" />
              </button>
            </div>
          ) : (
            <>
              <div className="flex items-center gap-2">
                <h5 className={`truncate text-sm font-bold ${isActive ? 'text-white' : 'text-slate-800'}`}>
                  {tree.name}
                </h5>
                {tree.isShared && tree.role && (
                  <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${isActive ? 'bg-white/15 text-white' : 'bg-white/70 text-slate-500'}`}>
                    {tree.role}
                  </span>
                )}
                {isActive && (
                  <span className="rounded-full bg-white/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">
                    {labels.active}
                  </span>
                )}
              </div>
              <p className={`mt-1 text-[12px] ${isActive ? 'text-white/80' : 'text-slate-500'}`}>
                {labels.updated} {formatDateLabel(tree, labels.justNow)}
              </p>
            </>
          )}
        </div>

        <div className={`mt-auto flex flex-wrap items-center ${compact ? 'gap-2.5 gap-y-3' : 'gap-1'}`}>
          <button
            type="button"
            onClick={() => onSelect(tree.id, tree.role)}
            disabled={isBusy || isActive}
            className={`min-h-11 min-w-11 ${compact ? 'rounded-xl' : 'rounded-2xl'} p-2 transition-all duration-300 ease-in-out disabled:cursor-not-allowed disabled:opacity-40 ${isActive ? 'text-white hover:bg-white/10' : 'text-[#a67c37] hover:bg-white/80'}`}
            title={labels.openTree}
          >
            {isBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
          </button>
          {!tree.isShared && onStartRename && (
            <button
              type="button"
              onClick={() => onStartRename(tree)}
              className={`min-h-11 min-w-11 ${compact ? 'rounded-xl' : 'rounded-2xl'} p-2 transition-all duration-300 ease-in-out ${isActive ? 'text-white hover:bg-white/10' : 'text-slate-500 hover:bg-white/80'}`}
              title={labels.renameTree}
            >
              <Edit2 className="h-4 w-4" />
            </button>
          )}
          {!tree.isShared && onDelete && (
            <button
              type="button"
              onClick={() => onDelete(tree.id)}
              className={`min-h-11 min-w-11 ${compact ? 'rounded-xl' : 'rounded-2xl'} p-2 transition-all duration-300 ease-in-out ${isActive ? 'text-white hover:bg-white/10' : 'text-[var(--danger-500)] hover:bg-[var(--danger-500)]/10'}`}
              title={labels.deleteTree}
            >
              <Trash2 className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      {tree.isShared && (
        <div className={`mt-3 flex items-center gap-2 rounded-2xl px-3 py-3 text-[12px] ${isActive ? 'bg-white/10 text-white/80' : compact ? 'bg-white/65 text-slate-500' : 'bg-white/45 text-slate-500'}`}>
          <Users className="h-3.5 w-3.5" />
          {labels.sharedAccessNote}
        </div>
      )}
    </div>
  );
};
