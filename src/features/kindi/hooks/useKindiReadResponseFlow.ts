import { useCallback } from 'react';

import type { Language } from '../../../types/common';
import type { Person } from '../../../types/person';
import { getFullName } from '../../../utils/familyLogic';
import { matchKindiGuideTopic } from '../logic/guideMatcher';
import { hasKindiAIFallbackIntentSignal } from '../logic/kindiCommandLexicon';
import type {
  KindiConversationCue,
  KindiConversationTurn,
} from '../logic/kindiConversationOrchestrator';
import { getKindiStrings } from '../logic/kindiLocales';
import { resolveKindiLocalStructuredAnswer } from '../logic/kindiLocalAnswerOrchestrator';
import { KINDI_LEARNING_FAILURE_REASONS } from '../logic/kindiLearningTaxonomy';
import type { KindiLearningEventInput } from '../services/kindiLearningService';
import type { KindiMessage, KindiRoutedIntent } from '../types';
import type { useKindiAIFallbackFlow } from './useKindiAIFallbackFlow';
import type { useKindiAIResponseFlow } from './useKindiAIResponseFlow';
import type { useKindiSearchFlow } from './useKindiSearchFlow';

type AddAssistantMessageWithCue = (
  message: Omit<KindiMessage, 'id' | 'role'>,
  cue?: KindiConversationCue
) => void;

type KindiFlowIntent = Extract<KindiConversationTurn, { kind: 'routed' }>['flowIntent'];
type RunSearchFlow = ReturnType<typeof useKindiSearchFlow>['runSearchFlow'];
type RunAIFallback = ReturnType<typeof useKindiAIFallbackFlow>['runAIFallback'];
type RespondToPlannedAI = ReturnType<typeof useKindiAIResponseFlow>['respondToPlannedAI'];
type RespondToClassifiedAI = ReturnType<typeof useKindiAIResponseFlow>['respondToClassifiedAI'];
type LogKindiFailure = ReturnType<typeof useKindiSearchFlow>['logKindiFailure'];

interface UseKindiReadResponseFlowArgs {
  language: Language;
  peopleList: Person[];
  lastContextPersonId?: string;
  focusId?: string;
  isAIEnabled: boolean;
  addAssistantMessageWithCue: AddAssistantMessageWithCue;
  runSearchFlow: RunSearchFlow;
  runAIFallback: RunAIFallback;
  respondToPlannedAI: RespondToPlannedAI;
  respondToClassifiedAI: RespondToClassifiedAI;
  logFailure: LogKindiFailure;
  logEvent: (event: KindiLearningEventInput) => void;
  logDebug?: (message: string, metadata?: Record<string, unknown>) => void;
}

const sleep = (ms: number) => new Promise((resolve) => window.setTimeout(resolve, ms));
const pickRandom = (items: readonly string[]) => items[Math.floor(Math.random() * items.length)];
const KINDI_WELLBEING_PATTERN = /كيف حالك|شلونك|اخبارك|أخبارك|اخباركم|أخباركم|عساك بخير|how are you/i;

