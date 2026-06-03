import { useCallback, useEffect, useMemo, useState } from 'react';

import { searchService } from '../../../services/searchService';
import { useAppStore } from '../../../store/useAppStore';
import type { Person } from '../../../types';
import { getFullName } from '../../../utils/familyLogic';
import { getConversationFlowIntent, hasKindiAIFallbackIntentSignal } from '../logic/kindiCommandLexicon';
import { getKindiGuideAnswer } from '../logic/guideMatcher';
import { KINDI_STRINGS } from '../logic/kindiLocales';
import { redactKindiPrompt } from '../logic/kindiPrivacy';
import { routeKindiIntent } from '../logic/intentRouter';
import { parseKindiProvidedName } from '../logic/kindiExecutivePlanner';
import type { KindiAddPlan, KindiConfirmation, KindiLearningTrace, KindiRoutedIntent } from '../types';
import {
  createKindiConfirmation,
  getKindiRelationLabel,
  useKindiCommandPlanningFlow,
} from './useKindiCommandPlanningFlow';
import { type KindiAIPlannerRequest, useKindiAIPlanningFlow } from './useKindiAIPlanningFlow';
import { useKindiExecutionFlow } from './useKindiExecutionFlow';
import { useKindiMessages } from './useKindiMessages';
import { useKindiSearchFlow } from './useKindiSearchFlow';
import { KINDI_LEARNING_FAILURE_REASONS } from '../logic/kindiLearningTaxonomy';

interface UseKindiControllerArgs {
  people: Record<string, Person>;
  onFocusPerson: (id: string) => void;
}

interface PendingAddNameRequest {
  interactionId?: string;
  routed: KindiRoutedIntent;
  plan: KindiAddPlan;
  relatedPeople: Person[];
  learningTrace?: KindiLearningTrace;
}

const sleep = (ms: number) => new Promise((resolve) => window.setTimeout(resolve, ms));

const pickRandom = (items: readonly string[]) => items[Math.floor(Math.random() * items.length)];
const IS_KINDI_AI_ENABLED = import.meta.env.VITE_KINDI_AI_ENABLED === 'true';
let fallbackInteractionIdCounter = 0;
const logKindiAIDebug = (message: string, metadata?: Record<string, unknown>) => {
  if (import.meta.env.DEV) {
    console.info(`[Kindi AI] ${message}`, metadata ?? {});
  }
};

const getSafeRedactedQuery = (query: string): string | undefined => {
  const redaction = redactKindiPrompt(query);
  return /\[NAME_\d+\]/.test(redaction.redactedText) ? redaction.redactedText : undefined;
};

const createKindiInteractionId = (): string => {
  const browserCrypto = globalThis.crypto;
  if (browserCrypto?.randomUUID) {
    return browserCrypto.randomUUID();
  }

  const bytes = new Uint8Array(16);
  if (browserCrypto?.getRandomValues) {
    browserCrypto.getRandomValues(bytes);
  } else {
    fallbackInteractionIdCounter += 1;
    return `kindi:${Date.now()}:${fallbackInteractionIdCounter}`;
  }

  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
};

const logKindiLearningEvent = (
  event: import('../services/kindiLearningService').KindiLearningEventInput
): void => {
  void import('../services/kindiLearningService').then(({ logKindiLearningEvent: logEvent }) => {
    logEvent(event);
  });
};

const pickGreetingReply = (query: string) =>
  pickRandom(KINDI_STRINGS.greetings.wellbeingPattern.test(query)
    ? KINDI_STRINGS.greetings.wellbeing
    : KINDI_STRINGS.greetings.welcome);

