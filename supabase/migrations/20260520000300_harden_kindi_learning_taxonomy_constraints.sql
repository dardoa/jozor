begin;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'kindi_learning_events_failure_reason_taxonomy'
      and conrelid = 'public.kindi_learning_events'::regclass
  ) then
    alter table public.kindi_learning_events
      add constraint kindi_learning_events_failure_reason_taxonomy
      check (
        failure_reason is null
        or failure_reason in (
          'UNKNOWN_DIALECT_WORD',
          'NAME_AMBIGUOUS',
          'FIELD_NOT_RECOGNIZED',
          'RELATION_NOT_SUPPORTED',
          'LOCAL_SEARCH_FAILED',
          'AI_LOW_CONFIDENCE',
          'USER_CANCELLED',
          'USER_REJECTED_DRAFT',
          'SUPPORT_TOPIC_MISSING',
          'PARSER_PATTERN_MISSING',
          'EXECUTION_FAILED',
          'PERMISSION_DENIED'
        )
      ) not valid;
  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'kindi_learning_events_parser_stage_taxonomy'
      and conrelid = 'public.kindi_learning_events'::regclass
  ) then
    alter table public.kindi_learning_events
      add constraint kindi_learning_events_parser_stage_taxonomy
      check (
        parser_stage is null
        or parser_stage in (
          'intent_router',
          'local_search',
          'command_planner',
          'ai_fallback',
          'confirmation',
          'disambiguation',
          'support_guide',
          'execution'
        )
      ) not valid;
  end if;
end $$;

comment on constraint kindi_learning_events_failure_reason_taxonomy
  on public.kindi_learning_events is
  'Constrains new Kindi learning events to the application failure taxonomy without validating older exploratory rows.';

comment on constraint kindi_learning_events_parser_stage_taxonomy
  on public.kindi_learning_events is
  'Constrains new Kindi learning events to known parser stages without validating older exploratory rows.';

commit;
