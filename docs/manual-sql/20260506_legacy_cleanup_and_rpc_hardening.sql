-- Manual SQL bundle for environments where Supabase migration history is out of sync.
-- Paste the contents of this file into the Supabase SQL editor.
--
-- This bundle intentionally contains SQL statements only. Do not paste the
-- migration file name into the SQL editor.

BEGIN;

-- Legacy Google Drive sharing is disabled in the application.
-- Google Drive remains available for personal backup/sync, but shared-tree
-- authorization now flows through trees + tree_collaborators only.
ALTER TABLE public.tree_shares
  DROP COLUMN IF EXISTS drive_file_id;

-- Tighten SECURITY DEFINER tree-edit RPCs so access is derived only from the
-- database source of truth: trees.owner_id and tree_collaborators.
-- The caller-provided p_owner_id remains in function signatures for client
-- compatibility, but it is not trusted as an authorization source.
CREATE OR REPLACE FUNCTION public.can_edit_tree(p_tree_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  v_caller_id TEXT;
BEGIN
  v_caller_id := public.current_user_id_text();

  IF v_caller_id IS NULL THEN
    RETURN FALSE;
  END IF;

  RETURN EXISTS (
    SELECT 1
    FROM public.trees
    WHERE id = p_tree_id
      AND owner_id = v_caller_id
  )
  OR public.is_tree_collaborator(p_tree_id, 'editor');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP FUNCTION IF EXISTS public.delete_person_and_relations(UUID, TEXT, UUID);

CREATE OR REPLACE FUNCTION public.delete_person_and_relations(
  p_tree_id UUID,
  p_owner_id TEXT,
  p_person_id TEXT
) RETURNS INTEGER AS $$
DECLARE
  v_rows_deleted INTEGER;
BEGIN
  IF NOT public.can_edit_tree(p_tree_id) THEN
    RAISE EXCEPTION 'Access Denied: User cannot delete from tree %', p_tree_id;
  END IF;

  UPDATE public.trees
  SET focus_id = NULL
  WHERE id = p_tree_id
    AND focus_id = p_person_id;

  DELETE FROM public.relationships
  WHERE tree_id = p_tree_id
    AND (person_id = p_person_id OR relative_id = p_person_id);

  DELETE FROM public.people
  WHERE id = p_person_id
    AND tree_id = p_tree_id;

  GET DIAGNOSTICS v_rows_deleted = ROW_COUNT;
  RETURN v_rows_deleted;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

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
BEGIN
  IF NOT public.can_edit_tree(p_tree_id) THEN
    RAISE EXCEPTION 'Access Denied: User cannot edit tree %', p_tree_id;
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
