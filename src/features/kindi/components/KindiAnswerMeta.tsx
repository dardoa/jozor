import { BookOpen, Cloud, ThumbsDown, ThumbsUp, TreePine } from 'lucide-react';

import type { TranslationSchema } from '../../../utils/translationLoader';
import type {
  KindiAnswerFeedback as KindiAnswerFeedbackValue,
  KindiAnswerMeta as KindiAnswerMetaValue,
} from '../types';

interface KindiAnswerMetaProps {
  messageId: string;
  answer: KindiAnswerMetaValue;
  text: TranslationSchema['kindi'];
  onRate: (messageId: string, feedback: KindiAnswerFeedbackValue) => void;
}

type KindiAnswerHeaderProps = Pick<KindiAnswerMetaProps, 'answer' | 'text'>;

const getSourcePresentation = (
  source: KindiAnswerMetaValue['source'],
  text: TranslationSchema['kindi']
) => {
  if (source === 'help-center') {
    return { Icon: BookOpen, label: text.answerSources.helpCenter };
  }

  if (source === 'cloud-assisted') {
    return { Icon: Cloud, label: text.answerSources.cloudAssisted };
  }

  return { Icon: TreePine, label: text.answerSources.localTree };
};

export const KindiAnswerHeader = ({ answer, text }: KindiAnswerHeaderProps) => {
  const source = getSourcePresentation(answer.source, text);
  const kindLabel = text.answerKinds[answer.kind];

  return (
    <div
      className="mb-2 flex min-w-0 flex-wrap items-center justify-between gap-1.5 text-[11px]"
      data-testid="kindi-answer-meta"
    >
      <span className="font-black text-[var(--text-main)]">{kindLabel}</span>
      <span className="inline-flex items-center gap-1 text-[var(--text-muted)]">
        <source.Icon className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
        {source.label}
      </span>
    </div>
  );
};

export const KindiAnswerFeedback = ({ messageId, answer, text, onRate }: KindiAnswerMetaProps) => {
  if (!answer.feedbackEnabled) return null;

  return (
    <div className="mt-3 flex min-w-0 flex-wrap items-center gap-1.5 border-t border-[var(--border-soft)]/60 pt-2.5">
      {answer.feedback ? (
        <span className="text-[11px] font-bold text-[var(--text-muted)]" role="status">
          {text.answerFeedbackThanks}
        </span>
      ) : (
        <>
          <span className="me-auto text-[11px] text-[var(--text-muted)]">
            {text.answerFeedbackPrompt}
          </span>
          <button
            type="button"
            onClick={() => onRate(messageId, 'helpful')}
            className="rounded-full p-1.5 text-[var(--text-muted)] transition hover:bg-[var(--surface-hover)] hover:text-[var(--primary-600)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary-600)]"
            aria-label={text.answerHelpful}
            title={text.answerHelpful}
          >
            <ThumbsUp className="h-3.5 w-3.5" aria-hidden="true" />
          </button>
          <button
            type="button"
            onClick={() => onRate(messageId, 'not-helpful')}
            className="rounded-full p-1.5 text-[var(--text-muted)] transition hover:bg-[var(--surface-hover)] hover:text-[var(--danger-600)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary-600)]"
            aria-label={text.answerNotHelpful}
            title={text.answerNotHelpful}
          >
            <ThumbsDown className="h-3.5 w-3.5" aria-hidden="true" />
          </button>
        </>
      )}
    </div>
  );
};
