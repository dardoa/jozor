begin;

create table if not exists public.admin_users (
  user_id uuid primary key references auth.users(id) on delete cascade,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  created_by uuid references auth.users(id) on delete set null,
  note text
);

alter table public.admin_users enable row level security;

drop policy if exists "App admins can read their own admin grant" on public.admin_users;
create policy "App admins can read their own admin grant"
  on public.admin_users
  for select
  to authenticated
  using ((select auth.uid()) = user_id and is_active);

create table if not exists public.kindi_learning_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  event_type text not null check (
    event_type in (
      'query_submitted',
      'search_success',
      'search_failure',
      'ai_fallback_requested',
      'ai_fallback_result',
      'confirmation_shown',
      'confirmation_confirmed',
      'confirmation_cancelled',
      'confirmation_failed',
      'disambiguation_shown',
      'disambiguation_resolved',
      'disambiguation_cancelled',
      'support_local_answered',
      'support_unanswered'
    )
  ),
  route_kind text check (route_kind in ('QUERY', 'UNKNOWN', 'GREETING', 'SUPPORT', 'ACTION', 'UPDATE', 'DELETE')),
  result_kind text,
  failure_reason text,
  redacted_query text check (redacted_query is null or position('[NAME_' in redacted_query) > 0),
  ai_category text check (
    ai_category is null or ai_category in (
      'EXECUTABLE_COMMAND',
      'FAMILY_QUERY',
      'SUPPORT',
      'GREETING',
      'IRRELEVANT',
      'UNCLEAR'
    )
  ),
  confidence double precision check (confidence is null or (confidence >= 0 and confidence <= 1)),
  parser_version text not null,
  local_lexicon_version text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

alter table public.kindi_learning_events enable row level security;

drop policy if exists "Authenticated users can insert their own Kindi learning events" on public.kindi_learning_events;
create policy "Authenticated users can insert their own Kindi learning events"
  on public.kindi_learning_events
  for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

drop policy if exists "App admins can read Kindi learning events" on public.kindi_learning_events;
create policy "App admins can read Kindi learning events"
  on public.kindi_learning_events
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.admin_users au
      where au.user_id = (select auth.uid())
        and au.is_active
    )
  );

create index if not exists idx_kindi_learning_events_created_at
  on public.kindi_learning_events (created_at desc);

create index if not exists idx_kindi_learning_events_type_created_at
  on public.kindi_learning_events (event_type, created_at desc);

create index if not exists idx_kindi_learning_events_route_created_at
  on public.kindi_learning_events (route_kind, created_at desc);

create index if not exists idx_kindi_learning_events_failure_created_at
  on public.kindi_learning_events (failure_reason, created_at desc)
  where failure_reason is not null;

create or replace view public.kindi_failure_summary
with (security_invoker = true)
as
select
  coalesce(failure_reason, result_kind, event_type) as reason,
  route_kind,
  count(*)::bigint as event_count,
  max(created_at) as last_seen_at
from public.kindi_learning_events
where event_type in ('search_failure', 'confirmation_failed')
group by coalesce(failure_reason, result_kind, event_type), route_kind;

create or replace view public.kindi_fallback_summary
with (security_invoker = true)
as
select
  coalesce(ai_category, result_kind, 'unknown') as fallback_result,
  count(*)::bigint as event_count,
  avg(confidence) as avg_confidence,
  max(created_at) as last_seen_at
from public.kindi_learning_events
where event_type in ('ai_fallback_requested', 'ai_fallback_result')
group by coalesce(ai_category, result_kind, 'unknown');

create or replace view public.kindi_ambiguous_names_summary
with (security_invoker = true)
as
select
  coalesce(redacted_query, metadata->>'promptName', 'unknown') as redacted_pattern,
  count(*)::bigint as event_count,
  avg(
    case
      when metadata->>'candidateCount' ~ '^[0-9]+(\.[0-9]+)?$'
        then (metadata->>'candidateCount')::double precision
      else null
    end
  ) as avg_candidate_count,
  max(created_at) as last_seen_at
from public.kindi_learning_events
where event_type = 'disambiguation_shown'
group by coalesce(redacted_query, metadata->>'promptName', 'unknown');

create or replace view public.kindi_redacted_query_summary
with (security_invoker = true)
as
select
  redacted_query,
  count(*)::bigint as event_count,
  max(created_at) as last_seen_at
from public.kindi_learning_events
where redacted_query is not null
group by redacted_query;

create or replace view public.kindi_learning_report_overview
with (security_invoker = true)
as
select
  count(*)::bigint as total_events,
  count(*) filter (where event_type = 'query_submitted')::bigint as kindi_uses,
  count(*) filter (where event_type = 'ai_fallback_requested')::bigint as ai_fallbacks,
  count(*) filter (where event_type = 'search_failure')::bigint as search_failures,
  count(*) filter (where event_type = 'disambiguation_shown')::bigint as disambiguations,
  count(*) filter (where event_type = 'confirmation_cancelled')::bigint as cancellations,
  count(*) filter (where event_type = 'confirmation_confirmed' and result_kind = 'ai_success')::bigint as confirmed_ai_successes,
  case
    when count(*) filter (where event_type in ('confirmation_confirmed', 'confirmation_cancelled')) = 0 then 0
    else (
      count(*) filter (where event_type = 'confirmation_cancelled')::double precision
      / count(*) filter (where event_type in ('confirmation_confirmed', 'confirmation_cancelled'))::double precision
    )
  end as cancellation_rate,
  case
    when count(*) filter (where event_type = 'confirmation_confirmed') = 0 then 0
    else (
      count(*) filter (where event_type = 'confirmation_confirmed' and result_kind = 'ai_success')::double precision
      / count(*) filter (where event_type = 'confirmation_confirmed')::double precision
    )
  end as ai_success_after_confirmation_rate
from public.kindi_learning_events;

grant select on table public.admin_users to authenticated;
grant insert, select on table public.kindi_learning_events to authenticated;
grant select on table public.kindi_failure_summary to authenticated;
grant select on table public.kindi_fallback_summary to authenticated;
grant select on table public.kindi_ambiguous_names_summary to authenticated;
grant select on table public.kindi_redacted_query_summary to authenticated;
grant select on table public.kindi_learning_report_overview to authenticated;

comment on table public.admin_users is
  'Application-level admin allowlist. Do not use user-editable metadata for this authorization decision.';

comment on table public.kindi_learning_events is
  'Redacted, read-only Kindi learning telemetry for admin reports. Raw user queries, names, and person IDs must not be stored here.';

commit;
