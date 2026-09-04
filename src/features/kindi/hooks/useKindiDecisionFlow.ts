import { useCallback, useState } from 'react';

import type { Language } from '../../../types/common';
import type { Person } from '../../../types/person';
import { getFullName } from '../../../utils/familyLogic';
import type { KindiConversationCue } from '../logic/kindiConversationOrchestrator';
import { KINDI_LEARNING_FAILURE_REASONS } from '../logic/kindiLearningTaxonomy';
import { getKindiStrings } from '../logic/kindiLocales';
import { parseKindiProvidedName } from '../logic/kindiExecutivePlanner';
import type { KindiLearningEventInput } from '../services/kindiLearningService';
import type {
  KindiAddPlan,
  KindiConfirmation,
  KindiLearningTrace,
  KindiMessage,
  KindiRoutedIntent,
} from '../types';
import {
  createKindiConfirmation,
  getKindiRelationLabel,
  useKindiCommandPlanningFlow,
} from './useKindiCommandPlanningFlow';

export interface KindiPendingAddNameRequest {
  interactionId?: string;
  routed: KindiRoutedIntent;
  plan: KindiAddPlan;
  relatedPeople: Person[];
  learningTrace?: KindiLearningTrace;
}

type AddAssistantMessage = (message: Omit<KindiMessage, 'id' | 'role'>) => string | void;
type AddAssistantMessageWithCue = (
  message: Omit<KindiMessage, 'id' | 'role'>,
  cue?: KindiConversationCue
) => void;

interface UseKindiDecisionFlowArgs {
  language: Language;
  messages: KindiMessage[];
  peopleList: Person[];
  addAssistantMessage: AddAssistantMessage;
  addAssistantMessageWithCue: AddAssistantMessageWithCue;
  setConfirmationStatus: (
    confirmationId: string,
    status: NonNullable<KindiConfirmation['status']>,
    error?: string
  ) => void;
  setDisambiguationStatus: (
    messageId: string,
    status: NonNullable<NonNullable<KindiMessage['disambiguation']>['status']>
  ) => void;
  setLastContextPersonId: (personId: string) => void;
  logEvent: (event: KindiLearningEventInput) => void;
  getSafeRedactedQuery: (query: string) => string | undefined;
}

const waitForConversationalPacing = () => new Promise((resolve) => window.setTimeout(resolve, 450));

