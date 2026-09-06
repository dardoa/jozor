BEGIN;

-- Tombstones outlive deletion: a delayed/offline writer must not reattach a
-- path whose Storage deletion has already started. Only the service can claim.
CREATE TABLE private.person_media_cleanup (
  bucket TEXT NOT NULL CHECK (bucket IN ('avatars', 'person-media')),
  object_path TEXT NOT NULL,
  tree_id UUID NOT NULL,
  requested_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  checked_at TIMESTAMPTZ,
  claimed_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  PRIMARY KEY (bucket, object_path)
);
REVOKE ALL ON private.person_media_cleanup FROM PUBLIC, anon, authenticated;

-- Deliberately conservative for legacy URLs, including percent-encoded paths:
-- wait until ALL legacy person references in this tree have been resolved.
CREATE FUNCTION private.has_legacy_person_media(p_doc JSONB) RETURNS BOOLEAN
LANGUAGE plpgsql IMMUTABLE SET search_path = '' AS $$
DECLARE v_key TEXT; v_value JSONB;
BEGIN
  IF jsonb_typeof(p_doc) = 'object' THEN
    FOR v_key, v_value IN SELECT * FROM jsonb_each(p_doc) LOOP
      IF v_key IN ('photo_path', 'photo_url', 'photoPath', 'photoUrl', 'path', 'url')
         AND jsonb_typeof(v_value) = 'string' AND v_value <> '""'::JSONB THEN RETURN true; END IF;
      IF v_key = 'gallery' AND jsonb_typeof(v_value) = 'array' AND EXISTS (
        SELECT 1 FROM jsonb_array_elements(v_value) i WHERE jsonb_typeof(i) = 'string'
      ) THEN RETURN true; END IF;
      IF private.has_legacy_person_media(v_value) THEN RETURN true; END IF;
    END LOOP;
  ELSIF jsonb_typeof(p_doc) = 'array' THEN
    FOR v_value IN SELECT * FROM jsonb_array_elements(p_doc) LOOP
      IF private.has_legacy_person_media(v_value) THEN RETURN true; END IF;
    END LOOP;
  END IF;
  RETURN false;
END;
$$;
REVOKE ALL ON FUNCTION private.has_legacy_person_media(JSONB) FROM PUBLIC, anon, authenticated;

CREATE FUNCTION private.person_media_is_referenced(p_tree_id UUID, p_bucket TEXT, p_path TEXT)
RETURNS BOOLEAN LANGUAGE sql STABLE SET search_path = '' AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.people p WHERE p.tree_id = p_tree_id AND
      CASE WHEN p_bucket = 'avatars' THEN private.has_legacy_person_media(jsonb_build_object(
        'photo_path', p.photo_path, 'photo_url', p.photo_url, 'custom_fields', p.custom_fields))
      ELSE position(p_path IN COALESCE(p.custom_fields::TEXT, '')) > 0 END
  ) OR EXISTS (
    SELECT 1 FROM public.tree_checkpoints c WHERE c.tree_id = p_tree_id AND
      CASE WHEN p_bucket = 'avatars' THEN private.has_legacy_person_media(c.people)
      ELSE position(p_path IN c.people::TEXT) > 0 END
  ) OR EXISTS (
    SELECT 1 FROM public.tree_operations o WHERE o.tree_id = p_tree_id AND
      CASE WHEN p_bucket = 'avatars' THEN private.has_legacy_person_media(o.payload)
      ELSE position(p_path IN o.payload::TEXT) > 0 END
  );
$$;
REVOKE ALL ON FUNCTION private.person_media_is_referenced(UUID, TEXT, TEXT) FROM PUBLIC, anon, authenticated;

