begin;

create table if not exists public.billing_webhook_diagnostics (
  id uuid primary key default gen_random_uuid(),
  provider text not null default 'paddle' check (provider in ('paddle')),
  event_id text,
  event_type text,
  processing_status text not null check (processing_status in ('received', 'processed', 'ignored', 'failed')),
  reason text,
  target_user_id text references public.user_profiles(id) on delete set null,
  subscription_id text,
  customer_id text,
  price_id text,
  tier text check (tier is null or tier in ('free', 'pro', 'family')),
  http_status integer,
  occurred_at timestamptz,
  received_at timestamptz not null default now(),
  metadata jsonb not null default '{}'::jsonb
);

create index if not exists idx_billing_webhook_diagnostics_received_at
  on public.billing_webhook_diagnostics(received_at desc);

create index if not exists idx_billing_webhook_diagnostics_event_id
  on public.billing_webhook_diagnostics(event_id);

create index if not exists idx_billing_webhook_diagnostics_status_received
  on public.billing_webhook_diagnostics(processing_status, received_at desc);

create index if not exists idx_billing_webhook_diagnostics_target_received
  on public.billing_webhook_diagnostics(target_user_id, received_at desc);

alter table public.billing_webhook_diagnostics enable row level security;

drop policy if exists "App admins can read billing webhook diagnostics" on public.billing_webhook_diagnostics;
create policy "App admins can read billing webhook diagnostics"
  on public.billing_webhook_diagnostics
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

revoke all on public.billing_webhook_diagnostics from public, anon, authenticated;
grant select on public.billing_webhook_diagnostics to authenticated;
grant all on public.billing_webhook_diagnostics to service_role;

comment on table public.billing_webhook_diagnostics is
  'Redacted Paddle webhook diagnostics for admin troubleshooting. Does not store raw payloads, signatures, tokens, or customer email.';

commit;

notify pgrst, 'reload schema';
