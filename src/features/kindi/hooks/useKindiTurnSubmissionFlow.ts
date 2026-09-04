import { useCallback } from 'react';

import type { Language } from '../../../types/common';
import type { KindiConversationCue } from '../logic/kindiConversationOrchestrator';
import { orchestrateKindiConversationTurn } from '../logic/kindiConversationOrchestrator';
import {
  createKindiInteractionId,
  getSafeKindiRedactedQuery,
} from '../logic/kindiInteractionContext';
import { getKindiStrings } from '../logic/kindiLocales';
import type { KindiLearningEventInput } from '../services/kindiLearningService';
import type { KindiMessage } from '../types';
import type { useKindiCommandResponseFlow } from './useKindiCommandResponseFlow';
import type { useKindiDecisionFlow } from './useKindiDecisionFlow';
import type { useKindiMessages } from './useKindiMessages';
import type { useKindiReadResponseFlow } from './useKindiReadResponseFlow';

type KindiMessageActions = ReturnType<typeof useKindiMessages>;
type DecisionFlow = ReturnType<typeof useKindiDecisionFlow>;
type ReadResponseFlow = ReturnType<typeof useKindiReadResponseFlow>;
type CommandResponseFlow = ReturnType<typeof useKindiCommandResponseFlow>;

interface UseKindiTurnSubmissionFlowArgs {
  draft: string;
  language: Language;
  hasPendingDecision: boolean;
  hasPendingAddName: boolean;
  lastConversationCue: KindiConversationCue;
  setDraft: (value: string) => void;
  setIsThinking: (value: boolean) => void;
  addAssistantMessage: (message: Omit<KindiMessage, 'id' | 'role'>) => string | void;
  addUserMessage: KindiMessageActions['addUserMessage'];
  clearConversationCue: KindiMessageActions['clearConversationCue'];
  respondToPendingAddName: DecisionFlow['respondToPendingAddName'];
  respondToConversationFlow: ReadResponseFlow['respondToConversationFlow'];
  respondToQueryIntent: ReadResponseFlow['respondToQueryIntent'];
  respondToUnknownIntent: ReadResponseFlow['respondToUnknownIntent'];
  respondToGreetingIntent: ReadResponseFlow['respondToGreetingIntent'];
  respondToSupportIntent: ReadResponseFlow['respondToSupportIntent'];
  respondToCommandIntent: CommandResponseFlow['respondToCommandIntent'];
  logEvent: (event: KindiLearningEventInput) => void;
}

export const useKindiTurnSubmissionFlow = ({
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
  logEvent,
}: UseKindiTurnSubmissionFlowArgs) => {
  const strings = getKindiStrings(language);

  const submit = useCallback(async (rawQuery?: string) => {
    const query = (rawQuery ?? draft).trim();
    if (!query) return;

    const turn = orchestrateKindiConversationTurn({
      query,
      language,
      hasPendingDecision,
      hasPendingAddName,
      lastConversationCue,
    });

    if (turn.kind === 'pending-decision') {
      addAssistantMessage({ text: strings.flow.pendingDecision });
      return;
    }

    setDraft('');
    addUserMessage(query);
    clearConversationCue();
    setIsThinking(true);

    try {
      const interactionId = createKindiInteractionId();
      const redactedQuery = getSafeKindiRedactedQuery(query);

      if (turn.kind === 'pending-add-name') {
        await respondToPendingAddName(query);
        return;
      }

      const { routed, flowIntent } = turn;
      logEvent({
        eventType: 'query_submitted',
        interactionId,
        routeKind: routed.kind,
        redactedQuery,
        intentGuess: routed.kind,
        parserStage: 'intent_router',
        parserName: 'intentRouter',
      });

      if (await respondToConversationFlow(routed, flowIntent)) return;

      if (routed.kind === 'QUERY') {
        await respondToQueryIntent(query, interactionId, redactedQuery);
        return;
      }

      if (routed.kind === 'UNKNOWN') {
        await respondToUnknownIntent(query, interactionId, redactedQuery);
        return;
      }

      if (routed.kind === 'GREETING') {
        respondToGreetingIntent(query);
        return;
      }

      if (routed.kind === 'SUPPORT') {
        respondToSupportIntent(query, interactionId, redactedQuery);
        return;
      }

      await respondToCommandIntent(routed, query, interactionId, redactedQuery);
    } finally {
      setIsThinking(false);
    }
  }, [
    addAssistantMessage,
    addUserMessage,
    clearConversationCue,
    draft,
    hasPendingAddName,
    hasPendingDecision,
    language,
    lastConversationCue,
    logEvent,
    respondToCommandIntent,
    respondToConversationFlow,
    respondToGreetingIntent,
    respondToPendingAddName,
    respondToQueryIntent,
    respondToSupportIntent,
    respondToUnknownIntent,
    setDraft,
    setIsThinking,
    strings.flow.pendingDecision,
  ]);

  return { submit };
};
