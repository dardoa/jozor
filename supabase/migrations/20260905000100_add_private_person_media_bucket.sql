-- Introduce private, owner-managed person images without changing the legacy
-- public avatars bucket. Existing public objects remain readable during the
-- compatibility migration; all new person uploads use person-media.

BEGIN;

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'person-media',
  'person-media',
  false,
  5242880,
  ARRAY['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO UPDATE SET
  public = false,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

CREATE OR REPLACE FUNCTION private.is_valid_person_media_object_name(
  p_name TEXT
) RETURNS BOOLEAN
LANGUAGE sql
IMMUTABLE
SET search_path = pg_catalog, pg_temp
AS $$
  SELECT COALESCE(
    p_name ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}/(profile-photo|gallery-photo)/[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\.(jpg|png|webp)$',
    false
  );
$$;

REVOKE ALL ON FUNCTION private.is_valid_person_media_object_name(TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION private.is_valid_person_media_object_name(TEXT) TO authenticated;

DROP POLICY IF EXISTS "Person Media Authenticated Read" ON storage.objects;
DROP POLICY IF EXISTS "Person Media Authenticated Insert" ON storage.objects;
DROP POLICY IF EXISTS "Person Media Authenticated Update" ON storage.objects;
DROP POLICY IF EXISTS "Person Media Authenticated Delete" ON storage.objects;

-- Owner/editor reads support private client-side embedding and archive export.
-- Viewer delivery is mediated by /api/person-media after people_secure masking.
CREATE POLICY "Person Media Authenticated Read" ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'person-media'
    AND private.is_valid_person_media_object_name(name)
    AND (
      private.is_tree_owner(split_part(name, '/', 1)::UUID)
      OR private.is_tree_collaborator(split_part(name, '/', 1)::UUID, 'editor')
    )
  );

CREATE POLICY "Person Media Authenticated Insert" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'person-media'
    AND private.is_valid_person_media_object_name(name)
    AND (
      private.is_tree_owner(split_part(name, '/', 1)::UUID)
      OR private.is_tree_collaborator(split_part(name, '/', 1)::UUID, 'editor')
    )
  );

CREATE POLICY "Person Media Authenticated Update" ON storage.objects
  FOR UPDATE TO authenticated
  USING (
    bucket_id = 'person-media'
    AND private.is_valid_person_media_object_name(name)
    AND (
      private.is_tree_owner(split_part(name, '/', 1)::UUID)
      OR private.is_tree_collaborator(split_part(name, '/', 1)::UUID, 'editor')
    )
  )
  WITH CHECK (
    bucket_id = 'person-media'
    AND private.is_valid_person_media_object_name(name)
    AND (
      private.is_tree_owner(split_part(name, '/', 1)::UUID)
      OR private.is_tree_collaborator(split_part(name, '/', 1)::UUID, 'editor')
    )
  );

CREATE POLICY "Person Media Authenticated Delete" ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'person-media'
    AND private.is_valid_person_media_object_name(name)
    AND (
      private.is_tree_owner(split_part(name, '/', 1)::UUID)
      OR private.is_tree_collaborator(split_part(name, '/', 1)::UUID, 'editor')
    )
  );

-- Fail closed on SQL NULL semantics and malformed JSON before casts.
-- Protect the same contract in sync projection, imports and direct writes.
CREATE OR REPLACE FUNCTION private.is_valid_person_media_asset(
  p_asset JSONB, p_tree_id UUID, p_kind TEXT
) RETURNS BOOLEAN
LANGUAGE plpgsql IMMUTABLE
SET search_path = pg_catalog, private, pg_temp
AS $$
DECLARE
  v_extension TEXT;
