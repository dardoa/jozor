import React from 'react';
import { treeControlNavButtonClass } from './TreeControlCenterShared';

export type TreeControlNavTab<TId extends string = string> = {
  id: TId;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
};

export const TreeControlCenterNav = <TId extends string>({
  ariaLabel,
  tabs,
  activeTabId,
  onSelect,
}: {
  ariaLabel: string;
  tabs: TreeControlNavTab<TId>[];
  activeTabId: TId;
  onSelect: (id: TId) => void;
}) => (
  <nav className="flex gap-2 overflow-x-auto md:flex-col" aria-label={ariaLabel}>
    {tabs.map((tab) => {
      const isActive = tab.id === activeTabId;
      const Icon = tab.icon;
      return (
        <button
          key={tab.id}
          type="button"
          onClick={() => onSelect(tab.id)}
          className={`${treeControlNavButtonClass} ${
            isActive
              ? 'bg-[var(--surface-panel)] text-[var(--primary-700)] shadow-[var(--shadow-xs)]'
              : 'text-[var(--text-dim)] hover:bg-[var(--surface-hover)] hover:text-[var(--text-main)]'
          }`}
        >
          <Icon className="h-4 w-4" />
          <span className="whitespace-nowrap">{tab.label}</span>
        </button>
      );
    })}
  </nav>
);

