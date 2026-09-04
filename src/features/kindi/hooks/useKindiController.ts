import { useCallback, useEffect, useMemo, useState } from 'react';

import { searchService } from '../../../services/searchService';
import { useAppStore } from '../../../store/useAppStore';
import type { Person } from '../../../types/person';
import { getSafeKindiRedactedQuery } from '../logic/kindiInteractionContext';
import type {
  KindiLearningTrace,
} from '../types';
import { useKindiCommandPlanningFlow } from './useKindiCommandPlanningFlow';
import { useKindiExecutionFlow } from './useKindiExecutionFlow';
import { useKindiAIFallbackFlow } from './useKindiAIFallbackFlow';
import { useKindiAIResponseFlow } from './useKindiAIResponseFlow';
import { useKindiDecisionFlow } from './useKindiDecisionFlow';
import { useKindiMessages } from './useKindiMessages';
import { useKindiSearchFlow } from './useKindiSearchFlow';
import { useKindiMessageActions } from './useKindiMessageActions';
import { useKindiReadResponseFlow } from './useKindiReadResponseFlow';
import { useKindiCommandResponseFlow } from './useKindiCommandResponseFlow';
import { useKindiTurnSubmissionFlow } from './useKindiTurnSubmissionFlow';
import { useKindiCloudPlanningGateway } from './useKindiCloudPlanningGateway';

interface UseKindiControllerArgs {
  people: Record<string, Person>;
  onFocusPerson: (id: string) => void;
}

const IS_KINDI_AI_ENABLED = import.meta.env.VITE_KINDI_AI_ENABLED === 'true';
const logKindiAIDebug = (message: string, metadata?: Record<string, unknown>) => {
  if (import.meta.env.DEV) {
    console.info(`[Kindi AI] ${message}`, metadata ?? {});
  }
};

const logKindiLearningEvent = (
  event: import('../services/kindiLearningService').KindiLearningEventInput
): void => {
  void import('../services/kindiLearningService').then(({ logKindiLearningEvent: logEvent }) => {
    logEvent(event);
  });
};

const logKindiLearningSuccess = (trace?: KindiLearningTrace): void => {
  if (!trace) return;
  void import('../services/kindiLearningService').then(({ logKindiSuccess }) => {
    logKindiSuccess(trace);
  });
};

