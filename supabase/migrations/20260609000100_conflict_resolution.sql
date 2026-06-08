-- Migration: Collaborative Conflict Resolution & Sync Deadlock Prevention
-- Description: Implements property-level LWW conflict resolution for UPDATE_PROP and SET_TREE_METADATA.
--              Excludes relational fields from tracking and allows silent bypasses for concurrently deleted nodes.

BEGIN;

CREATE OR REPLACE FUNCTION private.sync_tree_batch(
  p_ops JSONB
) RETURNS INTEGER AS $$
DECLARE
  v_caller_id TEXT;
  v_caller_email TEXT;
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
  
  -- LWW variable declarations
  v_incoming_ts TIMESTAMPTZ;
  v_incoming_client_id TEXT;
  v_incoming_client_version INTEGER;
  v_curr_ts_str TEXT;
  v_curr_op JSONB;
  v_curr_client_id TEXT;
  v_curr_client_version INTEGER;
  v_overwrite BOOLEAN;
  v_updated_any BOOLEAN;
  v_key TEXT;
  v_val JSONB;
  v_val_text TEXT;
  v_init_last_updated JSONB;
  v_init_last_updated_ops JSONB;

  -- Person columns to update
  v_first_name TEXT;
  v_last_name TEXT;
  v_middle_name TEXT;
  v_birth_name TEXT;
  v_nick_name TEXT;
  v_suffix TEXT;
  v_gender TEXT;
  v_birth_date DATE;
  v_death_date DATE;
  v_birth_place TEXT;
  v_death_place TEXT;
  v_bio TEXT;
  v_profession TEXT;
  v_company TEXT;
  v_interests TEXT;
  v_photo_url TEXT;
  v_photo_path TEXT;
  v_photo_version INTEGER;
  v_email TEXT;
  v_website TEXT;
  v_blog TEXT;
  v_address TEXT;

  -- Tree metadata LWW variables
  v_tree_name TEXT;
  v_tree_focus_id TEXT;
  v_tree_settings JSONB;
