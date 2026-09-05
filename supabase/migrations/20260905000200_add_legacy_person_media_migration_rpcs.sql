-- Server-only compare-and-set helpers for moving legacy person images from the
-- public avatars bucket into private person-media objects. Storage I/O remains
-- in the owner-authorized API; these functions make row attachment/finalization
-- atomic and resumable without exposing migration writes to browser clients.

BEGIN;

CREATE OR REPLACE FUNCTION private.is_safe_legacy_avatar_object_name(
  p_tree_id UUID,
  p_name TEXT
) RETURNS BOOLEAN
LANGUAGE sql
IMMUTABLE
SET search_path = pg_catalog, pg_temp
AS $$
  SELECT COALESCE(
    p_tree_id IS NOT NULL
    AND length(p_name) BETWEEN 3 AND 512
    AND p_name LIKE p_tree_id::TEXT || '/%'
    AND p_name !~ '(^|/)\.\.?(/|$)'
    AND p_name NOT LIKE '%//%'
    AND right(p_name, 1) <> '/'
    AND position(E'\\' IN p_name) = 0
    AND p_name !~ '[[:cntrl:]]',
    false
  );
$$;

REVOKE ALL ON FUNCTION private.is_safe_legacy_avatar_object_name(UUID, TEXT)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION private.is_safe_legacy_avatar_object_name(UUID, TEXT)
  TO service_role;

CREATE OR REPLACE FUNCTION public.attach_legacy_profile_person_media(
  p_tree_id UUID,
  p_person_id TEXT,
  p_source_object_path TEXT,
  p_expected_photo_path TEXT,
  p_expected_photo_url TEXT,
  p_asset JSONB
) RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, private, pg_temp
AS $$
DECLARE
  v_updated INTEGER;
BEGIN
  IF NOT private.is_safe_legacy_avatar_object_name(p_tree_id, p_source_object_path)
     OR NOT private.is_valid_person_media_asset(p_asset, p_tree_id, 'profile-photo')
     OR (p_expected_photo_path IS NULL AND p_expected_photo_url IS NULL) THEN
    RETURN false;
  END IF;

  UPDATE public.people
  SET custom_fields = jsonb_set(
    COALESCE(custom_fields, '{}'::JSONB),
    '{photoAsset}',
    p_asset,
    true
  )
  WHERE tree_id = p_tree_id
    AND id = p_person_id
    AND photo_path IS NOT DISTINCT FROM p_expected_photo_path
    AND photo_url IS NOT DISTINCT FROM p_expected_photo_url
    AND (
      NOT COALESCE(custom_fields, '{}'::JSONB) ? 'photoAsset'
      OR custom_fields->'photoAsset' = 'null'::JSONB
    );

  GET DIAGNOSTICS v_updated = ROW_COUNT;
  RETURN v_updated = 1;
END;
$$;

CREATE OR REPLACE FUNCTION public.attach_legacy_gallery_person_media(
  p_tree_id UUID,
  p_person_id TEXT,
  p_source_object_path TEXT,
  p_gallery_index INTEGER,
  p_expected_item JSONB,
  p_replacement_item JSONB
) RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, private, pg_temp
AS $$
DECLARE
  v_custom_fields JSONB;
  v_gallery JSONB;
  v_asset JSONB;
BEGIN
  v_asset := p_replacement_item->'asset';
  IF NOT private.is_safe_legacy_avatar_object_name(p_tree_id, p_source_object_path)
     OR p_gallery_index < 0
     OR jsonb_typeof(p_replacement_item) IS DISTINCT FROM 'object'
     OR NOT private.is_valid_person_media_asset(v_asset, p_tree_id, 'gallery-photo') THEN
    RETURN false;
  END IF;

  SELECT COALESCE(custom_fields, '{}'::JSONB)
  INTO v_custom_fields
  FROM public.people
  WHERE tree_id = p_tree_id AND id = p_person_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN false;
  END IF;

  v_gallery := v_custom_fields->'gallery';
  IF jsonb_typeof(v_gallery) IS DISTINCT FROM 'array'
     OR p_gallery_index >= jsonb_array_length(v_gallery)
     OR v_gallery->p_gallery_index IS DISTINCT FROM p_expected_item THEN
    RETURN false;
  END IF;

  v_custom_fields := jsonb_set(
    v_custom_fields,
    ARRAY['gallery', p_gallery_index::TEXT],
    p_replacement_item,
    false
  );
  UPDATE public.people
  SET custom_fields = v_custom_fields
  WHERE tree_id = p_tree_id AND id = p_person_id;
  RETURN true;
