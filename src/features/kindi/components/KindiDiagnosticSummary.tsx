import { BookOpenCheck, CheckCheck, HeartPulse } from 'lucide-react';

import type { TranslationSchema } from '../../../utils/translationLoader';
import type { KindiDiagnosticSummary as KindiDiagnosticSummaryValue } from '../types';

interface KindiDiagnosticSummaryProps {
  summary: KindiDiagnosticSummaryValue;
  text: TranslationSchema['kindi'];
}

export const KindiDiagnosticSummary = ({ summary, text }: KindiDiagnosticSummaryProps) => {
  const metrics = [
    { label: text.diagnosticHealth, value: summary.healthScore, Icon: HeartPulse },
    { label: text.diagnosticCompleteness, value: summary.completenessScore, Icon: CheckCheck },
    { label: text.diagnosticSources, value: summary.citationCoverage, Icon: BookOpenCheck },
  ];

  return (
    <div className="mt-3 border-y border-[var(--border-soft)]/70 py-2.5" data-testid="kindi-diagnostic-summary">
      <dl className="grid grid-cols-3 gap-2">
        {metrics.map(({ label, value, Icon }) => (
          <div key={label} className="min-w-0 text-center">
            <dt className="flex items-center justify-center gap-1 text-[10px] font-bold text-[var(--text-muted)]">
              <Icon className="h-3 w-3 shrink-0" aria-hidden="true" />
              <span className="truncate">{label}</span>
            </dt>
            <dd className="mt-0.5 text-sm font-black tabular-nums text-[var(--text-main)]">
              {value === null ? text.diagnosticNotApplicable : `${value}%`}
            </dd>
          </div>
        ))}
      </dl>
      <p className="mt-2 text-center text-[11px] font-bold text-[var(--text-secondary)]">
        {text.diagnosticIssueCounts(summary.errorCount, summary.warningCount, summary.reviewNoteCount)}
      </p>
    </div>
  );
};
