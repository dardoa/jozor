import React from 'react';

interface CardProps {
  children: React.ReactNode;
  title?: string;
  className?: string;
  contentClassName?: string; // For padding inside the content area
}

export const Card: React.FC<CardProps> = ({ children, title, className = '', contentClassName = 'p-3 space-y-2' }) => {
  return (
    <div className={`bg-white dark:bg-stone-800 rounded-xl border border-stone-200/50 dark:border-stone-700/50 shadow-sm relative ${className}`}>
      {title && (
        <h3 className="absolute top-[-12px] start-3 z-10 bg-white dark:bg-stone-800 px-2 text-[9px] font-bold text-stone-400 uppercase tracking-wider">
          {title}
        </h3>
      )}
      <div className={`pt-5 ${contentClassName}`}>
        {children}
      </div>
    </div>
  );
};