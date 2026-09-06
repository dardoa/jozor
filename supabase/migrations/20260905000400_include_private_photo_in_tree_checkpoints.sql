BEGIN;

-- Keep the existing checkpoint projection and relationship semantics, adding
-- the canonical private profile asset previously lost on import/reload.
-- Historical checkpoints are not rewritten. Viewer checkpoint access remains denied.
CREATE OR REPLACE FUNCTION private.generate_tree_checkpoint(
  p_tree_id UUID
) RETURNS BIGINT AS $$
DECLARE
  v_max_seq BIGINT;
  v_people_snapshot JSONB;
BEGIN
  SELECT COALESCE(MAX(version_seq), 0) INTO v_max_seq
  FROM public.tree_operations
  WHERE tree_id = p_tree_id;

  WITH tree_people AS (
    SELECT
      id,
      COALESCE(metadata, '{}'::jsonb) || jsonb_build_object(
        'id', id,
        'firstName', COALESCE(first_name, ''),
        'middleName', COALESCE(middle_name, ''),
        'lastName', COALESCE(last_name, ''),
        'birthName', COALESCE(birth_name, ''),
        'nickName', COALESCE(nick_name, ''),
        'suffix', COALESCE(suffix, ''),
        'gender', COALESCE(gender, 'male'),
        'birthDate', COALESCE(birth_date::text, ''),
        'birthPlace', COALESCE(birth_place, ''),
        'deathDate', COALESCE(death_date::text, ''),
        'deathPlace', COALESCE(death_place, ''),
        'bio', COALESCE(bio, ''),
        'profession', COALESCE(profession, ''),
        'company', COALESCE(company, ''),
        'interests', COALESCE(interests, ''),
        'photoUrl', photo_url,
        'photoPath', photo_path,
        'photoVersion', photo_version,
        'photoAsset', custom_fields->'photoAsset',
        'email', COALESCE(email, ''),
        'website', COALESCE(website, ''),
        'blog', COALESCE(blog, ''),
        'address', COALESCE(address, ''),
        'isDeceased', CASE WHEN death_date IS NOT NULL THEN true ELSE COALESCE((custom_fields->>'isDeceased')::boolean, false) END,
        'title', COALESCE(custom_fields->>'title', ''),
        'birthSource', COALESCE(custom_fields->>'birthSource', ''),
        'marriageDate', COALESCE(custom_fields->>'marriageDate', ''),
        'marriagePlace', COALESCE(custom_fields->>'marriagePlace', ''),
        'deathSource', COALESCE(custom_fields->>'deathSource', ''),
        'burialPlace', COALESCE(custom_fields->>'burialPlace', ''),
        'residence', COALESCE(custom_fields->>'residence', ''),
        'partnerDetails', custom_fields->'partnerDetails',
        'isPrivate', COALESCE((custom_fields->>'isPrivate')::boolean, false),
        'gallery', COALESCE(custom_fields->'gallery', '[]'::jsonb),
        'voiceNotes', COALESCE(custom_fields->'voiceNotes', '[]'::jsonb),
        'sources', COALESCE(custom_fields->'sources', '[]'::jsonb),
        'events', COALESCE(custom_fields->'events', '[]'::jsonb),
        'parents', '[]'::jsonb,
        'children', '[]'::jsonb,
        'spouses', '[]'::jsonb
      ) AS base_json
    FROM public.people
    WHERE tree_id = p_tree_id
  ),
  explicit_relations AS (
    SELECT person_id AS src, relative_id AS dst, 'parents'::text AS rel_type FROM public.relationships WHERE tree_id = p_tree_id AND type = 'parent'
    UNION
    SELECT relative_id AS src, person_id AS dst, 'children'::text AS rel_type FROM public.relationships WHERE tree_id = p_tree_id AND type = 'parent'
    UNION
    SELECT person_id AS src, relative_id AS dst, 'children'::text AS rel_type FROM public.relationships WHERE tree_id = p_tree_id AND type = 'child'
    UNION
    SELECT relative_id AS src, person_id AS dst, 'parents'::text AS rel_type FROM public.relationships WHERE tree_id = p_tree_id AND type = 'child'
    UNION
    SELECT person_id AS src, relative_id AS dst, 'spouses'::text AS rel_type FROM public.relationships WHERE tree_id = p_tree_id AND type = 'spouse'
    UNION
    SELECT relative_id AS src, person_id AS dst, 'spouses'::text AS rel_type FROM public.relationships WHERE tree_id = p_tree_id AND type = 'spouse'
  ),
  derived_children_from_spouses AS (
    SELECT sp.src AS src, ch.dst AS dst, 'children'::text AS rel_type
    FROM explicit_relations sp
    JOIN explicit_relations ch ON sp.dst = ch.src
    WHERE sp.rel_type = 'spouses' AND ch.rel_type = 'children'
  ),
  derived_parents_from_spouses AS (
    SELECT ch.src AS src, sp.dst AS dst, 'parents'::text AS rel_type
    FROM explicit_relations ch
    JOIN explicit_relations sp ON ch.dst = sp.src
    WHERE ch.rel_type = 'parents' AND sp.rel_type = 'spouses'
  ),
  relationships_union AS (
    SELECT src, dst, rel_type FROM explicit_relations
    UNION
    SELECT src, dst, rel_type FROM derived_children_from_spouses
    UNION
    SELECT src, dst, rel_type FROM derived_parents_from_spouses
  ),
  person_relations AS (
    SELECT src AS person_id, rel_type, jsonb_agg(dst) AS dst_list
    FROM relationships_union
    GROUP BY src, rel_type
  ),
  person_enriched AS (
    SELECT p.id, p.base_json || jsonb_build_object(
      'parents', COALESCE((SELECT dst_list FROM person_relations WHERE person_id = p.id AND rel_type = 'parents'), '[]'::jsonb),
      'children', COALESCE((SELECT dst_list FROM person_relations WHERE person_id = p.id AND rel_type = 'children'), '[]'::jsonb),
      'spouses', COALESCE((SELECT dst_list FROM person_relations WHERE person_id = p.id AND rel_type = 'spouses'), '[]'::jsonb)
    ) AS final_json
    FROM tree_people p
  )
  SELECT jsonb_object_agg(id, final_json) INTO v_people_snapshot FROM person_enriched;

  INSERT INTO public.tree_checkpoints (tree_id, version_seq, people, created_at)
  VALUES (p_tree_id, v_max_seq, COALESCE(v_people_snapshot, '{}'::jsonb), NOW())
  ON CONFLICT (tree_id, version_seq) DO UPDATE SET people = EXCLUDED.people, created_at = NOW();
  RETURN v_max_seq;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, private, pg_temp;

REVOKE ALL ON FUNCTION private.generate_tree_checkpoint(UUID) FROM PUBLIC, anon, authenticated;
COMMIT;
