import { useCallback } from 'react';

import type { Language } from '../../../types/common';
import type { Person } from '../../../types/person';
import type { KindiConversationCue } from '../logic/kindiConversationOrchestrator';
import { getKindiStrings } from '../logic/kindiLocales';
import { KINDI_LEARNING_FAILURE_REASONS } from '../logic/kindiLearningTaxonomy';
import { canKindiMutateTree, type KindiTreeRole } from '../logic/kindiPermissions';
import type { KindiLearningEventInput } from '../services/kindiLearningService';
import type { KindiMessage, KindiRoutedIntent } from '../types';
import type { useKindiAIFallbackFlow } from './useKindiAIFallbackFlow';
import type { useKindiAIResponseFlow } from './useKindiAIResponseFlow';
import type { useKindiCommandPlanningFlow } from './useKindiCommandPlanningFlow';
import type { useKindiDecisionFlow } from './useKindiDecisionFlow';
import type { useKindiSearchFlow } from './useKindiSearchFlow';

type AddAssistantMessageWithCue = (
  message: Omit<KindiMessage, 'id' | 'role'>,
  cue?: KindiConversationCue
) => void;

type PlanCommand = ReturnType<typeof useKindiCommandPlanningFlow>['planCommand'];
type RunAIFallback = ReturnType<typeof useKindiAIFallbackFlow>['runAIFallback'];
type RespondToPlannedAI = ReturnType<typeof useKindiAIResponseFlow>['respondToPlannedAI'];
type RespondToClassifiedAI = ReturnType<typeof useKindiAIResponseFlow>['respondToClassifiedAI'];
type RequestDisambiguation = ReturnType<typeof useKindiDecisionFlow>['requestDisambiguation'];
type RequestMissingAddName = ReturnType<typeof useKindiDecisionFlow>['requestMissingAddName'];
type LogKindiFailure = ReturnType<typeof useKindiSearchFlow>['logKindiFailure'];

interface UseKindiCommandResponseFlowArgs {
  language: Language;
  currentUserRole?: KindiTreeRole;
  currentTreeId?: string | null;
  peopleList: Person[];
  lastContextPersonId?: string;
  focusId?: string;
  isAIEnabled: boolean;
  planCommand: PlanCommand;
  runAIFallback: RunAIFallback;
  respondToPlannedAI: RespondToPlannedAI;
  respondToClassifiedAI: RespondToClassifiedAI;
  requestDisambiguation: RequestDisambiguation;
  requestMissingAddName: RequestMissingAddName;
  setLastContextPersonId: (personId: string) => void;
  addAssistantMessageWithCue: AddAssistantMessageWithCue;
  logFailure: LogKindiFailure;
  logEvent: (event: KindiLearningEventInput) => void;
}

export const useKindiCommandResponseFlow = ({
  language,
  currentUserRole,
  currentTreeId,
  peopleList,
  lastContextPersonId,
  focusId,
  isAIEnabled,
  planCommand,
  runAIFallback,
  respondToPlannedAI,
  respondToClassifiedAI,
  requestDisambiguation,
  requestMissingAddName,
  setLastContextPersonId,
  addAssistantMessageWithCue,
  logFailure,
  logEvent,
}: UseKindiCommandResponseFlowArgs) => {
  const strings = getKindiStrings(language);

  const respondToCommandIntent = useCallback(async (
    routed: KindiRoutedIntent,
    query: string,
    interactionId: string,
    redactedQuery?: string
  ): Promise<boolean> => {
    if (!canKindiMutateTree(currentUserRole, currentTreeId)) {
      addAssistantMessageWithCue({ text: strings.permissions.readOnly });
      return true;
    }

    const planning = planCommand({
      routed,
      query,
      peopleList,
      lastContextPersonId,
      focusId,
    });
    const aiPlanning = (planning.kind === 'no_plan' || planning.kind === 'not_found') && isAIEnabled
      ? await runAIFallback({
        query,
        peopleList,
        lastContextPersonId,
        focusId,
        interactionId,
        routeKind: routed.kind,
        resultKind: planning.kind,
        failureReason: planning.kind === 'not_found'
          ? KINDI_LEARNING_FAILURE_REASONS.LOCAL_SEARCH_FAILED
          : KINDI_LEARNING_FAILURE_REASONS.PARSER_PATTERN_MISSING,
        redactedQuery,
        requestParserName: 'kindiCommandPlanningFlow',
      })
      : undefined;
    if (aiPlanning) {
      if (respondToPlannedAI(aiPlanning, interactionId)) return true;
      if (respondToClassifiedAI(aiPlanning, interactionId)) return true;
    }

    const effectivePlanning = aiPlanning?.kind === 'planned' ? aiPlanning.planning : planning;
    const effectiveRouted = aiPlanning?.kind === 'planned' ? aiPlanning.routed : routed;
    const learningTrace = aiPlanning?.kind === 'planned' ? aiPlanning.learningTrace : undefined;

    if (effectivePlanning.kind === 'not_found') {
      logFailure(KINDI_LEARNING_FAILURE_REASONS.LOCAL_SEARCH_FAILED, query, {
        route: routed.kind,
        target: effectivePlanning.target,
      }, { interactionId, redactedQuery });
      addAssistantMessageWithCue({ text: effectivePlanning.text });
      return true;
    }

    if (effectivePlanning.kind === 'ambiguous') {
      requestDisambiguation(
        effectiveRouted,
        effectivePlanning.candidates,
        effectivePlanning.resultPeople,
        effectivePlanning.fallbackFocusId,
        effectivePlanning.promptName,
        interactionId
      );
      return true;
    }

    if (effectivePlanning.kind === 'no_plan') {
      addAssistantMessageWithCue({
        text: effectivePlanning.text,
        people: effectivePlanning.people,
      });
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

    if (effectivePlanning.selectedPersonId) {
      setLastContextPersonId(effectivePlanning.selectedPersonId);
    }
    logEvent({
      eventType: 'confirmation_shown',
      interactionId,
      routeKind: effectiveRouted.kind,
      redactedQuery,
      resultKind: effectivePlanning.confirmation.kind,
      confidence: learningTrace?.confidence,
      intentGuess: effectiveRouted.kind,
      parserStage: 'confirmation',
      parserName: 'kindiCommandPlanningFlow',
    });
    addAssistantMessageWithCue({
      text: effectivePlanning.text,
      people: effectivePlanning.people,
      visiblePeopleCount: effectivePlanning.visiblePeopleCount,
      answerMeta: {
        source: learningTrace ? 'cloud-assisted' : 'local-tree',
        kind: 'change',
        interactionId,
      },
      confirmation: learningTrace
        ? { ...effectivePlanning.confirmation, learningTrace, interactionId }
        : { ...effectivePlanning.confirmation, interactionId },
    });
    return true;
  }, [
    addAssistantMessageWithCue,
    currentUserRole,
    currentTreeId,
    focusId,
    isAIEnabled,
    lastContextPersonId,
    logEvent,
    logFailure,
    peopleList,
    planCommand,
    requestDisambiguation,
    requestMissingAddName,
    respondToClassifiedAI,
    respondToPlannedAI,
    runAIFallback,
    setLastContextPersonId,
    strings.permissions.readOnly,
  ]);

  return { respondToCommandIntent };
};
