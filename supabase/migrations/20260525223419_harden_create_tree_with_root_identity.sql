begin;

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
  v_tree_name text;
begin
  v_caller_id := auth.uid()::text;
  v_tree_name := nullif(trim(coalesce(p_tree_name, '')), '');

  if v_caller_id is null or v_caller_id <> p_owner_id then
    raise exception 'Access Denied: Cannot create tree for another user.';
  end if;

  if v_tree_name is null then
    raise exception 'Tree name is required.';
  end if;

  if p_root_person_data is null or jsonb_typeof(p_root_person_data) <> 'object' then
    raise exception 'Root person data must be an object.';
  end if;

  if p_settings is null or jsonb_typeof(p_settings) <> 'object' then
    p_settings := '{}'::jsonb;
  end if;

  v_tree_id := gen_random_uuid();
  v_root_id := nullif(p_root_person_data->>'id', '');

  if v_root_id is null then
    v_root_id := gen_random_uuid()::text;
  end if;

  insert into public.trees (id, owner_id, name, focus_id, settings)
  values (v_tree_id, p_owner_id, v_tree_name, null, p_settings);

  insert into public.people (
    id, tree_id, first_name, last_name, gender
  ) values (
    v_root_id,
    v_tree_id,
    coalesce(p_root_person_data->>'first_name', ''),
    coalesce(p_root_person_data->>'last_name', ''),
    coalesce(nullif(p_root_person_data->>'gender', ''), 'male')
  );

  update public.trees
  set focus_id = v_root_id
  where id = v_tree_id;

  return v_tree_id;
end;
$$ language plpgsql security definer set search_path = public, auth, pg_temp;

revoke all on function public.create_tree_with_root(text, text, jsonb, jsonb) from public;
revoke execute on function public.create_tree_with_root(text, text, jsonb, jsonb) from anon;
grant execute on function public.create_tree_with_root(text, text, jsonb, jsonb) to authenticated;

notify pgrst, 'reload schema';

commit;
