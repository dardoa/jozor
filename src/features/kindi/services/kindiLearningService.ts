import { authTokenService } from '../../../services/authTokenService';
import { getSupabaseFull } from '../../../services/supabaseClient';
import type { KindiIntentKind, KindiLearningTrace } from '../types';
import { KINDI_LOCAL_LEXICON_VERSION, shouldLogKindiLearningTrace } from '../logic/kindiLearningTrace';
import type { KindiLearningFailureReason, KindiParserStage } from '../logic/kindiLearningTaxonomy';

export const KINDI_PARSER_VERSION = '2026-05-kindi-parser-v1';

export type KindiLearningEventType =
  | 'query_submitted'
  | 'search_success'
  | 'search_failure'
  | 'ai_fallback_requested'
  | 'ai_fallback_result'
  | 'confirmation_shown'
  | 'confirmation_confirmed'
  | 'confirmation_cancelled'
  | 'confirmation_failed'
  | 'disambiguation_shown'
  | 'disambiguation_resolved'
  | 'disambiguation_cancelled'
  | 'support_local_answered'
  | 'support_unanswered';

export interface KindiLearningEventInput {
  eventType: KindiLearningEventType;
  interactionId?: string;
  routeKind?: KindiIntentKind;
  resultKind?: string;
  failureReason?: KindiLearningFailureReason;
  redactedQuery?: string;
  aiCategory?: string;
  confidence?: number;
  intentGuess?: string;
  parserStage?: KindiParserStage;
  parserName?: string;
  metadata?: Record<string, unknown>;
  parserVersion?: string;
  localLexiconVersion?: string;
}

const containsRedactionToken = (value: string | undefined): boolean =>
  Boolean(value && /\[NAME_\d+\]/.test(value));

const sanitizeMetadata = (metadata: Record<string, unknown> | undefined): Record<string, unknown> => {
  if (!metadata) return {};

  return Object.fromEntries(
    Object.entries(metadata)
      .filter(([, value]) =>
        value === null
        || typeof value === 'string'
        || typeof value === 'number'
        || typeof value === 'boolean'
      )
      .filter(([key]) => !/(person|target|subject|email|query|raw|id)$/i.test(key))
  );
};

export const insertKindiLearningEvent = async (event: KindiLearningEventInput): Promise<void> => {
  if (event.redactedQuery && !containsRedactionToken(event.redactedQuery)) return;
  if (event.confidence !== undefined && (!Number.isFinite(event.confidence) || event.confidence < 0 || event.confidence > 1)) return;

  const token = await authTokenService.getPreferredSupabaseToken();
  if (!token) return;

  const supabase = getSupabaseFull(undefined, undefined, token);
  const { error } = await supabase
    .from('kindi_learning_events')
    .insert({
      event_type: event.eventType,
      interaction_id: event.interactionId,
      route_kind: event.routeKind,
      result_kind: event.resultKind,
      failure_reason: event.failureReason,
      redacted_query: event.redactedQuery,
      ai_category: event.aiCategory,
      confidence: event.confidence,
      intent_guess: event.intentGuess,
      parser_stage: event.parserStage,
      parser_name: event.parserName,
      parser_version: event.parserVersion ?? KINDI_PARSER_VERSION,
      local_lexicon_version: event.localLexiconVersion ?? KINDI_LOCAL_LEXICON_VERSION,
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
