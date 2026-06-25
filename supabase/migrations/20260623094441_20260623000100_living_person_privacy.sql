-- Migration: Living Person Privacy Layer
-- Description: Sets up the public.people_secure view and helper functions.
--              Implements the primary design with security_invoker = true.

BEGIN;

-- 1. Helper function: is_person_living
CREATE OR REPLACE FUNCTION public.is_person_living(
  p_death_date DATE,
  p_birth_date DATE,
  p_custom_fields JSONB
) RETURNS BOOLEAN AS $$
DECLARE
  v_is_deceased BOOLEAN;
  v_calculated_age INT;
BEGIN
  IF p_custom_fields IS NOT NULL AND (p_custom_fields->>'isDeceased')::boolean = true THEN
    RETURN FALSE;
  END IF;
  
  IF p_death_date IS NOT NULL THEN
    RETURN FALSE;
  END IF;
  
  IF p_birth_date IS NOT NULL THEN
    v_calculated_age := date_part('year', age(p_birth_date));
    IF v_calculated_age > 110 THEN
      RETURN FALSE;
    END IF;
  END IF;
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql STABLE;

-- 2. Helper function: mask_partner_details
CREATE OR REPLACE FUNCTION public.mask_partner_details(
  p_partner_details JSONB
) RETURNS JSONB AS $$
DECLARE
  v_key TEXT;
  v_val JSONB;
  v_result JSONB := '{}'::jsonb;
BEGIN
  IF p_partner_details IS NULL OR jsonb_typeof(p_partner_details) <> 'object' THEN
    RETURN p_partner_details;
  END IF;
  
  FOR v_key, v_val IN SELECT * FROM jsonb_each(p_partner_details) LOOP
    v_result := jsonb_insert(
      v_result,
      array[v_key],
      jsonb_build_object(
        'type', v_val->'type',
        'startDate', '',
        'startPlace', '',
        'endDate', '',
        'endPlace', ''
      )
    );
  END LOOP;
  
  RETURN v_result;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- 3. Helper function: mask_custom_fields
CREATE OR REPLACE FUNCTION public.mask_custom_fields(
  p_custom_fields JSONB
) RETURNS JSONB AS $$
DECLARE
  v_masked JSONB;
BEGIN
  IF p_custom_fields IS NULL THEN
    RETURN '{}'::jsonb;
  END IF;
  v_masked := p_custom_fields;
  
  v_masked := v_masked || jsonb_build_object(
    'gallery', '[]'::jsonb,
    'voiceNotes', '[]'::jsonb,
    'sources', '[]'::jsonb,
    'events', '[]'::jsonb,
    'birthSource', '',
    'deathSource', '',
    'burialPlace', '',
    'residence', '',
    'marriageDate', '',
    'marriagePlace', ''
  );
  
  IF v_masked ? 'partnerDetails' THEN
    v_masked := jsonb_set(v_masked, '{partnerDetails}', public.mask_partner_details(v_masked->'partnerDetails'));
  END IF;
  
  RETURN v_masked;
END;
$$ LANGUAGE plpgsql STABLE;