export const useKindiDecisionFlow = ({
  language,
  messages,
  peopleList,
  addAssistantMessage,
  addAssistantMessageWithCue,
  setConfirmationStatus,
  setDisambiguationStatus,
  setLastContextPersonId,
  logEvent,
  getSafeRedactedQuery,
}: UseKindiDecisionFlowArgs) => {
  const [pendingAddNameRequest, setPendingAddNameRequest] = useState<KindiPendingAddNameRequest | null>(null);
  const strings = getKindiStrings(language);
  const { planDisambiguation } = useKindiCommandPlanningFlow(language);

  const clearPendingAddName = useCallback(() => {
    setPendingAddNameRequest(null);
  }, []);

  const requestMissingAddName = useCallback((request: KindiPendingAddNameRequest) => {
    const targetPerson = request.plan.targetPersonId
      ? request.relatedPeople.find((person) => person.id === request.plan.targetPersonId)
      : request.relatedPeople[0];
    const contextPeople = targetPerson ? [targetPerson] : [];

    setPendingAddNameRequest(request);
    addAssistantMessageWithCue({
      text: strings.addName.prompt(
        getKindiRelationLabel(request.plan, language),
        request.plan.targetPersonName
      ),
      people: contextPeople.length > 0 ? contextPeople : undefined,
      visiblePeopleCount: contextPeople.length,
    }, 'flow-add');
  }, [addAssistantMessageWithCue, language, strings.addName]);

  const requestDisambiguation = useCallback((
    routed: KindiRoutedIntent,
    candidates: Person[],
    resultPeople: Person[],
    fallbackFocusId: string | undefined,
    promptName?: string,
    interactionId?: string
  ) => {
    logEvent({
      eventType: 'disambiguation_shown',
      interactionId,
      routeKind: routed.kind,
      failureReason: KINDI_LEARNING_FAILURE_REASONS.NAME_AMBIGUOUS,
      redactedQuery: getSafeRedactedQuery(routed.query),
      intentGuess: routed.kind,
      parserStage: 'disambiguation',
      parserName: 'kindiTargetResolver',
      metadata: {
        candidateCount: candidates.length,
      },
    });

    addAssistantMessageWithCue({
      text: strings.disambiguation.prompt(promptName),
      people: candidates,
      visiblePeopleCount: Math.min(candidates.length, 12),
      disambiguation: {
        interactionId,
        promptName: promptName || strings.disambiguation.defaultPromptName,
        routedIntent: routed,
        resultPeople,
        fallbackFocusId,
        status: 'pending',
      },
    });
  }, [addAssistantMessageWithCue, getSafeRedactedQuery, logEvent, strings.disambiguation]);

  const respondToPendingAddName = useCallback(async (query: string): Promise<boolean> => {
    if (!pendingAddNameRequest) return false;

    await waitForConversationalPacing();

    const name = parseKindiProvidedName(query);
    if (!name?.firstName) {
      const targetPerson = pendingAddNameRequest.plan.targetPersonId
        ? pendingAddNameRequest.relatedPeople.find(
          (person) => person.id === pendingAddNameRequest.plan.targetPersonId
        )
        : pendingAddNameRequest.relatedPeople[0];
      addAssistantMessage({
        text: strings.flow.missingNewPersonName,
        people: targetPerson ? [targetPerson] : undefined,
        visiblePeopleCount: targetPerson ? 1 : 0,
      });
      return true;
    }

    const completedPlan: KindiAddPlan = {
      ...pendingAddNameRequest.plan,
      name,
    };
    setPendingAddNameRequest(null);
    const newPersonName = `${name.firstName}${name.lastName ? ` ${name.lastName}` : ''}`;
    addAssistantMessage({
      text: strings.addName.prepared(
        newPersonName,
        getKindiRelationLabel(completedPlan, language),
        completedPlan.targetPersonName
      ),
      people: pendingAddNameRequest.relatedPeople,
      visiblePeopleCount: Math.min(pendingAddNameRequest.relatedPeople.length, 12),
      confirmation: {
        ...createKindiConfirmation(
          pendingAddNameRequest.routed,
          completedPlan,
          pendingAddNameRequest.relatedPeople,
          language
        ),
        interactionId: pendingAddNameRequest.interactionId,
        learningTrace: pendingAddNameRequest.learningTrace,
      },
    });
    return true;
  }, [addAssistantMessage, language, pendingAddNameRequest, strings.addName, strings.flow.missingNewPersonName]);

  const chooseDisambiguation = useCallback((messageId: string, personId: string) => {
    const message = messages.find((item) => item.id === messageId);
    const disambiguation = message?.disambiguation;
    const selectedPerson = peopleList.find((person) => person.id === personId);
    if (!disambiguation || !selectedPerson) return;
    if (disambiguation.status && disambiguation.status !== 'pending') return;
    setLastContextPersonId(selectedPerson.id);

    setDisambiguationStatus(messageId, 'resolved');
    logEvent({
      eventType: 'disambiguation_resolved',
      interactionId: disambiguation.interactionId,
      routeKind: disambiguation.routedIntent.kind,
      redactedQuery: getSafeRedactedQuery(disambiguation.routedIntent.query),
      intentGuess: disambiguation.routedIntent.kind,
      parserStage: 'disambiguation',
      parserName: 'kindiTargetResolver',
      metadata: {
        candidateCount: disambiguation.resultPeople.length,
      },
    });

    const planning = planDisambiguation({
      disambiguation,
      selectedPerson,
      peopleList,
    });

    if (planning.kind === 'no_plan') {
      addAssistantMessage({ text: planning.text });
      return;
    }

    if (planning.kind === 'needs_add_name') {
      requestMissingAddName({
        routed: planning.routed,
        plan: planning.plan,
        relatedPeople: planning.relatedPeople,
        interactionId: disambiguation.interactionId,
      });
      return;
    }

    if (planning.kind === 'confirmation') {
      if (planning.selectedPersonId) setLastContextPersonId(planning.selectedPersonId);
      logEvent({
        eventType: 'confirmation_shown',
        interactionId: disambiguation.interactionId,
        routeKind: disambiguation.routedIntent.kind,
        redactedQuery: getSafeRedactedQuery(disambiguation.routedIntent.query),
        resultKind: planning.confirmation.kind,
        intentGuess: disambiguation.routedIntent.kind,
        parserStage: 'confirmation',
        parserName: 'kindiCommandPlanningFlow',
      });
      addAssistantMessage({
        text: strings.disambiguation.selected(getFullName(selectedPerson), planning.text),
        people: planning.people,
        visiblePeopleCount: planning.visiblePeopleCount,
        confirmation: { ...planning.confirmation, interactionId: disambiguation.interactionId },
      });
    }
  }, [
    addAssistantMessage,
    getSafeRedactedQuery,
    logEvent,
    messages,
    peopleList,
    planDisambiguation,
    requestMissingAddName,
    setDisambiguationStatus,
    setLastContextPersonId,
    strings.disambiguation,
  ]);

  const cancel = useCallback((confirmation?: KindiConfirmation) => {
    setPendingAddNameRequest(null);
    if (confirmation?.status && confirmation.status !== 'pending') return;

    if (!confirmation) {
      addAssistantMessage({ text: strings.flow.cancelled });
      return;
    }

    setConfirmationStatus(confirmation.id, 'cancelled');
    logEvent({
      eventType: 'confirmation_cancelled',
      interactionId: confirmation.interactionId,
      routeKind: confirmation.kind,
      failureReason: KINDI_LEARNING_FAILURE_REASONS.USER_CANCELLED,
      redactedQuery: confirmation.learningTrace?.redactedQuery,
      confidence: confirmation.learningTrace?.confidence,
      intentGuess: confirmation.kind,
      parserStage: 'confirmation',
      parserName: 'KindiOverlay',
    });
  }, [addAssistantMessage, logEvent, setConfirmationStatus, strings.flow.cancelled]);

  const cancelDisambiguation = useCallback((messageId: string) => {
    const message = messages.find((item) => item.id === messageId);
    if (message?.disambiguation) {
      logEvent({
        eventType: 'disambiguation_cancelled',
        interactionId: message.disambiguation.interactionId,
        routeKind: message.disambiguation.routedIntent.kind,
        failureReason: KINDI_LEARNING_FAILURE_REASONS.USER_CANCELLED,
        redactedQuery: getSafeRedactedQuery(message.disambiguation.routedIntent.query),
        intentGuess: message.disambiguation.routedIntent.kind,
        parserStage: 'disambiguation',
        parserName: 'KindiOverlay',
      });
    }
    setDisambiguationStatus(messageId, 'cancelled');
    setPendingAddNameRequest(null);
    addAssistantMessage({ text: strings.flow.disambiguationCancelled });
  }, [
    addAssistantMessage,
    getSafeRedactedQuery,
    logEvent,
    messages,
    setDisambiguationStatus,
    strings.flow.disambiguationCancelled,
  ]);

  return {
    hasPendingAddName: Boolean(pendingAddNameRequest),
    clearPendingAddName,
    requestMissingAddName,
    requestDisambiguation,
    respondToPendingAddName,
    chooseDisambiguation,
    cancel,
    cancelDisambiguation,
  };
};
