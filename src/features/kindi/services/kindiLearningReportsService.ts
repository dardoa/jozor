import type { UserProfile } from '../../../types/common';
import { getSupabaseFull } from '../../../services/supabaseClient';
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
  type KindiLearningEventType,
} from '../logic/kindiLearningDimensions';
import { KINDI_LEARNING_FAILURE_REASONS } from '../logic/kindiLearningTaxonomy';

export type { KindiLearningEventType } from '../logic/kindiLearningDimensions';

export interface KindiLearningReportFilters {
  dateFrom?: string;
  dateTo?: string;
  eventType?: KindiLearningEventType | 'all';
  parserVersion?: string;
}

export interface KindiLearningOverview {
  total_events: number;
  kindi_uses: number;
  ai_fallbacks: number;
  search_failures: number;
  disambiguations: number;
  cancellations: number;
  confirmed_ai_successes: number;
  local_improvement_opportunities: number;
  answer_feedback_total: number;
  answer_helpful_rate: number;
  cancellation_rate: number;
  ai_success_after_confirmation_rate: number;
}

export interface KindiFailureSummary {
  reason: string;
  route_kind: string | null;
  event_count: number;
  last_seen_at: string | null;
}

export interface KindiFallbackSummary {
  fallback_result: string;
  event_count: number;
  avg_confidence: number | null;
  last_seen_at: string | null;
}

export interface KindiAmbiguousNamesSummary {
  redacted_pattern: string;
  event_count: number;
  avg_candidate_count: number | null;
  last_seen_at: string | null;
}

export interface KindiRedactedQuerySummary {
  redacted_query: string;
  event_count: number;
  last_seen_at: string | null;
}

export interface KindiLearningEventRow {
  id: string;
  interaction_id: string | null;
  event_type: KindiLearningEventType;
  route_kind: string | null;
  result_kind: string | null;
  failure_reason: string | null;
  redacted_query: string | null;
  ai_category: string | null;
  confidence: number | null;
  intent_guess: string | null;
  parser_stage: string | null;
  parser_name: string | null;
  parser_version: string;
  local_lexicon_version: string;
  metadata: Record<string, unknown>;
  created_at: string;
}

export interface KindiLocalOpportunitySummary {
  redacted_query: string;
  route_kind: string | null;
  intent_guess: string | null;
  failure_reason: string | null;
  parser_stage: string | null;
  parser_version: string | null;
  opportunity_count: number;
  avg_ai_confidence: number | null;
  last_seen_at: string | null;
}

export interface KindiAnswerFeedbackSummary {
  answer_source: 'local-tree' | 'help-center' | 'cloud-assisted' | 'unknown';
  answer_kind: 'relationship' | 'diagnostic' | 'biography' | 'record-review' | 'search' | 'guide' | 'change' | 'unknown';
  topic_id: string | null;
  helpful_count: number;
  unhelpful_count: number;
  total_count: number;
  helpful_rate: number;
  last_seen_at: string | null;
}

export interface KindiLearningReports {
  isAdmin: boolean;
  overview: KindiLearningOverview;
  failures: KindiFailureSummary[];
  fallbacks: KindiFallbackSummary[];
  ambiguousNames: KindiAmbiguousNamesSummary[];
  redactedQueries: KindiRedactedQuerySummary[];
  localOpportunities: KindiLocalOpportunitySummary[];
  answerFeedback: KindiAnswerFeedbackSummary[];
  recentEvents: KindiLearningEventRow[];
}

const emptyOverview: KindiLearningOverview = {
  total_events: 0,
  kindi_uses: 0,
  ai_fallbacks: 0,
  search_failures: 0,
  disambiguations: 0,
  cancellations: 0,
  confirmed_ai_successes: 0,
  local_improvement_opportunities: 0,
  answer_feedback_total: 0,
  answer_helpful_rate: 0,
  cancellation_rate: 0,
  ai_success_after_confirmation_rate: 0,
};

const getClient = (user: UserProfile) =>
  getSupabaseFull(user.uid, user.email || '', user.supabaseToken);

