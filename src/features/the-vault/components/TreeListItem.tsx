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
  ownerRole: string;
  editorRole: string;
  viewerRole: string;
  locale: string;
  duplicateName: string;
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
  duplicatePosition?: { index: number; total: number } | null;
}

const formatDateLabel = (tree: TreeRow, justNowLabel: string, locale: string) => {
  const raw = tree.updatedAt || tree.createdAt;
  if (!raw) return justNowLabel;
  try {
    const date = new Date(raw);
    if (Number.isNaN(date.getTime())) return raw;
    const absolute = new Intl.DateTimeFormat(locale, { dateStyle: 'medium' }).format(date);
    const elapsedDays = Math.round((date.getTime() - Date.now()) / 86_400_000);
    const relative = new Intl.RelativeTimeFormat(locale, { numeric: 'auto' }).format(
      Math.abs(elapsedDays) < 30 ? elapsedDays : Math.round(elapsedDays / 30),
      Math.abs(elapsedDays) < 30 ? 'day' : 'month'
    );
    return `${absolute} · ${relative}`;
  } catch {
    return raw;
  }
};

const getRoleLabel = (role: TreeRow['role'], labels: TreeListLabels) => {
  if (role === 'owner') return labels.ownerRole;
  if (role === 'editor') return labels.editorRole;
  if (role === 'viewer') return labels.viewerRole;
  return null;
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
  duplicatePosition = null,
}) => {
  const isActive = activeTreeId === tree.id;
  const isEditing = editingId === tree.id;
  const isBusy = busyId === tree.id;
  const roleLabel = getRoleLabel(tree.role, labels);

  return (
    <div
      className={`${compact ? 'rounded-[14px]' : 'rounded-2xl'} p-4 transition-all duration-300 ease-in-out ${
        isActive
          ? 'bg-[var(--primary-600)] text-white shadow-sm'
          : compact
            ? 'border border-[var(--border-soft)] bg-[var(--surface-panel)] text-[var(--text-secondary)] hover:bg-[var(--surface-hover)]'
            : 'border border-[var(--border-soft)] bg-[var(--surface-subtle)] text-[var(--text-secondary)] hover:bg-[var(--surface-hover)]'
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
                className="min-h-11 w-full rounded-xl border border-[var(--primary-300)] bg-[var(--surface-panel)] px-3 py-2 text-sm font-semibold text-[var(--text-main)] outline-none ring-2 ring-[var(--primary-200)]"
              />
              <button
                type="button"
                onClick={() => onConfirmRename?.(tree.id)}
                className="min-h-11 min-w-11 rounded-xl bg-[var(--primary-600)] p-2 text-white"
                title={labels.renameTree}
                aria-label={labels.renameTree}
              >
                <Check className="h-4 w-4" />
              </button>
            </div>
          ) : (
            <>
              <div className="flex items-center gap-2">
                <h5 className={`truncate text-sm font-bold ${isActive ? 'text-white' : 'text-[var(--text-main)]'}`}>
                  {tree.name}
                </h5>
                {roleLabel && (
                  <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${isActive ? 'bg-white/15 text-white' : 'bg-[var(--surface-panel)] text-[var(--text-muted)]'}`}>
                    {roleLabel}
                  </span>
                )}
                {isActive && (
                  <span className="rounded-full bg-white/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">
                    {labels.active}
                  </span>
                )}
                {duplicatePosition ? (
                  <span
                    className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${isActive ? 'bg-white/15 text-white' : 'bg-amber-50 text-amber-700'}`}
                    aria-label={labels.duplicateName
                      .replace('{index}', String(duplicatePosition.index))
                      .replace('{total}', String(duplicatePosition.total))}
                  >
                    #{duplicatePosition.index}/{duplicatePosition.total}
                  </span>
                ) : null}
              </div>
              <p className={`mt-1 text-[12px] ${isActive ? 'text-white/80' : 'text-[var(--text-muted)]'}`}>
                {labels.updated} {formatDateLabel(tree, labels.justNow, labels.locale)}
              </p>
            </>
          )}
        </div>

        <div className={`mt-auto flex flex-wrap items-center ${compact ? 'gap-2.5 gap-y-3' : 'gap-1'}`}>
          <button
            type="button"
            onClick={() => onSelect(tree.id, tree.role)}
            disabled={isBusy || isActive}
            className={`min-h-11 min-w-11 ${compact ? 'rounded-xl' : 'rounded-2xl'} p-2 transition-all duration-300 ease-in-out disabled:cursor-not-allowed disabled:opacity-40 ${isActive ? 'text-white hover:bg-white/10' : 'text-[var(--primary-600)] hover:bg-[var(--surface-hover)]'}`}
            title={labels.openTree}
            aria-label={labels.openTree}
          >
            {isBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
          </button>
          {!tree.isShared && onStartRename && (
            <button
              type="button"
              onClick={() => onStartRename(tree)}
              disabled={isBusy}
              className={`min-h-11 min-w-11 ${compact ? 'rounded-xl' : 'rounded-2xl'} p-2 transition-all duration-300 ease-in-out disabled:cursor-not-allowed disabled:opacity-40 ${isActive ? 'text-white hover:bg-white/10' : 'text-[var(--text-muted)] hover:bg-[var(--surface-hover)]'}`}
              title={labels.renameTree}
              aria-label={labels.renameTree}
            >
              <Edit2 className="h-4 w-4" />
            </button>
          )}
          {!tree.isShared && onDelete && (
            <button
              type="button"
              onClick={() => onDelete(tree.id)}
              disabled={isBusy}
              className={`min-h-11 min-w-11 ${compact ? 'rounded-xl' : 'rounded-2xl'} p-2 transition-all duration-300 ease-in-out disabled:cursor-not-allowed disabled:opacity-40 ${isActive ? 'text-white hover:bg-white/10' : 'text-[var(--danger-500)] hover:bg-[var(--danger-500)]/10'}`}
              title={labels.deleteTree}
              aria-label={labels.deleteTree}
            >
              <Trash2 className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      {tree.isShared && (
        <div className={`mt-3 flex items-center gap-2 rounded-2xl px-3 py-3 text-[12px] ${isActive ? 'bg-white/10 text-white/80' : 'bg-[var(--surface-subtle)] text-[var(--text-muted)]'}`}>
          <Users className="h-3.5 w-3.5" />
          {labels.sharedAccessNote}
        </div>
      )}
    </div>
  );
};
