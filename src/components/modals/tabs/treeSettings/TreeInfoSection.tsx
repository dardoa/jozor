import React from 'react';
import { Info } from 'lucide-react';
import type { TreeSettingsText } from './treeSettingsTypes';

interface TreeInfoSectionProps {
  text: TreeSettingsText;
  treeId: string;
  peopleCount: number;
  currentRootLabel: string;
}

export const TreeInfoSection: React.FC<TreeInfoSectionProps> = ({
  text,
  treeId,
  peopleCount,
  currentRootLabel,
}) => (
  <section className="rounded-[var(--radius-xl)] border border-[var(--border-soft)] bg-[var(--surface-subtle)] p-4" aria-labelledby="tree-settings-info-title">
    <div className="mb-3">
      <h4 id="tree-settings-info-title" className="flex items-center gap-2 text-sm font-semibold text-[var(--text-main)]">
        <Info className="h-4 w-4 text-[var(--color-info)]" />
        {text.infoTitle}
      </h4>
    </div>
    <dl className="grid gap-3 text-sm sm:grid-cols-3">
      <div>
        <dt className="text-xs font-medium text-[var(--text-dim)]">{text.treeIdLabel}</dt>
        <dd className="mt-1 break-all text-[var(--text-main)]">{treeId}</dd>
      </div>
      <div>
        <dt className="text-xs font-medium text-[var(--text-dim)]">{text.peopleCountLabel}</dt>
        <dd className="mt-1 text-[var(--text-main)]">{peopleCount}</dd>
      </div>
      <div>
        <dt className="text-xs font-medium text-[var(--text-dim)]">{text.currentRootLabel}</dt>
        <dd className="mt-1 text-[var(--text-main)]">{currentRootLabel}</dd>
      </div>
    </dl>
  </section>
);