BEGIN
  -- A. Secure caller validation
  v_caller_id := private.current_user_id_text();
  v_caller_email := lower(coalesce(auth.jwt() ->> 'email', 'system'));
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
    
    v_incoming_ts := COALESCE((v_op->>'created_at')::timestamptz, NOW());
    v_incoming_client_id := COALESCE(v_payload->>'client_id', '');
    v_incoming_client_version := COALESCE((v_payload->>'client_version')::INTEGER, 0);

    IF v_type NOT IN ('ADD_NODE', 'UPDATE_PROP', 'DELETE_NODE', 'ADD_RELATION', 'DELETE_RELATION', 'SET_TREE_METADATA') THEN
      RAISE EXCEPTION 'Validation Error: Unsupported operation type %.', v_type;
    END IF;

    -- 1. Apply Projection to Tables
    IF v_type = 'ADD_NODE' THEN
      v_person := v_payload->'person';
      v_person_id := v_person->>'id';
      v_custom_fields := v_person->'custom_fields';
      
      IF v_person_id IS NULL THEN
        RAISE EXCEPTION 'Validation Error: ADD_NODE payload is missing person.id';
      END IF;

      -- Verify person does not exist in any other tree
      IF EXISTS (SELECT 1 FROM public.people WHERE id = v_person_id AND tree_id IS DISTINCT FROM v_tree_id) THEN
        RAISE EXCEPTION 'Access Denied: Person ID % exists in another tree.', v_person_id;
      END IF;

      -- Build default lastUpdated and lastUpdatedOps objects for all non-relational fields sent in the person object
      v_metadata := COALESCE(v_person->'metadata', '{}'::JSONB);
      v_init_last_updated := '{}'::JSONB;
      v_init_last_updated_ops := '{}'::JSONB;

      FOR v_key, v_val IN SELECT * FROM jsonb_each(v_person) LOOP
        IF v_key NOT IN ('id', 'parents', 'spouses', 'children', 'partnerDetails', 'metadata') THEN
          v_init_last_updated := jsonb_set(v_init_last_updated, ARRAY[v_key], to_jsonb(v_op->>'created_at'));
          v_init_last_updated_ops := jsonb_set(v_init_last_updated_ops, ARRAY[v_key], jsonb_build_object(
            'client_id', v_incoming_client_id,
            'client_version', v_incoming_client_version
          ));
        END IF;
      END LOOP;

      v_metadata := jsonb_set(v_metadata, '{lastUpdated}', v_init_last_updated || COALESCE(v_metadata->'lastUpdated', '{}'::JSONB));
      v_metadata := jsonb_set(v_metadata, '{lastUpdatedOps}', v_init_last_updated_ops || COALESCE(v_metadata->'lastUpdatedOps', '{}'::JSONB));

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
        COALESCE(v_custom_fields, '{}'::JSONB), v_metadata,
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

      -- Check if person exists anywhere at all
      IF NOT EXISTS (SELECT 1 FROM public.people WHERE id = v_person_id) THEN
        INSERT INTO public.activity_logs (tree_id, user_id, user_email, action_type, details)
        VALUES (v_tree_id, v_caller_id, v_caller_email, 'SYNC_SKIP', jsonb_build_object(
          'type', v_type,
          'personId', v_person_id,
          'reason', 'Person does not exist. Silently skipping UPDATE_PROP.'
        ));
        CONTINUE;
      ELSIF NOT EXISTS (SELECT 1 FROM public.people WHERE id = v_person_id AND tree_id = v_tree_id) THEN
        RAISE EXCEPTION 'Access Denied: Person % does not belong to tree %.', v_person_id, v_tree_id;
      END IF;

      SELECT first_name, last_name, middle_name, birth_name, nick_name, suffix, gender,
             birth_date, death_date, birth_place, death_place, bio, profession, company, interests,
             photo_url, photo_path, photo_version, email, website, blog, address, custom_fields, metadata
      INTO v_first_name, v_last_name, v_middle_name, v_birth_name, v_nick_name, v_suffix, v_gender,
           v_birth_date, v_death_date, v_birth_place, v_death_place, v_bio, v_profession, v_company, v_interests,
           v_photo_url, v_photo_path, v_photo_version, v_email, v_website, v_blog, v_address, v_custom_fields, v_metadata
      FROM public.people WHERE id = v_person_id;

      IF v_metadata IS NULL THEN
        v_metadata := '{}'::JSONB;
      END IF;
      IF NOT jsonb_exists(v_metadata, 'lastUpdated') THEN
        v_metadata := jsonb_set(v_metadata, '{lastUpdated}', '{}'::JSONB);
      END IF;
      IF NOT jsonb_exists(v_metadata, 'lastUpdatedOps') THEN
        v_metadata := jsonb_set(v_metadata, '{lastUpdatedOps}', '{}'::JSONB);
      END IF;

      v_updated_any := FALSE;

      FOR v_key, v_val IN SELECT * FROM jsonb_each(v_updates) LOOP
        IF v_key IN ('parents', 'spouses', 'children', 'partnerDetails') THEN
          CONTINUE;
        END IF;

        v_curr_ts_str := v_metadata->'lastUpdated'->>v_key;
        v_curr_op := v_metadata->'lastUpdatedOps'->v_key;
        v_overwrite := FALSE;

        IF v_curr_ts_str IS NULL THEN
          v_overwrite := TRUE;
        ELSE
          IF v_incoming_ts > v_curr_ts_str::TIMESTAMPTZ THEN
            v_overwrite := TRUE;
          ELSIF v_incoming_ts = v_curr_ts_str::TIMESTAMPTZ THEN
            v_curr_client_id := v_curr_op->>'client_id';
            v_curr_client_version := (v_curr_op->>'client_version')::INTEGER;
            IF v_incoming_client_id > COALESCE(v_curr_client_id, '') THEN
              v_overwrite := TRUE;
            ELSIF v_incoming_client_id = COALESCE(v_curr_client_id, '') AND v_incoming_client_version > COALESCE(v_curr_client_version, 0) THEN
              v_overwrite := TRUE;
            END IF;
          END IF;
        END IF;

        IF v_overwrite THEN
          v_val_text := CASE
            WHEN jsonb_typeof(v_val) = 'string' THEN v_val #>> '{}'
            WHEN jsonb_typeof(v_val) IN ('number', 'boolean') THEN v_val #>> '{}'
            WHEN jsonb_typeof(v_val) = 'null' THEN NULL
            ELSE NULL
          END;

          IF v_key = 'firstName' THEN v_first_name := NULLIF(v_val_text, '');
          ELSIF v_key = 'lastName' THEN v_last_name := NULLIF(v_val_text, '');
          ELSIF v_key = 'middleName' THEN v_middle_name := NULLIF(v_val_text, '');
          ELSIF v_key = 'birthName' THEN v_birth_name := NULLIF(v_val_text, '');
          ELSIF v_key = 'nickName' THEN v_nick_name := NULLIF(v_val_text, '');
          ELSIF v_key = 'suffix' THEN v_suffix := NULLIF(v_val_text, '');
          ELSIF v_key = 'gender' THEN v_gender := NULLIF(v_val_text, '');
          ELSIF v_key = 'birthDate' THEN v_birth_date := NULLIF(v_val_text, '')::DATE;
          ELSIF v_key = 'deathDate' THEN v_death_date := NULLIF(v_val_text, '')::DATE;
          ELSIF v_key = 'birthPlace' THEN v_birth_place := NULLIF(v_val_text, '');
          ELSIF v_key = 'deathPlace' THEN v_death_place := NULLIF(v_val_text, '');
          ELSIF v_key = 'bio' THEN v_bio := NULLIF(v_val_text, '');
          ELSIF v_key = 'profession' THEN v_profession := NULLIF(v_val_text, '');
          ELSIF v_key = 'company' THEN v_company := NULLIF(v_val_text, '');
          ELSIF v_key = 'interests' THEN v_interests := NULLIF(v_val_text, '');
          ELSIF v_key = 'photoUrl' THEN v_photo_url := NULLIF(v_val_text, '');
          ELSIF v_key = 'photoPath' THEN v_photo_path := NULLIF(v_val_text, '');
          ELSIF v_key = 'photoVersion' THEN v_photo_version := NULLIF(v_val_text, '')::INTEGER;
          ELSIF v_key = 'email' THEN v_email := NULLIF(v_val_text, '');
          ELSIF v_key = 'website' THEN v_website := NULLIF(v_val_text, '');
          ELSIF v_key = 'blog' THEN v_blog := NULLIF(v_val_text, '');
          ELSIF v_key = 'address' THEN v_address := NULLIF(v_val_text, '');
          ELSIF v_key = 'customFields' THEN v_custom_fields := v_val;
          END IF;

          v_metadata := jsonb_set(v_metadata, ARRAY['lastUpdated', v_key], to_jsonb(v_op->>'created_at'));
          v_metadata := jsonb_set(v_metadata, ARRAY['lastUpdatedOps', v_key], jsonb_build_object(
            'client_id', v_incoming_client_id,
            'client_version', v_incoming_client_version
          ));
          v_updated_any := TRUE;
        END IF;
      END LOOP;

      IF v_updated_any THEN
        UPDATE public.people
        SET
          first_name = v_first_name,
          last_name = v_last_name,
          middle_name = v_middle_name,
          birth_name = v_birth_name,
          nick_name = v_nick_name,
          suffix = v_suffix,
          gender = v_gender,
          birth_date = v_birth_date,
          death_date = v_death_date,
          birth_place = v_birth_place,
          death_place = v_death_place,
          bio = v_bio,
          profession = v_profession,
          company = v_company,
          interests = v_interests,
          photo_url = v_photo_url,
          photo_path = v_photo_path,
          photo_version = v_photo_version,
          email = v_email,
          website = v_website,
          blog = v_blog,
          address = v_address,
          custom_fields = v_custom_fields,
          metadata = v_metadata,
          updated_at = NOW()
        WHERE id = v_person_id;
      END IF;

    ELSIF v_type = 'DELETE_NODE' THEN
      v_person_id := v_payload->>'id';
      IF v_person_id IS NULL THEN
        RAISE EXCEPTION 'Validation Error: DELETE_NODE payload is missing id';
      END IF;

      -- Check if person exists anywhere at all
      IF NOT EXISTS (SELECT 1 FROM public.people WHERE id = v_person_id) THEN
        INSERT INTO public.activity_logs (tree_id, user_id, user_email, action_type, details)
        VALUES (v_tree_id, v_caller_id, v_caller_email, 'SYNC_SKIP', jsonb_build_object(
          'type', v_type,
          'personId', v_person_id,
          'reason', 'Person does not exist. Silently skipping DELETE_NODE.'
        ));
        CONTINUE;
      ELSIF NOT EXISTS (SELECT 1 FROM public.people WHERE id = v_person_id AND tree_id = v_tree_id) THEN
        RAISE EXCEPTION 'Access Denied: Person % does not belong to tree %.', v_person_id, v_tree_id;
      END IF;

      DELETE FROM public.people WHERE id = v_person_id;

    ELSIF v_type = 'ADD_RELATION' THEN
      v_focus_id := v_payload->>'focusId';
      v_existing_id := v_payload->>'existingId';
      v_rel_type := v_payload->>'type';
      IF v_focus_id IS NULL OR v_existing_id IS NULL OR v_rel_type NOT IN ('parent', 'child', 'spouse') THEN
        RAISE EXCEPTION 'Validation Error: ADD_RELATION payload is invalid';
      END IF;

      -- Throw access denied if either exists in another tree
      IF EXISTS (SELECT 1 FROM public.people WHERE id = v_focus_id AND tree_id IS DISTINCT FROM v_tree_id) OR
         EXISTS (SELECT 1 FROM public.people WHERE id = v_existing_id AND tree_id IS DISTINCT FROM v_tree_id) THEN
        RAISE EXCEPTION 'Access Denied: Relation nodes belong to another tree.';
      END IF;

      -- Check if both exist in this tree
      IF NOT EXISTS (SELECT 1 FROM public.people WHERE id = v_focus_id AND tree_id = v_tree_id) OR
         NOT EXISTS (SELECT 1 FROM public.people WHERE id = v_existing_id AND tree_id = v_tree_id) THEN
        INSERT INTO public.activity_logs (tree_id, user_id, user_email, action_type, details)
        VALUES (v_tree_id, v_caller_id, v_caller_email, 'SYNC_SKIP', jsonb_build_object(
          'type', v_type,
          'focusId', v_focus_id,
          'existingId', v_existing_id,
          'reason', 'One or both relation nodes do not exist. Silently skipping ADD_RELATION.'
        ));
        CONTINUE;
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

      -- Throw access denied if either exists in another tree
      IF EXISTS (SELECT 1 FROM public.people WHERE id = v_target_id AND tree_id IS DISTINCT FROM v_tree_id) OR
         EXISTS (SELECT 1 FROM public.people WHERE id = v_relative_id AND tree_id IS DISTINCT FROM v_tree_id) THEN
        RAISE EXCEPTION 'Access Denied: Relation nodes belong to another tree.';
      END IF;

      -- Check if both exist in this tree
      IF NOT EXISTS (SELECT 1 FROM public.people WHERE id = v_target_id AND tree_id = v_tree_id) OR
         NOT EXISTS (SELECT 1 FROM public.people WHERE id = v_relative_id AND tree_id = v_tree_id) THEN
        INSERT INTO public.activity_logs (tree_id, user_id, user_email, action_type, details)
        VALUES (v_tree_id, v_caller_id, v_caller_email, 'SYNC_SKIP', jsonb_build_object(
          'type', v_type,
          'targetId', v_target_id,
          'relativeId', v_relative_id,
          'reason', 'One or both relation nodes do not exist. Silently skipping DELETE_RELATION.'
        ));
        CONTINUE;
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
        SELECT name, focus_id, settings
        INTO v_tree_name, v_tree_focus_id, v_tree_settings
        FROM public.trees WHERE id = v_tree_id FOR UPDATE;

        IF v_tree_settings IS NULL THEN
          v_tree_settings := '{}'::JSONB;
        END IF;
        IF NOT jsonb_exists(v_tree_settings, 'sync_metadata') THEN
          v_tree_settings := jsonb_set(v_tree_settings, '{sync_metadata}', '{}'::JSONB);
        END IF;
        IF NOT jsonb_exists(v_tree_settings->'sync_metadata', 'lastUpdated') THEN
          v_tree_settings := jsonb_set(v_tree_settings, '{sync_metadata,lastUpdated}', '{}'::JSONB);
        END IF;
        IF NOT jsonb_exists(v_tree_settings->'sync_metadata', 'lastUpdatedOps') THEN
          v_tree_settings := jsonb_set(v_tree_settings, '{sync_metadata,lastUpdatedOps}', '{}'::JSONB);
        END IF;

        v_updated_any := FALSE;

        -- Check name LWW
        IF jsonb_exists(v_updates, 'name') AND v_updates->>'name' IS NOT NULL THEN
          v_curr_ts_str := v_tree_settings->'sync_metadata'->'lastUpdated'->>'name';
          v_curr_op := v_tree_settings->'sync_metadata'->'lastUpdatedOps'->'name';
          v_overwrite := FALSE;
          IF v_curr_ts_str IS NULL THEN
            v_overwrite := TRUE;
          ELSE
            IF v_incoming_ts > v_curr_ts_str::TIMESTAMPTZ THEN
              v_overwrite := TRUE;
            ELSIF v_incoming_ts = v_curr_ts_str::TIMESTAMPTZ THEN
              v_curr_client_id := v_curr_op->>'client_id';
              v_curr_client_version := (v_curr_op->>'client_version')::INTEGER;
              IF v_incoming_client_id > COALESCE(v_curr_client_id, '') THEN
                v_overwrite := TRUE;
              ELSIF v_incoming_client_id = COALESCE(v_curr_client_id, '') AND v_incoming_client_version > COALESCE(v_curr_client_version, 0) THEN
                v_overwrite := TRUE;
              END IF;
            END IF;
          END IF;

          IF v_overwrite THEN
            v_tree_name := v_updates->>'name';
            v_tree_settings := jsonb_set(v_tree_settings, '{sync_metadata,lastUpdated,name}', to_jsonb(v_op->>'created_at'));
            v_tree_settings := jsonb_set(v_tree_settings, '{sync_metadata,lastUpdatedOps,name}', jsonb_build_object(
              'client_id', v_incoming_client_id,
              'client_version', v_incoming_client_version
            ));
            v_updated_any := TRUE;
          END IF;
        END IF;

        -- Check focusId LWW
        IF jsonb_exists(v_updates, 'focusId') AND v_updates->>'focusId' IS NOT NULL THEN
          v_curr_ts_str := v_tree_settings->'sync_metadata'->'lastUpdated'->>'focusId';
          v_curr_op := v_tree_settings->'sync_metadata'->'lastUpdatedOps'->'focusId';
          v_overwrite := FALSE;
          IF v_curr_ts_str IS NULL THEN
            v_overwrite := TRUE;
          ELSE
            IF v_incoming_ts > v_curr_ts_str::TIMESTAMPTZ THEN
              v_overwrite := TRUE;
            ELSIF v_incoming_ts = v_curr_ts_str::TIMESTAMPTZ THEN
              v_curr_client_id := v_curr_op->>'client_id';
              v_curr_client_version := (v_curr_op->>'client_version')::INTEGER;
              IF v_incoming_client_id > COALESCE(v_curr_client_id, '') THEN
                v_overwrite := TRUE;
              ELSIF v_incoming_client_id = COALESCE(v_curr_client_id, '') AND v_incoming_client_version > COALESCE(v_curr_client_version, 0) THEN
                v_overwrite := TRUE;
              END IF;
            END IF;
          END IF;

          IF v_overwrite THEN
            v_tree_focus_id := v_updates->>'focusId';
            v_tree_settings := jsonb_set(v_tree_settings, '{sync_metadata,lastUpdated,focusId}', to_jsonb(v_op->>'created_at'));
            v_tree_settings := jsonb_set(v_tree_settings, '{sync_metadata,lastUpdatedOps,focusId}', jsonb_build_object(
              'client_id', v_incoming_client_id,
              'client_version', v_incoming_client_version
            ));
            v_updated_any := TRUE;
          END IF;
        END IF;

        -- Check individual settings keys
        IF jsonb_exists(v_updates, 'settings') AND jsonb_typeof(v_updates->'settings') = 'object' THEN
          FOR v_key, v_val IN SELECT * FROM jsonb_each(v_updates->'settings') LOOP
            IF v_key = 'sync_metadata' THEN
              CONTINUE;
            END IF;

            v_curr_ts_str := v_tree_settings->'sync_metadata'->'lastUpdated'->>v_key;
            v_curr_op := v_tree_settings->'sync_metadata'->'lastUpdatedOps'->v_key;
            v_overwrite := FALSE;

            IF v_curr_ts_str IS NULL THEN
              v_overwrite := TRUE;
            ELSE
              IF v_incoming_ts > v_curr_ts_str::TIMESTAMPTZ THEN
                v_overwrite := TRUE;
              ELSIF v_incoming_ts = v_curr_ts_str::TIMESTAMPTZ THEN
                v_curr_client_id := v_curr_op->>'client_id';
                v_curr_client_version := (v_curr_op->>'client_version')::INTEGER;
                IF v_incoming_client_id > COALESCE(v_curr_client_id, '') THEN
                  v_overwrite := TRUE;
                ELSIF v_incoming_client_id = COALESCE(v_curr_client_id, '') AND v_incoming_client_version > COALESCE(v_curr_client_version, 0) THEN
                  v_overwrite := TRUE;
                END IF;
              END IF;
            END IF;

            IF v_overwrite THEN
              v_tree_settings := jsonb_set(v_tree_settings, ARRAY[v_key], v_val);
              v_tree_settings := jsonb_set(v_tree_settings, ARRAY['sync_metadata', 'lastUpdated', v_key], to_jsonb(v_op->>'created_at'));
              v_tree_settings := jsonb_set(v_tree_settings, ARRAY['sync_metadata', 'lastUpdatedOps', v_key], jsonb_build_object(
                'client_id', v_incoming_client_id,
                'client_version', v_incoming_client_version
              ));
              v_updated_any := TRUE;
            END IF;
          END LOOP;
        END IF;

        IF v_updated_any THEN
          UPDATE public.trees
          SET
            name = v_tree_name,
            focus_id = v_tree_focus_id,
            settings = v_tree_settings,
            updated_at = NOW()
          WHERE id = v_tree_id;
        END IF;
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
      v_incoming_ts
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

COMMIT;

NOTIFY pgrst, 'reload schema';