const sortByCount = <T extends { event_count: number; last_seen_at: string | null }>(rows: T[]) =>
  rows.sort((a, b) => {
    if (b.event_count !== a.event_count) return b.event_count - a.event_count;
    return (Date.parse(b.last_seen_at ?? '') || 0) - (Date.parse(a.last_seen_at ?? '') || 0);
  });

const average = (values: number[]) =>
  values.length === 0 ? null : values.reduce((total, value) => total + value, 0) / values.length;

const ANSWER_SOURCES = new Set<KindiAnswerFeedbackSummary['answer_source']>([
  ...KINDI_LEARNING_ANSWER_SOURCES,
]);
const ANSWER_KINDS = new Set<KindiAnswerFeedbackSummary['answer_kind']>([
  ...KINDI_LEARNING_ANSWER_KINDS,
]);
const SAFE_TOPIC_ID_PATTERN = /^[a-z0-9][a-z0-9-]{0,79}$/;

const getAnswerFeedbackIdentity = (metadata: Record<string, unknown>) => {
  const sourceValue = metadata.answerSource;
  const kindValue = metadata.answerKind;
  const topicValue = metadata.topicId;
  const answerSource = typeof sourceValue === 'string' && ANSWER_SOURCES.has(sourceValue as KindiAnswerFeedbackSummary['answer_source'])
    ? sourceValue as KindiAnswerFeedbackSummary['answer_source']
    : 'unknown';
  const answerKind = typeof kindValue === 'string' && ANSWER_KINDS.has(kindValue as KindiAnswerFeedbackSummary['answer_kind'])
    ? kindValue as KindiAnswerFeedbackSummary['answer_kind']
    : 'unknown';
  const topicId = answerSource === 'help-center'
    && typeof topicValue === 'string'
    && SAFE_TOPIC_ID_PATTERN.test(topicValue)
    ? topicValue
    : null;

  return { answerSource, answerKind, topicId };
};

const KNOWN_EVENT_TYPES = new Set<string>(KINDI_LEARNING_EVENT_TYPES);
const SAFE_ROUTE_KINDS = new Set<string>(KINDI_LEARNING_ROUTE_KINDS);
const SAFE_RESULT_KINDS = new Set<string>(KINDI_LEARNING_RESULT_KINDS);
const SAFE_FAILURE_REASONS = new Set<string>(Object.values(KINDI_LEARNING_FAILURE_REASONS));
const SAFE_AI_CATEGORIES = new Set<string>(KINDI_LEARNING_AI_CATEGORIES);
const SAFE_INTENT_GUESSES = new Set<string>(KINDI_LEARNING_INTENT_GUESSES);
const SAFE_PARSER_STAGES = new Set<string>(KINDI_LEARNING_PARSER_STAGES);
const SAFE_PARSER_NAMES = new Set<string>(KINDI_LEARNING_PARSER_NAMES);
const SAFE_PLAN_TYPES = new Set<string>(KINDI_LEARNING_PLAN_TYPES);
const SAFE_INTERACTION_ID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const SAFE_PARSER_VERSION_PATTERN = /^\d{4}-\d{2}-kindi-parser-v\d+$/;
const SAFE_LEXICON_VERSION_PATTERN = /^\d{4}-\d{2}-kindi-v\d+$/;
const PRIVATE_REPORT_TEXT_PATTERN = /(?:https?:\/\/|file:\/\/|s3:\/\/|blob:|[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}|bearer\s+|eyJ[A-Za-z0-9_-]{10,}\.)/i;

const safeAllowedReportDimension = (
  value: unknown,
  allowedValues: ReadonlySet<string>
): string | null => typeof value === 'string' && allowedValues.has(value) ? value : null;

const safeReportVersion = (value: unknown, pattern: RegExp): string =>
  typeof value === 'string' && pattern.test(value) ? value : 'unknown';

const safeReportTimestamp = (value: unknown): string =>
  typeof value === 'string' && Number.isFinite(Date.parse(value))
    ? value
    : '1970-01-01T00:00:00.000Z';

const safeRedactedQuery = (value: unknown): string | null => {
  if (typeof value !== 'string' || value.length > 500) return null;
  if (!/\[NAME_\d+\]/.test(value) || PRIVATE_REPORT_TEXT_PATTERN.test(value)) return null;
  return value;
};

