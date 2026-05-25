begin;

create table if not exists public.app_default_tree_settings (
  key text primary key default 'global',
  settings jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id) on delete set null,
  constraint app_default_tree_settings_global_key check (key = 'global'),
  constraint app_default_tree_settings_object check (jsonb_typeof(settings) = 'object')
);

alter table public.app_default_tree_settings enable row level security;

drop policy if exists "Authenticated users can read default tree settings" on public.app_default_tree_settings;
create policy "Authenticated users can read default tree settings"
  on public.app_default_tree_settings
  for select
  to authenticated
  using (true);

drop policy if exists "App admins can insert default tree settings" on public.app_default_tree_settings;
create policy "App admins can insert default tree settings"
  on public.app_default_tree_settings
  for insert
  to authenticated
  with check (
    exists (
      select 1
      from public.admin_users au
      where au.user_id = (select auth.uid())
        and au.is_active
    )
  );

drop policy if exists "App admins can update default tree settings" on public.app_default_tree_settings;
create policy "App admins can update default tree settings"
  on public.app_default_tree_settings
  for update
  to authenticated
  using (
    exists (
      select 1
      from public.admin_users au
      where au.user_id = (select auth.uid())
        and au.is_active
    )
  )
  with check (
    exists (
      select 1
      from public.admin_users au
      where au.user_id = (select auth.uid())
        and au.is_active
    )
  );

grant select on table public.app_default_tree_settings to authenticated;
grant insert, update on table public.app_default_tree_settings to authenticated;

insert into public.app_default_tree_settings (key, settings)
values ('global', '{}'::jsonb)
on conflict (key) do nothing;

drop function if exists public.create_tree_with_root(text, text, jsonb);
drop function if exists public.create_tree_with_root(text, text, jsonb, jsonb);

create or replace function public.create_tree_with_root(
  p_owner_id text,
  p_tree_name text,
  p_root_person_data jsonb,
  p_settings jsonb default '{}'::jsonb
) returns uuid as $$
declare
  v_tree_id uuid;
  v_root_id text;
  v_caller_id text;
begin
  v_caller_id := coalesce(auth.jwt() ->> 'sub', p_owner_id);

  if v_caller_id is null or v_caller_id <> p_owner_id then
    raise exception 'Access Denied: Cannot create tree for another user.';
  end if;

  if p_settings is null or jsonb_typeof(p_settings) <> 'object' then
    p_settings := '{}'::jsonb;
  end if;

  v_tree_id := gen_random_uuid();
  v_root_id := p_root_person_data->>'id';

  if v_root_id is null then
    v_root_id := gen_random_uuid()::text;
  end if;

  insert into public.trees (id, owner_id, name, focus_id, settings)
  values (v_tree_id, p_owner_id, p_tree_name, null, p_settings);

  insert into public.people (
    id, tree_id, first_name, last_name, gender
  ) values (
    v_root_id,
    v_tree_id,
    p_root_person_data->>'first_name',
    p_root_person_data->>'last_name',
    p_root_person_data->>'gender'
  );

  update public.trees
  set focus_id = v_root_id
  where id = v_tree_id;

  return v_tree_id;
end;
$$ language plpgsql security definer set search_path = public;

revoke all on function public.create_tree_with_root(text, text, jsonb, jsonb) from public;
revoke execute on function public.create_tree_with_root(text, text, jsonb, jsonb) from anon;
grant execute on function public.create_tree_with_root(text, text, jsonb, jsonb) to authenticated;

comment on table public.app_default_tree_settings is
  'Application-level default visual tree settings used when authenticated users create new trees. Writes are limited to app admins.';

comment on column public.app_default_tree_settings.settings is
  'Whitelisted visual TreeSettings JSON. Do not store secrets, permissions, or executable configuration here.';

notify pgrst, 'reload schema';

commit;
