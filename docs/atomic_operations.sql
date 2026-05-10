-- 1. Hardened Atomic Function for Creating and Linking a Person
-- This version adds an explicit catch-all error to detect if relationship types are mismatched.

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
  -- 1. Ownership & Inputs Verification
  IF NOT EXISTS (SELECT 1 FROM trees WHERE id = p_tree_id AND owner_id = p_owner_id) THEN
    RAISE EXCEPTION 'Access Denied: Tree % does not belong to owner %', p_tree_id, p_owner_id;
  END IF;

  v_new_id := (p_person_data->>'id')::UUID;
  v_type_clean := TRIM(LOWER(p_rel_type));

  -- 2. Insert the Person
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

  -- 3. Insert the Relationship
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
$$ LANGUAGE plpgsql;