const safeReportMetadata = (metadata: Record<string, unknown>): Record<string, unknown> => {
  const safe: Record<string, unknown> = {};
  const numericKeys = ['bestFuseScore', 'bestScore'];
  const countKeys = ['candidateCount', 'lowConfidenceCount'];

  numericKeys.forEach((key) => {
    const value = metadata[key];
    if (typeof value === 'number' && Number.isFinite(value)) safe[key] = value;
  });
  countKeys.forEach((key) => {
    const value = metadata[key];
    if (typeof value === 'number' && Number.isInteger(value) && value >= 0) safe[key] = value;
  });
  const planType = safeAllowedReportDimension(metadata.planType, SAFE_PLAN_TYPES);
  const route = safeAllowedReportDimension(metadata.route, SAFE_ROUTE_KINDS);
  if (planType) safe.planType = planType;
  if (route) safe.route = route;

  const feedback = getAnswerFeedbackIdentity(metadata);
  if (feedback.answerSource !== 'unknown') safe.answerSource = feedback.answerSource;
  if (feedback.answerKind !== 'unknown') safe.answerKind = feedback.answerKind;
  if (feedback.topicId) safe.topicId = feedback.topicId;

  return safe;
};

const normalizeReportEvent = (
  event: KindiLearningEventRow,
  index: number
): KindiLearningEventRow => ({
  id: `report-event-${index + 1}`,
  interaction_id: typeof event.interaction_id === 'string' && SAFE_INTERACTION_ID_PATTERN.test(event.interaction_id)
    ? event.interaction_id
    : null,
  event_type: event.event_type,
  route_kind: safeAllowedReportDimension(event.route_kind, SAFE_ROUTE_KINDS),
  result_kind: safeAllowedReportDimension(event.result_kind, SAFE_RESULT_KINDS),
  failure_reason: safeAllowedReportDimension(event.failure_reason, SAFE_FAILURE_REASONS),
  redacted_query: safeRedactedQuery(event.redacted_query),
  ai_category: safeAllowedReportDimension(event.ai_category, SAFE_AI_CATEGORIES),
  confidence: typeof event.confidence === 'number'
    && Number.isFinite(event.confidence)
    && event.confidence >= 0
    && event.confidence <= 1
    ? event.confidence
    : null,
  intent_guess: safeAllowedReportDimension(event.intent_guess, SAFE_INTENT_GUESSES),
  parser_stage: safeAllowedReportDimension(event.parser_stage, SAFE_PARSER_STAGES),
  parser_name: safeAllowedReportDimension(event.parser_name, SAFE_PARSER_NAMES),
  parser_version: safeReportVersion(event.parser_version, SAFE_PARSER_VERSION_PATTERN),
  local_lexicon_version: safeReportVersion(event.local_lexicon_version, SAFE_LEXICON_VERSION_PATTERN),
  metadata: safeReportMetadata(
    event.metadata && typeof event.metadata === 'object' && !Array.isArray(event.metadata)
      ? event.metadata
      : {}
  ),
  created_at: safeReportTimestamp(event.created_at),
});

