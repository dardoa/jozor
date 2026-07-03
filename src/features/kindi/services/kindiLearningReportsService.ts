import type { UserProfile } from '../../../types/common';
import { getSupabaseFull } from '../../../services/supabaseClient';

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

export interface KindiLearningReports {
  isAdmin: boolean;
  overview: KindiLearningOverview;
  failures: KindiFailureSummary[];
  fallbacks: KindiFallbackSummary[];
  ambiguousNames: KindiAmbiguousNamesSummary[];
  redactedQueries: KindiRedactedQuerySummary[];
  localOpportunities: KindiLocalOpportunitySummary[];
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

const buildReportsFromEvents = (events: KindiLearningEventRow[]): Omit<KindiLearningReports, 'isAdmin'> => {
  const confirmationDecisions = events.filter((event) =>
    event.event_type === 'confirmation_confirmed' || event.event_type === 'confirmation_cancelled'
  ).length;
  const confirmedEvents = events.filter((event) => event.event_type === 'confirmation_confirmed');
  const confirmedAiSuccesses = confirmedEvents.filter((event) => event.result_kind === 'ai_success').length;

  const failures = new Map<string, KindiFailureSummary>();
  const fallbacks = new Map<string, KindiFallbackSummary & { confidenceValues: number[] }>();
  const ambiguousNames = new Map<string, KindiAmbiguousNamesSummary & { candidateValues: number[] }>();
  const redactedQueries = new Map<string, KindiRedactedQuerySummary>();
  const interactionEvents = new Map<string, KindiLearningEventRow[]>();

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
      const promptName = typeof event.metadata.promptName === 'string' ? event.metadata.promptName : 'unknown';
      const pattern = event.redacted_query ?? promptName;
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
    recentEvents: events.slice(0, 100),
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
