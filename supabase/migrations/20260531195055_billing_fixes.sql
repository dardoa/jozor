BEGIN;

-- 1. Helper function for UUID verification
CREATE OR REPLACE FUNCTION private.is_valid_uuid(p_value text)
RETURNS boolean
LANGUAGE plpgsql IMMUTABLE AS $$
BEGIN
  PERFORM p_value::uuid;
  RETURN true;
EXCEPTION WHEN invalid_text_representation THEN
  RETURN false;
END;
$$;

-- 2. Webhook processed events table (Private)
CREATE TABLE IF NOT EXISTS private.processed_paddle_webhook_events (
    event_id TEXT PRIMARY KEY,
    occurred_at TIMESTAMPTZ NOT NULL,
    processed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. Checkout rate limiting table (Private)
CREATE TABLE IF NOT EXISTS private.checkout_rate_limits (
    user_id TEXT PRIMARY KEY,
    last_requested_at TIMESTAMPTZ NOT NULL,
    request_count INTEGER NOT NULL DEFAULT 1
);

-- 4. AI monthly usage reservations table (Private)
CREATE TABLE IF NOT EXISTS private.ai_usage_reservations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id TEXT NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMPTZ NOT NULL DEFAULT NOW() + INTERVAL '5 minutes',
    status TEXT NOT NULL DEFAULT 'reserved' CONSTRAINT chk_reservation_status CHECK (status IN ('reserved', 'completed', 'refunded', 'expired_charged'))
);

-- 5. Expose last_event_occurred_at in public.subscriptions
ALTER TABLE public.subscriptions
  ADD COLUMN IF NOT EXISTS last_event_occurred_at TIMESTAMPTZ;

-- Convert version_seq to plain BIGINT
ALTER TABLE public.tree_operations ALTER COLUMN version_seq DROP IDENTITY IF EXISTS;
ALTER TABLE public.tree_operations ALTER COLUMN version_seq DROP DEFAULT;

-- Add photo_path and photo_version to user_profiles
ALTER TABLE public.user_profiles
  ADD COLUMN IF NOT EXISTS photo_path TEXT,
  ADD COLUMN IF NOT EXISTS photo_version INTEGER NOT NULL DEFAULT 0;

-- 6. Helper function to serialize and generate tree checkpoints on the database (merging metadata first)
CREATE OR REPLACE FUNCTION private.generate_tree_checkpoint(
  p_tree_id UUID
) RETURNS BIGINT AS $$
DECLARE
  v_max_seq BIGINT;
  v_people_snapshot JSONB;
BEGIN
  -- 1. Find max synced version_seq of operations
  SELECT COALESCE(MAX(version_seq), 0) INTO v_max_seq
  FROM public.tree_operations
  WHERE tree_id = p_tree_id;

  -- 2. Reconstruct people maps and parents/children/spouses relationship arrays in JSONB
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
    SELECT
      sp.src AS src,
      ch.dst AS dst,
      'children'::text AS rel_type
    FROM explicit_relations sp
    JOIN explicit_relations ch ON sp.dst = ch.src
    WHERE sp.rel_type = 'spouses' AND ch.rel_type = 'children'
  ),
  derived_parents_from_spouses AS (
    SELECT
      ch.src AS src,
      sp.dst AS dst,
      'parents'::text AS rel_type
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
    SELECT
      src AS person_id,
      rel_type,
      jsonb_agg(dst) AS dst_list
    FROM relationships_union
    GROUP BY src, rel_type
  ),
  person_enriched AS (
    SELECT
      p.id,
      p.base_json || jsonb_build_object(
        'parents', COALESCE((SELECT dst_list FROM person_relations WHERE person_id = p.id AND rel_type = 'parents'), '[]'::jsonb),
        'children', COALESCE((SELECT dst_list FROM person_relations WHERE person_id = p.id AND rel_type = 'children'), '[]'::jsonb),
        'spouses', COALESCE((SELECT dst_list FROM person_relations WHERE person_id = p.id AND rel_type = 'spouses'), '[]'::jsonb)
      ) AS final_json
    FROM tree_people p
  )
  SELECT jsonb_object_agg(id, final_json) INTO v_people_snapshot
  FROM person_enriched;

  IF v_people_snapshot IS NULL THEN
    v_people_snapshot := '{}'::jsonb;
  END IF;

  -- 3. Upsert checkpoint
  INSERT INTO public.tree_checkpoints (tree_id, version_seq, people, created_at)
  VALUES (p_tree_id, v_max_seq, v_people_snapshot, NOW())
  ON CONFLICT (tree_id, version_seq) DO UPDATE SET
    people = EXCLUDED.people,
    created_at = NOW();

  RETURN v_max_seq;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, private, pg_temp;

-- 7. Remove any legacy triggers that generated checkpoints from tree_operations
DROP TRIGGER IF EXISTS prune_old_checkpoints_trigger ON public.tree_checkpoints;
DROP TRIGGER IF EXISTS trg_generate_tree_checkpoint ON public.tree_operations;

-- 8. Unified collaborator limits trigger with locking
CREATE OR REPLACE FUNCTION private.assert_tree_collaborator_limits(
  p_tree_id UUID
) RETURNS VOID AS $$
DECLARE
  v_owner_id TEXT;
  v_tier TEXT;
  v_active_count INTEGER;
  v_pending_count INTEGER;
BEGIN
  -- Obtain exclusive lock on the tree row to serialize updates and prevent race conditions
  SELECT owner_id INTO v_owner_id FROM public.trees WHERE id = p_tree_id FOR UPDATE;

  v_tier := COALESCE((SELECT tier FROM public.user_profiles WHERE id = v_owner_id), 'free');

  IF v_tier = 'family' THEN
    RETURN;
  END IF;

  -- Count active editors/collaborators
  SELECT count(*) INTO v_active_count FROM public.tree_collaborators WHERE tree_id = p_tree_id;

  -- Count pending invitations, excluding those whose emails already transitioned to active tree_collaborators
  SELECT count(*) INTO v_pending_count
  FROM public.tree_invitations i
  WHERE i.tree_id = p_tree_id
    AND i.status = 'pending'
    AND i.expires_at > NOW()
    AND NOT EXISTS (
      SELECT 1 FROM public.tree_collaborators c
      WHERE c.tree_id = p_tree_id AND lower(c.email) = lower(i.invited_email)
    );

  IF v_tier = 'free' THEN
    IF (v_active_count + v_pending_count) > 0 THEN
      RAISE EXCEPTION 'Free tier trees cannot have collaborators. Please upgrade to Pro or Family.';
    END IF;
  ELSIF v_tier = 'pro' THEN
    IF (v_active_count + v_pending_count) > 1 THEN
      RAISE EXCEPTION 'Pro tier trees are limited to exactly 1 Co-Editor. Please upgrade to Family for unlimited collaborators.';
    END IF;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, private, pg_temp;

-- Revoke execute on private helper from non-service role
REVOKE EXECUTE ON FUNCTION private.assert_tree_collaborator_limits(UUID) FROM PUBLIC, anon, authenticated;