export const buildReportsFromEvents = (unsafeEvents: KindiLearningEventRow[]): Omit<KindiLearningReports, 'isAdmin'> => {
  const events = unsafeEvents
    .filter((event) => KNOWN_EVENT_TYPES.has(event.event_type))
    .map(normalizeReportEvent);
  const confirmationDecisions = events.filter((event) =>
    event.event_type === 'confirmation_confirmed' || event.event_type === 'confirmation_cancelled'
  ).length;
  const confirmedEvents = events.filter((event) => event.event_type === 'confirmation_confirmed');
  const confirmedAiSuccesses = confirmedEvents.filter((event) => event.result_kind === 'ai_success').length;
  const answerFeedbackEvents = events.filter((event) =>
    event.event_type === 'answer_feedback_helpful' || event.event_type === 'answer_feedback_unhelpful'
  );

  const failures = new Map<string, KindiFailureSummary>();
  const fallbacks = new Map<string, KindiFallbackSummary & { confidenceValues: number[] }>();
  const ambiguousNames = new Map<string, KindiAmbiguousNamesSummary & { candidateValues: number[] }>();
  const redactedQueries = new Map<string, KindiRedactedQuerySummary>();
  const interactionEvents = new Map<string, KindiLearningEventRow[]>();
  const answerFeedback = new Map<string, KindiAnswerFeedbackSummary>();

  events.forEach((event) => {
    if (event.interaction_id) {
      interactionEvents.set(event.interaction_id, [
        ...(interactionEvents.get(event.interaction_id) ?? []),
        event,
      ]);
    }

    if (event.event_type === 'search_failure' || event.event_type === 'confirmation_failed') {
      const reason = event.failure_reason ?? event.result_kind ?? event.event_type;
      const key = `${reason}:${event.route_kind ?? ''}`;
      const current = failures.get(key) ?? {
        reason,
        route_kind: event.route_kind,
        event_count: 0,
        last_seen_at: null,
      };
      current.event_count += 1;
      current.last_seen_at = event.created_at > (current.last_seen_at ?? '') ? event.created_at : current.last_seen_at;
      failures.set(key, current);
    }

    if (event.event_type === 'ai_fallback_requested' || event.event_type === 'ai_fallback_result') {
      const fallbackResult = event.ai_category ?? event.result_kind ?? 'unknown';
      const current = fallbacks.get(fallbackResult) ?? {
        fallback_result: fallbackResult,
        event_count: 0,
        avg_confidence: null,
        last_seen_at: null,
        confidenceValues: [],
      };
      current.event_count += 1;
      if (typeof event.confidence === 'number') current.confidenceValues.push(event.confidence);
      current.avg_confidence = average(current.confidenceValues);
      current.last_seen_at = event.created_at > (current.last_seen_at ?? '') ? event.created_at : current.last_seen_at;
      fallbacks.set(fallbackResult, current);
    }

    if (event.event_type === 'disambiguation_shown') {
      const pattern = event.redacted_query ?? 'unknown';
      const current = ambiguousNames.get(pattern) ?? {
        redacted_pattern: pattern,
        event_count: 0,
        avg_candidate_count: null,
        last_seen_at: null,
        candidateValues: [],
      };
      const candidateCount = event.metadata.candidateCount;
      current.event_count += 1;
      if (typeof candidateCount === 'number') current.candidateValues.push(candidateCount);
      current.avg_candidate_count = average(current.candidateValues);
      current.last_seen_at = event.created_at > (current.last_seen_at ?? '') ? event.created_at : current.last_seen_at;
      ambiguousNames.set(pattern, current);
    }

    if (event.redacted_query) {
      const current = redactedQueries.get(event.redacted_query) ?? {
        redacted_query: event.redacted_query,
        event_count: 0,
        last_seen_at: null,
      };
      current.event_count += 1;
      current.last_seen_at = event.created_at > (current.last_seen_at ?? '') ? event.created_at : current.last_seen_at;
      redactedQueries.set(event.redacted_query, current);
    }

    if (event.event_type === 'answer_feedback_helpful' || event.event_type === 'answer_feedback_unhelpful') {
      const { answerSource, answerKind, topicId } = getAnswerFeedbackIdentity(event.metadata);
      const key = `${answerSource}|${answerKind}|${topicId ?? ''}`;
      const current = answerFeedback.get(key) ?? {
        answer_source: answerSource,
        answer_kind: answerKind,
        topic_id: topicId,
        helpful_count: 0,
        unhelpful_count: 0,
        total_count: 0,
        helpful_rate: 0,
        last_seen_at: null,
      };
      if (event.event_type === 'answer_feedback_helpful') current.helpful_count += 1;
      if (event.event_type === 'answer_feedback_unhelpful') current.unhelpful_count += 1;
      current.total_count += 1;
      current.helpful_rate = current.helpful_count / current.total_count;
      current.last_seen_at = event.created_at > (current.last_seen_at ?? '') ? event.created_at : current.last_seen_at;
      answerFeedback.set(key, current);
    }
  });

  const opportunityEvents = Array.from(interactionEvents.values())
    .map((interaction) => {
      const hadLocalFailure = interaction.some((event) => event.event_type === 'search_failure');
      const hadAiResult = interaction.some((event) => event.event_type === 'ai_fallback_result');
      const hadConfirmedAiSuccess = interaction.some((event) =>
        event.event_type === 'confirmation_confirmed' && event.result_kind === 'ai_success'
      );
      if (!hadLocalFailure || !hadAiResult || !hadConfirmedAiSuccess) return null;

      const redactedQuery = interaction.find((event) => event.redacted_query)?.redacted_query;
      if (!redactedQuery) return null;

      const confidenceValues = interaction
        .filter((event) => event.event_type === 'ai_fallback_result' && typeof event.confidence === 'number')
        .map((event) => event.confidence as number);
      const latestEvent = interaction.reduce((latest, event) =>
        event.created_at > latest.created_at ? event : latest
      );
      const failureEvent = interaction.find((event) => event.failure_reason);
      const routeEvent = interaction.find((event) => event.route_kind);
      const intentEvent = interaction.find((event) => event.intent_guess);
      const parserEvent = interaction.find((event) => event.parser_stage || event.parser_name);

      return {
        redactedQuery,
        routeKind: routeEvent?.route_kind ?? null,
        intentGuess: intentEvent?.intent_guess ?? null,
        failureReason: failureEvent?.failure_reason ?? null,
        parserStage: parserEvent?.parser_stage ?? null,
        parserVersion: latestEvent.parser_version,
        avgAiConfidence: average(confidenceValues),
        lastSeenAt: latestEvent.created_at,
      };
    })
    .filter((event): event is NonNullable<typeof event> => event !== null);

  const localOpportunities = new Map<string, KindiLocalOpportunitySummary & { confidenceValues: number[] }>();
  opportunityEvents.forEach((event) => {
    const key = [
      event.redactedQuery,
      event.routeKind ?? '',
      event.intentGuess ?? '',
      event.failureReason ?? '',
      event.parserStage ?? '',
      event.parserVersion ?? '',
    ].join('|');
    const current = localOpportunities.get(key) ?? {
      redacted_query: event.redactedQuery,
      route_kind: event.routeKind,
      intent_guess: event.intentGuess,
      failure_reason: event.failureReason,
      parser_stage: event.parserStage,
      parser_version: event.parserVersion,
      opportunity_count: 0,
      avg_ai_confidence: null,
      last_seen_at: null,
      confidenceValues: [],
    };
    current.opportunity_count += 1;
    if (typeof event.avgAiConfidence === 'number') current.confidenceValues.push(event.avgAiConfidence);
    current.avg_ai_confidence = average(current.confidenceValues);
    current.last_seen_at = event.lastSeenAt > (current.last_seen_at ?? '') ? event.lastSeenAt : current.last_seen_at;
    localOpportunities.set(key, current);
  });

  return {
    overview: {
      total_events: events.length,
      kindi_uses: events.filter((event) => event.event_type === 'query_submitted').length,
      ai_fallbacks: events.filter((event) => event.event_type === 'ai_fallback_requested').length,
      search_failures: events.filter((event) => event.event_type === 'search_failure').length,
      disambiguations: events.filter((event) => event.event_type === 'disambiguation_shown').length,
      cancellations: events.filter((event) => event.event_type === 'confirmation_cancelled').length,
      confirmed_ai_successes: confirmedAiSuccesses,
      local_improvement_opportunities: opportunityEvents.length,
      answer_feedback_total: answerFeedbackEvents.length,
      answer_helpful_rate: answerFeedbackEvents.length === 0
        ? 0
        : answerFeedbackEvents.filter((event) => event.event_type === 'answer_feedback_helpful').length / answerFeedbackEvents.length,
      cancellation_rate: confirmationDecisions === 0
        ? 0
        : events.filter((event) => event.event_type === 'confirmation_cancelled').length / confirmationDecisions,
      ai_success_after_confirmation_rate: confirmedEvents.length === 0
        ? 0
        : confirmedAiSuccesses / confirmedEvents.length,
    },
    failures: sortByCount(Array.from(failures.values())).slice(0, 20),
    fallbacks: sortByCount(Array.from(fallbacks.values()).map((row) => ({
      fallback_result: row.fallback_result,
      event_count: row.event_count,
      avg_confidence: row.avg_confidence,
      last_seen_at: row.last_seen_at,
    }))).slice(0, 20),
    ambiguousNames: sortByCount(Array.from(ambiguousNames.values()).map((row) => ({
      redacted_pattern: row.redacted_pattern,
      event_count: row.event_count,
      avg_candidate_count: row.avg_candidate_count,
      last_seen_at: row.last_seen_at,
    }))).slice(0, 20),
    redactedQueries: sortByCount(Array.from(redactedQueries.values())).slice(0, 20),
    localOpportunities: sortByCount(
      Array.from(localOpportunities.values()).map((row) => ({
        redacted_query: row.redacted_query,
        route_kind: row.route_kind,
        intent_guess: row.intent_guess,
        failure_reason: row.failure_reason,
        parser_stage: row.parser_stage,
        parser_version: row.parser_version,
        opportunity_count: row.opportunity_count,
        avg_ai_confidence: row.avg_ai_confidence,
        last_seen_at: row.last_seen_at,
        event_count: row.opportunity_count,
      }))
    ).map((row) => ({
      redacted_query: row.redacted_query,
      route_kind: row.route_kind,
      intent_guess: row.intent_guess,
      failure_reason: row.failure_reason,
      parser_stage: row.parser_stage,
      parser_version: row.parser_version,
      opportunity_count: row.opportunity_count,
      avg_ai_confidence: row.avg_ai_confidence,
      last_seen_at: row.last_seen_at,
    })).slice(0, 20),
    answerFeedback: Array.from(answerFeedback.values())
      .sort((a, b) => {
        if (b.total_count !== a.total_count) return b.total_count - a.total_count;
        return (Date.parse(b.last_seen_at ?? '') || 0) - (Date.parse(a.last_seen_at ?? '') || 0);
      })
      .slice(0, 20),
    recentEvents: events.slice(0, 100).map((event) => ({
      ...event,
      interaction_id: null,
    })),
  };
};

