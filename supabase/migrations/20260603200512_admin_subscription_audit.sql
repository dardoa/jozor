begin;

create table if not exists public.subscription_override_audit_events (
  id uuid primary key default gen_random_uuid(),
  target_user_id text not null references public.user_profiles(id) on delete cascade,
  actor_user_id uuid references auth.users(id) on delete set null,
  action text not null check (action in ('grant', 'revoke', 'replace')),
  override_id uuid references public.subscription_overrides(id) on delete set null,
  tier text check (tier is null or tier in ('free', 'pro', 'family')),
  source text check (source is null or source in ('manual_comp', 'sandbox_test', 'internal_test')),
  reason text,
  expires_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_subscription_override_audit_target_created
  on public.subscription_override_audit_events(target_user_id, created_at desc);

create index if not exists idx_subscription_override_audit_actor_created
  on public.subscription_override_audit_events(actor_user_id, created_at desc);

create index if not exists idx_subscription_override_audit_action_created
  on public.subscription_override_audit_events(action, created_at desc);

alter table public.subscription_override_audit_events enable row level security;

drop policy if exists "App admins can read subscription override audit" on public.subscription_override_audit_events;
create policy "App admins can read subscription override audit"
  on public.subscription_override_audit_events
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

revoke all on public.subscription_override_audit_events from public, anon, authenticated;
grant select on public.subscription_override_audit_events to authenticated;
grant all on public.subscription_override_audit_events to service_role;

comment on table public.subscription_override_audit_events is
  'Append-only audit trail for admin subscription override grants and revocations. Written by server-side admin APIs only.';

commit;

notify pgrst, 'reload schema';
