import { useCallback } from 'react';

import { searchService, type SearchResult } from '../../../services/searchService';
import { KINDI_STRINGS } from '../logic/kindiLocales';
import type { KindiPersonResult } from '../types';
import {
  KINDI_LEARNING_FAILURE_REASONS,
  type KindiLearningFailureReason,
} from '../logic/kindiLearningTaxonomy';
import type { KindiLearningEventInput } from '../services/kindiLearningService';

export type KindiFailureReason = KindiLearningFailureReason;

interface KindiFailureLogContext {
  interactionId?: string;
  redactedQuery?: string;
}

type KindiSearchFlowResult =
  | {
      kind: 'reliable' | 'nearby';
      text: string;
      peopleResults: KindiPersonResult[];
      visiblePeopleCount: number;
    }
  | {
      kind: 'not_found' | 'low_confidence';
      text: string;
    };

const KINDI_FAILURE_LOG_KEY = 'jozor:kindi:failure-log';
const SEARCH_THINKING_DELAY_MS = 250;

const sleep = (ms: number) => new Promise((resolve) => window.setTimeout(resolve, ms));

const logKindiFailure = (
  reason: KindiFailureReason,
  query: string,
  metadata?: Record<string, unknown>,
  context?: KindiFailureLogContext
) => {
  const entry = {
    reason,
    query,
    metadata,
    timestamp: new Date().toISOString(),
  };

  console.warn('[Kindi failure]', entry);

  if (typeof window === 'undefined') return;

  try {
    const previous = JSON.parse(window.sessionStorage.getItem(KINDI_FAILURE_LOG_KEY) || '[]');
    const entries = Array.isArray(previous) ? previous : [];
    window.sessionStorage.setItem(
      KINDI_FAILURE_LOG_KEY,
      JSON.stringify([...entries.slice(-49), entry])
    );
  } catch {
    // Diagnostic-only logging must never interrupt the assistant flow.
  }

  const event: KindiLearningEventInput = {
    eventType: 'search_failure',
    interactionId: context?.interactionId,
    routeKind: metadata?.route === 'QUERY' ? 'QUERY' : undefined,
    resultKind: reason,
    failureReason: reason,
    redactedQuery: context?.redactedQuery,
    parserStage: metadata?.route === 'QUERY' ? 'local_search' : 'intent_router',
    parserName: metadata?.route === 'QUERY' ? 'searchService' : 'intentRouter',
    metadata,
  };
  void import('../services/kindiLearningService').then(({ logKindiLearningEvent }) => {
    logKindiLearningEvent(event);
  });
};

const splitKindiSearchConfidence = (results: SearchResult[]) => {
  const reliable = results.filter((result) =>
    result.matchType === 'exact' || result.confidence === 'exact' || result.confidence === 'high'
  );
  const nearby = results.filter((result) => result.confidence === 'medium');
  const low = results.filter((result) => result.confidence === 'low');

  return {
    reliable,
    nearby,
    low,
    best: results[0],
  };
};

const toKindiPersonResults = (
  results: SearchResult[],
  matchLevel: KindiPersonResult['matchLevel']
): KindiPersonResult[] => results.map((result) => ({
  person: result.person,
  matchLevel,
  score: result.score,
}));

const buildReliableSearchResult = (results: SearchResult[]): KindiSearchFlowResult => {
  const peopleResults = toKindiPersonResults(results, 'strong');
  const visiblePeopleCount = Math.min(peopleResults.length, 12);

  return {
    kind: 'reliable',
    text: KINDI_STRINGS.search.reliable(peopleResults.length, visiblePeopleCount),
    peopleResults,
    visiblePeopleCount,
  };
};

const buildNearbySearchResult = (results: SearchResult[]): KindiSearchFlowResult => {
  const peopleResults = toKindiPersonResults(results, 'medium');

  return {
    kind: 'nearby',
    text: KINDI_STRINGS.search.nearby,
    peopleResults,
    visiblePeopleCount: Math.min(peopleResults.length, 12),
  };
};

export const useKindiSearchFlow = () => {
  const runSearchFlow = useCallback(async (
    query: string,
    context?: KindiFailureLogContext
  ): Promise<KindiSearchFlowResult> => {
    const [searchResults] = await Promise.all([
      searchService.search(query, 200),
      sleep(SEARCH_THINKING_DELAY_MS),
    ]);
    const confidence = splitKindiSearchConfidence(searchResults);

    if (searchResults.length === 0) {
      logKindiFailure(KINDI_LEARNING_FAILURE_REASONS.LOCAL_SEARCH_FAILED, query, { route: 'QUERY' }, context);
      return {
        kind: 'not_found',
        text: KINDI_STRINGS.search.notFound,
      };
    }

    if (confidence.reliable.length > 0) {
      return buildReliableSearchResult(confidence.reliable);
    }

    if (confidence.nearby.length > 0) {
      return buildNearbySearchResult(confidence.nearby);
    }

    logKindiFailure(KINDI_LEARNING_FAILURE_REASONS.AI_LOW_CONFIDENCE, query, {
      bestScore: confidence.best?.score,
      bestFuseScore: confidence.best?.fuseScore,
      lowConfidenceCount: confidence.low.length,
    }, context);

    return {
      kind: 'low_confidence',
      text: KINDI_STRINGS.search.lowConfidence,
    };
  }, []);

  return {
    runSearchFlow,
    logKindiFailure,
  };
};
