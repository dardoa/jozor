import { authTokenService } from '../../../services/authTokenService';
import { getSupabaseFull } from '../../../services/supabaseClient';
import type { KindiIntentKind, KindiLearningTrace } from '../types';
import { KINDI_LOCAL_LEXICON_VERSION, shouldLogKindiLearningTrace } from '../logic/kindiLearningTrace';
import {
  KINDI_LEARNING_FAILURE_REASONS,
  type KindiLearningFailureReason,
  type KindiParserStage,
} from '../logic/kindiLearningTaxonomy';
import {
  KINDI_LEARNING_AI_CATEGORIES,
  KINDI_LEARNING_ANSWER_KINDS,
  KINDI_LEARNING_ANSWER_SOURCES,
  KINDI_LEARNING_EVENT_TYPES,
  KINDI_LEARNING_INTENT_GUESSES,
  KINDI_LEARNING_PARSER_NAMES,
  KINDI_LEARNING_PARSER_STAGES,
  KINDI_LEARNING_PLAN_TYPES,
  KINDI_LEARNING_RESULT_KINDS,
  KINDI_LEARNING_ROUTE_KINDS,
  type KindiLearningAICategory,
  type KindiLearningEventType,
  type KindiLearningIntentGuess,
  type KindiLearningParserName,
  type KindiLearningResultKind,
} from '../logic/kindiLearningDimensions';

export const KINDI_PARSER_VERSION = '2026-05-kindi-parser-v1';

export type { KindiLearningEventType } from '../logic/kindiLearningDimensions';

export interface KindiLearningEventInput {
  eventType: KindiLearningEventType;
  interactionId?: string;
  routeKind?: KindiIntentKind;
  resultKind?: KindiLearningResultKind;
  failureReason?: KindiLearningFailureReason;
  redactedQuery?: string;
  aiCategory?: KindiLearningAICategory;
  confidence?: number;
  intentGuess?: KindiLearningIntentGuess;
  parserStage?: KindiParserStage;
  parserName?: KindiLearningParserName;
  metadata?: Record<string, unknown>;
}

const containsRedactionToken = (value: string | undefined): boolean =>
  Boolean(value && /\[NAME_\d+\]/.test(value));

const SAFE_INTERACTION_ID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const SAFE_TOPIC_ID_PATTERN = /^[a-z0-9][a-z0-9-]{0,79}$/;
const SAFE_ANSWER_SOURCES = new Set<string>(KINDI_LEARNING_ANSWER_SOURCES);
const SAFE_ANSWER_KINDS = new Set<string>(KINDI_LEARNING_ANSWER_KINDS);
const SAFE_PLAN_TYPES = new Set<string>(KINDI_LEARNING_PLAN_TYPES);
const SAFE_EVENT_TYPES = new Set<string>(KINDI_LEARNING_EVENT_TYPES);
const SAFE_ROUTE_KINDS = new Set<string>(KINDI_LEARNING_ROUTE_KINDS);
const SAFE_RESULT_KINDS = new Set<string>(KINDI_LEARNING_RESULT_KINDS);
const SAFE_FAILURE_REASONS = new Set(Object.values(KINDI_LEARNING_FAILURE_REASONS));
const SAFE_AI_CATEGORIES = new Set<string>(KINDI_LEARNING_AI_CATEGORIES);
const SAFE_INTENT_GUESSES = new Set<string>(KINDI_LEARNING_INTENT_GUESSES);
const SAFE_PARSER_STAGES = new Set<string>(KINDI_LEARNING_PARSER_STAGES);
const SAFE_PARSER_NAMES = new Set<string>(KINDI_LEARNING_PARSER_NAMES);

const safeAllowedValue = (
  value: unknown,
  allowedValues: ReadonlySet<string>
): string | undefined => typeof value === 'string' && allowedValues.has(value)
  ? value
  : undefined;