export const useKindiReadResponseFlow = ({
  language,
  peopleList,
  lastContextPersonId,
  focusId,
  isAIEnabled,
  addAssistantMessageWithCue,
  runSearchFlow,
  runAIFallback,
  respondToPlannedAI,
  respondToClassifiedAI,
  logFailure,
  logEvent,
  logDebug,
}: UseKindiReadResponseFlowArgs) => {
  const strings = getKindiStrings(language);

  const respondToConversationFlow = useCallback(async (
    routed: KindiRoutedIntent,
    flowIntent?: KindiFlowIntent
  ): Promise<boolean> => {
    if (flowIntent === 'search' && routed.kind === 'QUERY') {
      await sleep(450);
      addAssistantMessageWithCue({ text: strings.flow.searchPrompt }, 'flow-search');
      return true;
    }

    if (flowIntent === 'add' && routed.kind === 'QUERY') {
      await sleep(450);
      addAssistantMessageWithCue({ text: strings.flow.addPrompt }, 'flow-add');
      return true;
    }

    return false;
  }, [addAssistantMessageWithCue, strings.flow.addPrompt, strings.flow.searchPrompt]);

  const respondToQueryIntent = useCallback(async (
    query: string,
    interactionId: string,
    redactedQuery?: string
  ): Promise<boolean> => {
    const localStructuredAnswer = resolveKindiLocalStructuredAnswer({
      query,
      people: peopleList,
      contextPersonId: lastContextPersonId ?? focusId,
      language,
      interactionId,
    });
    if (localStructuredAnswer) {
      addAssistantMessageWithCue(localStructuredAnswer.message);
      return true;
    }

    const searchFlow = await runSearchFlow(query, { interactionId, redactedQuery });
    if (searchFlow.kind === 'not_found' || searchFlow.kind === 'low_confidence') {
      if (!isAIEnabled) {
        logDebug?.('fallback skipped: VITE_KINDI_AI_ENABLED is not true', {
          searchKind: searchFlow.kind,
        });
      } else {
        const aiPlanning = await runAIFallback({
          query,
          peopleList,
          lastContextPersonId,
          focusId,
          interactionId,
          routeKind: 'QUERY',
          resultKind: searchFlow.kind,
          redactedQuery,
          requestParserName: 'kindiAIPlanningFlow',
          debugSearchKind: searchFlow.kind,
        });

        if (respondToPlannedAI(aiPlanning, interactionId)) return true;
        if (respondToClassifiedAI(aiPlanning, interactionId)) return true;
      }
    }

    addAssistantMessageWithCue({
      text: searchFlow.text,
      peopleResults: 'peopleResults' in searchFlow ? searchFlow.peopleResults : undefined,
      visiblePeopleCount: 'visiblePeopleCount' in searchFlow ? searchFlow.visiblePeopleCount : undefined,
      answerMeta: {
        source: 'local-tree',
        kind: 'search',
        interactionId,
        feedbackEnabled: true,
      },
    });
    return true;
  }, [
    addAssistantMessageWithCue,
    focusId,
    isAIEnabled,
    language,
    lastContextPersonId,
    logDebug,
    peopleList,
    respondToClassifiedAI,
    respondToPlannedAI,
    runAIFallback,
    runSearchFlow,
  ]);

  const respondToSupportIntent = useCallback((
    query: string,
    interactionId: string,
    redactedQuery?: string
  ): boolean => {
    const guideMatch = matchKindiGuideTopic(query, language);
    logEvent({
      eventType: guideMatch ? 'support_local_answered' : 'support_unanswered',
      interactionId,
      routeKind: 'SUPPORT',
      failureReason: guideMatch
        ? undefined
        : KINDI_LEARNING_FAILURE_REASONS.SUPPORT_TOPIC_MISSING,
      redactedQuery,
      intentGuess: 'SUPPORT',
      parserStage: 'support_guide',
      parserName: 'guideMatcher',
    });

    if (guideMatch) {
      addAssistantMessageWithCue({
        text: guideMatch.topic.answer,
        helpTopicId: guideMatch.topic.helpTopicId,
        answerMeta: {
          source: 'help-center',
          kind: 'guide',
          interactionId,
          topicId: guideMatch.topic.helpTopicId,
          feedbackEnabled: true,
        },
      }, 'greeting');
      return true;
    }

    const contextPerson = lastContextPersonId
      ? peopleList.find((person) => person.id === lastContextPersonId)
      : undefined;
    addAssistantMessageWithCue({
      text: contextPerson
        ? strings.support.withContext(getFullName(contextPerson))
        : strings.support.generic,
      people: contextPerson ? [contextPerson] : undefined,
      visiblePeopleCount: contextPerson ? 1 : 0,
      answerMeta: {
        source: 'help-center',
        kind: 'guide',
        interactionId,
        feedbackEnabled: true,
      },
    }, 'greeting');
    return true;
  }, [
    addAssistantMessageWithCue,
    language,
    lastContextPersonId,
    logEvent,
    peopleList,
    strings.support,
  ]);

  const respondToUnknownIntent = useCallback(async (
    query: string,
    interactionId: string,
    redactedQuery?: string
  ): Promise<boolean> => {
    logFailure(KINDI_LEARNING_FAILURE_REASONS.PARSER_PATTERN_MISSING, query, {
      route: 'UNKNOWN',
    }, { interactionId, redactedQuery });

    if (isAIEnabled && hasKindiAIFallbackIntentSignal(query)) {
      const aiPlanning = await runAIFallback({
        query,
        peopleList,
        lastContextPersonId,
        focusId,
        interactionId,
        routeKind: 'UNKNOWN',
        resultKind: 'unknown_with_intent_signal',
        failureReason: KINDI_LEARNING_FAILURE_REASONS.PARSER_PATTERN_MISSING,
        redactedQuery,
        requestParserName: 'kindiAIPlanningFlow',
        debugSearchKind: 'unknown_with_intent_signal',
      });

      if (respondToPlannedAI(aiPlanning, interactionId)) return true;
      if (respondToClassifiedAI(aiPlanning, interactionId)) return true;
    }

    addAssistantMessageWithCue({ text: pickRandom(strings.outOfScope) });
    return true;
  }, [
    addAssistantMessageWithCue,
    focusId,
    isAIEnabled,
    lastContextPersonId,
    logFailure,
    peopleList,
    respondToClassifiedAI,
    respondToPlannedAI,
    runAIFallback,
    strings.outOfScope,
  ]);

  const respondToGreetingIntent = useCallback((query: string): boolean => {
    addAssistantMessageWithCue({
      text: pickRandom(KINDI_WELLBEING_PATTERN.test(query)
        ? strings.greetings.wellbeing
        : strings.greetings.welcome),
    }, 'greeting');
    return true;
  }, [addAssistantMessageWithCue, strings.greetings]);

  return {
    respondToConversationFlow,
    respondToQueryIntent,
    respondToSupportIntent,
    respondToUnknownIntent,
    respondToGreetingIntent,
  };
};
