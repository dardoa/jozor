import React from 'react';

interface FanEmptyStateProps {
  title: string;
  description: string;
}

export const FanEmptyState: React.FC<FanEmptyStateProps> = ({ title, description }) => (
  <foreignObject x="-200" y="-80" width="400" height="160">
    <div className="w-full h-full flex flex-col items-center justify-center gap-3 text-center p-6 rounded-[var(--radius-xl)] bg-[var(--card-bg)] border border-[var(--card-border)] shadow-[var(--shadow-md)]">
      <svg
        className="w-8 h-8 text-[var(--text-dim)]"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22Z" />
        <path d="M12 8V12L14 14" />
      </svg>
      <p className="text-sm font-semibold text-[var(--text-main)]">{title}</p>
      <p className="text-xs text-[var(--text-dim)] leading-relaxed">{description}</p>
    </div>
  </foreignObject>
);

interface TreeEmptyStateProps {
  title: string;
  description: string;
  addMaleLabel: string;
  addFemaleLabel: string;
  footerLabel: string;
  onAddFirstPerson: (gender: 'male' | 'female') => void;
}

export const TreeEmptyState: React.FC<TreeEmptyStateProps> = ({
  title,
  description,
  addMaleLabel,
  addFemaleLabel,
  footerLabel,
  onAddFirstPerson,
}) => (
  <foreignObject x="-250" y="-150" width="500" height="300">
    <div
      style={{ fontFamily: 'var(--font-main, sans-serif)' }}
      className="w-full h-full flex flex-col items-center justify-center gap-5 text-center p-8 rounded-[2.25rem] bg-[var(--theme-bg-elevated)] border border-[var(--card-border)] shadow-[var(--shadow-lg)] backdrop-blur-xl animate-in zoom-in-95 duration-500"
    >
      <div className="w-20 h-20 rounded-3xl bg-[var(--primary-50)] flex items-center justify-center text-[var(--primary-600)] mb-1 shadow-[var(--shadow-sm)]">
        <svg
          className="w-10 h-10"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22Z" />
          <path d="M12 8V16" />
          <path d="M8 12H16" />
        </svg>
      </div>

      <div className="space-y-2">
        <h3 className="text-xl font-bold text-[var(--text-main)]">{title}</h3>
        <p className="text-sm text-[var(--text-dim)] max-w-[300px] leading-relaxed">{description}</p>
      </div>

      <div className="flex gap-4 w-full max-w-[300px]">
        <button
          onClick={() => onAddFirstPerson('male')}
          className="flex-1 px-6 py-3.5 bg-[var(--primary-600)] hover:bg-[var(--primary-700)] text-[var(--primary-text)] rounded-2xl font-semibold text-sm transition-all shadow-[var(--shadow-md)] active:scale-95 flex items-center justify-center gap-2"
        >
          {addMaleLabel}
        </button>
        <button
          onClick={() => onAddFirstPerson('female')}
          className="flex-1 px-6 py-3.5 bg-[var(--theme-surface)] hover:bg-[var(--theme-hover)] text-[var(--text-main)] border border-[var(--border-main)] rounded-2xl font-semibold text-sm transition-all shadow-[var(--shadow-sm)] active:scale-95 flex items-center justify-center gap-2"
        >
          {addFemaleLabel}
        </button>
      </div>

      <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[var(--text-muted)] opacity-60 mt-1">
        {footerLabel}
      </p>
    </div>
  </foreignObject>
);
