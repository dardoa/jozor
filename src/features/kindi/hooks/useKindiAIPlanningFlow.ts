import { useCallback } from 'react';

import type { Person } from '../../../types/person';
import { redactKindiPrompt, restoreKindiDraft, type KindiPromptRedaction } from '../logic/kindiPrivacy';
import { routeKindiIntent } from '../logic/intentRouter';
import { createKindiLearningTrace } from '../logic/kindiLearningTrace';
import type {
  KindiAIClassification,
  KindiAIPlanDraft,
  KindiExecutivePlan,
  KindiLearningTrace,
  KindiRoutedIntent,
} from '../types';
import { type KindiCommandPlanningResult, useKindiCommandPlanningFlow } from './useKindiCommandPlanningFlow';

export interface KindiAIPlannerRequestArgs {
  originalQuery: string;
  redactedText: string;
  redaction: KindiPromptRedaction;
}

export type KindiAIPlannerRequest = (args: KindiAIPlannerRequestArgs) => Promise<KindiAIPlanDraft | KindiAIClassification | null>;

interface UseKindiAIPlanningFlowArgs {
  requestDraft?: KindiAIPlannerRequest;
  minimumConfidence?: number;
}

interface PlanWithAIArgs {
  query: string;
  peopleList: Person[];
  lastContextPersonId?: string;
  focusId?: string;
}

export type KindiAIPlanningResult =
  | {
      kind: 'disabled';
      redaction: KindiPromptRedaction;
    }
  | {
      kind: 'no_draft';
      redaction: KindiPromptRedaction;
    }
  | {
      kind: 'invalid_draft';
      redaction: KindiPromptRedaction;
      draft: KindiAIPlanDraft;
      restoredDraft: KindiAIPlanDraft;
    }
  | {
      kind: 'low_confidence';
      redaction: KindiPromptRedaction;
      draft: KindiAIPlanDraft;
      restoredDraft: KindiAIPlanDraft;
    }
  | {
      kind: 'planned';
      redaction: KindiPromptRedaction;
      draft: KindiAIPlanDraft;
      restoredDraft: KindiAIPlanDraft;
      routed: KindiRoutedIntent;
      syntheticQuery: string;
      planning: KindiCommandPlanningResult;
      learningTrace?: KindiLearningTrace;
    }
  | {
      kind: 'failed';
      redaction: KindiPromptRedaction;
      error: unknown;
    }
  | {
      kind: 'classified';
      redaction: KindiPromptRedaction;
      classification: KindiAIClassification;
      learningTrace?: KindiLearningTrace;
    };

const DEFAULT_AI_CONFIDENCE_FLOOR = 0.55;

const asText = (value: unknown): string | undefined => {
  if (typeof value !== 'string') return undefined;
  const cleaned = value.replace(/\s+/g, ' ').trim();
  return cleaned || undefined;
};

const isClassification = (value: KindiAIPlanDraft | KindiAIClassification): value is KindiAIClassification =>
  'category' in value;

const draftToClassification = (draft: KindiAIPlanDraft): KindiAIClassification => ({
  category: draft.intent === 'QUERY'
    ? 'FAMILY_QUERY'
    : draft.intent === 'UNKNOWN'
      ? 'UNCLEAR'
      : 'EXECUTABLE_COMMAND',
  ...(draft.intent === 'UNKNOWN' || draft.intent === 'QUERY' ? {} : { draft }),
  confidence: draft.confidence,
});

const classificationTraceDraft = (classification: KindiAIClassification): KindiAIPlanDraft => classification.draft ?? {
  intent: 'UNKNOWN',
  missingFields: [`category:${classification.category}`],
  confidence: classification.confidence,
};

const normalizeRelationKeyword = (draft: KindiAIPlanDraft): string => {
  const relation = draft.relation;
  const gender = draft.gender;

  if (relation === 'son' || (relation === 'child' && (gender === 'male' || gender === 'M'))) return 'son';
  if (relation === 'daughter' || (relation === 'child' && (gender === 'female' || gender === 'F'))) return 'daughter';
  if (relation === 'wife' || (relation === 'spouse' && (gender === 'female' || gender === 'F'))) return 'wife';
  if (relation === 'husband' || (relation === 'spouse' && (gender === 'male' || gender === 'M'))) return 'husband';
  if (relation === 'father' || (relation === 'parent' && (gender === 'male' || gender === 'M'))) return 'father';
  if (relation === 'mother' || (relation === 'parent' && (gender === 'female' || gender === 'F'))) return 'mother';

  return 'son';
};

const firstUpdateEntry = (updates: KindiAIPlanDraft['updates']): [string, string] | undefined => {
  if (!updates) return undefined;
  const entry = Object.entries(updates).find(([, value]) => typeof value === 'string');
  if (!entry || typeof entry[1] !== 'string') return undefined;
  const value = asText(entry[1]);
  return value ? [entry[0], value] : undefined;
};

const updateFieldLabel = (field: string): string => {
  if (field === 'birthDate') return 'birth date';
  if (field === 'birthPlace') return 'birth place';
  if (field === 'deathPlace') return 'death place';
  if (field === 'firstName') return 'first name';
  if (field === 'middleName') return 'middle name';
  if (field === 'lastName') return 'last name';
  if (field === 'profession') return 'profession';
  if (field === 'bio') return 'notes';
  return field;
};

