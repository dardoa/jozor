import React from 'react';
import { X } from 'lucide-react';
import { OverlayPrimitive } from '../../context/OverlayContext';
import { TreeControlCenterNav } from './TreeControlCenterNav';
import type { TreeControlNavTab } from './TreeControlCenterNav';
import type { TreeControlTab, TreeControlText } from './TreeControlCenterTypes';

interface TreeControlCenterShellProps {
  isOpen: boolean;
  onClose: () => void;
  treeName: string;
  text: TreeControlText;
  tabs: TreeControlNavTab<TreeControlTab>[];
  activeTab: TreeControlTab;
  onSelectTab: (tab: TreeControlTab) => void;
  children: React.ReactNode;
}

export const TreeControlCenterShell: React.FC<TreeControlCenterShellProps> = ({
  isOpen,
  onClose,
  treeName,
  text,
  tabs,
  activeTab,
  onSelectTab,
  children,
}) => (
  <OverlayPrimitive isOpen={isOpen} onClose={onClose} id="tree-control-center">
    <div className="ds-overlay-card relative flex h-[min(90vh,52rem)] w-[calc(100vw-1rem)] max-w-6xl flex-col overflow-hidden rounded-[var(--radius-2xl)] shadow-[var(--shadow-lg)]">
      <div className="ds-modal-header flex items-center justify-between gap-4 px-4 py-4 sm:px-6">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--text-dim)]">{text.title}</p>
          <h2 className="mt-1 text-xl font-semibold text-[var(--text-main)]">{treeName}</h2>
          <p className="mt-1 text-sm text-[var(--text-dim)]">{text.subtitle}</p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="inline-flex h-10 w-10 items-center justify-center rounded-full text-[var(--text-dim)] transition hover:bg-[var(--surface-hover)] hover:text-[var(--text-main)]"
          aria-label={text.closeAria}
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      <div className="flex min-h-0 flex-1 flex-col md:flex-row">
        <aside className="border-b border-[var(--border-main)] bg-[var(--surface-panel-subtle)]/75 p-3 md:w-64 md:border-b-0 md:border-e">
          <TreeControlCenterNav
            ariaLabel={text.navigationAria}
            tabs={tabs}
            activeTabId={activeTab}
            onSelect={onSelectTab}
          />
        </aside>

        <div className="flex-1 overflow-y-auto bg-[var(--surface-app)]/70 p-4 sm:p-6">{children}</div>
      </div>
    </div>
  </OverlayPrimitive>
);