CREATE FUNCTION public.claim_person_media_cleanup(p_bucket TEXT, p_object_path TEXT)
RETURNS BOOLEAN LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE v_tree UUID;
BEGIN
  IF p_bucket IS NULL OR p_bucket NOT IN ('avatars', 'person-media')
     OR split_part(p_object_path, '/', 1) !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
     OR p_object_path IS NULL THEN RETURN false; END IF;
  v_tree := split_part(p_object_path, '/', 1)::UUID;
  IF (p_bucket = 'person-media' AND NOT private.is_valid_person_media_object_name(p_object_path))
     OR (p_bucket = 'avatars' AND NOT private.is_safe_legacy_avatar_object_name(v_tree, p_object_path)) THEN RETURN false; END IF;
  PERFORM pg_advisory_xact_lock(hashtextextended('person-media:' || v_tree::TEXT, 0));
  INSERT INTO private.person_media_cleanup(bucket, object_path, tree_id)
  VALUES (p_bucket, p_object_path, v_tree) ON CONFLICT DO NOTHING;
  UPDATE private.person_media_cleanup SET checked_at = now()
    WHERE bucket = p_bucket AND object_path = p_object_path;
  IF private.person_media_is_referenced(v_tree, p_bucket, p_object_path) THEN RETURN false; END IF;
  UPDATE private.person_media_cleanup SET claimed_at = COALESCE(claimed_at, now()), completed_at = NULL
    WHERE bucket = p_bucket AND object_path = p_object_path;
  RETURN true;
END;
$$;

CREATE FUNCTION public.complete_person_media_cleanup(p_bucket TEXT, p_object_path TEXT)
RETURNS BOOLEAN LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  IF EXISTS (SELECT 1 FROM storage.objects WHERE bucket_id = p_bucket AND name = p_object_path) THEN RETURN false; END IF;
  UPDATE private.person_media_cleanup SET completed_at = now()
  WHERE bucket = p_bucket AND object_path = p_object_path AND claimed_at IS NOT NULL;
  RETURN FOUND;
END;
$$;

CREATE FUNCTION public.list_person_media_cleanup_candidates()
RETURNS TABLE(bucket TEXT, object_path TEXT) LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  -- Inventory only private uploads after a 24-hour grace period. Never sweep
  -- arbitrary public avatars; legacy candidates are explicitly queued by CAS.
  INSERT INTO private.person_media_cleanup(bucket, object_path, tree_id)
  SELECT o.bucket_id, o.name, split_part(o.name, '/', 1)::UUID
  FROM storage.objects o
  WHERE o.bucket_id = 'person-media' AND o.created_at < now() - interval '24 hours'
    AND private.is_valid_person_media_object_name(o.name)
    AND NOT EXISTS (SELECT 1 FROM private.person_media_cleanup c WHERE c.bucket = o.bucket_id AND c.object_path = o.name)
  ORDER BY o.created_at, o.name LIMIT 200 ON CONFLICT DO NOTHING;
  RETURN QUERY SELECT c.bucket, c.object_path FROM private.person_media_cleanup c
    WHERE c.completed_at IS NULL
    ORDER BY c.checked_at NULLS FIRST, c.requested_at, c.object_path LIMIT 100;
END;
$$;

CREATE FUNCTION private.fence_person_media_cleanup() RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE v_doc JSONB; v_tree UUID;
BEGIN
  v_tree := NEW.tree_id;
  PERFORM pg_advisory_xact_lock(hashtextextended('person-media:' || v_tree::TEXT, 0));
  v_doc := CASE TG_TABLE_NAME WHEN 'people' THEN jsonb_build_object(
    'photo_path', to_jsonb(NEW)->'photo_path', 'photo_url', to_jsonb(NEW)->'photo_url',
    'custom_fields', to_jsonb(NEW)->'custom_fields')
    WHEN 'tree_checkpoints' THEN to_jsonb(NEW)->'people' ELSE to_jsonb(NEW)->'payload' END;
  IF EXISTS (SELECT 1 FROM private.person_media_cleanup c WHERE c.tree_id = v_tree AND c.claimed_at IS NOT NULL AND
    CASE WHEN c.bucket = 'avatars' THEN private.has_legacy_person_media(v_doc)
      ELSE position(c.object_path IN v_doc::TEXT) > 0 END) THEN
    RAISE EXCEPTION 'Media reference is retired; upload a new asset.' USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER trg_fence_person_media_cleanup BEFORE INSERT OR UPDATE OF custom_fields, photo_path, photo_url ON public.people
  FOR EACH ROW EXECUTE FUNCTION private.fence_person_media_cleanup();
