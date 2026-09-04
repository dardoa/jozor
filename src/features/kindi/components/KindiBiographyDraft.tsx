import { FileText, ShieldCheck } from 'lucide-react';

import type { TranslationSchema } from '../../../utils/translationLoader';
import type { KindiBiographyDraft as KindiBiographyDraftValue } from '../types';

interface KindiBiographyDraftProps {
  draft: KindiBiographyDraftValue;
  text: TranslationSchema['kindi'];
}

export const KindiBiographyDraft = ({ draft, text }: KindiBiographyDraftProps) => (
  <section
    className="mt-3 border-y border-[var(--border-soft)]/70 py-3"
    aria-label={text.biographyDraftHeading}
    data-testid="kindi-biography-draft"
  >
    <div className="flex items-center gap-1.5 text-xs font-black text-[var(--text-main)]">
      <FileText className="h-3.5 w-3.5 text-[var(--primary-600)]" aria-hidden="true" />
      {text.biographyDraftHeading}
    </div>
    <p className="mt-2 text-sm leading-6 text-[var(--text-main)]" data-testid="kindi-biography-draft-text">
      {draft.text}
    </p>
    <h3 className="mt-3 text-[11px] font-black text-[var(--text-muted)]">
      {text.biographyFactsUsed}
    </h3>
    <dl className="mt-1.5 grid gap-x-3 gap-y-1 text-xs sm:grid-cols-2">
      {draft.facts.map((fact) => (
        <div key={fact.label} className="min-w-0">
          <dt className="text-[var(--text-muted)]">{fact.label}</dt>
          <dd className="break-words font-bold text-[var(--text-secondary)]">{fact.value}</dd>
        </div>
      ))}
    </dl>
    <p className="mt-3 flex items-center gap-1.5 text-[11px] font-bold text-[var(--text-muted)]">
      <ShieldCheck className="h-3.5 w-3.5 shrink-0 text-[var(--primary-600)]" aria-hidden="true" />
      {text.biographyNotSaved}
    </p>
  </section>
);
