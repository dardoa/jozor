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
    refreshTrees: string;
  }>;
  onCreate: () => void;
  onImport: () => void;
  onRefresh: () => void;
}

const DEFAULT_LABELS = {
  activeTree: 'Active Tree',
  createTree: 'New',
  importTree: 'Import',
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
    <section className="rounded-[14px] bg-[#f9f7f3] p-4 shadow-none">
      <div className="flex flex-col gap-5">
        <div className="flex items-center gap-3">
          <div className="rounded-2xl bg-white/70 p-3 text-[#a67c37]">
            <FolderTree className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <p className="text-[11px] font-bold uppercase tracking-[0.05em] text-slate-400">
              {resolvedLabels.activeTree}
            </p>
            <h3 className="truncate text-[16px] font-bold tracking-tight text-slate-800">
              {treeName}
            </h3>
            <div className="mt-2">
              <span className="inline-flex items-center rounded-md bg-[#a67c37]/10 px-2 py-0.5 text-[11px] font-medium text-[#a67c37]">
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
            className="inline-flex min-h-10 min-w-10 shrink-0 items-center justify-center gap-2 rounded-xl bg-white/70 px-3 py-2 text-sm font-medium text-slate-600 transition-all duration-200 ease-in-out hover:bg-white disabled:opacity-50"
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
            className="inline-flex min-h-10 min-w-10 shrink-0 items-center justify-center gap-2 rounded-xl bg-white/70 px-3 py-2 text-sm font-medium text-slate-600 transition-all duration-200 ease-in-out hover:bg-white disabled:opacity-50"
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
            className="inline-flex min-h-10 min-w-10 shrink-0 items-center justify-center gap-2 rounded-xl bg-white/70 px-3 py-2 text-sm font-medium text-slate-600 transition-all duration-200 ease-in-out hover:bg-white disabled:opacity-50"
          >
            <span className="inline-flex items-center gap-2">
              <RefreshCw className="h-4 w-4" />
              {resolvedLabels.refreshTrees}
            </span>
          </button>
        </div>
      </div>
    </section>
  );
};
