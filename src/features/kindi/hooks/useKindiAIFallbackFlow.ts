import { useCallback } from 'react';

import type { KindiLearningFailureReason } from '../logic/kindiLearningTaxonomy';
import type { KindiIntentKind } from '../types';
import type {
  KindiLearningParserName,
  KindiLearningResultKind,
} from '../logic/kindiLearningDimensions';
import type { KindiLearningEventInput } from '../services/kindiLearningService';
import type { KindiAIPlanningResult, PlanWithAIArgs } from './useKindiAIPlanningFlow';

export type KindiAIFallbackPlanningResult = KindiAIPlanningResult
  | { kind: 'paywall_intercepted' }
  | { kind: 'cloud_failure_intercepted' };

interface RunKindiAIFallbackArgs extends PlanWithAIArgs {
  interactionId: string;
  routeKind: KindiIntentKind;
  resultKind: KindiLearningResultKind;
  failureReason?: KindiLearningFailureReason;
  redactedQuery?: string;
  requestParserName: KindiLearningParserName;
  debugSearchKind?: string;
}

interface UseKindiAIFallbackFlowArgs {
  planWithAI: (args: PlanWithAIArgs) => Promise<KindiAIFallbackPlanningResult>;
  logEvent: (event: KindiLearningEventInput) => void;
  logDebug?: (message: string, metadata?: Record<string, unknown>) => void;
}

const createFallbackResultEvent = (
  result: KindiAIFallbackPlanningResult,
  request: RunKindiAIFallbackArgs
): KindiLearningEventInput => ({
  eventType: 'ai_fallback_result',
  interactionId: request.interactionId,
  routeKind: request.routeKind,
  resultKind: result.kind,
  redactedQuery: request.redactedQuery,
  aiCategory: result.kind === 'classified' ? result.classification.category : undefined,
  confidence: result.kind === 'classified'
    ? result.classification.confidence
    : result.kind === 'planned'
      ? result.draft.confidence
      : undefined,
  intentGuess: result.kind === 'planned'
    ? result.draft.intent
    : result.kind === 'classified'
      ? result.classification.category
      : undefined,
  parserStage: 'ai_fallback',
  parserName: 'kindiAIService',
});

export const useKindiAIFallbackFlow = ({
  planWithAI,
  logEvent,
  logDebug,
}: UseKindiAIFallbackFlowArgs) => {
  const runAIFallback = useCallback(async ({
    query,
    peopleList,
    lastContextPersonId,
    focusId,
    interactionId,
    routeKind,
    resultKind,
    failureReason,
    redactedQuery,
    requestParserName,
    debugSearchKind,
  }: RunKindiAIFallbackArgs): Promise<KindiAIFallbackPlanningResult> => {
    if (debugSearchKind) {
      logDebug?.('fallback requested', { searchKind: debugSearchKind });
    }
    logEvent({
      eventType: 'ai_fallback_requested',
      interactionId,
      routeKind,
      resultKind,
      failureReason,
      redactedQuery,
      intentGuess: routeKind,
      parserStage: 'ai_fallback',
      parserName: requestParserName,
    });

    const result = await planWithAI({
      query,
      peopleList,
      lastContextPersonId,
      focusId,
    });

    if (debugSearchKind) {
      logDebug?.('fallback completed', { resultKind: result.kind });
    }
    logEvent(createFallbackResultEvent(result, {
      query,
      peopleList,
      lastContextPersonId,
      focusId,
      interactionId,
      routeKind,
      resultKind,
      failureReason,
      redactedQuery,
      requestParserName,
      debugSearchKind,
    }));

    return result;
  }, [logDebug, logEvent, planWithAI]);

  return { runAIFallback };
};
