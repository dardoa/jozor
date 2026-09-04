import { useCallback } from 'react';

import { searchService, type SearchResult } from '../../../services/searchService';
import type { Language } from '../../../types/common';
import { getKindiStrings } from '../logic/kindiLocales';
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
const SAFE_FAILURE_METADATA_KEYS = new Set([
  'bestFuseScore',
  'bestScore',
  'lowConfidenceCount',
  'route',
]);

const sleep = (ms: number) => new Promise((resolve) => window.setTimeout(resolve, ms));

const sanitizeFailureMetadata = (
  metadata: Record<string, unknown> | undefined
): Record<string, string | number | boolean | null> => Object.fromEntries(
  Object.entries(metadata ?? {})
    .filter(([key]) => SAFE_FAILURE_METADATA_KEYS.has(key))
    .filter(([, value]) =>
      value === null
      || typeof value === 'string'
      || typeof value === 'number'
      || typeof value === 'boolean'
    )
) as Record<string, string | number | boolean | null>;

const sanitizeStoredFailureEntry = (value: unknown) => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const record = value as Record<string, unknown>;
  if (typeof record.reason !== 'string' || typeof record.timestamp !== 'string') return null;

  return {
    reason: record.reason,
    redactedQuery: typeof record.redactedQuery === 'string' && /\[NAME_\d+\]/.test(record.redactedQuery)
      ? record.redactedQuery
      : undefined,
    metadata: sanitizeFailureMetadata(
      record.metadata && typeof record.metadata === 'object' && !Array.isArray(record.metadata)
        ? record.metadata as Record<string, unknown>
        : undefined
    ),
    timestamp: record.timestamp,
  };
};

const logKindiFailure = (
  reason: KindiFailureReason,
  _query: string,
  metadata?: Record<string, unknown>,
  context?: KindiFailureLogContext
) => {
  const entry = {
    reason,
    redactedQuery: context?.redactedQuery,
    metadata: sanitizeFailureMetadata(metadata),
    timestamp: new Date().toISOString(),
  };

  console.warn('[Kindi failure]', entry);

  if (typeof window === 'undefined') return;

  try {
    const previous = JSON.parse(window.sessionStorage.getItem(KINDI_FAILURE_LOG_KEY) || '[]');
    const entries = Array.isArray(previous)
      ? previous.map(sanitizeStoredFailureEntry).filter(Boolean)
      : [];
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

const buildReliableSearchResult = (
  results: SearchResult[],
  language: Language
): KindiSearchFlowResult => {
  const peopleResults = toKindiPersonResults(results, 'strong');
  const visiblePeopleCount = Math.min(peopleResults.length, 12);

  return {
    kind: 'reliable',
    text: getKindiStrings(language).search.reliable(peopleResults.length, visiblePeopleCount),
    peopleResults,
    visiblePeopleCount,
  };
};

const buildNearbySearchResult = (
  results: SearchResult[],
  language: Language
): KindiSearchFlowResult => {
  const peopleResults = toKindiPersonResults(results, 'medium');

  return {
    kind: 'nearby',
    text: getKindiStrings(language).search.nearby,
    peopleResults,
    visiblePeopleCount: Math.min(peopleResults.length, 12),
  };
};

export const useKindiSearchFlow = (language: Language = 'ar') => {
  const strings = getKindiStrings(language);
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
        text: strings.search.notFound,
      };
    }

    if (confidence.reliable.length > 0) {
      return buildReliableSearchResult(confidence.reliable, language);
    }

    if (confidence.nearby.length > 0) {
      return buildNearbySearchResult(confidence.nearby, language);
    }

    logKindiFailure(KINDI_LEARNING_FAILURE_REASONS.AI_LOW_CONFIDENCE, query, {
      bestScore: confidence.best?.score,
      bestFuseScore: confidence.best?.fuseScore,
      lowConfidenceCount: confidence.low.length,
    }, context);

    return {
      kind: 'low_confidence',
      text: strings.search.lowConfidence,
    };
  }, [language, strings.search.lowConfidence, strings.search.notFound]);

  return {
    runSearchFlow,
    logKindiFailure,
  };
};
