create table if not exists public.ai_usage (
  user_id uuid primary key references auth.users(id) on delete cascade,
  usage_count integer not null default 0 check (usage_count >= 0),
  "limit" integer not null default 100 check ("limit" > 0),
  last_reset timestamptz not null default now(),
  period text not null default 'daily' check (period in ('daily', 'monthly')),
  plan_tier text not null default 'default',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.ai_usage enable row level security;

revoke all on table public.ai_usage from public;
revoke all on table public.ai_usage from anon;
revoke all on table public.ai_usage from authenticated;
grant select, insert, update on table public.ai_usage to service_role;

create or replace function public.reserve_ai_usage(p_user_id uuid)
returns table (
  allowed boolean,
  usage_count integer,
  "limit" integer,
  last_reset timestamptz,
  period text,
  next_reset timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
declare
  usage_row public.ai_usage%rowtype;
  current_timestamp_utc timestamptz := now();
  calculated_next_reset timestamptz;
begin
  insert into public.ai_usage (user_id)
  values (p_user_id)
  on conflict (user_id) do nothing;

  select *
  into usage_row
  from public.ai_usage
  where user_id = p_user_id
  for update;

  if usage_row.user_id is null then
    raise exception 'AI usage row could not be created for user %', p_user_id;
  end if;

  calculated_next_reset := case
    when usage_row.period = 'monthly' then usage_row.last_reset + interval '1 month'
    else usage_row.last_reset + interval '1 day'
  end;

  if current_timestamp_utc >= calculated_next_reset then
    update public.ai_usage
    set usage_count = 0,
        last_reset = current_timestamp_utc,
        updated_at = current_timestamp_utc
    where user_id = p_user_id
    returning * into usage_row;

    calculated_next_reset := case
      when usage_row.period = 'monthly' then usage_row.last_reset + interval '1 month'
      else usage_row.last_reset + interval '1 day'
    end;
  end if;

  if usage_row.usage_count >= usage_row."limit" then
    allowed := false;
    usage_count := usage_row.usage_count;
    "limit" := usage_row."limit";
    last_reset := usage_row.last_reset;
    period := usage_row.period;
    next_reset := calculated_next_reset;
    return next;
    return;
  end if;

  update public.ai_usage
  set usage_count = usage_row.usage_count + 1,
      updated_at = current_timestamp_utc
  where user_id = p_user_id
  returning * into usage_row;

  calculated_next_reset := case
    when usage_row.period = 'monthly' then usage_row.last_reset + interval '1 month'
    else usage_row.last_reset + interval '1 day'
  end;

  allowed := true;
  usage_count := usage_row.usage_count;
  "limit" := usage_row."limit";
  last_reset := usage_row.last_reset;
  period := usage_row.period;
  next_reset := calculated_next_reset;
  return next;
end;
$$;

revoke all on function public.reserve_ai_usage(uuid) from public;
revoke all on function public.reserve_ai_usage(uuid) from anon;
revoke all on function public.reserve_ai_usage(uuid) from authenticated;
grant execute on function public.reserve_ai_usage(uuid) to service_role;