END;
$$;

CREATE OR REPLACE FUNCTION public.finalize_legacy_profile_person_media(
  p_tree_id UUID,
  p_person_id TEXT,
  p_source_object_path TEXT,
  p_expected_photo_path TEXT,
  p_expected_photo_url TEXT,
  p_asset_id TEXT
) RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, private, pg_temp
AS $$
DECLARE
  v_updated INTEGER;
BEGIN
  IF NOT private.is_safe_legacy_avatar_object_name(p_tree_id, p_source_object_path) THEN
    RETURN false;
  END IF;

  UPDATE public.people
  SET photo_path = NULL,
      photo_url = NULL
  WHERE tree_id = p_tree_id
    AND id = p_person_id
    AND photo_path IS NOT DISTINCT FROM p_expected_photo_path
    AND photo_url IS NOT DISTINCT FROM p_expected_photo_url
    AND custom_fields->'photoAsset'->>'assetId' = p_asset_id;

  GET DIAGNOSTICS v_updated = ROW_COUNT;
  RETURN v_updated = 1;
END;
$$;

CREATE OR REPLACE FUNCTION public.finalize_legacy_gallery_person_media(
  p_tree_id UUID,
  p_person_id TEXT,
  p_source_object_path TEXT,
  p_asset_id TEXT
) RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, private, pg_temp
AS $$
DECLARE
  v_custom_fields JSONB;
  v_gallery JSONB;
  v_clean_gallery JSONB;
  v_match_count INTEGER;
BEGIN
  IF NOT private.is_safe_legacy_avatar_object_name(p_tree_id, p_source_object_path) THEN
    RETURN false;
  END IF;

  SELECT COALESCE(custom_fields, '{}'::JSONB)
  INTO v_custom_fields
  FROM public.people
  WHERE tree_id = p_tree_id AND id = p_person_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN false;
  END IF;

  v_gallery := v_custom_fields->'gallery';
  IF jsonb_typeof(v_gallery) IS DISTINCT FROM 'array' THEN
    RETURN false;
  END IF;

  SELECT
    COALESCE(jsonb_agg(
      CASE
        WHEN jsonb_typeof(item) = 'object'
             AND item->'asset'->>'assetId' = p_asset_id
          THEN item - 'path' - 'url'
        ELSE item
      END
      ORDER BY item_index
    ), '[]'::JSONB),
    count(*) FILTER (
      WHERE jsonb_typeof(item) = 'object'
        AND item->'asset'->>'assetId' = p_asset_id
    )::INTEGER
  INTO v_clean_gallery, v_match_count
  FROM jsonb_array_elements(v_gallery) WITH ORDINALITY AS gallery_item(item, item_index);

  IF v_match_count <> 1 THEN
    RETURN false;
  END IF;

  UPDATE public.people
  SET custom_fields = jsonb_set(v_custom_fields, '{gallery}', v_clean_gallery, true)
  WHERE tree_id = p_tree_id AND id = p_person_id;
  RETURN true;
END;
$$;

REVOKE ALL ON FUNCTION public.attach_legacy_profile_person_media(
  UUID, TEXT, TEXT, TEXT, TEXT, JSONB
) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.attach_legacy_gallery_person_media(
  UUID, TEXT, TEXT, INTEGER, JSONB, JSONB
) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.finalize_legacy_profile_person_media(
  UUID, TEXT, TEXT, TEXT, TEXT, TEXT
) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.finalize_legacy_gallery_person_media(
  UUID, TEXT, TEXT, TEXT
) FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.attach_legacy_profile_person_media(
  UUID, TEXT, TEXT, TEXT, TEXT, JSONB
) TO service_role;
GRANT EXECUTE ON FUNCTION public.attach_legacy_gallery_person_media(
  UUID, TEXT, TEXT, INTEGER, JSONB, JSONB
) TO service_role;
GRANT EXECUTE ON FUNCTION public.finalize_legacy_profile_person_media(
  UUID, TEXT, TEXT, TEXT, TEXT, TEXT
) TO service_role;
GRANT EXECUTE ON FUNCTION public.finalize_legacy_gallery_person_media(
  UUID, TEXT, TEXT, TEXT
) TO service_role;

COMMIT;

NOTIFY pgrst, 'reload schema';
