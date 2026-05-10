import React from 'react';

interface CardProps {
  children: React.ReactNode;
  title?: string;
  className?: string;
  contentClassName?: string; // For padding inside the content area
  tone?: 'default' | 'subtle' | 'flat';
}

export const Card: React.FC<CardProps> = ({
  children,
  title,
  className = '',
  contentClassName = 'p-4 space-y-3',
  tone = 'default',
}) => {
  if (tone === 'flat') {
    return (
      <div className={`flex flex-col space-y-4 pb-6 border-b border-[var(--border-soft)] last:border-0 ${className}`}>
        {title && (
          <h3 className='text-xs font-bold text-[var(--text-muted)] uppercase'>
            {title}
          </h3>
        )}
        <div className={contentClassName.replace('p-4 ', '')}>{children}</div>
      </div>
    );
  }

  const toneClass = tone === 'subtle' ? 'ds-panel-subtle' : 'ds-panel';

  return (
    <div
      className={`${toneClass} relative overflow-visible shadow-[var(--shadow-sm)] ${className}`}
    >
      {title && (
        <h3 className='absolute top-[-10px] start-4 z-10 bg-[var(--surface-app)] px-2.5 ds-label'>
          {title}
        </h3>
      )}
      <div className={`pt-6 ${contentClassName}`}>{children}</div>
    </div>
  );
};