BEGIN
  IF jsonb_typeof(p_asset) IS DISTINCT FROM 'object'
     OR p_tree_id IS NULL OR p_kind IS NULL
     OR p_kind NOT IN ('profile-photo', 'gallery-photo') THEN
    RETURN false;
  END IF;
  IF NOT (p_asset ?& ARRAY[
    'schemaVersion', 'provider', 'bucket', 'assetId', 'kind',
    'objectPath', 'mimeType', 'byteLength', 'version', 'createdAt'
  ]) OR EXISTS (
    SELECT 1 FROM jsonb_object_keys(p_asset) AS asset_key
    WHERE asset_key NOT IN (
      'schemaVersion', 'provider', 'bucket', 'assetId', 'kind',
      'objectPath', 'mimeType', 'byteLength', 'version', 'createdAt'
    )
  ) THEN
    RETURN false;
  END IF;
  IF p_asset->'schemaVersion' IS DISTINCT FROM '1'::JSONB
     OR p_asset->'provider' IS DISTINCT FROM '"supabase-private"'::JSONB
     OR p_asset->'bucket' IS DISTINCT FROM '"person-media"'::JSONB
     OR p_asset->'kind' IS DISTINCT FROM to_jsonb(p_kind)
     OR jsonb_typeof(p_asset->'assetId') IS DISTINCT FROM 'string'
     OR jsonb_typeof(p_asset->'objectPath') IS DISTINCT FROM 'string'
     OR jsonb_typeof(p_asset->'mimeType') IS DISTINCT FROM 'string'
     OR jsonb_typeof(p_asset->'byteLength') IS DISTINCT FROM 'number'
     OR jsonb_typeof(p_asset->'version') IS DISTINCT FROM 'number'
     OR jsonb_typeof(p_asset->'createdAt') IS DISTINCT FROM 'string' THEN
    RETURN false;
  END IF;
  IF p_asset->>'byteLength' !~ '^[1-9][0-9]*$'
     OR (p_asset->>'byteLength')::NUMERIC > 5242880
     OR p_asset->>'version' !~ '^[1-9][0-9]*$'
     OR p_asset->>'createdAt' !~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}T'
     OR NOT isfinite((p_asset->>'createdAt')::TIMESTAMPTZ) THEN
    RETURN false;
  END IF;
  v_extension := CASE p_asset->>'mimeType'
    WHEN 'image/jpeg' THEN 'jpg'
    WHEN 'image/png' THEN 'png'
    WHEN 'image/webp' THEN 'webp'
  END;
  RETURN COALESCE(
    private.is_valid_person_media_object_name(p_asset->>'objectPath')
    AND p_asset->>'objectPath' = p_tree_id::TEXT || '/' || p_kind || '/'
      || (p_asset->>'assetId') || '.' || v_extension,
    false
  );
EXCEPTION
  WHEN invalid_text_representation OR numeric_value_out_of_range
    OR invalid_datetime_format OR datetime_field_overflow THEN
    RETURN false;
END;
$$;

REVOKE ALL ON FUNCTION private.is_valid_person_media_asset(JSONB, UUID, TEXT)
  FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION private.validate_person_media_fields()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = pg_catalog, private, pg_temp
AS $$
DECLARE
  v_item JSONB;
BEGIN
  IF NEW.custom_fields ? 'photoAsset'
     AND NEW.custom_fields->'photoAsset' <> 'null'::JSONB
     AND NOT private.is_valid_person_media_asset(NEW.custom_fields->'photoAsset', NEW.tree_id, 'profile-photo') THEN
    RAISE EXCEPTION 'Validation Error: Invalid private profile-photo reference.';
  END IF;
  IF jsonb_typeof(NEW.custom_fields->'gallery') = 'array' THEN
    FOR v_item IN SELECT * FROM jsonb_array_elements(NEW.custom_fields->'gallery') LOOP
      IF jsonb_typeof(v_item) = 'object' AND v_item ? 'asset'
         AND NOT private.is_valid_person_media_asset(v_item->'asset', NEW.tree_id, 'gallery-photo') THEN
        RAISE EXCEPTION 'Validation Error: Invalid private gallery-photo reference.';
      END IF;
    END LOOP;
  END IF;
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION private.validate_person_media_fields() FROM PUBLIC, anon, authenticated;
DROP TRIGGER IF EXISTS trg_validate_person_media_fields ON public.people;
CREATE TRIGGER trg_validate_person_media_fields
  BEFORE INSERT OR UPDATE OF custom_fields ON public.people
  FOR EACH ROW EXECUTE FUNCTION private.validate_person_media_fields();

-- Preserve the existing privacy function while explicitly removing current and
-- future typed media references from viewer-visible masked custom fields.
CREATE OR REPLACE FUNCTION public.mask_custom_fields(
  p_custom_fields JSONB
) RETURNS JSONB AS $$
DECLARE
  v_masked JSONB;
BEGIN
  IF p_custom_fields IS NULL THEN
    RETURN '{}'::jsonb;
  END IF;

  v_masked := p_custom_fields - 'photoAsset' - 'voiceNoteAssets';
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

-- Provider-bound media references belong only in typed custom_fields. Strip
-- historical duplicates before they can bypass people_secure media masking.
CREATE OR REPLACE FUNCTION private.strip_person_media_metadata()
RETURNS TRIGGER AS $$
BEGIN
  NEW.metadata := COALESCE(NEW.metadata, '{}'::JSONB)
    - 'photoAsset'
    - 'photoUrl'
    - 'photoPath'
    - 'photoVersion'
    - 'gallery'
    - 'voiceNotes'
    - 'voiceNoteAssets';
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

REVOKE ALL ON FUNCTION private.strip_person_media_metadata() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trg_strip_person_media_metadata ON public.people;
CREATE TRIGGER trg_strip_person_media_metadata
  BEFORE INSERT OR UPDATE OF metadata ON public.people
  FOR EACH ROW
  EXECUTE FUNCTION private.strip_person_media_metadata();

