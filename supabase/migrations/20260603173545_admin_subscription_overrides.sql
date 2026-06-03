begin;

create table if not exists public.subscription_overrides (
  id uuid primary key default gen_random_uuid(),
  user_id text not null references public.user_profiles(id) on delete cascade,
  tier text not null check (tier in ('free', 'pro', 'family')),
  source text not null check (source in ('manual_comp', 'sandbox_test', 'internal_test')),
  reason text,
  starts_at timestamptz not null default now(),
  expires_at timestamptz,
  is_active boolean not null default true,
  created_by uuid references auth.users(id) on delete set null,
  revoked_at timestamptz,
  revoked_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists uq_subscription_overrides_one_active_per_user
  on public.subscription_overrides(user_id)
  where is_active and revoked_at is null;

create index if not exists idx_subscription_overrides_user_active
  on public.subscription_overrides(user_id, is_active, expires_at);

alter table public.subscription_overrides enable row level security;

drop policy if exists "Users can read their own subscription override" on public.subscription_overrides;
create policy "Users can read their own subscription override"
  on public.subscription_overrides
  for select
  to authenticated
  using ((select auth.uid())::text = user_id);

drop policy if exists "App admins can read subscription overrides" on public.subscription_overrides;
create policy "App admins can read subscription overrides"
  on public.subscription_overrides
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

revoke all on public.subscription_overrides from public, anon, authenticated;
grant select on public.subscription_overrides to authenticated;
grant all on public.subscription_overrides to service_role;

comment on table public.subscription_overrides is
  'Manual admin subscription grants. These do not mutate Paddle subscription rows; the app resolves the effective tier from the strongest active entitlement.';

commit;

notify pgrst, 'reload schema';
