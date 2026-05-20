begin;

alter table public.kindi_learning_events
  add column if not exists interaction_id uuid,
  add column if not exists intent_guess text,
  add column if not exists parser_stage text,
  add column if not exists parser_name text;

create index if not exists idx_kindi_learning_events_interaction_id
  on public.kindi_learning_events (interaction_id)
  where interaction_id is not null;

create index if not exists idx_kindi_learning_events_parser_version_created_at
  on public.kindi_learning_events (parser_version, created_at desc);

create index if not exists idx_kindi_learning_events_parser_stage_created_at
  on public.kindi_learning_events (parser_stage, created_at desc)
  where parser_stage is not null;

create or replace view public.kindi_ai_to_local_opportunity_summary
with (security_invoker = true)
as
with interaction_rollup as (
  select
    interaction_id,
    coalesce(
      max(redacted_query) filter (where redacted_query is not null),
      'unknown'
    ) as redacted_query,
    max(route_kind) filter (where route_kind is not null) as route_kind,
    max(intent_guess) filter (where intent_guess is not null) as intent_guess,
    max(failure_reason) filter (where failure_reason is not null) as failure_reason,
    max(parser_stage) filter (where parser_stage is not null) as parser_stage,
    max(parser_version) as parser_version,
    avg(confidence) filter (where event_type = 'ai_fallback_result' and confidence is not null) as avg_ai_confidence,
    max(created_at) as last_seen_at,
    bool_or(event_type = 'search_failure') as had_local_failure,
    bool_or(event_type = 'ai_fallback_result') as had_ai_result,
    bool_or(event_type = 'confirmation_confirmed' and result_kind = 'ai_success') as had_confirmed_ai_success
  from public.kindi_learning_events
  where interaction_id is not null
  group by interaction_id
)
select
  redacted_query,
  route_kind,
  intent_guess,
  failure_reason,
  parser_stage,
  parser_version,
  count(*)::bigint as opportunity_count,
  avg(avg_ai_confidence) as avg_ai_confidence,
  max(last_seen_at) as last_seen_at
from interaction_rollup
where had_local_failure
  and had_ai_result
  and had_confirmed_ai_success
  and redacted_query <> 'unknown'
group by
  redacted_query,
  route_kind,
  intent_guess,
  failure_reason,
  parser_stage,
  parser_version;

grant select on table public.kindi_ai_to_local_opportunity_summary to authenticated;

comment on column public.kindi_learning_events.interaction_id is
  'Client-generated request correlation ID used to connect query, local failure, AI fallback, confirmation, and cancellation events.';

comment on column public.kindi_learning_events.failure_reason is
  'Application-level taxonomy value. Keep values stable and uppercase; do not store raw user text here.';

comment on view public.kindi_ai_to_local_opportunity_summary is
  'Read-only admin report for repeated redacted requests that failed locally, succeeded through AI, and were confirmed by the user.';

commit;
