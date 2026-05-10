-- Migration: Atomic full-tree replacement RPC for shared editing
-- Replaces people + relationships in a single transaction to avoid partial saves.

CREATE OR REPLACE FUNCTION public.replace_tree_content(
  p_tree_id UUID,
  p_people JSONB,
  p_relationships JSONB
) RETURNS VOID AS $$
DECLARE
  v_caller_id TEXT;
BEGIN
  v_caller_id := public.current_user_id_text();

  IF v_caller_id IS NULL THEN
    RAISE EXCEPTION 'Access Denied: Missing authenticated user.';
  END IF;

  IF NOT (
    EXISTS (SELECT 1 FROM public.trees WHERE id = p_tree_id AND owner_id = v_caller_id)
    OR public.is_tree_collaborator(p_tree_id, 'editor')
  ) THEN
    RAISE EXCEPTION 'Access Denied: User % cannot edit tree %', v_caller_id, p_tree_id;
  END IF;

  DELETE FROM public.relationships
  WHERE tree_id = p_tree_id;

  DELETE FROM public.people
  WHERE tree_id = p_tree_id;

  INSERT INTO public.people (
    id,
    tree_id,
    first_name,
    last_name,
    middle_name,
    gender,
    birth_date,
    death_date,
    birth_place,
    death_place,
    bio,
    profession,
    interests,
    photo_url,
    email,
    website,
    blog,
    address,
    custom_fields,
    metadata
  )
  SELECT
    (person->>'id')::UUID,
    p_tree_id,
    COALESCE(person->>'first_name', ''),
    COALESCE(person->>'last_name', ''),
    COALESCE(person->>'middle_name', ''),
    COALESCE(person->>'gender', 'male'),
    NULLIF(person->>'birth_date', '')::DATE,
    NULLIF(person->>'death_date', '')::DATE,
    COALESCE(person->>'birth_place', ''),
    COALESCE(person->>'death_place', ''),
    COALESCE(person->>'bio', ''),
    COALESCE(person->>'profession', ''),
    COALESCE(person->>'interests', ''),
    NULLIF(person->>'photo_url', ''),
    COALESCE(person->>'email', ''),
    COALESCE(person->>'website', ''),
    COALESCE(person->>'blog', ''),
    COALESCE(person->>'address', ''),
    COALESCE(person->'custom_fields', '{}'::JSONB),
    COALESCE(person->'metadata', '{}'::JSONB)
  FROM jsonb_array_elements(COALESCE(p_people, '[]'::JSONB)) AS person;

  INSERT INTO public.relationships (
    tree_id,
    person_id,
    relative_id,
    type
  )
  SELECT
    p_tree_id,
    (rel->>'person_id')::UUID,
    (rel->>'relative_id')::UUID,
    rel->>'type'
  FROM jsonb_array_elements(COALESCE(p_relationships, '[]'::JSONB)) AS rel;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
NOTIFY pgrst, 'reload schema';
