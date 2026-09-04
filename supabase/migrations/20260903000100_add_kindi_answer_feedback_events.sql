begin;

alter table public.kindi_learning_events
  drop constraint if exists kindi_learning_events_event_type_check;

alter table public.kindi_learning_events
  add constraint kindi_learning_events_event_type_check
  check (
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
      'support_unanswered',
      'answer_feedback_helpful',
      'answer_feedback_unhelpful'
    )
  ) not valid;

comment on constraint kindi_learning_events_event_type_check
  on public.kindi_learning_events is
  'Allows only recognized Kindi lifecycle and privacy-safe answer feedback events.';

commit;
