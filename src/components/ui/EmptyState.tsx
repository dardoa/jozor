import React from 'react';

interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
  tone?: 'default' | 'subtle';
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon,
  title,
  description,
  action,
  className = '',
  tone = 'default',
}) => {
  const toneClass =
    tone === 'subtle'
      ? 'bg-[var(--surface-subtle)] border-[var(--border-soft)]'
      : 'bg-[var(--surface-panel)] border-[var(--border-strong)]';

  return (
    <div
      className={`ds-empty-state ${toneClass} text-[var(--text-muted)] flex flex-col items-center gap-2.5 ${className}`}
    >
      {icon && <div className='opacity-70 text-[var(--text-dim)]'>{icon}</div>}
      <span className='text-sm font-semibold text-[var(--text-main)]'>{title}</span>
      {description && (
        <p className='text-xs text-[var(--text-dim)] max-w-xs leading-relaxed'>{description}</p>
      )}
      {action && <div className='mt-2'>{action}</div>}
    </div>
  );
};
