import React from 'react';
import { TreeControlCard } from './TreeControlCenterShared';

type OverviewText = {
  overviewCards: {
    role: string;
    people: string;
    currentRoot: string;
    notSet: string;
    syncState: string;
    syncNeedsAttention: string;
    syncHealthy: string;
  };
  quickActions: {
    title: string;
    description: string;
    shareTree: string;
    openDiagnostics: string;
  };
  migration: {
    title: string;
    description: string;
    treeIdLabel: string;
  };
};

export const TreeControlCenterOverview: React.FC<{
  text: OverviewText;
  roleLabel: string;
  peopleCount: number;
  currentRootName?: string | null;
  hasPendingSync: boolean;
  treeId?: string | null;
  onOpenShare: () => void;
  onOpenDiagnostics: () => void;
}> = ({
  text,
  roleLabel,
  peopleCount,
  currentRootName,
  hasPendingSync,
  treeId,
  onOpenShare,
  onOpenDiagnostics,
}) => (
  <div className="space-y-5">
    <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      <TreeControlCard>
        <p className="text-xs font-semibold uppercase tracking-wide text-[var(--text-dim)]">{text.overviewCards.role}</p>
        <p className="mt-2 text-lg font-semibold text-[var(--text-main)]">{roleLabel}</p>
      </TreeControlCard>
      <TreeControlCard>
        <p className="text-xs font-semibold uppercase tracking-wide text-[var(--text-dim)]">{text.overviewCards.people}</p>
        <p className="mt-2 text-lg font-semibold text-[var(--text-main)]">{peopleCount}</p>
      </TreeControlCard>
      <TreeControlCard>
        <p className="text-xs font-semibold uppercase tracking-wide text-[var(--text-dim)]">{text.overviewCards.currentRoot}</p>
        <p className="mt-2 text-lg font-semibold text-[var(--text-main)]">
          {currentRootName || text.overviewCards.notSet}
        </p>
      </TreeControlCard>
      <TreeControlCard>
        <p className="text-xs font-semibold uppercase tracking-wide text-[var(--text-dim)]">{text.overviewCards.syncState}</p>
        <p className="mt-2 text-lg font-semibold text-[var(--text-main)]">
          {hasPendingSync ? text.overviewCards.syncNeedsAttention : text.overviewCards.syncHealthy}
        </p>
      </TreeControlCard>
    </section>

    <TreeControlCard className="space-y-4">
      <div>
        <h3 className="text-base font-semibold text-[var(--text-main)]">{text.quickActions.title}</h3>
        <p className="mt-1 text-sm text-[var(--text-dim)]">{text.quickActions.description}</p>
      </div>
      <div className="flex flex-col gap-3 sm:flex-row">
        <button
          type="button"
          onClick={onOpenShare}
          className="rounded-[var(--radius-lg)] bg-[var(--primary-600)] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[var(--primary-700)]"
        >
          {text.quickActions.shareTree}
        </button>
        <button
          type="button"
          onClick={onOpenDiagnostics}
          className="rounded-[var(--radius-lg)] border border-[var(--border-soft)] bg-[var(--surface-panel-subtle)] px-4 py-2 text-sm font-semibold text-[var(--text-main)] transition hover:bg-[var(--surface-hover)]"
        >
          {text.quickActions.openDiagnostics}
        </button>
      </div>
    </TreeControlCard>

    <TreeControlCard>
      <h3 className="text-base font-semibold text-[var(--text-main)]">{text.migration.title}</h3>
      <p className="mt-2 text-sm leading-6 text-[var(--text-dim)]">{text.migration.description}</p>
      {treeId ? (
        <p className="mt-3 text-xs text-[var(--text-dim)]">
          {text.migration.treeIdLabel} {treeId}
        </p>
      ) : null}
    </TreeControlCard>
  </div>
);