CREATE TRIGGER trg_fence_checkpoint_media_cleanup BEFORE INSERT OR UPDATE OF people ON public.tree_checkpoints
  FOR EACH ROW EXECUTE FUNCTION private.fence_person_media_cleanup();
CREATE TRIGGER trg_fence_operation_media_cleanup BEFORE INSERT OR UPDATE OF payload ON public.tree_operations
  FOR EACH ROW EXECUTE FUNCTION private.fence_person_media_cleanup();
REVOKE ALL ON FUNCTION private.fence_person_media_cleanup() FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.finalize_legacy_profile_person_media(
  p_tree_id UUID, p_person_id TEXT, p_source_object_path TEXT,
  p_expected_photo_path TEXT, p_expected_photo_url TEXT, p_asset_id TEXT
) RETURNS BOOLEAN LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  IF NOT private.is_safe_legacy_avatar_object_name(p_tree_id, p_source_object_path) THEN RETURN false; END IF;
  UPDATE public.people SET photo_path = NULL, photo_url = NULL
  WHERE tree_id = p_tree_id AND id = p_person_id
    AND photo_path IS NOT DISTINCT FROM p_expected_photo_path AND photo_url IS NOT DISTINCT FROM p_expected_photo_url
    AND custom_fields->'photoAsset'->>'assetId' = p_asset_id;
  IF NOT FOUND THEN RETURN false; END IF;
  INSERT INTO private.person_media_cleanup(bucket, object_path, tree_id)
  VALUES ('avatars', p_source_object_path, p_tree_id) ON CONFLICT DO NOTHING;
  RETURN true;
END;
$$;

CREATE FUNCTION public.finalize_legacy_gallery_person_media_checked(
  p_tree_id UUID, p_person_id TEXT, p_source_object_path TEXT, p_asset_id TEXT, p_expected_item JSONB
) RETURNS BOOLEAN LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE v_fields JSONB; v_gallery JSONB; v_index INTEGER; v_count INTEGER;
BEGIN
  IF NOT private.is_safe_legacy_avatar_object_name(p_tree_id, p_source_object_path) THEN RETURN false; END IF;
  SELECT custom_fields INTO v_fields FROM public.people WHERE tree_id = p_tree_id AND id = p_person_id FOR UPDATE;
  IF NOT FOUND OR jsonb_typeof(v_fields->'gallery') IS DISTINCT FROM 'array' THEN RETURN false; END IF;
  v_gallery := v_fields->'gallery';
  SELECT min(ordinality)::INTEGER - 1, count(*)::INTEGER INTO v_index, v_count
  FROM jsonb_array_elements(v_gallery) WITH ORDINALITY WHERE value->'asset'->>'assetId' = p_asset_id;
  IF v_count <> 1 OR v_gallery->v_index IS DISTINCT FROM p_expected_item THEN RETURN false; END IF;
  UPDATE public.people SET custom_fields = jsonb_set(v_fields, ARRAY['gallery', v_index::TEXT], p_expected_item - 'path' - 'url')
  WHERE tree_id = p_tree_id AND id = p_person_id;
  INSERT INTO private.person_media_cleanup(bucket, object_path, tree_id)
  VALUES ('avatars', p_source_object_path, p_tree_id) ON CONFLICT DO NOTHING;
  RETURN true;
END;
$$;
-- Retire the unguarded signature instead of allowing stale service clients to
-- clear a concurrently edited gallery item by asset ID alone.
REVOKE ALL ON FUNCTION public.finalize_legacy_gallery_person_media(UUID, TEXT, TEXT, TEXT) FROM service_role;
REVOKE ALL ON FUNCTION public.finalize_legacy_gallery_person_media_checked(UUID, TEXT, TEXT, TEXT, JSONB) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.finalize_legacy_gallery_person_media_checked(UUID, TEXT, TEXT, TEXT, JSONB) TO service_role;
REVOKE ALL ON FUNCTION public.claim_person_media_cleanup(TEXT, TEXT), public.complete_person_media_cleanup(TEXT, TEXT), public.list_person_media_cleanup_candidates() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.claim_person_media_cleanup(TEXT, TEXT), public.complete_person_media_cleanup(TEXT, TEXT), public.list_person_media_cleanup_candidates() TO service_role;

COMMIT;
NOTIFY pgrst, 'reload schema';
