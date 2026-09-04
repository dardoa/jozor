import { BookOpenText, ListChecks, ShieldCheck, SquarePen } from 'lucide-react';

import type { TranslationSchema } from '../../../utils/translationLoader';
import type { KindiRecordReview as KindiRecordReviewValue } from '../types';

interface KindiRecordReviewProps {
  review: KindiRecordReviewValue;
  text: TranslationSchema['kindi'];
  onOpenRecord?: () => void;
}

export const KindiRecordReview = ({ review, text, onOpenRecord }: KindiRecordReviewProps) => (
  <section
    className="mt-3 border-y border-[var(--border-soft)]/70 py-3"
    aria-label={text.recordReviewHeading}
    data-testid="kindi-record-review"
  >
    <h3 className="flex items-center gap-1.5 text-xs font-black text-[var(--text-main)]">
      <BookOpenText className="h-3.5 w-3.5 text-[var(--primary-600)]" aria-hidden="true" />
      {text.recordReviewHeading}
    </h3>
    <div className="mt-2.5 space-y-3">
      {review.sections.map((section) => (
        <section key={section.id} aria-label={section.title}>
          <h4 className="text-[11px] font-black text-[var(--text-muted)]">{section.title}</h4>
          <dl className="mt-1.5 grid gap-x-3 gap-y-1.5 text-xs sm:grid-cols-2">
            {section.items.map((item, index) => (
              <div key={`${section.id}:${item.label}:${index}`} className="min-w-0">
                <dt className="break-words text-[var(--text-muted)]">{item.label}</dt>
                <dd className="break-words font-bold leading-5 text-[var(--text-secondary)]">{item.value}</dd>
              </div>
            ))}
          </dl>
        </section>
      ))}
    </div>
    <p className="mt-3 text-[11px] font-bold text-[var(--text-muted)]">
      {text.recordReviewSourceSummary(
        review.sourceSummary.recordedCount,
        review.sourceSummary.displayedCount
      )}
    </p>
    <section className="mt-3" aria-label={text.recordReviewNextSteps}>
      <h4 className="flex items-center gap-1.5 text-[11px] font-black text-[var(--text-main)]">
        <ListChecks className="h-3.5 w-3.5 text-[var(--primary-600)]" aria-hidden="true" />
        {text.recordReviewNextSteps}
      </h4>
      <ul className="mt-1.5 space-y-1 text-xs leading-5 text-[var(--text-secondary)]">
        {review.reviewNotes.map((note) => (
          <li key={note} className="flex gap-2">
            <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-[var(--primary-600)]" aria-hidden="true" />
            <span>{note}</span>
          </li>
        ))}
      </ul>
    </section>
    <p className="mt-3 flex items-center gap-1.5 text-[11px] font-bold text-[var(--text-muted)]">
      <ShieldCheck className="h-3.5 w-3.5 shrink-0 text-[var(--primary-600)]" aria-hidden="true" />
      {text.recordReviewNotSaved}
    </p>
    {onOpenRecord && (
      <button
        type="button"
        onClick={onOpenRecord}
        className="mt-3 inline-flex min-h-10 items-center gap-2 rounded-lg border border-[var(--primary-600)]/30 px-3 py-2 text-xs font-black text-[var(--primary-700)] transition-colors hover:bg-[var(--primary-600)]/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary-500)] focus-visible:ring-offset-2"
      >
        <SquarePen className="h-4 w-4" aria-hidden="true" />
        {text.recordReviewOpenRecord}
      </button>
    )}
  </section>
);
