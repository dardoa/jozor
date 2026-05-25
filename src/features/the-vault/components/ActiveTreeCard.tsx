import React from 'react';
import { Download, FolderTree, Plus, RefreshCw } from 'lucide-react';

interface ActiveTreeCardProps {
  treeName: string;
  treeId: string | null;
  roleLabel: string;
  ownedCount: number;
  sharedCount: number;
  isBusy?: boolean;
  labels?: Partial<{
    activeTree: string;
    createTree: string;
    importTree: string;
    importTreeHint: string;
    refreshTrees: string;
  }>;
  onCreate: () => void;
  onImport: () => void;
  onRefresh: () => void;
}

const DEFAULT_LABELS = {
  activeTree: 'Active Tree',
  createTree: 'New',
  importTree: 'Import as new tree',
  importTreeHint: 'Imported files create a separate cloud tree and do not replace the active tree.',
  refreshTrees: 'Refresh',
};

export const ActiveTreeCard: React.FC<ActiveTreeCardProps> = ({
  treeName,
  roleLabel,
  isBusy = false,
  labels,
  onCreate,
  onImport,
  onRefresh,
}) => {
  const resolvedLabels = { ...DEFAULT_LABELS, ...labels };

  return (
    <section className="rounded-[14px] border border-[var(--border-soft)] bg-[var(--surface-panel)] p-4 shadow-none">
      <div className="flex flex-col gap-5">
        <div className="flex items-center gap-3">
          <div className="rounded-2xl bg-[var(--surface-subtle)] p-3 text-[var(--primary-600)]">
            <FolderTree className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <p className="text-[11px] font-bold uppercase tracking-[0.05em] text-[var(--text-muted)]">
              {resolvedLabels.activeTree}
            </p>
            <h3 className="truncate text-[16px] font-bold tracking-tight text-[var(--text-main)]">
              {treeName}
            </h3>
            <div className="mt-2">
              <span className="inline-flex items-center rounded-md bg-[var(--primary-600)]/10 px-2 py-0.5 text-[11px] font-medium text-[var(--primary-600)]">
                {roleLabel}
              </span>
            </div>
          </div>
        </div>

        <div className="flex w-full flex-row flex-nowrap items-center gap-3 overflow-x-auto [scrollbar-width:none]">
          <button
            type="button"
            onClick={onCreate}
            disabled={isBusy}
            className="inline-flex min-h-10 min-w-10 shrink-0 items-center justify-center gap-2 rounded-xl border border-[var(--border-soft)] bg-[var(--surface-subtle)] px-3 py-2 text-sm font-medium text-[var(--text-secondary)] transition-all duration-200 ease-in-out hover:bg-[var(--surface-hover)] disabled:opacity-50"
          >
            <span className="inline-flex items-center gap-2">
              <Plus className="h-4 w-4" />
              {resolvedLabels.createTree}
            </span>
          </button>
          <button
            type="button"
            onClick={onImport}
            disabled={isBusy}
            className="inline-flex min-h-10 min-w-10 shrink-0 items-center justify-center gap-2 rounded-xl border border-[var(--border-soft)] bg-[var(--surface-subtle)] px-3 py-2 text-sm font-medium text-[var(--text-secondary)] transition-all duration-200 ease-in-out hover:bg-[var(--surface-hover)] disabled:opacity-50"
          >
            <span className="inline-flex items-center gap-2">
              <Download className="h-4 w-4" />
              {resolvedLabels.importTree}
            </span>
          </button>
          <button
            type="button"
            onClick={onRefresh}
            disabled={isBusy}
            className="inline-flex min-h-10 min-w-10 shrink-0 items-center justify-center gap-2 rounded-xl border border-[var(--border-soft)] bg-[var(--surface-subtle)] px-3 py-2 text-sm font-medium text-[var(--text-secondary)] transition-all duration-200 ease-in-out hover:bg-[var(--surface-hover)] disabled:opacity-50"
          >
            <span className="inline-flex items-center gap-2">
              <RefreshCw className="h-4 w-4" />
              {resolvedLabels.refreshTrees}
            </span>
          </button>
        </div>
        {resolvedLabels.importTreeHint && (
          <p className="-mt-2 text-xs font-medium leading-relaxed text-[var(--text-muted)]">
            {resolvedLabels.importTreeHint}
          </p>
        )}
      </div>
    </section>
  );
};