const sanitizeMetadata = (metadata: Record<string, unknown> | undefined): Record<string, unknown> => {
  if (!metadata) return {};

  const safe: Record<string, unknown> = {};
  ['bestFuseScore', 'bestScore'].forEach((key) => {
    const value = metadata[key];
    if (typeof value === 'number' && Number.isFinite(value)) safe[key] = value;
  });
  ['candidateCount', 'lowConfidenceCount'].forEach((key) => {
    const value = metadata[key];
    if (typeof value === 'number' && Number.isInteger(value) && value >= 0) safe[key] = value;
  });
  const planType = safeAllowedValue(metadata.planType, SAFE_PLAN_TYPES);
  const route = safeAllowedValue(metadata.route, SAFE_ROUTE_KINDS);
  if (planType) safe.planType = planType;
  if (route) safe.route = route;

  const answerSource = metadata.answerSource;
  const answerKind = metadata.answerKind;
  const topicId = metadata.topicId;
  if (typeof answerSource === 'string' && SAFE_ANSWER_SOURCES.has(answerSource)) {
    safe.answerSource = answerSource;
  }
  if (typeof answerKind === 'string' && SAFE_ANSWER_KINDS.has(answerKind)) {
    safe.answerKind = answerKind;
  }
  if (
    answerSource === 'help-center'
    && typeof topicId === 'string'
    && SAFE_TOPIC_ID_PATTERN.test(topicId)
  ) {
    safe.topicId = topicId;
  }

  return safe;
};

export const insertKindiLearningEvent = async (event: KindiLearningEventInput): Promise<void> => {
  if (!SAFE_EVENT_TYPES.has(event.eventType)) return;
  if (event.redactedQuery && !containsRedactionToken(event.redactedQuery)) return;
  if (event.confidence !== undefined && (!Number.isFinite(event.confidence) || event.confidence < 0 || event.confidence > 1)) return;

  const token = await authTokenService.getPreferredSupabaseToken();
  if (!token) return;

  const supabase = getSupabaseFull(undefined, undefined, token);
  const { error } = await supabase
    .from('kindi_learning_events')
    .insert({
      event_type: event.eventType,
      interaction_id: event.interactionId && SAFE_INTERACTION_ID_PATTERN.test(event.interactionId)
        ? event.interactionId
        : undefined,
      route_kind: safeAllowedValue(event.routeKind, SAFE_ROUTE_KINDS),
      result_kind: safeAllowedValue(event.resultKind, SAFE_RESULT_KINDS),
      failure_reason: safeAllowedValue(event.failureReason, SAFE_FAILURE_REASONS),
      redacted_query: event.redactedQuery,
      ai_category: safeAllowedValue(event.aiCategory, SAFE_AI_CATEGORIES),
      confidence: event.confidence,
      intent_guess: safeAllowedValue(event.intentGuess, SAFE_INTENT_GUESSES),
      parser_stage: safeAllowedValue(event.parserStage, SAFE_PARSER_STAGES),
      parser_name: safeAllowedValue(event.parserName, SAFE_PARSER_NAMES),
      parser_version: KINDI_PARSER_VERSION,
      local_lexicon_version: KINDI_LOCAL_LEXICON_VERSION,
      metadata: sanitizeMetadata(event.metadata),
    });

  if (error) throw error;
};

export const logKindiLearningEvent = (event: KindiLearningEventInput): void => {
  void insertKindiLearningEvent(event).catch((error) => {
    if (import.meta.env.DEV) {
      console.warn('[Kindi learning] Failed to log learning event.', error);
    }
  });
};

export const insertKindiLearningLog = async (trace: KindiLearningTrace): Promise<void> => {
  if (!shouldLogKindiLearningTrace(trace)) return;

  const token = await authTokenService.getPreferredSupabaseToken();
  if (!token) return;

  const supabase = getSupabaseFull(undefined, undefined, token);
  const { error } = await supabase
    .from('kindi_learning_logs')
    .insert({
      redacted_query: trace.redactedQuery,
      ai_draft: trace.aiDraft,
      confidence: trace.confidence,
      local_lexicon_version: trace.localLexiconVersion,
    });

  if (error) throw error;
};

export const logKindiSuccess = (trace?: KindiLearningTrace): void => {
  if (!shouldLogKindiLearningTrace(trace)) return;

  void insertKindiLearningLog(trace).catch((error) => {
    if (import.meta.env.DEV) {
      console.warn('[Kindi learning] Failed to log successful AI trace.', error);
    }
  });
};
