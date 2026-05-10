import React from 'react';

export const treeControlNavButtonClass =
  'flex items-center gap-3 rounded-[var(--radius-lg)] px-3 py-2 text-sm font-medium transition-colors';

export const treeControlPlaceholderCardClass =
  'rounded-[var(--radius-xl)] border border-[var(--border-soft)] bg-[var(--surface-panel)] p-5 shadow-[var(--shadow-xs)]';

export const TreeControlCard: React.FC<{ children: React.ReactNode; className?: string }> = ({
  children,
  className,
}) => (
  <div className={`${treeControlPlaceholderCardClass}${className ? ` ${className}` : ''}`}>{children}</div>
);

export const TreeControlPlaceholder: React.FC<{ title: string; body: string }> = ({ title, body }) => (
  <section className={`${treeControlPlaceholderCardClass} space-y-3`}>
    <h3 className="text-base font-semibold text-[var(--text-main)]">{title}</h3>
    <p className="text-sm leading-6 text-[var(--text-dim)]">{body}</p>
  </section>
);

export const TreeControlSectionIntro: React.FC<{ title: string; description: string }> = ({
  title,
  description,
}) => (
  <TreeControlCard>
    <h3 className="text-base font-semibold text-[var(--text-main)]">{title}</h3>
    <p className="mt-2 text-sm leading-6 text-[var(--text-dim)]">{description}</p>
  </TreeControlCard>
);

