-- Harden Sprint 14 living person privacy view after integration review.
-- This migration is intentionally idempotent because the original Sprint 14B
-- migration may already be recorded as applied on integration databases.

BEGIN;

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
    'title', '',
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

CREATE OR REPLACE VIEW public.people_secure
WITH (security_barrier = true) AS
SELECT
    id,
    tree_id,
    gender,
    CASE
        WHEN ((custom_fields->>'isPrivate')::boolean = true
             OR public.is_person_living(death_date, birth_date, custom_fields))
             AND NOT (
                 EXISTS (SELECT 1 FROM public.trees t WHERE t.id = tree_id AND t.owner_id = public.current_user_id_text())
                 OR public.is_tree_collaborator(tree_id, 'editor')
             )
        THEN '{}'::jsonb
        ELSE metadata
    END as metadata,
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
FROM public.people
WHERE tree_id IN (
    SELECT id FROM public.trees WHERE owner_id = public.current_user_id_text()
) OR public.is_tree_collaborator(tree_id, 'viewer');

ALTER VIEW public.people_secure OWNER TO postgres;
REVOKE ALL ON public.people_secure FROM PUBLIC, anon;
GRANT SELECT ON public.people_secure TO authenticated;

DROP POLICY IF EXISTS "people_collaborator_read" ON public.people;
CREATE POLICY "people_collaborator_read" ON public.people
    FOR SELECT TO authenticated USING (
        tree_id IN (SELECT id FROM public.trees WHERE owner_id = public.current_user_id_text())
        OR public.is_tree_collaborator(tree_id, 'editor')
    );

DROP POLICY IF EXISTS "checkpoints_collaborator_read" ON public.tree_checkpoints;
CREATE POLICY "checkpoints_collaborator_read" ON public.tree_checkpoints
    FOR SELECT TO authenticated USING (
        tree_id IN (SELECT id FROM public.trees WHERE owner_id = public.current_user_id_text())
        OR public.is_tree_collaborator(tree_id, 'editor')
    );

COMMIT;

NOTIFY pgrst, 'reload schema';;