export const useKindiController = ({ people, onFocusPerson }: UseKindiControllerArgs) => {
  const [isOpen, setIsOpen] = useState(false);
  const [draft, setDraft] = useState('');
  const [isThinking, setIsThinking] = useState(false);
  const [lastContextPersonId, setLastContextPersonId] = useState<string | undefined>(undefined);
  const setSearchTarget = useAppStore((state) => state.setSearchTarget);
  const triggerPulse = useAppStore((state) => state.triggerPulse);
  const currentUserRole = useAppStore((state) => state.currentUserRole);
  const currentTreeId = useAppStore((state) => state.currentTreeId);
  const focusId = useAppStore((state) => state.focusId);
  const language = useAppStore((state) => state.language);

  const peopleList = useMemo(() => Object.values(people || {}), [people]);
  const {
    messages,
    lastConversationCue,
    hasPendingDecision,
    addAssistantMessage,
    addAssistantMessageWithCue,
    addUserMessage,
    clearConversationCue,
    resetConversation: resetMessages,
    setConfirmationStatus: setMessageConfirmationStatus,
    setDisambiguationStatus,
    setUndoActionStatus,
    setAnswerFeedback,
    showMorePeople,
  } = useKindiMessages(language);
  const { runSearchFlow, logKindiFailure } = useKindiSearchFlow(language);
  const { planCommand } = useKindiCommandPlanningFlow(language);
  const subscriptionTier = useAppStore((state) => state.subscriptionTier);
  const setAiCloudQuotaRemaining = useAppStore((state) => state.setAiCloudQuotaRemaining);
  const { planWithAI } = useKindiCloudPlanningGateway({
    enabled: IS_KINDI_AI_ENABLED,
    language,
    subscriptionTier,
    setAiCloudQuotaRemaining,
    addAssistantMessage,
  });
  const { runAIFallback } = useKindiAIFallbackFlow({
    planWithAI,
    logEvent: logKindiLearningEvent,
    logDebug: logKindiAIDebug,
  });
  const { confirm } = useKindiExecutionFlow({
    currentUserRole,
    currentTreeId,
    language,
    addAssistantMessage,
    setConfirmationStatus: setMessageConfirmationStatus,
  });
  const {
    hasPendingAddName,
    clearPendingAddName,
    requestMissingAddName,
    requestDisambiguation,
    respondToPendingAddName,
    chooseDisambiguation,
    cancel,
    cancelDisambiguation,
  } = useKindiDecisionFlow({
    language,
    messages,
    peopleList,
    addAssistantMessage,
    addAssistantMessageWithCue,
    setConfirmationStatus: setMessageConfirmationStatus,
    setDisambiguationStatus,
    setLastContextPersonId,
    logEvent: logKindiLearningEvent,
    getSafeRedactedQuery: getSafeKindiRedactedQuery,
  });
  const { respondToClassifiedAI, respondToPlannedAI } = useKindiAIResponseFlow({
    language,
    addAssistantMessageWithCue,
    requestDisambiguation,
    requestMissingAddName,
    setLastContextPersonId,
    logLearningSuccess: logKindiLearningSuccess,
  });

  useEffect(() => {
    let active = true;
    const timer = setTimeout(() => {
      if (active) {
        void searchService.updateSearchIndex(peopleList);
      }
    }, 150);

    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [peopleList]);

  const focusPerson = useCallback((personId: string) => {
    setLastContextPersonId(personId);
    onFocusPerson(personId);
    setSearchTarget(personId);
    triggerPulse(personId);
    setIsOpen(false);
  }, [onFocusPerson, setSearchTarget, triggerPulse]);

  const currentContextPerson = useMemo(
    () => people[lastContextPersonId ?? focusId],
    [focusId, lastContextPersonId, people]
  );

  const {
    startNewConversation,
    undoKindiChange,
    rateKindiAnswer,
  } = useKindiMessageActions({
    language,
    messages,
    hasPendingDecision,
    isThinking,
    setDraft,
    clearPendingAddName,
    setLastContextPersonId,
    resetConversation: resetMessages,
    addAssistantMessage,
    setUndoActionStatus,
    setAnswerFeedback,
  });

  const {
    respondToConversationFlow,
    respondToQueryIntent,
    respondToSupportIntent,
    respondToUnknownIntent,
    respondToGreetingIntent,
  } = useKindiReadResponseFlow({
    language,
    peopleList,
    lastContextPersonId,
    focusId,
    isAIEnabled: IS_KINDI_AI_ENABLED,
    addAssistantMessageWithCue,
    runSearchFlow,
    runAIFallback,
    respondToPlannedAI,
    respondToClassifiedAI,
    logFailure: logKindiFailure,
    logEvent: logKindiLearningEvent,
    logDebug: logKindiAIDebug,
  });

  const { respondToCommandIntent } = useKindiCommandResponseFlow({
    language,
    currentUserRole,
    currentTreeId,
    peopleList,
    lastContextPersonId,
    focusId,
    isAIEnabled: IS_KINDI_AI_ENABLED,
    planCommand,
    runAIFallback,
    respondToPlannedAI,
    respondToClassifiedAI,
    requestDisambiguation,
    requestMissingAddName,
    setLastContextPersonId,
    addAssistantMessageWithCue,
    logFailure: logKindiFailure,
    logEvent: logKindiLearningEvent,
  });

  const { submit } = useKindiTurnSubmissionFlow({
    draft,
    language,
    hasPendingDecision,
    hasPendingAddName,
    lastConversationCue,
    setDraft,
    setIsThinking,
    addAssistantMessage,
    addUserMessage,
    clearConversationCue,
    respondToPendingAddName,
    respondToConversationFlow,
    respondToQueryIntent,
    respondToUnknownIntent,
    respondToGreetingIntent,
    respondToSupportIntent,
    respondToCommandIntent,
    logEvent: logKindiLearningEvent,
  });

  return {
    isOpen,
    setIsOpen,
    draft,
    setDraft,
    messages,
    isThinking,
    submit,
    focusPerson,
    confirm,
    cancel,
    cancelDisambiguation,
    showMorePeople,
    chooseDisambiguation,
    hasPendingDecision,
    currentContextPerson,
    startNewConversation,
    undoKindiChange,
    rateKindiAnswer,
  };
};
