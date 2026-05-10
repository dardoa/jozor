-- Migration: Atomic RPCs for Tree Operations
-- Description: Ensures Data Integrity by bundling critical operations into single transactions.

-- 1. Create Tree with Root Person
CREATE OR REPLACE FUNCTION create_tree_with_root(
  p_owner_id TEXT,
  p_tree_name TEXT,
  p_root_person_data JSONB
) RETURNS UUID AS $$
DECLARE
  v_tree_id UUID;
  v_root_id UUID;
BEGIN
  v_tree_id := gen_random_uuid();
  v_root_id := (p_root_person_data->>'id')::UUID;
  
  IF v_root_id IS NULL THEN
    v_root_id := gen_random_uuid();
  END IF;

  -- Insert tree without focus first to satisfy the FK from trees.focus_id -> people.id
  INSERT INTO trees (id, owner_id, name, focus_id)
  VALUES (v_tree_id, p_owner_id, p_tree_name, NULL);

  -- Insert root person after the tree exists so tree_id FK is satisfied
  INSERT INTO people (
    id, tree_id, first_name, last_name, gender
  ) VALUES (
    v_root_id,
    v_tree_id,
    p_root_person_data->>'first_name',
    p_root_person_data->>'last_name',
    p_root_person_data->>'gender'
  );

  -- Backfill focus_id once both sides exist
  UPDATE trees
  SET focus_id = v_root_id::text
  WHERE id = v_tree_id;

  RETURN v_tree_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
-- 2. Delete Person and Relations
CREATE OR REPLACE FUNCTION delete_person_and_relations(
  p_tree_id UUID,
  p_owner_id TEXT,
  p_person_id UUID
) RETURNS VOID AS $$
BEGIN
  -- Verify Ownership (RLS bypasses in SECURITY DEFINER, so we check manually)
  IF NOT EXISTS (
    SELECT 1 FROM trees 
    WHERE id = p_tree_id AND (owner_id = p_owner_id OR EXISTS (
      SELECT 1 FROM tree_shares WHERE tree_id = p_tree_id AND owner_uid = p_owner_id AND role = 'editor'
    ))
  ) THEN
    RAISE EXCEPTION 'Access Denied: User % cannot delete from tree %', p_owner_id, p_tree_id;
  END IF;

  -- Delete Relationships involving this person
  DELETE FROM relationships 
  WHERE tree_id = p_tree_id AND (person_id = p_person_id OR relative_id = p_person_id);

  -- Delete Person
  DELETE FROM people 
  WHERE id = p_person_id AND tree_id = p_tree_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
-- 3. Hardened Add Person and Relation
CREATE OR REPLACE FUNCTION create_person_and_relationship(
  p_tree_id UUID,
  p_owner_id TEXT,
  p_person_data JSONB,
  p_rel_person_id UUID,
  p_rel_type TEXT -- 'parent', 'child', 'spouse'
) RETURNS VOID AS $$
DECLARE
  v_new_id UUID;
  v_type_clean TEXT;
BEGIN
  -- Verify Ownership
  IF NOT EXISTS (
    SELECT 1 FROM trees 
    WHERE id = p_tree_id AND (owner_id = p_owner_id OR EXISTS (
      SELECT 1 FROM tree_shares WHERE tree_id = p_tree_id AND owner_uid = p_owner_id AND role = 'editor'
    ))
  ) THEN
    RAISE EXCEPTION 'Access Denied: User % cannot edit tree %', p_owner_id, p_tree_id;
  END IF;

  v_new_id := (p_person_data->>'id')::UUID;
  v_type_clean := TRIM(LOWER(p_rel_type));

  -- Insert the Person
  INSERT INTO people (
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

  -- Insert the Relationship
  IF v_type_clean = 'parent' THEN
    -- p_rel_person_id is the CHILD, new person is PARENT
    INSERT INTO relationships (tree_id, person_id, relative_id, type)
    VALUES (p_tree_id, p_rel_person_id, v_new_id, 'parent');
  ELSIF v_type_clean = 'child' THEN
    -- p_rel_person_id is the PARENT, new person is CHILD
    INSERT INTO relationships (tree_id, person_id, relative_id, type)
    VALUES (p_tree_id, p_rel_person_id, v_new_id, 'child');
  ELSIF v_type_clean = 'spouse' THEN
    INSERT INTO relationships (tree_id, person_id, relative_id, type)
    VALUES (p_tree_id, p_rel_person_id, v_new_id, 'spouse');
  ELSE
    RAISE EXCEPTION 'Invalid relationship type provided: %', p_rel_type;
  END IF;

END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
