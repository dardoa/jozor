import { useCallback } from 'react';

import type { Language } from '../../../types/common';
import type { Person } from '../../../types/person';
import type { KindiConversationCue } from '../logic/kindiConversationOrchestrator';
import { resolveKindiClassifiedResponse } from '../logic/kindiAIResponseMapper';
import type {
  KindiAddPlan,
  KindiLearningTrace,
  KindiMessage,
  KindiRoutedIntent,
} from '../types';
import type { KindiAIFallbackPlanningResult } from './useKindiAIFallbackFlow';

interface PendingAddNameRequest {
  interactionId?: string;
  routed: KindiRoutedIntent;
  plan: KindiAddPlan;
  relatedPeople: Person[];
  learningTrace?: KindiLearningTrace;
}

type AddAssistantMessageWithCue = (
  message: Omit<KindiMessage, 'id' | 'role'>,
  cue?: KindiConversationCue
) => void;

type RequestDisambiguation = (
  routed: KindiRoutedIntent,
  candidates: Person[],
  resultPeople: Person[],
  fallbackFocusId: string | undefined,
  promptName?: string,
  interactionId?: string
) => void;

interface UseKindiAIResponseFlowArgs {
  language: Language;
  addAssistantMessageWithCue: AddAssistantMessageWithCue;
  requestDisambiguation: RequestDisambiguation;
  requestMissingAddName: (request: PendingAddNameRequest) => void;
  setLastContextPersonId: (personId: string) => void;
  logLearningSuccess: (trace?: KindiLearningTrace) => void;
}

export const useKindiAIResponseFlow = ({
  language,
  addAssistantMessageWithCue,
  requestDisambiguation,
  requestMissingAddName,
  setLastContextPersonId,
  logLearningSuccess,
}: UseKindiAIResponseFlowArgs) => {
  const respondToClassifiedAI = useCallback((
    aiPlanning: KindiAIFallbackPlanningResult,
    interactionId?: string
  ): boolean => {
    if (aiPlanning.kind === 'paywall_intercepted' || aiPlanning.kind === 'cloud_failure_intercepted') {
      return true;
    }
    if (aiPlanning.kind !== 'classified') return false;

    logLearningSuccess(aiPlanning.learningTrace);
    const response = resolveKindiClassifiedResponse({
      classification: aiPlanning.classification,
      language,
      interactionId,
    });
    if (!response) return false;

    addAssistantMessageWithCue(response.message, response.cue);
    return true;
  }, [addAssistantMessageWithCue, language, logLearningSuccess]);

  const respondToPlannedAI = useCallback((
    aiPlanning: KindiAIFallbackPlanningResult,
    interactionId?: string
  ): boolean => {
    if (aiPlanning.kind === 'paywall_intercepted' || aiPlanning.kind === 'cloud_failure_intercepted') {
      return true;
    }
    if (aiPlanning.kind !== 'planned') return false;

    const effectivePlanning = aiPlanning.planning;
    const learningTrace = aiPlanning.learningTrace;

    if (effectivePlanning.kind === 'ambiguous') {
      requestDisambiguation(
        aiPlanning.routed,
        effectivePlanning.candidates,
        effectivePlanning.resultPeople,
        effectivePlanning.fallbackFocusId,
        effectivePlanning.promptName,
        interactionId
      );
      return true;
    }

    if (effectivePlanning.kind === 'needs_add_name') {
      requestMissingAddName({
        routed: effectivePlanning.routed,
        plan: effectivePlanning.plan,
        relatedPeople: effectivePlanning.relatedPeople,
        learningTrace,
        interactionId,
      });
      return true;
    }

    if (effectivePlanning.kind === 'confirmation') {
      if (effectivePlanning.selectedPersonId) {
        setLastContextPersonId(effectivePlanning.selectedPersonId);
      }
      addAssistantMessageWithCue({
        text: effectivePlanning.text,
        people: effectivePlanning.people,
        visiblePeopleCount: effectivePlanning.visiblePeopleCount,
        answerMeta: {
          source: 'cloud-assisted',
          kind: 'change',
          interactionId,
        },
        confirmation: learningTrace
          ? { ...effectivePlanning.confirmation, learningTrace, interactionId }
          : { ...effectivePlanning.confirmation, interactionId },
      });
      return true;
    }

    return false;
  }, [
    addAssistantMessageWithCue,
    requestDisambiguation,
    requestMissingAddName,
    setLastContextPersonId,
  ]);

  return { respondToClassifiedAI, respondToPlannedAI };
};
