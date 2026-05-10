-- Migration: Fix Person ID Types in RPCs
-- Description: Changes UUID to TEXT for person IDs to match the schema and prevent cast errors.
-- Updated: 2026-04-27 - Robust permissions and focus_id handling.

BEGIN;

-- 1. Fix create_tree_with_root
DROP FUNCTION IF EXISTS public.create_tree_with_root(TEXT, TEXT, JSONB);
CREATE OR REPLACE FUNCTION public.create_tree_with_root(
  p_owner_id TEXT,
  p_tree_name TEXT,
  p_root_person_data JSONB
) RETURNS UUID AS $$
DECLARE
  v_tree_id UUID;
  v_root_id TEXT;
  v_caller_id TEXT;
BEGIN
  v_caller_id := COALESCE(auth.jwt() ->> 'sub', p_owner_id);
  
  IF v_caller_id IS NULL OR v_caller_id <> p_owner_id THEN
    RAISE EXCEPTION 'Access Denied: Cannot create tree for another user.';
  END IF;

  v_tree_id := gen_random_uuid();
  v_root_id := p_root_person_data->>'id';
  
  IF v_root_id IS NULL THEN
    v_root_id := gen_random_uuid()::TEXT;
  END IF;

  INSERT INTO public.trees (id, owner_id, name, focus_id)
  VALUES (v_tree_id, p_owner_id, p_tree_name, NULL);

  INSERT INTO public.people (
    id, tree_id, first_name, last_name, gender
  ) VALUES (
    v_root_id,
    v_tree_id,
    p_root_person_data->>'first_name',
    p_root_person_data->>'last_name',
    p_root_person_data->>'gender'
  );

  UPDATE public.trees
  SET focus_id = v_root_id
  WHERE id = v_tree_id;

  RETURN v_tree_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 2. Fix delete_person_and_relations (MOST CRITICAL FOR PERSISTENCE)
-- We MUST drop this because we changed the return type from VOID to INTEGER
DROP FUNCTION IF EXISTS public.delete_person_and_relations(UUID, TEXT, TEXT);
-- Also drop the legacy version just in case
DROP FUNCTION IF EXISTS public.delete_person_and_relations(UUID, TEXT, UUID);

CREATE OR REPLACE FUNCTION public.delete_person_and_relations(
  p_tree_id UUID,
  p_owner_id TEXT,
  p_person_id TEXT
) RETURNS INTEGER AS $$
DECLARE
  v_caller_id TEXT;
  v_rows_deleted INTEGER;
BEGIN
  v_caller_id := auth.jwt() ->> 'sub';

  -- Security Check
  IF NOT (
    v_caller_id = p_owner_id -- Caller is owner
    OR EXISTS (SELECT 1 FROM public.trees WHERE id = p_tree_id AND owner_id = v_caller_id) -- Owner check via DB
    OR public.is_tree_collaborator(p_tree_id, 'editor') -- Editor check
  ) THEN
    RAISE EXCEPTION 'Access Denied: User % cannot delete from tree %', v_caller_id, p_tree_id;
  END IF;

  -- 1. Clear focus_id reference in trees table if this is the focus person
  UPDATE public.trees 
  SET focus_id = NULL 
  WHERE id = p_tree_id AND focus_id = p_person_id;

  -- 2. Delete all relationships where this person is involved
  DELETE FROM public.relationships 
  WHERE tree_id = p_tree_id AND (person_id = p_person_id OR relative_id = p_person_id);

  -- 3. Delete the person
  DELETE FROM public.people 
  WHERE id = p_person_id AND tree_id = p_tree_id;
  
  GET DIAGNOSTICS v_rows_deleted = ROW_COUNT;
  RETURN v_rows_deleted;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 3. Fix create_person_and_relationship
DROP FUNCTION IF EXISTS public.create_person_and_relationship(UUID, TEXT, JSONB, TEXT, TEXT);
DROP FUNCTION IF EXISTS public.create_person_and_relationship(UUID, TEXT, JSONB, UUID, TEXT);

CREATE OR REPLACE FUNCTION public.create_person_and_relationship(
  p_tree_id UUID,
  p_owner_id TEXT,
  p_person_data JSONB,
  p_rel_person_id TEXT,
  p_rel_type TEXT
) RETURNS VOID AS $$
DECLARE
  v_new_id TEXT;
  v_type_clean TEXT;
  v_caller_id TEXT;
BEGIN
  v_caller_id := auth.jwt() ->> 'sub';

  IF NOT (
    v_caller_id = p_owner_id
    OR EXISTS (SELECT 1 FROM public.trees WHERE id = p_tree_id AND owner_id = v_caller_id)
    OR public.is_tree_collaborator(p_tree_id, 'editor')
  ) THEN
    RAISE EXCEPTION 'Access Denied';
  END IF;

  v_new_id := p_person_data->>'id';
  v_type_clean := TRIM(LOWER(p_rel_type));

  INSERT INTO public.people (
    id, tree_id, first_name, last_name, gender, birth_date, death_date, bio, photo_url,
    middle_name, nick_name, birth_name, suffix, birth_place, death_place,
    profession, company, interests, email, website, blog, address
  ) VALUES (
    v_new_id,
    p_tree_id,
    p_person_data->>'first_name',
    p_person_data->>'last_name',
    p_person_data->>'gender', 
    NULLIF(p_person_data->>'birth_date', '')::DATE,
    NULLIF(p_person_data->>'death_date', '')::DATE,
    p_person_data->>'bio',
    p_person_data->>'photo_url',
    p_person_data->>'middle_name',
    p_person_data->>'nick_name',
    p_person_data->>'birth_name',
    p_person_data->>'suffix',
    p_person_data->>'birth_place',
    p_person_data->>'death_place',
    p_person_data->>'profession',
    p_person_data->>'company',
    p_person_data->>'interests',
    p_person_data->>'email',
    p_person_data->>'website',
    p_person_data->>'blog',
    p_person_data->>'address'
  );

  IF v_type_clean = 'parent' THEN
    INSERT INTO public.relationships (tree_id, person_id, relative_id, type)
    VALUES (p_tree_id, p_rel_person_id, v_new_id, 'parent');
  ELSIF v_type_clean = 'child' THEN
    INSERT INTO public.relationships (tree_id, person_id, relative_id, type)
    VALUES (p_tree_id, p_rel_person_id, v_new_id, 'child');
  ELSIF v_type_clean = 'spouse' THEN
    INSERT INTO public.relationships (tree_id, person_id, relative_id, type)
    VALUES (p_tree_id, p_rel_person_id, v_new_id, 'spouse');
  ELSE
    RAISE EXCEPTION 'Invalid relationship type provided: %', p_rel_type;
  END IF;

END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;


COMMIT;
NOTIFY pgrst, 'reload schema';

