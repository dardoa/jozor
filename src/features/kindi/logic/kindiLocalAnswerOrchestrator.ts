import type { Language } from '../../../types/common';
import type { Person } from '../../../types/person';
import type { KindiAnswerKind, KindiMessage } from '../types';
import { resolveKindiBiographyDraft } from './kindiBiographyDraftEngine';
import { resolveKindiLocalRelationshipQuery } from './kindiLocalQueryEngine';
import { resolveKindiRecordReview } from './kindiRecordReviewEngine';
import { resolveKindiTreeDiagnosticsQuery } from './kindiTreeDiagnosticsEngine';

type KindiLocalStructuredAnswerKind = Extract<
  KindiAnswerKind,
  'biography' | 'record-review' | 'diagnostic' | 'relationship'
>;

export interface KindiLocalStructuredAnswer {
  kind: KindiLocalStructuredAnswerKind;
  message: Omit<KindiMessage, 'id' | 'role'>;
}

interface ResolveKindiLocalStructuredAnswerArgs {
  query: string;
  people: readonly Person[];
  contextPersonId?: string | null;
  language: Language;
  interactionId: string;
}

const createAnswerMeta = (
  kind: KindiLocalStructuredAnswerKind,
  interactionId: string
): NonNullable<KindiMessage['answerMeta']> => ({
  source: 'local-tree',
  kind,
  interactionId,
  feedbackEnabled: true,
});

export const resolveKindiLocalStructuredAnswer = ({
  query,
  people,
  contextPersonId,
  language,
  interactionId,
}: ResolveKindiLocalStructuredAnswerArgs): KindiLocalStructuredAnswer | null => {
  const biographyResult = resolveKindiBiographyDraft({
    query,
    people,
    contextPersonId,
    language,
  });
  if (biographyResult) {
    return {
      kind: 'biography',
      message: {
        text: biographyResult.text,
        people: biographyResult.people,
        visiblePeopleCount: Math.min(biographyResult.people.length, 6),
        personContexts: biographyResult.personContexts,
        biographyDraft: biographyResult.draft,
        answerMeta: createAnswerMeta('biography', interactionId),
      },
    };
  }

  const recordReviewResult = resolveKindiRecordReview({
    query,
    people,
    contextPersonId,
    language,
  });
  if (recordReviewResult) {
    return {
      kind: 'record-review',
      message: {
        text: recordReviewResult.text,
        people: recordReviewResult.people,
        visiblePeopleCount: Math.min(recordReviewResult.people.length, 6),
        personContexts: recordReviewResult.personContexts,
        recordReview: recordReviewResult.review,
        recordReviewTargetPersonId: recordReviewResult.targetPersonId,
        answerMeta: createAnswerMeta('record-review', interactionId),
      },
    };
  }

  const diagnosticsResult = resolveKindiTreeDiagnosticsQuery({
    query,
    people,
    contextPersonId,
    language,
  });
  if (diagnosticsResult) {
    return {
      kind: 'diagnostic',
      message: {
        text: diagnosticsResult.text,
        people: diagnosticsResult.people,
        visiblePeopleCount: Math.min(diagnosticsResult.people.length, 6),
        diagnosticPersonContexts: diagnosticsResult.personContexts,
        diagnosticSuggestions: diagnosticsResult.suggestions,
        diagnosticSummary: diagnosticsResult.metrics ? {
          scope: diagnosticsResult.scope,
          healthScore: diagnosticsResult.metrics.healthScore,
          completenessScore: diagnosticsResult.metrics.completenessScore,
          citationCoverage: diagnosticsResult.metrics.citationCoverage,
          errorCount: diagnosticsResult.metrics.counts.ERROR,
          warningCount: diagnosticsResult.metrics.counts.WARNING,
          reviewNoteCount: diagnosticsResult.metrics.counts.INFO,
        } : undefined,
        answerMeta: createAnswerMeta('diagnostic', interactionId),
      },
    };
  }

  const relationshipResult = resolveKindiLocalRelationshipQuery({
    query,
    people,
    contextPersonId,
    language,
  });
  if (relationshipResult) {
    return {
      kind: 'relationship',
      message: {
        text: relationshipResult.text,
        people: relationshipResult.people,
        visiblePeopleCount: Math.min(relationshipResult.people.length, 6),
        answerMeta: createAnswerMeta('relationship', interactionId),
      },
    };
  }

  return null;
};