UPDATE public.people
SET metadata = COALESCE(metadata, '{}'::JSONB)
  - 'photoAsset'
  - 'photoUrl'
  - 'photoPath'
  - 'photoVersion'
  - 'gallery'
  - 'voiceNotes'
  - 'voiceNoteAssets'
WHERE metadata ?| ARRAY[
  'photoAsset', 'photoUrl', 'photoPath', 'photoVersion',
  'gallery', 'voiceNotes', 'voiceNoteAssets'
];

-- The current sync projection stores scalar Person fields in columns. Media
-- references live in custom_fields, so project only the two supported media
-- keys after sync_tree_batch has accepted the operation and recorded its LWW
-- winner metadata. Direct writes to tree_operations are already revoked.
CREATE OR REPLACE FUNCTION private.project_person_media_update()
RETURNS TRIGGER AS $$
DECLARE
  v_updates JSONB;
  v_person_id TEXT;
  v_key TEXT;
  v_value JSONB;
  v_custom_fields JSONB;
  v_metadata JSONB;
  v_winning_op JSONB;
  v_expected_client_id TEXT;
  v_expected_client_version TEXT;
  v_asset JSONB;
  v_gallery_item JSONB;
BEGIN
  IF NEW.type <> 'UPDATE_PROP' THEN
    RETURN NEW;
  END IF;

  v_updates := NEW.payload->'updates';
  v_person_id := NEW.payload->>'id';
  IF v_person_id IS NULL OR jsonb_typeof(v_updates) <> 'object' THEN
    RETURN NEW;
  END IF;

  SELECT COALESCE(custom_fields, '{}'::JSONB), COALESCE(metadata, '{}'::JSONB)
  INTO v_custom_fields, v_metadata
  FROM public.people
  WHERE id = v_person_id AND tree_id = NEW.tree_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN NEW;
  END IF;

  v_expected_client_id := COALESCE(NEW.payload->>'client_id', '');
  v_expected_client_version := COALESCE(NEW.payload->>'client_version', '0');

  FOR v_key, v_value IN SELECT * FROM jsonb_each(v_updates) LOOP
    IF v_key NOT IN ('photoAsset', 'gallery') THEN
      CONTINUE;
    END IF;

    -- sync_tree_batch updates this stamp only when the incoming field wins.
    v_winning_op := v_metadata->'lastUpdatedOps'->v_key;
    IF v_winning_op IS NULL
       OR COALESCE(v_winning_op->>'client_id', '') <> v_expected_client_id
       OR COALESCE(v_winning_op->>'client_version', '0') <> v_expected_client_version
       OR (v_metadata->'lastUpdated'->>v_key)::TIMESTAMPTZ IS DISTINCT FROM NEW.created_at THEN
      CONTINUE;
    END IF;

    IF v_key = 'photoAsset' THEN
      IF jsonb_typeof(v_value) = 'null' THEN
        v_custom_fields := v_custom_fields - 'photoAsset';
        CONTINUE;
      END IF;

      v_asset := v_value;
      IF NOT private.is_valid_person_media_asset(v_asset, NEW.tree_id, 'profile-photo') THEN
        RAISE EXCEPTION 'Validation Error: Invalid private profile-photo reference.';
      END IF;

      v_custom_fields := jsonb_set(v_custom_fields, '{photoAsset}', v_asset, TRUE);
    ELSE
      IF jsonb_typeof(v_value) <> 'array' THEN
        RAISE EXCEPTION 'Validation Error: Gallery update must be an array.';
      END IF;

      -- Validate every typed private gallery reference while retaining legacy
      -- string/path records until the separate migration pass is complete.
      FOR v_gallery_item IN SELECT * FROM jsonb_array_elements(v_value) LOOP
        IF jsonb_typeof(v_gallery_item) = 'object' AND v_gallery_item ? 'asset' THEN
          v_asset := v_gallery_item->'asset';
          IF NOT private.is_valid_person_media_asset(v_asset, NEW.tree_id, 'gallery-photo') THEN
            RAISE EXCEPTION 'Validation Error: Invalid private gallery-photo reference.';
          END IF;
        END IF;
      END LOOP;

      v_custom_fields := jsonb_set(v_custom_fields, '{gallery}', v_value, TRUE);
    END IF;
  END LOOP;

  UPDATE public.people
  SET custom_fields = v_custom_fields
  WHERE id = v_person_id AND tree_id = NEW.tree_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, private, pg_temp;

REVOKE ALL ON FUNCTION private.project_person_media_update() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trg_project_person_media_update ON public.tree_operations;
CREATE TRIGGER trg_project_person_media_update
  AFTER INSERT ON public.tree_operations
  FOR EACH ROW
  EXECUTE FUNCTION private.project_person_media_update();

COMMIT;

NOTIFY pgrst, 'reload schema';