export const buildKindiAICommandQuery = (draft: KindiAIPlanDraft): string | undefined => {
  const targetMention = asText(draft.targetMention);
  const newPersonName = asText(draft.newPersonName);

  if (draft.intent === 'ADD') {
    const relation = normalizeRelationKeyword(draft);
    const targetPart = targetMention ? ` for ${targetMention}` : '';
    const namePart = newPersonName ? ` named ${newPersonName}` : '';
    return `add ${relation}${targetPart}${namePart}`.trim();
  }

  if (draft.intent === 'UPDATE') {
    const update = firstUpdateEntry(draft.updates);
    if (!targetMention || !update) return undefined;
    const [field, value] = update;
    return `update ${targetMention} ${updateFieldLabel(field)} to ${value}`;
  }

  if (draft.intent === 'DELETE') {
    if (!targetMention) return undefined;
    return `delete ${targetMention}`;
  }

  if (draft.intent === 'QUERY') {
    return targetMention || newPersonName;
  }

  return undefined;
};

const mergeDraftUpdatesIntoPlan = (
  plan: KindiExecutivePlan,
  draft: KindiAIPlanDraft
): KindiExecutivePlan => {
  if (!draft.updates || Object.keys(draft.updates).length === 0) return plan;

  if (plan.type === 'ADD') {
    return {
      ...plan,
      initialUpdates: {
        ...(plan.initialUpdates ?? {}),
        ...draft.updates,
      },
    };
  }

  if (plan.type === 'UPDATE') {
    return {
      ...plan,
      updates: {
        ...plan.updates,
        ...draft.updates,
      },
    };
  }

  return plan;
};

const preserveDraftUpdatesInPlanning = (
  planning: KindiCommandPlanningResult,
  draft: KindiAIPlanDraft
): KindiCommandPlanningResult => {
  if (!draft.updates || Object.keys(draft.updates).length === 0) return planning;

  if (planning.kind === 'needs_add_name') {
    return {
      ...planning,
      plan: mergeDraftUpdatesIntoPlan(planning.plan, draft) as typeof planning.plan,
    };
  }

  if (planning.kind === 'confirmation') {
    const mergedPlan = mergeDraftUpdatesIntoPlan(planning.confirmation.plan!, draft);
    return {
      ...planning,
      confirmation: {
        ...planning.confirmation,
        plan: mergedPlan,
      },
    };
  }

  return planning;
};

export const useKindiAIPlanningFlow = ({
  requestDraft,
  minimumConfidence = DEFAULT_AI_CONFIDENCE_FLOOR,
}: UseKindiAIPlanningFlowArgs = {}) => {
  const { planCommand } = useKindiCommandPlanningFlow();

  const planWithAI = useCallback(async ({
    query,
    peopleList,
    lastContextPersonId,
    focusId,
  }: PlanWithAIArgs): Promise<KindiAIPlanningResult> => {
    const redaction = redactKindiPrompt(query);

    if (!requestDraft) {
      return { kind: 'disabled', redaction };
    }

    try {
      const aiResponse = await requestDraft({
        originalQuery: query,
        redactedText: redaction.redactedText,
        redaction,
      });

      if (!aiResponse) {
        return { kind: 'no_draft', redaction };
      }

      const classification = isClassification(aiResponse) ? aiResponse : draftToClassification(aiResponse);
      if (classification.category !== 'EXECUTABLE_COMMAND') {
        return {
          kind: 'classified',
          redaction,
          classification,
          learningTrace: createKindiLearningTrace({
            redactedQuery: redaction.redactedText,
            aiDraft: classificationTraceDraft(classification),
          }),
        };
      }

      const draft = classification.draft;
      if (!draft) {
        return { kind: 'invalid_draft', redaction, draft: classificationTraceDraft(classification), restoredDraft: classificationTraceDraft(classification) };
      }

      const restoredDraft = restoreKindiDraft(draft, redaction.entities);
      if (restoredDraft.confidence < minimumConfidence) {
        return { kind: 'low_confidence', redaction, draft, restoredDraft };
      }

      const syntheticQuery = buildKindiAICommandQuery(restoredDraft);
      if (!syntheticQuery) {
        return { kind: 'invalid_draft', redaction, draft, restoredDraft };
      }

      const routed = routeKindiIntent(syntheticQuery);
      const planning = preserveDraftUpdatesInPlanning(planCommand({
        routed,
        query,
        peopleList,
        lastContextPersonId,
        focusId,
      }), restoredDraft);

      return {
        kind: 'planned',
        redaction,
        draft,
        restoredDraft,
        routed,
        syntheticQuery,
        planning,
        learningTrace: createKindiLearningTrace({
          redactedQuery: redaction.redactedText,
          aiDraft: draft,
        }),
      };
    } catch (error) {
      return { kind: 'failed', redaction, error };
    }
  }, [minimumConfidence, planCommand, requestDraft]);

  return { planWithAI };
};
