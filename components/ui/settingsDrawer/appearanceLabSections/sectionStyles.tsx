import React from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import type { IconComponent } from '../shared';
import type { SectionId } from './types';

export const activeStyle = {
  backgroundColor: 'var(--color-accent-500)',
  color: '#fff',
  boxShadow: 'var(--shadow-sm)',
  transform: 'scale(1.02)',
};

export const inactiveStyle = {
  backgroundColor: 'rgba(255,255,255,0.24)',
  color: 'var(--text-dim)',
  boxShadow: '0 2px 10px rgba(0,0,0,0.02)',
  transform: 'scale(1)',
};

export const valueTone = (value: number, low: number, high: number) => {
  const midpoint = (low + high) / 2;
  if (value < midpoint * 0.92) return 'Compact';
  if (value > midpoint * 1.08) return 'Wide';
  return 'Medium';
};

export const SectionShell = ({
  id,
  icon: Icon,
  title,
  caption,
  open,
  onToggle,
  children,
}: {
  id: SectionId;
  icon: IconComponent;
  title: string;
  caption: string;
  open: boolean;
  onToggle: (id: SectionId) => void;
  children: React.ReactNode;
}) => (
  <section className="rounded-[24px] bg-transparent shadow-[0_2px_10px_rgba(0,0,0,0.02)]">
    <button
      type="button"
      onClick={() => onToggle(id)}
      className="flex w-full items-center justify-between rounded-[24px] px-4 py-4 text-start transition-all duration-200 active:scale-[0.99]"
    >
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white/50 text-[var(--color-accent-500)] shadow-[0_2px_10px_rgba(0,0,0,0.02)]">
          <Icon className="h-4 w-4" />
        </div>
        <div>
          <div className="text-[15px] font-semibold tracking-[0.2px] text-[var(--text-main)]">{title}</div>
          <div className="mt-1 text-[11px] font-medium text-[var(--text-muted)]">{caption}</div>
        </div>
      </div>
      {open ? <ChevronUp className="h-4 w-4 text-[var(--text-muted)]" /> : <ChevronDown className="h-4 w-4 text-[var(--text-muted)]" />}
    </button>
    {open ? <div className="space-y-6 px-4 pb-4 pt-1">{children}</div> : null}
  </section>
);
