create table if not exists public.kindi_learning_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  redacted_query text not null check (position('[NAME_' in redacted_query) > 0),
  ai_draft jsonb not null,
  confidence double precision not null check (confidence >= 0 and confidence <= 1),
  local_lexicon_version text not null,
  status text not null default 'pending' check (status in ('pending', 'integrated', 'ignored')),
  created_at timestamptz not null default now()
);

alter table public.kindi_learning_logs enable row level security;

drop policy if exists "Authenticated users can insert Kindi learning logs" on public.kindi_learning_logs;
create policy "Authenticated users can insert Kindi learning logs"
  on public.kindi_learning_logs
  for insert
  to authenticated
  with check (auth.uid() = user_id);

create index if not exists idx_kindi_learning_logs_status_created_at
  on public.kindi_learning_logs (status, created_at desc);

comment on table public.kindi_learning_logs is
  'Silent, redacted Kindi AI success traces. User SELECT is intentionally not granted; service role/admin tools may review for lexicon improvement.';