export const useKindiController = ({ people, onFocusPerson }: UseKindiControllerArgs) => {
  const [isOpen, setIsOpen] = useState(false);
  const [draft, setDraft] = useState('');
  const [isThinking, setIsThinking] = useState(false);
  const [pendingAddNameRequest, setPendingAddNameRequest] = useState<PendingAddNameRequest | null>(null);
  const [lastContextPersonId, setLastContextPersonId] = useState<string | undefined>(undefined);
  const setSearchTarget = useAppStore((state) => state.setSearchTarget);
  const triggerPulse = useAppStore((state) => state.triggerPulse);
  const currentUserRole = useAppStore((state) => state.currentUserRole);
  const focusId = useAppStore((state) => state.focusId);

  const peopleList = useMemo(() => Object.values(people || {}), [people]);
  const {
    messages,
    lastConversationCue,
    hasPendingDecision,
    addAssistantMessage,
    addAssistantMessageWithCue,
    addUserMessage,
    clearConversationCue,
    setConfirmationStatus: setMessageConfirmationStatus,
    setDisambiguationStatus,
    showMorePeople,
  } = useKindiMessages();
  const { runSearchFlow, logKindiFailure } = useKindiSearchFlow();
  const { planCommand, planDisambiguation } = useKindiCommandPlanningFlow();
  const kindiAIRequestDraft = useMemo<KindiAIPlannerRequest | undefined>(() => {
    if (!IS_KINDI_AI_ENABLED) return undefined;
    return async ({ redactedText }) => {
      const { requestKindiClassification } = await import('../services/kindiAIService');
      return requestKindiClassification(redactedText);
    };
  }, []);
  const { planWithAI: planWithAIRaw } = useKindiAIPlanningFlow({
    requestDraft: kindiAIRequestDraft,
  });

  const subscriptionTier = useAppStore((state) => state.subscriptionTier);
  const aiCloudQuotaRemaining = useAppStore((state) => state.aiCloudQuotaRemaining);
  const setAiCloudQuotaRemaining = useAppStore((state) => state.setAiCloudQuotaRemaining);
  const language = useAppStore((state) => state.language);

  const planWithAI = useCallback(
    async (args: Parameters<typeof planWithAIRaw>[0]): Promise<
      Awaited<ReturnType<typeof planWithAIRaw>> | { kind: 'paywall_intercepted' }
    > => {
      if (subscriptionTier === 'free') {
        const lang = language === 'en' ? 'en' : 'ar';
        addAssistantMessage({
          text: KINDI_STRINGS.billing.freePaywall[lang],
        });
        window.dispatchEvent(new CustomEvent('open-paywall'));
        return { kind: 'paywall_intercepted' };
      }

      if (subscriptionTier === 'pro') {
        if (aiCloudQuotaRemaining <= 0) {
          const lang = language === 'en' ? 'en' : 'ar';
          addAssistantMessage({
            text: KINDI_STRINGS.billing.quotaExhausted[lang],
          });
          window.dispatchEvent(new CustomEvent('open-paywall'));
          return { kind: 'paywall_intercepted' };
        }
      }

      const result = await planWithAIRaw(args);

      if (
        subscriptionTier === 'pro' &&
        (result.kind === 'planned' || result.kind === 'classified')
      ) {
        setAiCloudQuotaRemaining(Math.max(0, aiCloudQuotaRemaining - 1));
      }

      return result;
    },
    [
      planWithAIRaw,
      subscriptionTier,
      aiCloudQuotaRemaining,
      setAiCloudQuotaRemaining,
      language,
      addAssistantMessage,
    ]
  );
  const { confirm } = useKindiExecutionFlow({
    currentUserRole,
    addAssistantMessage,
    setConfirmationStatus: setMessageConfirmationStatus,
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

  const requestMissingAddName = useCallback((request: PendingAddNameRequest) => {
    const targetPerson = request.plan.targetPersonId
      ? request.relatedPeople.find((person) => person.id === request.plan.targetPersonId)
      : request.relatedPeople[0];
    const contextPeople = targetPerson ? [targetPerson] : [];

    setPendingAddNameRequest(request);
    addAssistantMessageWithCue({
      text: KINDI_STRINGS.addName.prompt(
        getKindiRelationLabel(request.plan),
        request.plan.targetPersonName
      ),
      people: contextPeople.length > 0 ? contextPeople : undefined,
      visiblePeopleCount: contextPeople.length,
    }, 'flow-add');
  }, [addAssistantMessageWithCue]);

  const requestDisambiguation = useCallback((
    routed: KindiRoutedIntent,
    candidates: Person[],
    resultPeople: Person[],
    fallbackFocusId: string | undefined,
    promptName?: string,
    interactionId?: string
  ) => {
    logKindiLearningEvent({
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
        promptName,
      },
    });

    addAssistantMessageWithCue({
      text: KINDI_STRINGS.disambiguation.prompt(promptName),
      people: candidates,
      visiblePeopleCount: Math.min(candidates.length, 12),
      disambiguation: {
        interactionId,
        promptName: promptName || KINDI_STRINGS.disambiguation.defaultPromptName,
        routedIntent: routed,
        resultPeople,
        fallbackFocusId,
        status: 'pending',
      },
    });
  }, [addAssistantMessageWithCue]);

  const respondToClassifiedAI = useCallback((aiPlanning: Awaited<ReturnType<typeof planWithAI>>): boolean => {
    if (aiPlanning.kind === 'paywall_intercepted') return true;
    if (aiPlanning.kind !== 'classified') return false;

    if (aiPlanning.learningTrace) {
      void import('../services/kindiLearningService').then(({ logKindiSuccess }) => {
        logKindiSuccess(aiPlanning.learningTrace);
      });
    }

    const { category, clarifyingQuestion } = aiPlanning.classification;
    if (category === 'GREETING') {
      addAssistantMessageWithCue({ text: pickGreetingReply('مرحبا') }, 'greeting');
      return true;
    }

    if (category === 'SUPPORT' || category === 'FAMILY_QUERY' || category === 'UNCLEAR') {
      addAssistantMessageWithCue({
        text: clarifyingQuestion || KINDI_STRINGS.support.generic,
      }, category === 'SUPPORT' ? 'greeting' : undefined);
      return true;
    }

    if (category === 'IRRELEVANT') {
      addAssistantMessageWithCue({
        text: pickRandom(KINDI_STRINGS.outOfScope),
      });
      return true;
    }

    return false;
  }, [addAssistantMessageWithCue, planWithAI]);

  const respondToPlannedAI = useCallback((
    aiPlanning: Awaited<ReturnType<typeof planWithAI>>,
    interactionId?: string
  ): boolean => {
    if (aiPlanning.kind === 'paywall_intercepted') return true;
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
        confirmation: learningTrace
          ? { ...effectivePlanning.confirmation, learningTrace, interactionId }
          : { ...effectivePlanning.confirmation, interactionId },
      });
      return true;
    }

    return false;
  }, [addAssistantMessageWithCue, planWithAI, requestDisambiguation, requestMissingAddName]);

  const respondToPendingAddName = useCallback(async (query: string): Promise<boolean> => {
    if (!pendingAddNameRequest) return false;

    await sleep(450);

    const name = parseKindiProvidedName(query);
    if (!name?.firstName) {
      const targetPerson = pendingAddNameRequest.plan.targetPersonId
        ? pendingAddNameRequest.relatedPeople.find((person) => person.id === pendingAddNameRequest.plan.targetPersonId)
        : pendingAddNameRequest.relatedPeople[0];
      addAssistantMessage({
        text: KINDI_STRINGS.flow.missingNewPersonName,
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
      text: KINDI_STRINGS.addName.prepared(
        newPersonName,
        getKindiRelationLabel(completedPlan),
        completedPlan.targetPersonName
      ),
      people: pendingAddNameRequest.relatedPeople,
      visiblePeopleCount: Math.min(pendingAddNameRequest.relatedPeople.length, 12),
      confirmation: {
        ...createKindiConfirmation(pendingAddNameRequest.routed, completedPlan, pendingAddNameRequest.relatedPeople),
        interactionId: pendingAddNameRequest.interactionId,
        learningTrace: pendingAddNameRequest.learningTrace,
      },
    });
    return true;
  }, [addAssistantMessage, pendingAddNameRequest]);

  const respondToConversationFlow = useCallback(async (routed: KindiRoutedIntent, flowIntent?: string): Promise<boolean> => {
    if (flowIntent === 'search' && routed.kind === 'QUERY') {
      await sleep(450);
      addAssistantMessageWithCue({
        text: KINDI_STRINGS.flow.searchPrompt,
      }, 'flow-search');
      return true;
    }

    if (flowIntent === 'add' && routed.kind === 'QUERY') {
      await sleep(450);
      addAssistantMessageWithCue({
        text: KINDI_STRINGS.flow.addPrompt,
      }, 'flow-add');
      return true;
    }

    return false;
  }, [addAssistantMessageWithCue]);

  const respondToQueryIntent = useCallback(async (
    query: string,
    interactionId: string,
    redactedQuery?: string
  ): Promise<boolean> => {
    const searchFlow = await runSearchFlow(query, { interactionId, redactedQuery });

    if (searchFlow.kind === 'not_found' || searchFlow.kind === 'low_confidence') {
      if (!IS_KINDI_AI_ENABLED) {
        logKindiAIDebug('fallback skipped: VITE_KINDI_AI_ENABLED is not true', {
          query,
          searchKind: searchFlow.kind,
        });
      } else {
        logKindiAIDebug('fallback requested', {
          query,
          searchKind: searchFlow.kind,
        });
        logKindiLearningEvent({
          eventType: 'ai_fallback_requested',
          interactionId,
          routeKind: 'QUERY',
          resultKind: searchFlow.kind,
          redactedQuery,
          intentGuess: 'QUERY',
          parserStage: 'ai_fallback',
          parserName: 'kindiAIPlanningFlow',
        });
        const aiPlanning = await planWithAI({
          query,
          peopleList,
          lastContextPersonId,
          focusId,
        });
        logKindiAIDebug('fallback completed', {
          resultKind: aiPlanning.kind,
        });
        logKindiLearningEvent({
          eventType: 'ai_fallback_result',
          interactionId,
          routeKind: 'QUERY',
          resultKind: aiPlanning.kind,
          redactedQuery,
          aiCategory: aiPlanning.kind === 'classified' ? aiPlanning.classification.category : undefined,
          confidence: aiPlanning.kind === 'classified'
            ? aiPlanning.classification.confidence
            : aiPlanning.kind === 'planned'
              ? aiPlanning.draft.confidence
              : undefined,
          intentGuess: aiPlanning.kind === 'planned'
            ? aiPlanning.draft.intent
            : aiPlanning.kind === 'classified'
              ? aiPlanning.classification.category
              : undefined,
          parserStage: 'ai_fallback',
          parserName: 'kindiAIService',
        });

        if (respondToPlannedAI(aiPlanning, interactionId)) {
          return true;
        }

        if (respondToClassifiedAI(aiPlanning)) {
          return true;
        }
      }
    }

    addAssistantMessageWithCue({
      text: searchFlow.text,
      peopleResults: 'peopleResults' in searchFlow ? searchFlow.peopleResults : undefined,
      visiblePeopleCount: 'visiblePeopleCount' in searchFlow ? searchFlow.visiblePeopleCount : undefined,
    });
    return true;
  }, [addAssistantMessageWithCue, focusId, lastContextPersonId, peopleList, planWithAI, respondToClassifiedAI, respondToPlannedAI, runSearchFlow]);

  const respondToSupportIntent = useCallback((query: string): boolean => {
    const guideAnswer = getKindiGuideAnswer(query);
    if (guideAnswer) {
      addAssistantMessageWithCue({ text: guideAnswer }, 'greeting');
      return true;
    }

    const contextPerson = lastContextPersonId ? peopleList.find((person) => person.id === lastContextPersonId) : undefined;
    addAssistantMessageWithCue({
      text: contextPerson
        ? KINDI_STRINGS.support.withContext(getFullName(contextPerson))
        : KINDI_STRINGS.support.generic,
      people: contextPerson ? [contextPerson] : undefined,
      visiblePeopleCount: contextPerson ? 1 : 0,
    }, 'greeting');
    return true;
  }, [addAssistantMessageWithCue, lastContextPersonId, peopleList]);

  const respondToCommandIntent = useCallback(async (
    routed: KindiRoutedIntent,
    query: string,
    interactionId: string,
    redactedQuery?: string
  ): Promise<boolean> => {
    if (currentUserRole === 'viewer') {
      addAssistantMessageWithCue({
        text: KINDI_STRINGS.permissions.readOnly,
      });
      return true;
    }

    const planning = planCommand({
      routed,
      query,
      peopleList,
      lastContextPersonId,
      focusId,
    });
    const aiPlanning = (planning.kind === 'no_plan' || planning.kind === 'not_found') && IS_KINDI_AI_ENABLED
      ? await planWithAI({
        query,
        peopleList,
        lastContextPersonId,
        focusId,
      })
      : undefined;
    if (aiPlanning) {
      logKindiLearningEvent({
        eventType: 'ai_fallback_requested',
        interactionId,
        routeKind: routed.kind,
        resultKind: planning.kind,
        failureReason: planning.kind === 'not_found'
          ? KINDI_LEARNING_FAILURE_REASONS.LOCAL_SEARCH_FAILED
          : KINDI_LEARNING_FAILURE_REASONS.PARSER_PATTERN_MISSING,
        redactedQuery,
        intentGuess: routed.kind,
        parserStage: 'ai_fallback',
        parserName: 'kindiCommandPlanningFlow',
      });
      logKindiLearningEvent({
        eventType: 'ai_fallback_result',
        interactionId,
        routeKind: routed.kind,
        resultKind: aiPlanning.kind,
        redactedQuery,
        aiCategory: aiPlanning.kind === 'classified' ? aiPlanning.classification.category : undefined,
        confidence: aiPlanning.kind === 'classified'
          ? aiPlanning.classification.confidence
          : aiPlanning.kind === 'planned'
            ? aiPlanning.draft.confidence
            : undefined,
        intentGuess: aiPlanning.kind === 'planned'
          ? aiPlanning.draft.intent
          : aiPlanning.kind === 'classified'
            ? aiPlanning.classification.category
            : undefined,
        parserStage: 'ai_fallback',
        parserName: 'kindiAIService',
      });
      if (respondToPlannedAI(aiPlanning, interactionId)) {
        return true;
      }

      if (respondToClassifiedAI(aiPlanning)) {
        return true;
      }
    }

    const effectivePlanning = aiPlanning?.kind === 'planned' ? aiPlanning.planning : planning;
    const effectiveRouted = aiPlanning?.kind === 'planned' ? aiPlanning.routed : routed;
    const learningTrace = aiPlanning?.kind === 'planned' ? aiPlanning.learningTrace : undefined;

    if (effectivePlanning.kind === 'not_found') {
      logKindiFailure(KINDI_LEARNING_FAILURE_REASONS.LOCAL_SEARCH_FAILED, query, {
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

    if (effectivePlanning.selectedPersonId) setLastContextPersonId(effectivePlanning.selectedPersonId);
    logKindiLearningEvent({
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
      confirmation: learningTrace
        ? { ...effectivePlanning.confirmation, learningTrace, interactionId }
        : { ...effectivePlanning.confirmation, interactionId },
    });
    return true;
  }, [addAssistantMessageWithCue, currentUserRole, focusId, lastContextPersonId, logKindiFailure, peopleList, planCommand, planWithAI, requestDisambiguation, requestMissingAddName, respondToClassifiedAI, respondToPlannedAI]);

  const submit = useCallback(async (rawQuery?: string) => {
    const query = (rawQuery ?? draft).trim();
    if (!query) return;
    if (hasPendingDecision) {
      addAssistantMessage({
        text: KINDI_STRINGS.flow.pendingDecision,
      });
      return;
    }

    setDraft('');
    addUserMessage(query);
    clearConversationCue();

    setIsThinking(true);
    try {
      const interactionId = createKindiInteractionId();
      const redactedQuery = getSafeRedactedQuery(query);
      if (await respondToPendingAddName(query)) {
        return;
      }

      const routed = routeKindiIntent(query);
      logKindiLearningEvent({
        eventType: 'query_submitted',
        interactionId,
        routeKind: routed.kind,
        redactedQuery,
        intentGuess: routed.kind,
        parserStage: 'intent_router',
        parserName: 'intentRouter',
      });
      const flowIntent = lastConversationCue === 'greeting'
        ? getConversationFlowIntent(query)
        : undefined;

      if (await respondToConversationFlow(routed, flowIntent)) {
        return;
      }

      if (routed.kind === 'QUERY') {
        await respondToQueryIntent(query, interactionId, redactedQuery);
        return;
      }

      if (routed.kind === 'UNKNOWN') {
        logKindiFailure(KINDI_LEARNING_FAILURE_REASONS.PARSER_PATTERN_MISSING, query, { route: routed.kind }, {
          interactionId,
          redactedQuery,
        });
        if (IS_KINDI_AI_ENABLED && hasKindiAIFallbackIntentSignal(query)) {
          logKindiAIDebug('fallback requested', {
            query,
            searchKind: 'unknown_with_intent_signal',
          });
          logKindiLearningEvent({
            eventType: 'ai_fallback_requested',
            interactionId,
            routeKind: 'UNKNOWN',
            resultKind: 'unknown_with_intent_signal',
            failureReason: KINDI_LEARNING_FAILURE_REASONS.PARSER_PATTERN_MISSING,
            redactedQuery,
            intentGuess: 'UNKNOWN',
            parserStage: 'ai_fallback',
            parserName: 'kindiAIPlanningFlow',
          });
          const aiPlanning = await planWithAI({
            query,
            peopleList,
            lastContextPersonId,
            focusId,
          });
          logKindiAIDebug('fallback completed', {
            resultKind: aiPlanning.kind,
          });
          logKindiLearningEvent({
            eventType: 'ai_fallback_result',
            interactionId,
            routeKind: 'UNKNOWN',
            resultKind: aiPlanning.kind,
            redactedQuery,
            aiCategory: aiPlanning.kind === 'classified' ? aiPlanning.classification.category : undefined,
            confidence: aiPlanning.kind === 'classified'
              ? aiPlanning.classification.confidence
              : aiPlanning.kind === 'planned'
                ? aiPlanning.draft.confidence
                : undefined,
            intentGuess: aiPlanning.kind === 'planned'
              ? aiPlanning.draft.intent
              : aiPlanning.kind === 'classified'
                ? aiPlanning.classification.category
                : undefined,
            parserStage: 'ai_fallback',
            parserName: 'kindiAIService',
          });

          if (respondToPlannedAI(aiPlanning, interactionId)) {
            return;
          }

          if (respondToClassifiedAI(aiPlanning)) {
            return;
          }
        }

        addAssistantMessageWithCue({
          text: pickRandom(KINDI_STRINGS.outOfScope),
        });
        return;
      }

      if (routed.kind === 'GREETING') {
        addAssistantMessageWithCue({
          text: pickGreetingReply(query),
        }, 'greeting');
        return;
      }

      if (routed.kind === 'SUPPORT') {
        const hasGuideAnswer = Boolean(getKindiGuideAnswer(query));
        logKindiLearningEvent({
          eventType: hasGuideAnswer ? 'support_local_answered' : 'support_unanswered',
          interactionId,
          routeKind: 'SUPPORT',
          failureReason: hasGuideAnswer ? undefined : KINDI_LEARNING_FAILURE_REASONS.SUPPORT_TOPIC_MISSING,
          redactedQuery,
          intentGuess: 'SUPPORT',
          parserStage: 'support_guide',
          parserName: 'guideMatcher',
        });
        respondToSupportIntent(query);
        return;
      }

      await respondToCommandIntent(routed, query, interactionId, redactedQuery);
    } finally {
      setIsThinking(false);
    }
  }, [addAssistantMessage, addAssistantMessageWithCue, addUserMessage, clearConversationCue, draft, focusId, hasPendingDecision, lastContextPersonId, lastConversationCue, peopleList, planWithAI, respondToClassifiedAI, respondToCommandIntent, respondToConversationFlow, respondToPendingAddName, respondToPlannedAI, respondToQueryIntent, respondToSupportIntent]);

  const chooseDisambiguation = useCallback((messageId: string, personId: string) => {
    const message = messages.find((item) => item.id === messageId);
    const disambiguation = message?.disambiguation;
    const selectedPerson = peopleList.find((person) => person.id === personId);
    if (!disambiguation || !selectedPerson) return;
    if (disambiguation.status && disambiguation.status !== 'pending') return;
    setLastContextPersonId(selectedPerson.id);

    setDisambiguationStatus(messageId, 'resolved');
      logKindiLearningEvent({
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
      logKindiLearningEvent({
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
        text: KINDI_STRINGS.disambiguation.selected(getFullName(selectedPerson), planning.text),
        people: planning.people,
        visiblePeopleCount: planning.visiblePeopleCount,
        confirmation: { ...planning.confirmation, interactionId: disambiguation.interactionId },
      });
    }
  }, [addAssistantMessage, messages, peopleList, planDisambiguation, requestMissingAddName, setDisambiguationStatus]);


  const cancel = useCallback((confirmation?: KindiConfirmation) => {
    setPendingAddNameRequest(null);
    if (confirmation?.status && confirmation.status !== 'pending') return;

    if (confirmation) {
      setMessageConfirmationStatus(confirmation.id, 'cancelled');
      logKindiLearningEvent({
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
    }

    addAssistantMessage({
      text: KINDI_STRINGS.flow.cancelled,
    });
  }, [addAssistantMessage, setMessageConfirmationStatus]);

  const cancelDisambiguation = useCallback((messageId: string) => {
    const message = messages.find((item) => item.id === messageId);
    if (message?.disambiguation) {
      logKindiLearningEvent({
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
    addAssistantMessage({
      text: KINDI_STRINGS.flow.disambiguationCancelled,
    });
  }, [addAssistantMessage, messages, setDisambiguationStatus]);

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
  };
};