export const checkKindiReportsAdminAccess = async (user: UserProfile): Promise<boolean> => {
  const client = getClient(user);
  const { data, error } = await client
    .from('admin_users')
    .select('user_id')
    .eq('user_id', user.uid)
    .eq('is_active', true)
    .maybeSingle();

  if (error) throw error;
  return Boolean(data);
};

export const fetchKindiLearningReports = async (
  user: UserProfile,
  filters: KindiLearningReportFilters = {}
): Promise<KindiLearningReports> => {
  const client = getClient(user);
  const isAdmin = await checkKindiReportsAdminAccess(user);
  if (!isAdmin) {
    return {
      isAdmin: false,
      overview: emptyOverview,
      failures: [],
      fallbacks: [],
      ambiguousNames: [],
      redactedQueries: [],
      localOpportunities: [],
      answerFeedback: [],
      recentEvents: [],
    };
  }

  let eventsQuery = client
    .from('kindi_learning_events')
    .select('id,interaction_id,event_type,route_kind,result_kind,failure_reason,redacted_query,ai_category,confidence,intent_guess,parser_stage,parser_name,parser_version,local_lexicon_version,metadata,created_at')
    .order('created_at', { ascending: false })
    .limit(5000);

  if (filters.dateFrom) eventsQuery = eventsQuery.gte('created_at', filters.dateFrom);
  if (filters.dateTo) eventsQuery = eventsQuery.lte('created_at', filters.dateTo);
  if (filters.eventType && filters.eventType !== 'all') eventsQuery = eventsQuery.eq('event_type', filters.eventType);
  if (filters.parserVersion) eventsQuery = eventsQuery.eq('parser_version', filters.parserVersion);

  const { data, error } = await eventsQuery;
  if (error) throw error;

  const computedReports = buildReportsFromEvents((data ?? []) as KindiLearningEventRow[]);

  return {
    isAdmin: true,
    ...computedReports,
  };
};
