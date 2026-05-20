begin;

create extension if not exists pg_cron with schema extensions;

create or replace function public.prune_kindi_learning_events(p_retention_days integer default 90)
returns integer
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
declare
  deleted_count integer;
begin
  if p_retention_days < 30 then
    raise exception 'Kindi learning retention must be at least 30 days';
  end if;

  delete from public.kindi_learning_events
  where created_at < now() - make_interval(days => p_retention_days);

  get diagnostics deleted_count = row_count;
  return deleted_count;
end;
$$;

revoke all on function public.prune_kindi_learning_events(integer) from public;

do $$
begin
  perform cron.unschedule('kindi-learning-retention-daily');
exception
  when others then
    null;
end $$;

select cron.schedule(
  'kindi-learning-retention-daily',
  '17 2 * * *',
  $$select public.prune_kindi_learning_events(90);$$
);

comment on function public.prune_kindi_learning_events(integer) is
  'Deletes Kindi learning events older than the configured retention window. Default retention is 90 days.';

commit;
