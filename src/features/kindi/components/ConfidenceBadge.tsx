import { AlertTriangle, CheckCircle2 } from 'lucide-react';

import type { KindiPersonResult } from '../types';

interface ConfidenceBadgeProps {
  matchLevel: KindiPersonResult['matchLevel'];
}

export const ConfidenceBadge = ({ matchLevel }: ConfidenceBadgeProps) => {
  const isStrong = matchLevel === 'strong';
  const Icon = isStrong ? CheckCircle2 : AlertTriangle;

  return (
    <span
      className={`inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-1 text-[10px] font-black leading-none ring-1 ${
        isStrong
          ? 'bg-[var(--color-success-500)]/10 text-[var(--color-success-500)] ring-[var(--color-success-500)]/20'
          : 'bg-[var(--color-warning-500)]/10 text-[var(--color-warning-500)] ring-[var(--color-warning-500)]/25'
      }`}
    >
      <Icon className="h-3 w-3" />
      {isStrong ? 'تطابق قوي' : 'نتيجة قريبة'}
    </span>
  );
};