-- Table Triggers for Defense-in-Depth
CREATE OR REPLACE FUNCTION public.trg_assert_tree_collaborator_limits()
RETURNS TRIGGER AS $$
BEGIN
  PERFORM private.assert_tree_collaborator_limits(NEW.tree_id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, private, pg_temp;

DROP TRIGGER IF EXISTS trg_assert_collaborator_limits ON public.tree_collaborators;
CREATE CONSTRAINT TRIGGER trg_assert_collaborator_limits
AFTER INSERT OR UPDATE ON public.tree_collaborators
DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW
EXECUTE FUNCTION public.trg_assert_tree_collaborator_limits();

DROP TRIGGER IF EXISTS trg_assert_invitation_limits ON public.tree_invitations;
CREATE CONSTRAINT TRIGGER trg_assert_invitation_limits
AFTER INSERT OR UPDATE ON public.tree_invitations
DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW
EXECUTE FUNCTION public.trg_assert_tree_collaborator_limits();

-- 9. Redefine people limits trigger to raise exceptions rather than returning NULL
CREATE OR REPLACE FUNCTION private.enforce_people_limit()
RETURNS TRIGGER AS $$
DECLARE
  v_owner_id TEXT;
  v_tier TEXT;
  v_people_count INTEGER;
BEGIN
  SELECT owner_id INTO v_owner_id FROM public.trees WHERE id = NEW.tree_id;
  v_tier := COALESCE((SELECT tier FROM public.user_profiles WHERE id = v_owner_id), 'free');

  IF v_tier = 'free' THEN
    SELECT count(*) INTO v_people_count FROM public.people WHERE tree_id = NEW.tree_id;
    IF v_people_count >= 100 THEN
      RAISE EXCEPTION 'Free tier limit reached. Please upgrade to add more family members.' USING ERRCODE = 'P0001';
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, private, pg_temp;

CREATE OR REPLACE FUNCTION private.enforce_tree_operations_limit()
RETURNS TRIGGER AS $$
DECLARE
  v_owner_id TEXT;
  v_tier TEXT;
  v_people_count INTEGER;
BEGIN
  IF NEW.type = 'ADD_NODE' THEN
    SELECT owner_id INTO v_owner_id FROM public.trees WHERE id = NEW.tree_id;
    v_tier := COALESCE((SELECT tier FROM public.user_profiles WHERE id = v_owner_id), 'free');

    IF v_tier = 'free' THEN
      SELECT count(*) INTO v_people_count FROM public.people WHERE tree_id = NEW.tree_id;
      IF v_people_count >= 100 THEN
        RAISE EXCEPTION 'Free tier limit reached. Please upgrade to add more family members.' USING ERRCODE = 'P0001';
      END IF;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, private, pg_temp;

-- Revoke executions
REVOKE EXECUTE ON FUNCTION private.enforce_people_limit() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION private.enforce_tree_operations_limit() FROM PUBLIC, anon, authenticated;

-- 10. Implement User Profile registration triggers & onboarding helpers in private schema
CREATE OR REPLACE FUNCTION private.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.user_profiles (id, display_name, photo_url, tier, metadata, created_at, updated_at)
  VALUES (
    NEW.id::text,
    COALESCE(NEW.raw_user_meta_data->>'display_name', NEW.raw_user_meta_data->>'full_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'avatar_url', ''),
    'free',
    '{}'::jsonb,
    NOW(),
    NOW()
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, auth, pg_temp;

REVOKE ALL ON FUNCTION private.handle_new_user() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION private.handle_new_user();

-- ensure_user_profile for custom Google auth exchange onboarding
CREATE OR REPLACE FUNCTION private.ensure_user_profile(
  p_user_id TEXT,
  p_display_name TEXT,
  p_photo_url TEXT
) RETURNS VOID AS $$
BEGIN
  INSERT INTO public.user_profiles (id, display_name, photo_url, tier, metadata, created_at, updated_at)
  VALUES (p_user_id, p_display_name, p_photo_url, 'free', '{}'::jsonb, NOW(), NOW())
  ON CONFLICT (id) DO NOTHING;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, private, pg_temp;

REVOKE ALL ON FUNCTION private.ensure_user_profile(TEXT, TEXT, TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION private.ensure_user_profile(TEXT, TEXT, TEXT) TO service_role;

CREATE OR REPLACE FUNCTION public.ensure_user_profile(
  p_user_id TEXT,
  p_display_name TEXT,
  p_photo_url TEXT
) RETURNS VOID AS $$
BEGIN
  PERFORM private.ensure_user_profile(p_user_id, p_display_name, p_photo_url);
END;
$$ LANGUAGE plpgsql SECURITY INVOKER;

REVOKE ALL ON FUNCTION public.ensure_user_profile(TEXT, TEXT, TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.ensure_user_profile(TEXT, TEXT, TEXT) TO service_role;

-- 11. Profile & Tour status modifications
CREATE OR REPLACE FUNCTION private.update_my_profile(
  p_updates JSONB
) RETURNS VOID AS $$
DECLARE
  v_user_id TEXT;
BEGIN
  v_user_id := private.current_user_id_text();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Access Denied: Missing authenticated user.';
  END IF;

  UPDATE public.user_profiles
  SET display_name = CASE WHEN p_updates ? 'displayName' THEN NULLIF(p_updates->>'displayName', '') ELSE display_name END,
      photo_url = CASE WHEN p_updates ? 'photoURL' THEN NULLIF(p_updates->>'photoURL', '') ELSE photo_url END,
      photo_path = CASE WHEN p_updates ? 'photoPath' THEN NULLIF(p_updates->>'photoPath', '') ELSE photo_path END,
      photo_version = CASE WHEN p_updates ? 'photoVersion' THEN (p_updates->>'photoVersion')::integer ELSE photo_version END,
      metadata = CASE WHEN p_updates ? 'metadata' THEN COALESCE(metadata, '{}'::jsonb) || COALESCE(p_updates->'metadata', '{}'::jsonb) ELSE metadata END,
      updated_at = NOW()
  WHERE id = v_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, private, pg_temp;

REVOKE ALL ON FUNCTION private.update_my_profile(JSONB) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION private.update_my_profile(JSONB) TO authenticated;

CREATE OR REPLACE FUNCTION public.update_my_profile(
  p_updates JSONB
) RETURNS VOID AS $$
BEGIN
  PERFORM private.update_my_profile(p_updates);
END;
$$ LANGUAGE plpgsql SECURITY INVOKER;

REVOKE ALL ON FUNCTION public.update_my_profile(JSONB) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.update_my_profile(JSONB) TO authenticated;


CREATE OR REPLACE FUNCTION private.update_user_tour_status(
  p_has_completed BOOLEAN
) RETURNS VOID AS $$
DECLARE
  v_user_id TEXT;
BEGIN
  v_user_id := private.current_user_id_text();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Access Denied: Missing authenticated user.';
  END IF;

  UPDATE public.user_profiles
  SET metadata = COALESCE(metadata, '{}'::jsonb) || jsonb_build_object('has_completed_tour', p_has_completed),
      updated_at = NOW()
  WHERE id = v_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, private, pg_temp;

REVOKE ALL ON FUNCTION private.update_user_tour_status(BOOLEAN) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION private.update_user_tour_status(BOOLEAN) TO authenticated;

CREATE OR REPLACE FUNCTION public.update_user_tour_status(
  p_has_completed BOOLEAN
) RETURNS VOID AS $$
BEGIN
  PERFORM private.update_user_tour_status(p_has_completed);
END;
$$ LANGUAGE plpgsql SECURITY INVOKER;

REVOKE ALL ON FUNCTION public.update_user_tour_status(BOOLEAN) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.update_user_tour_status(BOOLEAN) TO authenticated;


-- 12. Atomic profile and trees DB deletion
CREATE OR REPLACE FUNCTION private.delete_my_profile_data()
RETURNS VOID AS $$
DECLARE
  v_user_id TEXT;
BEGIN
  v_user_id := private.current_user_id_text();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Access Denied: Missing authenticated user.';
  END IF;

  -- Delete trees owned by user (cascades to collaborators, shares, people, etc.)
  DELETE FROM public.trees WHERE owner_id = v_user_id;

  -- Delete profile
  DELETE FROM public.user_profiles WHERE id = v_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, private, pg_temp;

REVOKE ALL ON FUNCTION private.delete_my_profile_data() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION private.delete_my_profile_data() TO authenticated;

CREATE OR REPLACE FUNCTION public.delete_my_profile_data()
RETURNS VOID AS $$
BEGIN
  PERFORM private.delete_my_profile_data();
END;
$$ LANGUAGE plpgsql SECURITY INVOKER;

REVOKE ALL ON FUNCTION public.delete_my_profile_data() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.delete_my_profile_data() TO authenticated;


-- 13. Unified Tree Mutation Helper (writes content, enforces limits, resolves hijackings)
CREATE OR REPLACE FUNCTION private.write_tree_content(
  p_tree_id UUID,
  p_people JSONB,
  p_relationships JSONB,
  p_replace BOOLEAN
) RETURNS VOID AS $$
DECLARE
  v_caller_id TEXT;
  v_owner_id TEXT;
  v_tier TEXT;
  v_final_people_count INTEGER;
  v_new_people_count INTEGER := 0;
  v_person JSONB;
  v_person_id TEXT;
  v_custom_fields JSONB;
  v_metadata JSONB;
  v_rel JSONB;
  v_rel_person_id TEXT;
  v_rel_relative_id TEXT;
  v_rel_type TEXT;
  v_focus_id TEXT;
  v_existing_id TEXT;
BEGIN
  -- 1. Secure caller validation
  v_caller_id := private.current_user_id_text();
  IF v_caller_id IS NULL THEN
    RAISE EXCEPTION 'Access Denied: Missing authenticated user.';
  END IF;

  -- Verify p_people and p_relationships are arrays
  IF jsonb_typeof(p_people) <> 'array' OR jsonb_typeof(p_relationships) <> 'array' THEN
    RAISE EXCEPTION 'Invalid inputs: people and relationships must be arrays.';
  END IF;

  -- Import limits
  IF jsonb_array_length(p_people) > 1000 OR jsonb_array_length(p_relationships) > 2000 THEN
    RAISE EXCEPTION 'Validation Error: Import/Replace limit exceeded (max 1000 people and 2000 relationships).';
  END IF;

  -- 2. Lock tree row for atomic writes and verify editor permissions
  SELECT owner_id INTO v_owner_id FROM public.trees WHERE id = p_tree_id FOR UPDATE;
  IF v_owner_id IS NULL THEN
    RAISE EXCEPTION 'Not Found: Tree % does not exist.', p_tree_id;
  END IF;

  IF NOT (
    v_owner_id = v_caller_id OR public.is_tree_collaborator(p_tree_id, 'editor')
  ) THEN
    RAISE EXCEPTION 'Access Denied: User % is not authorized to edit tree %', v_caller_id, p_tree_id;
  END IF;

  v_tier := COALESCE((SELECT tier FROM public.user_profiles WHERE id = v_owner_id), 'free');

  -- 3. Calculate final count and validate Free tier limits
  IF v_tier = 'free' THEN
    IF p_replace THEN
      -- If replacing, the final count is exactly the count of unique IDs in the new payload
      SELECT count(DISTINCT (elem->>'id')) INTO v_final_people_count
      FROM jsonb_array_elements(p_people) AS elem;
    ELSE
      -- If importing (upserting), the final count is current people + new unique people in payload
      SELECT count(*) INTO v_final_people_count FROM public.people WHERE tree_id = p_tree_id;
      SELECT count(DISTINCT (elem->>'id')) INTO v_new_people_count
      FROM jsonb_array_elements(p_people) AS elem
      WHERE NOT EXISTS (
        SELECT 1 FROM public.people WHERE id = elem->>'id' AND tree_id = p_tree_id
      );
      v_final_people_count := v_final_people_count + v_new_people_count;
    END IF;

    IF v_final_people_count > 100 THEN
      RAISE EXCEPTION 'Free tier limit reached. Please upgrade to add more family members.' USING ERRCODE = 'P0001';
    END IF;
  END IF;

  -- 4. Prevent cross-tree hijacking: assert that none of the IDs exist in other trees
  IF EXISTS (
    SELECT 1
    FROM jsonb_array_elements(p_people) AS elem
    JOIN public.people p ON p.id = elem->>'id'
    WHERE p.tree_id IS DISTINCT FROM p_tree_id
  ) THEN
    RAISE EXCEPTION 'Access Denied: Some person IDs exist in another tree.';
  END IF;

  -- 5. Delete existing content if p_replace is true
  IF p_replace THEN
    DELETE FROM public.relationships WHERE tree_id = p_tree_id;
    DELETE FROM public.people WHERE tree_id = p_tree_id;
  END IF;

  -- 6. Insert/Update people
  FOR v_person IN SELECT * FROM jsonb_array_elements(p_people) LOOP
    v_person_id := v_person->>'id';
    v_custom_fields := v_person->'customFields';
    IF v_custom_fields IS NULL THEN
      v_custom_fields := v_person->'custom_fields';
    END IF;
    v_metadata := v_person->'metadata';

    IF v_person_id IS NULL THEN
      RAISE EXCEPTION 'Validation Error: Person payload is missing id';
    END IF;

    INSERT INTO public.people (
      id, tree_id, first_name, last_name, middle_name, birth_name, nick_name, suffix, gender,
      birth_date, death_date, birth_place, death_place, bio, profession, company, interests,
      photo_url, photo_path, photo_version, email, website, blog, address, custom_fields, metadata,
      created_at, updated_at
    ) VALUES (
      v_person_id, p_tree_id,
      COALESCE(v_person->>'firstName', v_person->>'first_name', ''),
      COALESCE(v_person->>'lastName', v_person->>'last_name', ''),
      COALESCE(v_person->>'middleName', v_person->>'middle_name', ''),
      COALESCE(v_person->>'birthName', v_person->>'birth_name', ''),
      COALESCE(v_person->>'nickName', v_person->>'nick_name', ''),
      COALESCE(v_person->>'suffix', v_person->>'suffix', ''),
      COALESCE(v_person->>'gender', 'male'),
      NULLIF(COALESCE(v_person->>'birthDate', v_person->>'birth_date', ''), '')::date,
      NULLIF(COALESCE(v_person->>'deathDate', v_person->>'death_date', ''), '')::date,
      COALESCE(v_person->>'birthPlace', v_person->>'birth_place', ''),
      COALESCE(v_person->>'deathPlace', v_person->>'death_place', ''),
      COALESCE(v_person->>'bio', ''),
      COALESCE(v_person->>'profession', ''),
      COALESCE(v_person->>'company', ''),
      COALESCE(v_person->>'interests', ''),
      NULLIF(COALESCE(v_person->>'photoUrl', v_person->>'photo_url', ''), ''),
      COALESCE(v_person->>'photoPath', v_person->>'photo_path', ''),
      COALESCE((v_person->>'photoVersion')::integer, (v_person->>'photo_version')::integer, 0),
      COALESCE(v_person->>'email', ''),
      COALESCE(v_person->>'website', ''),
      COALESCE(v_person->>'blog', ''),
      COALESCE(v_person->>'address', ''),
      COALESCE(v_custom_fields, '{}'::JSONB),
      COALESCE(v_metadata, '{}'::JSONB),
      NOW(), NOW()
    ) ON CONFLICT (id) DO UPDATE SET
      first_name = EXCLUDED.first_name,
      last_name = EXCLUDED.last_name,
      middle_name = EXCLUDED.middle_name,
      birth_name = EXCLUDED.birth_name,
      nick_name = EXCLUDED.nick_name,
      suffix = EXCLUDED.suffix,
      gender = EXCLUDED.gender,
      birth_date = EXCLUDED.birth_date,
      death_date = EXCLUDED.death_date,
      birth_place = EXCLUDED.birth_place,
      death_place = EXCLUDED.death_place,
      bio = EXCLUDED.bio,
      profession = EXCLUDED.profession,
      company = EXCLUDED.company,
      interests = EXCLUDED.interests,
      photo_url = EXCLUDED.photo_url,
      photo_path = EXCLUDED.photo_path,
      photo_version = EXCLUDED.photo_version,
      email = EXCLUDED.email,
      website = EXCLUDED.website,
      blog = EXCLUDED.blog,
      address = EXCLUDED.address,
      custom_fields = EXCLUDED.custom_fields,
      metadata = EXCLUDED.metadata,
      updated_at = NOW();
  END LOOP;

  -- 7. Insert relationships
  FOR v_rel IN SELECT * FROM jsonb_array_elements(p_relationships) LOOP
    v_rel_person_id := COALESCE(v_rel->>'personId', v_rel->>'person_id');
    v_rel_relative_id := COALESCE(v_rel->>'relativeId', v_rel->>'relative_id');
    v_rel_type := v_rel->>'type';

    IF v_rel_person_id IS NULL OR v_rel_relative_id IS NULL OR v_rel_type IS NULL THEN
      RAISE EXCEPTION 'Validation Error: Relationship payload is invalid';
    END IF;

    -- Verify both belong to active tree
    IF NOT EXISTS (SELECT 1 FROM public.people WHERE id = v_rel_person_id AND tree_id = p_tree_id) OR
       NOT EXISTS (SELECT 1 FROM public.people WHERE id = v_rel_relative_id AND tree_id = p_tree_id) THEN
      RAISE EXCEPTION 'Access Denied: Relationship nodes must belong to tree %', p_tree_id;
    END IF;

    INSERT INTO public.relationships (tree_id, person_id, relative_id, type, created_at)
    VALUES (p_tree_id, v_rel_person_id, v_rel_relative_id, v_rel_type, NOW())
    ON CONFLICT (tree_id, person_id, relative_id, type) DO NOTHING;
  END LOOP;

  -- 8. Generate checkpoint
  PERFORM private.generate_tree_checkpoint(p_tree_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, private, pg_temp;

-- Revoke execute on helper from all roles
REVOKE ALL ON FUNCTION private.write_tree_content(UUID, JSONB, JSONB, BOOLEAN) FROM PUBLIC, anon, authenticated;

-- Redefine Import/Replace to delegate to private helper
CREATE OR REPLACE FUNCTION private.import_tree_content(
  p_tree_id UUID,
  p_people JSONB,
  p_relationships JSONB
) RETURNS VOID AS $$
BEGIN
  PERFORM private.write_tree_content(p_tree_id, p_people, p_relationships, false);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, private, pg_temp;

REVOKE ALL ON FUNCTION private.import_tree_content(UUID, JSONB, JSONB) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION private.import_tree_content(UUID, JSONB, JSONB) TO authenticated;

CREATE OR REPLACE FUNCTION public.import_tree_content(
  p_tree_id UUID,
  p_people JSONB,
  p_relationships JSONB
) RETURNS VOID AS $$
BEGIN
  PERFORM private.import_tree_content(p_tree_id, p_people, p_relationships);
END;
$$ LANGUAGE plpgsql SECURITY INVOKER;

REVOKE ALL ON FUNCTION public.import_tree_content(UUID, JSONB, JSONB) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.import_tree_content(UUID, JSONB, JSONB) TO authenticated;


CREATE OR REPLACE FUNCTION private.replace_tree_content(
  p_tree_id UUID,
  p_people JSONB,
  p_relationships JSONB
) RETURNS VOID AS $$
BEGIN
  PERFORM private.write_tree_content(p_tree_id, p_people, p_relationships, true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, private, pg_temp;

REVOKE ALL ON FUNCTION private.replace_tree_content(UUID, JSONB, JSONB) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION private.replace_tree_content(UUID, JSONB, JSONB) TO authenticated;

CREATE OR REPLACE FUNCTION public.replace_tree_content(
  p_tree_id UUID,
  p_people JSONB,
  p_relationships JSONB
) RETURNS VOID AS $$
BEGIN
  PERFORM private.replace_tree_content(p_tree_id, p_people, p_relationships);
END;
$$ LANGUAGE plpgsql SECURITY INVOKER;

REVOKE ALL ON FUNCTION public.replace_tree_content(UUID, JSONB, JSONB) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.replace_tree_content(UUID, JSONB, JSONB) TO authenticated;


-- 14. Secure storage media photo updates
CREATE OR REPLACE FUNCTION private.update_person_photo(
  p_person_id TEXT,
  p_tree_id UUID,
  p_photo_url TEXT,
  p_photo_path TEXT,
  p_photo_version INTEGER
) RETURNS VOID AS $$
DECLARE
  v_caller_id TEXT;
  v_owner_id TEXT;
BEGIN
  v_caller_id := private.current_user_id_text();
  IF v_caller_id IS NULL THEN
    RAISE EXCEPTION 'Access Denied: Missing authenticated user.';
  END IF;

  -- Verify tree exists and caller is owner or editor
  SELECT owner_id INTO v_owner_id FROM public.trees WHERE id = p_tree_id FOR UPDATE;
  IF v_owner_id IS NULL THEN
    RAISE EXCEPTION 'Not Found: Tree % does not exist.', p_tree_id;
  END IF;

  IF NOT (
    v_owner_id = v_caller_id OR public.is_tree_collaborator(p_tree_id, 'editor')
  ) THEN
    RAISE EXCEPTION 'Access Denied: User % is not authorized to edit tree %', v_caller_id, p_tree_id;
  END IF;

  UPDATE public.people
  SET photo_url = p_photo_url,
      photo_path = p_photo_path,
      photo_version = p_photo_version,
      updated_at = NOW()
  WHERE id = p_person_id AND tree_id = p_tree_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Not Found: Person % does not exist in tree %.', p_person_id, p_tree_id;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, private, pg_temp;

REVOKE ALL ON FUNCTION private.update_person_photo(TEXT, UUID, TEXT, TEXT, INTEGER) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION private.update_person_photo(TEXT, UUID, TEXT, TEXT, INTEGER) TO authenticated;

CREATE OR REPLACE FUNCTION public.update_person_photo(
  p_person_id TEXT,
  p_tree_id UUID,
  p_photo_url TEXT,
  p_photo_path TEXT,
  p_photo_version INTEGER
) RETURNS VOID AS $$
BEGIN
  PERFORM private.update_person_photo(p_person_id, p_tree_id, p_photo_url, p_photo_path, p_photo_version);
END;
$$ LANGUAGE plpgsql SECURITY INVOKER;

REVOKE ALL ON FUNCTION public.update_person_photo(TEXT, UUID, TEXT, TEXT, INTEGER) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.update_person_photo(TEXT, UUID, TEXT, TEXT, INTEGER) TO authenticated;


CREATE OR REPLACE FUNCTION private.update_user_avatar(
  p_photo_url TEXT,
  p_photo_path TEXT,
  p_photo_version INTEGER
) RETURNS VOID AS $$
DECLARE
  v_user_id TEXT;
BEGIN
  v_user_id := private.current_user_id_text();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Access Denied: Missing authenticated user.';
  END IF;

  UPDATE public.user_profiles
  SET photo_url = p_photo_url,
      photo_path = p_photo_path,
      photo_version = p_photo_version,
      updated_at = NOW()
  WHERE id = v_user_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Not Found: Profile for user % does not exist.', v_user_id;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, private, pg_temp;

REVOKE ALL ON FUNCTION private.update_user_avatar(TEXT, TEXT, INTEGER) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION private.update_user_avatar(TEXT, TEXT, INTEGER) TO authenticated;

CREATE OR REPLACE FUNCTION public.update_user_avatar(
  p_photo_url TEXT,
  p_photo_path TEXT,
  p_photo_version INTEGER
) RETURNS VOID AS $$
BEGIN
  PERFORM private.update_user_avatar(p_photo_url, p_photo_path, p_photo_version);
END;
$$ LANGUAGE plpgsql SECURITY INVOKER;

REVOKE ALL ON FUNCTION public.update_user_avatar(TEXT, TEXT, INTEGER) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.update_user_avatar(TEXT, TEXT, INTEGER) TO authenticated;


-- 15. Relocate sync_tree_batch to private schema and process sequentially in request order
DROP FUNCTION IF EXISTS public.sync_tree_batch(jsonb);

CREATE OR REPLACE FUNCTION private.sync_tree_batch(
  p_ops JSONB
) RETURNS INTEGER AS $$
DECLARE
  v_caller_id TEXT;
  v_inserted_count INTEGER := 0;
  v_tree_id UUID;
  v_owner_id TEXT;
  v_tier TEXT;
  v_base_version BIGINT;
  v_last_checkpoint_seq BIGINT;
  v_people_count INTEGER;
  v_op JSONB;
  v_payload JSONB;
  v_person JSONB;
  v_updates JSONB;
  v_custom_fields JSONB;
  v_metadata JSONB;
  v_type TEXT;
  v_person_id TEXT;
  v_relative_id TEXT;
  v_rel_type TEXT;
  v_target_id TEXT;
  v_focus_id TEXT;
  v_existing_id TEXT;
  v_ops_length INTEGER;
BEGIN
  -- A. Secure caller validation
  v_caller_id := private.current_user_id_text();
  IF v_caller_id IS NULL THEN
    RAISE EXCEPTION 'Access Denied: Missing authenticated user.';
  END IF;

  IF p_ops IS NULL OR jsonb_typeof(p_ops) <> 'array' OR jsonb_array_length(p_ops) = 0 THEN
    RETURN 0;
  END IF;

  v_ops_length := jsonb_array_length(p_ops);
  IF v_ops_length > 100 THEN
    RAISE EXCEPTION 'Validation Error: Batch size cannot exceed 100 operations.';
  END IF;

  -- B. Enforce single tree per batch
  SELECT (value->>'tree_id')::UUID INTO v_tree_id
  FROM jsonb_array_elements(p_ops) AS value LIMIT 1;

  IF v_tree_id IS NULL THEN
    RAISE EXCEPTION 'Validation Error: Missing tree_id in sync batch.';
  END IF;

  IF EXISTS (
    SELECT 1 FROM jsonb_array_elements(p_ops) AS value
    WHERE (value->>'tree_id')::UUID IS DISTINCT FROM v_tree_id
  ) THEN
    RAISE EXCEPTION 'Validation Error: sync_tree_batch accepts one tree_id per batch.';
  END IF;

  -- C. Lock tree row for atomic writes and verify editor permissions
  SELECT owner_id INTO v_owner_id FROM public.trees WHERE id = v_tree_id FOR UPDATE;
  IF v_owner_id IS NULL THEN
    RAISE EXCEPTION 'Not Found: Tree % does not exist.', v_tree_id;
  END IF;

  IF NOT (
    v_owner_id = v_caller_id OR public.is_tree_collaborator(v_tree_id, 'editor')
  ) THEN
    RAISE EXCEPTION 'Access Denied: User % is not authorized to edit tree %', v_caller_id, v_tree_id;
  END IF;

  v_tier := COALESCE((SELECT tier FROM public.user_profiles WHERE id = v_owner_id), 'free');

  -- D. Retrieve base version sequence
  SELECT COALESCE(MAX(version_seq), 0) INTO v_base_version
  FROM public.tree_operations WHERE tree_id = v_tree_id;

  -- E. Loop through operations and apply database projections in sequential request order (no sorting)
  FOR v_op IN SELECT * FROM jsonb_array_elements(p_ops) LOOP
    v_type := v_op->>'type';
    v_payload := v_op->'payload';

    IF v_type NOT IN ('ADD_NODE', 'UPDATE_PROP', 'DELETE_NODE', 'ADD_RELATION', 'DELETE_RELATION', 'SET_TREE_METADATA') THEN
      RAISE EXCEPTION 'Validation Error: Unsupported operation type %.', v_type;
    END IF;

    -- 1. Apply Projection to Tables
    IF v_type = 'ADD_NODE' THEN
      v_person := v_payload->'person';
      v_person_id := v_person->>'id';
      v_custom_fields := v_person->'custom_fields';
      v_metadata := v_person->'metadata';
      IF v_person_id IS NULL THEN
        RAISE EXCEPTION 'Validation Error: ADD_NODE payload is missing person.id';
      END IF;

      -- Verify person does not exist in any other tree
      IF EXISTS (SELECT 1 FROM public.people WHERE id = v_person_id AND tree_id IS DISTINCT FROM v_tree_id) THEN
        RAISE EXCEPTION 'Access Denied: Person ID % exists in another tree.', v_person_id;
      END IF;

      INSERT INTO public.people (
        id, tree_id, first_name, last_name, middle_name, birth_name, nick_name, suffix, gender,
        birth_date, death_date, birth_place, death_place, bio, profession, company, interests,
        photo_url, photo_path, photo_version, email, website, blog, address, custom_fields, metadata,
        created_at, updated_at
      ) VALUES (
        v_person_id, v_tree_id,
        v_person->>'firstName', v_person->>'lastName', v_person->>'middleName', v_person->>'birthName',
        v_person->>'nickName', v_person->>'suffix', COALESCE(v_person->>'gender', 'male'),
        NULLIF(v_person->>'birthDate', '')::date, NULLIF(v_person->>'deathDate', '')::date, v_person->>'birthPlace', v_person->>'deathPlace',
        v_person->>'bio', v_person->>'profession', v_person->>'company', v_person->>'interests',
        v_person->>'photoUrl', v_person->>'photoPath', COALESCE((v_person->>'photoVersion')::integer, 0),
        v_person->>'email', v_person->>'website', v_person->>'blog', v_person->>'address',
        COALESCE(v_custom_fields, '{}'::JSONB), COALESCE(v_metadata, '{}'::JSONB),
        NOW(), NOW()
      ) ON CONFLICT (id) DO UPDATE SET
        first_name = EXCLUDED.first_name, last_name = EXCLUDED.last_name, gender = EXCLUDED.gender, updated_at = NOW();

      -- Link initial relative relationship if sent in ADD_NODE
      v_relative_id := v_payload->>'relativeId';
      v_rel_type := v_payload->>'type';
      IF v_relative_id IS NOT NULL AND v_rel_type IN ('parent', 'child', 'spouse') THEN
        IF NOT EXISTS (SELECT 1 FROM public.people WHERE id = v_relative_id AND tree_id = v_tree_id) THEN
          RAISE EXCEPTION 'Access Denied: Relative ID % does not belong to tree %.', v_relative_id, v_tree_id;
        END IF;

        INSERT INTO public.relationships (tree_id, person_id, relative_id, type)
        VALUES (v_tree_id, v_relative_id, v_person_id, v_rel_type)
        ON CONFLICT (tree_id, person_id, relative_id, type) DO NOTHING;
      END IF;

     ELSIF v_type = 'UPDATE_PROP' THEN
      v_person_id := v_payload->>'id';
      v_updates := v_payload->'updates';
      IF v_person_id IS NULL OR v_updates IS NULL THEN
        RAISE EXCEPTION 'Validation Error: UPDATE_PROP payload is missing id or updates';
      END IF;

      -- Verify person belongs to active tree
      IF NOT EXISTS (SELECT 1 FROM public.people WHERE id = v_person_id AND tree_id = v_tree_id) THEN
        RAISE EXCEPTION 'Access Denied: Person % does not exist in tree %.', v_person_id, v_tree_id;
      END IF;

      -- Update the matching person fields directly in SQL
      UPDATE public.people
      SET
        first_name = COALESCE(v_updates->>'firstName', first_name),
        last_name = COALESCE(v_updates->>'lastName', last_name),
        middle_name = CASE WHEN jsonb_exists(v_updates, 'middleName') THEN v_updates->>'middleName' ELSE middle_name END,
        birth_name = CASE WHEN jsonb_exists(v_updates, 'birthName') THEN v_updates->>'birthName' ELSE birth_name END,
        nick_name = CASE WHEN jsonb_exists(v_updates, 'nickName') THEN v_updates->>'nickName' ELSE nick_name END,
        suffix = CASE WHEN jsonb_exists(v_updates, 'suffix') THEN v_updates->>'suffix' ELSE suffix END,
        gender = COALESCE(v_updates->>'gender', gender),
        birth_date = CASE WHEN jsonb_exists(v_updates, 'birthDate') THEN NULLIF(v_updates->>'birthDate', '')::date ELSE birth_date END,
        death_date = CASE WHEN jsonb_exists(v_updates, 'deathDate') THEN NULLIF(v_updates->>'deathDate', '')::date ELSE death_date END,
        birth_place = CASE WHEN jsonb_exists(v_updates, 'birthPlace') THEN v_updates->>'birthPlace' ELSE birth_place END,
        death_place = CASE WHEN jsonb_exists(v_updates, 'deathPlace') THEN v_updates->>'deathPlace' ELSE death_place END,
        bio = CASE WHEN jsonb_exists(v_updates, 'bio') THEN v_updates->>'bio' ELSE bio END,
        photo_url = CASE WHEN jsonb_exists(v_updates, 'photoUrl') THEN v_updates->>'photoUrl' ELSE photo_url END,
        photo_path = CASE WHEN jsonb_exists(v_updates, 'photoPath') THEN v_updates->>'photoPath' ELSE photo_path END,
        photo_version = CASE WHEN jsonb_exists(v_updates, 'photoVersion') THEN (v_updates->>'photoVersion')::integer ELSE photo_version END,
        updated_at = NOW()
      WHERE id = v_person_id;

    ELSIF v_type = 'DELETE_NODE' THEN
      v_person_id := v_payload->>'id';
      IF v_person_id IS NULL THEN
        RAISE EXCEPTION 'Validation Error: DELETE_NODE payload is missing id';
      END IF;

      -- Verify person belongs to active tree
      IF NOT EXISTS (SELECT 1 FROM public.people WHERE id = v_person_id AND tree_id = v_tree_id) THEN
        RAISE EXCEPTION 'Access Denied: Person % does not exist in tree %.', v_person_id, v_tree_id;
      END IF;

      DELETE FROM public.people WHERE id = v_person_id;

    ELSIF v_type = 'ADD_RELATION' THEN
      v_focus_id := v_payload->>'focusId';
      v_existing_id := v_payload->>'existingId';
      v_rel_type := v_payload->>'type';
      IF v_focus_id IS NULL OR v_existing_id IS NULL OR v_rel_type NOT IN ('parent', 'child', 'spouse') THEN
        RAISE EXCEPTION 'Validation Error: ADD_RELATION payload is invalid';
      END IF;

      -- Verify both belong to active tree
      IF NOT EXISTS (SELECT 1 FROM public.people WHERE id = v_focus_id AND tree_id = v_tree_id) OR
         NOT EXISTS (SELECT 1 FROM public.people WHERE id = v_existing_id AND tree_id = v_tree_id) THEN
        RAISE EXCEPTION 'Access Denied: Relation nodes must exist in tree %.', v_tree_id;
      END IF;

      INSERT INTO public.relationships (tree_id, person_id, relative_id, type)
      VALUES (v_tree_id, v_focus_id, v_existing_id, v_rel_type)
      ON CONFLICT (tree_id, person_id, relative_id, type) DO NOTHING;

    ELSIF v_type = 'DELETE_RELATION' THEN
      v_target_id := v_payload->>'targetId';
      v_relative_id := v_payload->>'relativeId';
      v_rel_type := v_payload->>'type';
      IF v_target_id IS NULL OR v_relative_id IS NULL OR v_rel_type NOT IN ('parent', 'child', 'spouse') THEN
        RAISE EXCEPTION 'Validation Error: DELETE_RELATION payload is invalid';
      END IF;

      -- Verify both belong to active tree
      IF NOT EXISTS (SELECT 1 FROM public.people WHERE id = v_target_id AND tree_id = v_tree_id) OR
         NOT EXISTS (SELECT 1 FROM public.people WHERE id = v_relative_id AND tree_id = v_tree_id) THEN
        RAISE EXCEPTION 'Access Denied: Relation nodes must exist in tree %.', v_tree_id;
      END IF;

      -- Delete relationship and inverse
      DELETE FROM public.relationships
      WHERE tree_id = v_tree_id AND person_id = v_target_id AND relative_id = v_relative_id AND type = v_rel_type;

      DELETE FROM public.relationships
      WHERE tree_id = v_tree_id AND person_id = v_relative_id AND relative_id = v_target_id AND type =
        CASE
          WHEN v_rel_type = 'parent' THEN 'child'
          WHEN v_rel_type = 'child' THEN 'parent'
          ELSE 'spouse'
        END;

    ELSIF v_type = 'SET_TREE_METADATA' THEN
      v_updates := v_payload->'treeMetadata';
      IF v_updates IS NOT NULL THEN
        UPDATE public.trees
        SET
          name = COALESCE(v_updates->>'name', name),
          focus_id = COALESCE(v_updates->>'focusId', focus_id),
          settings = COALESCE(v_updates->'settings', settings),
          updated_at = NOW()
        WHERE id = v_tree_id;
      END IF;
    END IF;

    -- 2. Insert secure log into tree_operations
    v_base_version := v_base_version + 1;
    INSERT INTO public.tree_operations (
      tree_id, user_id, type, payload, version_seq, created_at
    ) VALUES (
      v_tree_id,
      v_caller_id,
      v_type,
      v_payload,
      v_base_version,
      COALESCE((v_op->>'created_at')::timestamptz, NOW())
    );
  END LOOP;

  -- F. Validate Free tier limits at the end of the transaction
  IF v_tier = 'free' THEN
    SELECT count(*) INTO v_people_count FROM public.people WHERE tree_id = v_tree_id;
    IF v_people_count > 100 THEN
      RAISE EXCEPTION 'Free tier limit reached. Please upgrade to add more family members.' USING ERRCODE = 'P0001';
    END IF;
  END IF;

  -- G. Generate Checkpoint if version_seq crossed a multiple of 50
  SELECT COALESCE(MAX(version_seq), 0) INTO v_last_checkpoint_seq
  FROM public.tree_checkpoints WHERE tree_id = v_tree_id;

  IF v_base_version >= 50 AND (v_base_version / 50) > (v_last_checkpoint_seq / 50) THEN
    PERFORM private.generate_tree_checkpoint(v_tree_id);
  END IF;

  GET DIAGNOSTICS v_inserted_count = ROW_COUNT;
  RETURN v_inserted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, private, pg_temp;

REVOKE ALL ON FUNCTION private.sync_tree_batch(JSONB) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION private.sync_tree_batch(JSONB) TO authenticated;

CREATE OR REPLACE FUNCTION public.sync_tree_batch(
  p_ops JSONB
) RETURNS INTEGER AS $$
BEGIN
  RETURN private.sync_tree_batch(p_ops);
END;
$$ LANGUAGE plpgsql SECURITY INVOKER;

REVOKE ALL ON FUNCTION public.sync_tree_batch(JSONB) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.sync_tree_batch(JSONB) TO authenticated;


-- 16. Webhook handler with safe profile upsert
CREATE OR REPLACE FUNCTION public.process_paddle_subscription_event(
    p_event_id TEXT,
    p_occurred_at TIMESTAMPTZ,
    p_user_id TEXT,
    p_subscription_id TEXT,
    p_customer_id TEXT,
    p_status TEXT,
    p_plan_id TEXT,
    p_current_period_end TIMESTAMPTZ,
    p_tier TEXT
) RETURNS BOOLEAN AS $$
DECLARE
  v_last_occurred TIMESTAMPTZ;
  v_inserted BOOLEAN := FALSE;
BEGIN
  -- 1. Insert into processed events (handles duplicate event_id)
  INSERT INTO private.processed_paddle_webhook_events (event_id, occurred_at)
  VALUES (p_event_id, p_occurred_at)
  ON CONFLICT (event_id) DO NOTHING;

  GET DIAGNOSTICS v_inserted = ROW_COUNT;
  IF NOT v_inserted THEN
    RETURN FALSE; -- Duplicate event, ignored
  END IF;

  -- 2. Check for out-of-order events
  SELECT last_event_occurred_at INTO v_last_occurred
  FROM public.subscriptions
  WHERE user_id = p_user_id;

  IF v_last_occurred IS NOT NULL AND p_occurred_at < v_last_occurred THEN
    RETURN FALSE; -- Out of order event, ignored
  END IF;

  -- 3. Perform a safe upsert of user profile tier (handles Google onboarding bypasses)
  INSERT INTO public.user_profiles (id, tier, created_at, updated_at)
  VALUES (p_user_id, p_tier, NOW(), NOW())
  ON CONFLICT (id) DO UPDATE SET
    tier = EXCLUDED.tier,
    updated_at = NOW();

  -- 4. Upsert subscription details
  INSERT INTO public.subscriptions (
    id, user_id, paddle_customer_id, status, plan_id, current_period_end, last_event_occurred_at, updated_at
  ) VALUES (
    p_subscription_id, p_user_id, p_customer_id, p_status, p_plan_id, p_current_period_end, p_occurred_at, NOW()
  ) ON CONFLICT (user_id) DO UPDATE SET
    id = EXCLUDED.id,
    paddle_customer_id = EXCLUDED.paddle_customer_id,
    status = EXCLUDED.status,
    plan_id = EXCLUDED.plan_id,
    current_period_end = EXCLUDED.current_period_end,
    last_event_occurred_at = EXCLUDED.last_event_occurred_at,
    updated_at = NOW();

  -- 5. Initialize or reset AI quota for Pro users
  IF p_tier = 'pro' THEN
    INSERT INTO public.ai_monthly_usage (
      user_id, cloud_requests_limit, reset_at, updated_at
    ) VALUES (
      p_user_id, 30, COALESCE(p_current_period_end, NOW() + INTERVAL '1 month'), NOW()
    ) ON CONFLICT (user_id) DO UPDATE SET
      cloud_requests_limit = EXCLUDED.cloud_requests_limit,
      reset_at = EXCLUDED.reset_at,
      updated_at = NOW();
  END IF;

  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, private, pg_temp;

REVOKE EXECUTE ON FUNCTION public.process_paddle_subscription_event(TEXT, TIMESTAMPTZ, TEXT, TEXT, TEXT, TEXT, TEXT, TIMESTAMPTZ, TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.process_paddle_subscription_event(TEXT, TIMESTAMPTZ, TEXT, TEXT, TEXT, TEXT, TEXT, TIMESTAMPTZ, TEXT) TO service_role;


-- 17. AI usage quota reservation with expired_charged transition (no refund)
CREATE OR REPLACE FUNCTION public.reserve_ai_usage_atomic(
    p_user_id TEXT
) RETURNS UUID AS $$
DECLARE
  v_used INTEGER;
  v_limit INTEGER;
  v_reservation_id UUID;
BEGIN
  -- 1. Expire reservations to 'expired_charged' WITHOUT refunding
  UPDATE private.ai_usage_reservations
  SET status = 'expired_charged'
  WHERE status = 'reserved' AND expires_at <= NOW();

  -- 2. Ensure usage row exists
  INSERT INTO public.ai_monthly_usage (user_id, cloud_requests_used, cloud_requests_limit, reset_at, updated_at)
  VALUES (p_user_id, 0, 30, NOW() + INTERVAL '1 month', NOW())
  ON CONFLICT (user_id) DO NOTHING;

  -- 3. If reset cycle is reached, reset quota
  UPDATE public.ai_monthly_usage
  SET cloud_requests_used = 0,
      reset_at = NOW() + INTERVAL '1 month',
      updated_at = NOW()
  WHERE user_id = p_user_id AND reset_at <= NOW();

  -- 4. Atomic increment and check
  UPDATE public.ai_monthly_usage
  SET cloud_requests_used = cloud_requests_used + 1,
      updated_at = NOW()
  WHERE user_id = p_user_id AND cloud_requests_used < cloud_requests_limit
  RETURNING cloud_requests_used INTO v_used;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'AI monthly usage quota exceeded.';
  END IF;

  -- 5. Create reservation
  INSERT INTO private.ai_usage_reservations (user_id, status)
  VALUES (p_user_id, 'reserved')
  RETURNING id INTO v_reservation_id;

  RETURN v_reservation_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, private, pg_temp;

REVOKE EXECUTE ON FUNCTION public.reserve_ai_usage_atomic(TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.reserve_ai_usage_atomic(TEXT) TO service_role;


CREATE OR REPLACE FUNCTION public.refund_ai_usage_reservation(
    p_reservation_id UUID
) RETURNS BOOLEAN AS $$
DECLARE
  v_user_id TEXT;
  v_status TEXT;
BEGIN
  -- Lock reservation row to prevent double refund
  SELECT user_id, status INTO v_user_id, v_status
  FROM private.ai_usage_reservations
  WHERE id = p_reservation_id FOR UPDATE;

  IF NOT FOUND OR v_status != 'reserved' THEN
    RETURN FALSE;
  END IF;

  -- Mark as refunded
  UPDATE private.ai_usage_reservations
  SET status = 'refunded'
  WHERE id = p_reservation_id;

  -- Decrement quota
  UPDATE public.ai_monthly_usage
  SET cloud_requests_used = GREATEST(cloud_requests_used - 1, 0),
      updated_at = NOW()
  WHERE user_id = v_user_id;

  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, private, pg_temp;

REVOKE EXECUTE ON FUNCTION public.refund_ai_usage_reservation(UUID) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.refund_ai_usage_reservation(UUID) TO service_role;


CREATE OR REPLACE FUNCTION public.complete_ai_usage_reservation(
    p_reservation_id UUID
) RETURNS BOOLEAN AS $$
BEGIN
  UPDATE private.ai_usage_reservations
  SET status = 'completed'
  WHERE id = p_reservation_id AND status = 'reserved';

  RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, private, pg_temp;

REVOKE EXECUTE ON FUNCTION public.complete_ai_usage_reservation(UUID) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.complete_ai_usage_reservation(UUID) TO service_role;


-- 18. Checkout rate limiting
CREATE OR REPLACE FUNCTION public.check_checkout_rate_limit(
    p_user_id TEXT
) RETURNS BOOLEAN AS $$
DECLARE
  v_last_requested TIMESTAMPTZ;
  v_count INTEGER;
BEGIN
  INSERT INTO private.checkout_rate_limits (user_id, last_requested_at, request_count)
  VALUES (p_user_id, NOW(), 1)
  ON CONFLICT (user_id) DO UPDATE SET
    request_count = CASE
      WHEN checkout_rate_limits.last_requested_at < NOW() - INTERVAL '1 minute' THEN 1
      ELSE checkout_rate_limits.request_count + 1
    END,
    last_requested_at = NOW()
  RETURNING request_count INTO v_count;

  IF v_count > 5 THEN
    RETURN FALSE; -- Rate limit exceeded
  END IF;

  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, private, pg_temp;

REVOKE EXECUTE ON FUNCTION public.check_checkout_rate_limit(TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.check_checkout_rate_limit(TEXT) TO service_role;


-- 19. Revoke table direct writes from authenticated/anon/public clients
REVOKE INSERT, UPDATE, DELETE ON public.people FROM authenticated, anon, public;
REVOKE INSERT, UPDATE, DELETE ON public.relationships FROM authenticated, anon, public;
REVOKE INSERT, UPDATE, DELETE ON public.tree_operations FROM authenticated, anon, public;
REVOKE INSERT, UPDATE, DELETE ON public.tree_checkpoints FROM authenticated, anon, public;
REVOKE INSERT, UPDATE, DELETE ON public.user_profiles FROM authenticated, anon, public;

-- Revoke private execute permissions from non-owners
REVOKE EXECUTE ON FUNCTION private.generate_tree_checkpoint(UUID) FROM PUBLIC, anon, authenticated;

-- 20. Explicit storage.objects policies
DROP POLICY IF EXISTS "Avatar Public Read" ON storage.objects;
DROP POLICY IF EXISTS "Avatar Write Policy" ON storage.objects;
DROP POLICY IF EXISTS "Avatar Authenticated Insert" ON storage.objects;
DROP POLICY IF EXISTS "Avatar Authenticated Update" ON storage.objects;
DROP POLICY IF EXISTS "Avatar Authenticated Delete" ON storage.objects;

-- SELECT policy (public read access)
CREATE POLICY "Avatar Public Read" ON storage.objects
  FOR SELECT USING (bucket_id = 'avatars');

-- INSERT policy (authenticated uploads)
CREATE POLICY "Avatar Authenticated Insert" ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'avatars'
    AND (
      (split_part(name, '/', 1) = 'users' AND split_part(name, '/', 2) = private.current_user_id_text())
      OR (
        private.is_valid_uuid(split_part(name, '/', 1))
        AND (
          private.is_tree_owner(split_part(name, '/', 1)::UUID)
          OR private.is_tree_collaborator(split_part(name, '/', 1)::UUID, 'editor')
        )
      )
    )
  );

-- UPDATE policy (authenticated modifications)
CREATE POLICY "Avatar Authenticated Update" ON storage.objects
  FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'avatars'
    AND (
      (split_part(name, '/', 1) = 'users' AND split_part(name, '/', 2) = private.current_user_id_text())
      OR (
        private.is_valid_uuid(split_part(name, '/', 1))
        AND (
          private.is_tree_owner(split_part(name, '/', 1)::UUID)
          OR private.is_tree_collaborator(split_part(name, '/', 1)::UUID, 'editor')
        )
      )
    )
  )
  WITH CHECK (
    bucket_id = 'avatars'
    AND (
      (split_part(name, '/', 1) = 'users' AND split_part(name, '/', 2) = private.current_user_id_text())
      OR (
        private.is_valid_uuid(split_part(name, '/', 1))
        AND (
          private.is_tree_owner(split_part(name, '/', 1)::UUID)
          OR private.is_tree_collaborator(split_part(name, '/', 1)::UUID, 'editor')
        )
      )
    )
  );

-- DELETE policy (authenticated deletions)
CREATE POLICY "Avatar Authenticated Delete" ON storage.objects
  FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'avatars'
    AND (
      (split_part(name, '/', 1) = 'users' AND split_part(name, '/', 2) = private.current_user_id_text())
      OR (
        private.is_valid_uuid(split_part(name, '/', 1))
        AND (
          private.is_tree_owner(split_part(name, '/', 1)::UUID)
          OR private.is_tree_collaborator(split_part(name, '/', 1)::UUID, 'editor')
        )
      )
    )
  );

COMMIT;

NOTIFY pgrst, 'reload schema';;
