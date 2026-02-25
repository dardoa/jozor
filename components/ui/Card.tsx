import React from 'react';

interface CardProps {
  children: React.ReactNode;
  title?: string;
  className?: string;
  contentClassName?: string; // For padding inside the content area
}

export const Card: React.FC<CardProps> = ({
  children,
  title,
  className = '',
  contentClassName = 'p-3 space-y-2',
}) => {
  return (
    <div
      className={`bg-[var(--card-bg)] rounded-xl border border-[var(--card-border)] shadow-sm relative ${className}`}
    >
      {title && (
        <h3 className='absolute top-[-12px] start-3 z-10 bg-[var(--theme-bg)] px-2 text-[9px] font-bold text-[var(--text-dim)] uppercase tracking-wider'>
          {title}
        </h3>
      )}
      <div className={`pt-5 ${contentClassName}`}>{children}</div>
    </div>
  );
};