-- 4. Create public.people_secure view with security_invoker = true
CREATE OR REPLACE VIEW public.people_secure WITH (security_invoker = true) AS
SELECT 
    id,
    tree_id,
    gender,
    metadata,
    CASE 
        WHEN ((custom_fields->>'isPrivate')::boolean = true 
             OR public.is_person_living(death_date, birth_date, custom_fields))
             AND NOT (
                 EXISTS (SELECT 1 FROM public.trees t WHERE t.id = tree_id AND t.owner_id = public.current_user_id_text())
                 OR public.is_tree_collaborator(tree_id, 'editor')
             ) 
        THEN 'Private'
        ELSE first_name
    END as first_name,
    CASE 
        WHEN ((custom_fields->>'isPrivate')::boolean = true 
             OR public.is_person_living(death_date, birth_date, custom_fields))
             AND NOT (
                 EXISTS (SELECT 1 FROM public.trees t WHERE t.id = tree_id AND t.owner_id = public.current_user_id_text())
                 OR public.is_tree_collaborator(tree_id, 'editor')
             ) 
        THEN ''
        ELSE middle_name
    END as middle_name,
    CASE 
        WHEN ((custom_fields->>'isPrivate')::boolean = true 
             OR public.is_person_living(death_date, birth_date, custom_fields))
             AND NOT (
                 EXISTS (SELECT 1 FROM public.trees t WHERE t.id = tree_id AND t.owner_id = public.current_user_id_text())
                 OR public.is_tree_collaborator(tree_id, 'editor')
             ) 
        THEN ''
        ELSE last_name
    END as last_name,
    CASE 
        WHEN ((custom_fields->>'isPrivate')::boolean = true 
             OR public.is_person_living(death_date, birth_date, custom_fields))
             AND NOT (
                 EXISTS (SELECT 1 FROM public.trees t WHERE t.id = tree_id AND t.owner_id = public.current_user_id_text())
                 OR public.is_tree_collaborator(tree_id, 'editor')
             ) 
        THEN ''
        ELSE birth_name
    END as birth_name,
    CASE 
        WHEN ((custom_fields->>'isPrivate')::boolean = true 
             OR public.is_person_living(death_date, birth_date, custom_fields))
             AND NOT (
                 EXISTS (SELECT 1 FROM public.trees t WHERE t.id = tree_id AND t.owner_id = public.current_user_id_text())
                 OR public.is_tree_collaborator(tree_id, 'editor')
             ) 
        THEN ''
        ELSE nick_name
    END as nick_name,
    CASE 
        WHEN ((custom_fields->>'isPrivate')::boolean = true 
             OR public.is_person_living(death_date, birth_date, custom_fields))
             AND NOT (
                 EXISTS (SELECT 1 FROM public.trees t WHERE t.id = tree_id AND t.owner_id = public.current_user_id_text())
                 OR public.is_tree_collaborator(tree_id, 'editor')
             ) 
        THEN ''
        ELSE suffix
    END as suffix,
    CASE 
        WHEN ((custom_fields->>'isPrivate')::boolean = true 
             OR public.is_person_living(death_date, birth_date, custom_fields))
             AND NOT (
                 EXISTS (SELECT 1 FROM public.trees t WHERE t.id = tree_id AND t.owner_id = public.current_user_id_text())
                 OR public.is_tree_collaborator(tree_id, 'editor')
             ) 
        THEN NULL
        ELSE birth_date
    END as birth_date,
    CASE 
        WHEN ((custom_fields->>'isPrivate')::boolean = true 
             OR public.is_person_living(death_date, birth_date, custom_fields))
             AND NOT (
                 EXISTS (SELECT 1 FROM public.trees t WHERE t.id = tree_id AND t.owner_id = public.current_user_id_text())
                 OR public.is_tree_collaborator(tree_id, 'editor')
             ) 
        THEN NULL
        ELSE death_date
    END as death_date,
    CASE 
        WHEN ((custom_fields->>'isPrivate')::boolean = true 
             OR public.is_person_living(death_date, birth_date, custom_fields))
             AND NOT (
                 EXISTS (SELECT 1 FROM public.trees t WHERE t.id = tree_id AND t.owner_id = public.current_user_id_text())
                 OR public.is_tree_collaborator(tree_id, 'editor')
             ) 
        THEN ''
        ELSE birth_place
    END as birth_place,
    CASE 
        WHEN ((custom_fields->>'isPrivate')::boolean = true 
             OR public.is_person_living(death_date, birth_date, custom_fields))
             AND NOT (
                 EXISTS (SELECT 1 FROM public.trees t WHERE t.id = tree_id AND t.owner_id = public.current_user_id_text())
                 OR public.is_tree_collaborator(tree_id, 'editor')
             ) 
        THEN ''
        ELSE death_place
    END as death_place,
    CASE 
        WHEN ((custom_fields->>'isPrivate')::boolean = true 
             OR public.is_person_living(death_date, birth_date, custom_fields))
             AND NOT (
                 EXISTS (SELECT 1 FROM public.trees t WHERE t.id = tree_id AND t.owner_id = public.current_user_id_text())
                 OR public.is_tree_collaborator(tree_id, 'editor')
             ) 
        THEN ''
        ELSE bio
    END as bio,
    CASE 
        WHEN ((custom_fields->>'isPrivate')::boolean = true 
             OR public.is_person_living(death_date, birth_date, custom_fields))
             AND NOT (
                 EXISTS (SELECT 1 FROM public.trees t WHERE t.id = tree_id AND t.owner_id = public.current_user_id_text())
                 OR public.is_tree_collaborator(tree_id, 'editor')
             ) 
        THEN ''
        ELSE profession
    END as profession,
    CASE 
        WHEN ((custom_fields->>'isPrivate')::boolean = true 
             OR public.is_person_living(death_date, birth_date, custom_fields))
             AND NOT (
                 EXISTS (SELECT 1 FROM public.trees t WHERE t.id = tree_id AND t.owner_id = public.current_user_id_text())
                 OR public.is_tree_collaborator(tree_id, 'editor')
             ) 
        THEN ''
        ELSE company
    END as company,
    CASE 
        WHEN ((custom_fields->>'isPrivate')::boolean = true 
             OR public.is_person_living(death_date, birth_date, custom_fields))
             AND NOT (
                 EXISTS (SELECT 1 FROM public.trees t WHERE t.id = tree_id AND t.owner_id = public.current_user_id_text())
                 OR public.is_tree_collaborator(tree_id, 'editor')
             ) 
        THEN ''
        ELSE interests
    END as interests,
    CASE 
        WHEN ((custom_fields->>'isPrivate')::boolean = true 
             OR public.is_person_living(death_date, birth_date, custom_fields))
             AND NOT (
                 EXISTS (SELECT 1 FROM public.trees t WHERE t.id = tree_id AND t.owner_id = public.current_user_id_text())
                 OR public.is_tree_collaborator(tree_id, 'editor')
             ) 
        THEN ''
        ELSE email
    END as email,
    CASE 
        WHEN ((custom_fields->>'isPrivate')::boolean = true 
             OR public.is_person_living(death_date, birth_date, custom_fields))
             AND NOT (
                 EXISTS (SELECT 1 FROM public.trees t WHERE t.id = tree_id AND t.owner_id = public.current_user_id_text())
                 OR public.is_tree_collaborator(tree_id, 'editor')
             ) 
        THEN ''
        ELSE website
    END as website,
    CASE 
        WHEN ((custom_fields->>'isPrivate')::boolean = true 
             OR public.is_person_living(death_date, birth_date, custom_fields))
             AND NOT (
                 EXISTS (SELECT 1 FROM public.trees t WHERE t.id = tree_id AND t.owner_id = public.current_user_id_text())
                 OR public.is_tree_collaborator(tree_id, 'editor')
             ) 
        THEN ''
        ELSE blog
    END as blog,
    CASE 
        WHEN ((custom_fields->>'isPrivate')::boolean = true 
             OR public.is_person_living(death_date, birth_date, custom_fields))
             AND NOT (
                 EXISTS (SELECT 1 FROM public.trees t WHERE t.id = tree_id AND t.owner_id = public.current_user_id_text())
                 OR public.is_tree_collaborator(tree_id, 'editor')
             ) 
        THEN ''
        ELSE address
    END as address,
    CASE 
        WHEN ((custom_fields->>'isPrivate')::boolean = true 
             OR public.is_person_living(death_date, birth_date, custom_fields))
             AND NOT (
                 EXISTS (SELECT 1 FROM public.trees t WHERE t.id = tree_id AND t.owner_id = public.current_user_id_text())
                 OR public.is_tree_collaborator(tree_id, 'editor')
             ) 
        THEN NULL
        ELSE photo_url
    END as photo_url,
    CASE 
        WHEN ((custom_fields->>'isPrivate')::boolean = true 
             OR public.is_person_living(death_date, birth_date, custom_fields))
             AND NOT (
                 EXISTS (SELECT 1 FROM public.trees t WHERE t.id = tree_id AND t.owner_id = public.current_user_id_text())
                 OR public.is_tree_collaborator(tree_id, 'editor')
             ) 
        THEN NULL
        ELSE photo_path
    END as photo_path,
    CASE 
        WHEN ((custom_fields->>'isPrivate')::boolean = true 
             OR public.is_person_living(death_date, birth_date, custom_fields))
             AND NOT (
                 EXISTS (SELECT 1 FROM public.trees t WHERE t.id = tree_id AND t.owner_id = public.current_user_id_text())
                 OR public.is_tree_collaborator(tree_id, 'editor')
             ) 
        THEN 0
        ELSE photo_version
    END as photo_version,
    CASE 
        WHEN ((custom_fields->>'isPrivate')::boolean = true 
             OR public.is_person_living(death_date, birth_date, custom_fields))
             AND NOT (
                 EXISTS (SELECT 1 FROM public.trees t WHERE t.id = tree_id AND t.owner_id = public.current_user_id_text())
                 OR public.is_tree_collaborator(tree_id, 'editor')
             ) 
        THEN public.mask_custom_fields(custom_fields)
        ELSE custom_fields
    END as custom_fields
FROM public.people;

-- 5. Restrict SELECT on raw public.people using RLS to owners/editors only
DROP POLICY IF EXISTS "people_collaborator_read" ON public.people;
CREATE POLICY "people_collaborator_read" ON public.people
    FOR SELECT USING (
        tree_id IN (SELECT id FROM public.trees WHERE owner_id = public.current_user_id_text())
        OR public.is_tree_collaborator(tree_id, 'editor')
    );

-- 6. Restrict SELECT on checkpoints to owners/editors only
DROP POLICY IF EXISTS "checkpoints_collaborator_read" ON public.tree_checkpoints;
CREATE POLICY "checkpoints_collaborator_read" ON public.tree_checkpoints
    FOR SELECT USING (
        tree_id IN (SELECT id FROM public.trees WHERE owner_id = public.current_user_id_text())
        OR public.is_tree_collaborator(tree_id, 'editor')
    );

COMMIT;

NOTIFY pgrst, 'reload schema';;
