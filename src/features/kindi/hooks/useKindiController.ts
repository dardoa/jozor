import { useCallback, useEffect, useMemo, useState } from 'react';

import { searchService } from '../../../services/searchService';
import { useAppStore } from '../../../store/useAppStore';
import type { Person } from '../../../types';
import { getFullName } from '../../../utils/familyLogic';
import { getConversationFlowIntent, hasKindiAIFallbackIntentSignal } from '../logic/kindiCommandLexicon';
import { KINDI_STRINGS } from '../logic/kindiLocales';
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

interface UseKindiControllerArgs {
  people: Record<string, Person>;
  onFocusPerson: (id: string) => void;
}

interface PendingAddNameRequest {
  routed: KindiRoutedIntent;
  plan: KindiAddPlan;
  relatedPeople: Person[];
  learningTrace?: KindiLearningTrace;
}

const sleep = (ms: number) => new Promise((resolve) => window.setTimeout(resolve, ms));

const pickRandom = (items: readonly string[]) => items[Math.floor(Math.random() * items.length)];
const IS_KINDI_AI_ENABLED = import.meta.env.VITE_KINDI_AI_ENABLED === 'true';
const logKindiAIDebug = (message: string, metadata?: Record<string, unknown>) => {
  if (import.meta.env.DEV) {
    console.info(`[Kindi AI] ${message}`, metadata ?? {});
  }
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
  const { planWithAI } = useKindiAIPlanningFlow({
    requestDraft: kindiAIRequestDraft,
  });
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
    promptName?: string
  ) => {
    addAssistantMessageWithCue({
      text: KINDI_STRINGS.disambiguation.prompt(promptName),
      people: candidates,
      visiblePeopleCount: Math.min(candidates.length, 12),
      disambiguation: {
        promptName: promptName || KINDI_STRINGS.disambiguation.defaultPromptName,
        routedIntent: routed,
        resultPeople,
        fallbackFocusId,
        status: 'pending',
      },
    });
  }, [addAssistantMessageWithCue]);

  const respondToClassifiedAI = useCallback((aiPlanning: Awaited<ReturnType<typeof planWithAI>>): boolean => {
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
      if (pendingAddNameRequest) {
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
          return;
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
            learningTrace: pendingAddNameRequest.learningTrace,
          },
        });
        return;
      }

      const routed = routeKindiIntent(query);
      const flowIntent = lastConversationCue === 'greeting'
        ? getConversationFlowIntent(query)
        : undefined;

      if (flowIntent === 'search' && routed.kind === 'QUERY') {
        await sleep(450);
        addAssistantMessageWithCue({
          text: KINDI_STRINGS.flow.searchPrompt,
        }, 'flow-search');
        return;
      }

      if (flowIntent === 'add' && routed.kind === 'QUERY') {
        await sleep(450);
        addAssistantMessageWithCue({
          text: KINDI_STRINGS.flow.addPrompt,
        }, 'flow-add');
        return;
      }

      if (routed.kind === 'QUERY') {
        const searchFlow = await runSearchFlow(query);

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
            const aiPlanning = await planWithAI({
              query,
              peopleList,
              lastContextPersonId,
              focusId,
            });
            logKindiAIDebug('fallback completed', {
              resultKind: aiPlanning.kind,
            });

            if (aiPlanning.kind === 'planned') {
              const effectivePlanning = aiPlanning.planning;
              const learningTrace = aiPlanning.learningTrace;

              if (effectivePlanning.kind === 'ambiguous') {
                requestDisambiguation(
                  aiPlanning.routed,
                  effectivePlanning.candidates,
                  effectivePlanning.resultPeople,
                  effectivePlanning.fallbackFocusId,
                  effectivePlanning.promptName
                );
                return;
              }

              if (effectivePlanning.kind === 'needs_add_name') {
                requestMissingAddName({
                  routed: effectivePlanning.routed,
                  plan: effectivePlanning.plan,
                  relatedPeople: effectivePlanning.relatedPeople,
                  learningTrace,
                });
                return;
              }

              if (effectivePlanning.kind === 'confirmation') {
                if (effectivePlanning.selectedPersonId) setLastContextPersonId(effectivePlanning.selectedPersonId);
                addAssistantMessageWithCue({
                  text: effectivePlanning.text,
                  people: effectivePlanning.people,
                  visiblePeopleCount: effectivePlanning.visiblePeopleCount,
                  confirmation: learningTrace
                    ? { ...effectivePlanning.confirmation, learningTrace }
                    : effectivePlanning.confirmation,
                });
                return;
              }
            }

            if (respondToClassifiedAI(aiPlanning)) {
              return;
            }
          }
        }

        addAssistantMessageWithCue({
          text: searchFlow.text,
          peopleResults: 'peopleResults' in searchFlow ? searchFlow.peopleResults : undefined,
          visiblePeopleCount: 'visiblePeopleCount' in searchFlow ? searchFlow.visiblePeopleCount : undefined,
        });
        return;
      }

      if (routed.kind === 'UNKNOWN') {
        logKindiFailure('UNKNOWN', query, { route: routed.kind });
        if (IS_KINDI_AI_ENABLED && hasKindiAIFallbackIntentSignal(query)) {
          logKindiAIDebug('fallback requested', {
            query,
            searchKind: 'unknown_with_intent_signal',
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

          if (aiPlanning.kind === 'planned') {
            const effectivePlanning = aiPlanning.planning;
            const learningTrace = aiPlanning.learningTrace;

            if (effectivePlanning.kind === 'ambiguous') {
              requestDisambiguation(
                aiPlanning.routed,
                effectivePlanning.candidates,
                effectivePlanning.resultPeople,
                effectivePlanning.fallbackFocusId,
                effectivePlanning.promptName
              );
              return;
            }

            if (effectivePlanning.kind === 'needs_add_name') {
              requestMissingAddName({
                routed: effectivePlanning.routed,
                plan: effectivePlanning.plan,
                relatedPeople: effectivePlanning.relatedPeople,
                learningTrace,
              });
              return;
            }

            if (effectivePlanning.kind === 'confirmation') {
              if (effectivePlanning.selectedPersonId) setLastContextPersonId(effectivePlanning.selectedPersonId);
              addAssistantMessageWithCue({
                text: effectivePlanning.text,
                people: effectivePlanning.people,
                visiblePeopleCount: effectivePlanning.visiblePeopleCount,
                confirmation: learningTrace
                  ? { ...effectivePlanning.confirmation, learningTrace }
                  : effectivePlanning.confirmation,
              });
              return;
            }
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
        const contextPerson = lastContextPersonId ? peopleList.find((person) => person.id === lastContextPersonId) : undefined;
        addAssistantMessageWithCue({
          text: contextPerson
            ? KINDI_STRINGS.support.withContext(getFullName(contextPerson))
            : KINDI_STRINGS.support.generic,
          people: contextPerson ? [contextPerson] : undefined,
          visiblePeopleCount: contextPerson ? 1 : 0,
        }, 'greeting');
        return;
      }

      if (currentUserRole === 'viewer') {
        addAssistantMessageWithCue({
          text: KINDI_STRINGS.permissions.readOnly,
        });
        return;
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
      const effectivePlanning = aiPlanning?.kind === 'planned' ? aiPlanning.planning : planning;
      const effectiveRouted = aiPlanning?.kind === 'planned' ? aiPlanning.routed : routed;
      const learningTrace = aiPlanning?.kind === 'planned' ? aiPlanning.learningTrace : undefined;

      if (aiPlanning && respondToClassifiedAI(aiPlanning)) {
        return;
      }

      if (effectivePlanning.kind === 'not_found') {
        logKindiFailure('not_found', query, {
          route: routed.kind,
          target: effectivePlanning.target,
        });
        addAssistantMessageWithCue({ text: effectivePlanning.text });
        return;
      }

      if (effectivePlanning.kind === 'ambiguous') {
        requestDisambiguation(
          effectiveRouted,
          effectivePlanning.candidates,
          effectivePlanning.resultPeople,
          effectivePlanning.fallbackFocusId,
          effectivePlanning.promptName
        );
        return;
      }

      if (effectivePlanning.kind === 'no_plan') {
        addAssistantMessageWithCue({
          text: effectivePlanning.text,
          people: effectivePlanning.people,
        });
        return;
      }

      if (effectivePlanning.kind === 'needs_add_name') {
        requestMissingAddName({
          routed: effectivePlanning.routed,
          plan: effectivePlanning.plan,
          relatedPeople: effectivePlanning.relatedPeople,
          learningTrace,
        });
        return;
      }

      if (effectivePlanning.selectedPersonId) setLastContextPersonId(effectivePlanning.selectedPersonId);
      addAssistantMessageWithCue({
        text: effectivePlanning.text,
        people: effectivePlanning.people,
        visiblePeopleCount: effectivePlanning.visiblePeopleCount,
        confirmation: learningTrace
          ? { ...effectivePlanning.confirmation, learningTrace }
          : effectivePlanning.confirmation,
      });
    } finally {
      setIsThinking(false);
    }
  }, [addAssistantMessage, addAssistantMessageWithCue, addUserMessage, clearConversationCue, currentUserRole, draft, focusId, hasPendingDecision, lastContextPersonId, lastConversationCue, logKindiFailure, pendingAddNameRequest, peopleList, planCommand, planWithAI, requestDisambiguation, requestMissingAddName, respondToClassifiedAI, runSearchFlow]);

  const chooseDisambiguation = useCallback((messageId: string, personId: string) => {
    const message = messages.find((item) => item.id === messageId);
    const disambiguation = message?.disambiguation;
    const selectedPerson = peopleList.find((person) => person.id === personId);
    if (!disambiguation || !selectedPerson) return;
    if (disambiguation.status && disambiguation.status !== 'pending') return;
    setLastContextPersonId(selectedPerson.id);

    setDisambiguationStatus(messageId, 'resolved');

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
      });
      return;
    }

    if (planning.kind === 'confirmation') {
      if (planning.selectedPersonId) setLastContextPersonId(planning.selectedPersonId);
      addAssistantMessage({
        text: KINDI_STRINGS.disambiguation.selected(getFullName(selectedPerson), planning.text),
        people: planning.people,
        visiblePeopleCount: planning.visiblePeopleCount,
        confirmation: planning.confirmation,
      });
    }
  }, [addAssistantMessage, messages, peopleList, planDisambiguation, requestMissingAddName, setDisambiguationStatus]);


  const cancel = useCallback((confirmation?: KindiConfirmation) => {
    setPendingAddNameRequest(null);
    if (confirmation?.status && confirmation.status !== 'pending') return;

    if (confirmation) {
      setMessageConfirmationStatus(confirmation.id, 'cancelled');
    }

    addAssistantMessage({
      text: KINDI_STRINGS.flow.cancelled,
    });
  }, [addAssistantMessage, setMessageConfirmationStatus]);

  const cancelDisambiguation = useCallback((messageId: string) => {
    setDisambiguationStatus(messageId, 'cancelled');
    setPendingAddNameRequest(null);
    addAssistantMessage({
      text: KINDI_STRINGS.flow.disambiguationCancelled,
    });
  }, [addAssistantMessage, setDisambiguationStatus]);

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
