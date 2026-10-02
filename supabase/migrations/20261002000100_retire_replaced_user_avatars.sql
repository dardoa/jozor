BEGIN;

CREATE TABLE private.user_avatar_cleanup (
  object_path TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  requested_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  claimed_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ
);
CREATE INDEX user_avatar_cleanup_pending ON private.user_avatar_cleanup(requested_at, object_path)
  WHERE completed_at IS NULL;
REVOKE ALL ON private.user_avatar_cleanup FROM PUBLIC, anon, authenticated;

CREATE FUNCTION private.is_user_avatar_path(p_path TEXT, p_owner TEXT, p_legacy BOOLEAN DEFAULT false)
RETURNS BOOLEAN LANGUAGE sql IMMUTABLE SET search_path = '' AS $$
  SELECT COALESCE(p_owner <> '' AND length(p_path) <= 1024 AND p_owner !~ '[/\\%[:cntrl:]]'
    AND p_owner NOT IN ('.','..') AND split_part(p_path,'/',1) = 'users'
    AND split_part(p_path,'/',2) = p_owner AND cardinality(string_to_array(p_path,'/')) = 3
    AND (split_part(p_path,'/',3) ~* '^profile-[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\.webp$'
      OR (p_legacy AND split_part(p_path,'/',3) IN ('profile.webp','profile.png','profile.jpg','profile.jpeg'))), false);
$$;

CREATE FUNCTION private.user_avatar_url_path(p_url TEXT) RETURNS TEXT
LANGUAGE sql IMMUTABLE SET search_path = '' AS $$
  SELECT substring(p_url FROM '^https?://[^/?#]+/storage/v1/object/public/avatars/([^?#]+)(?:[?#].*)?$');
$$;

CREATE FUNCTION private.user_avatar_is_referenced(p_path TEXT) RETURNS BOOLEAN
LANGUAGE sql STABLE SET search_path = '' AS $$
  SELECT EXISTS(SELECT 1 FROM public.user_profiles p WHERE p.photo_path = p_path
    OR private.user_avatar_url_path(p.photo_url) = p_path
    OR (p.photo_url LIKE '%/storage/v1/object/public/avatars/%' AND p.photo_url LIKE '%\%%' ESCAPE '\'));
$$;

-- One transaction lock also covers references from a different profile. Statement
-- triggers acquire it before row locks, including direct/legacy profile writes.
CREATE FUNCTION private.lock_user_avatar_changes() RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  PERFORM pg_advisory_xact_lock(hashtextextended('user-avatar-retirement', 0));
  RETURN NULL;
END;
$$;
CREATE TRIGGER user_avatar_profile_lock BEFORE INSERT OR DELETE OR UPDATE OF photo_path, photo_url ON public.user_profiles
  FOR EACH STATEMENT EXECUTE FUNCTION private.lock_user_avatar_changes();

CREATE FUNCTION private.guard_user_avatar_profile() RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE v_old_path TEXT; v_new_path TEXT;
BEGIN
  IF TG_OP <> 'DELETE' THEN
    v_new_path := COALESCE(NEW.photo_path, private.user_avatar_url_path(NEW.photo_url));
    IF EXISTS(SELECT 1 FROM private.user_avatar_cleanup c WHERE c.object_path = v_new_path)
      AND (TG_OP = 'INSERT' OR NEW.photo_path IS DISTINCT FROM OLD.photo_path OR NEW.photo_url IS DISTINCT FROM OLD.photo_url) THEN
      RAISE EXCEPTION 'Avatar is retired; upload a new asset.' USING ERRCODE = '23514';
    END IF;
    IF NEW.photo_path IS NOT NULL AND (
      NOT private.is_user_avatar_path(NEW.photo_path, NEW.id, true)
      OR private.user_avatar_url_path(NEW.photo_url) IS DISTINCT FROM NEW.photo_path
      OR NEW.photo_url ~ '[?#%[:cntrl:]]') THEN
      RAISE EXCEPTION 'Invalid owned avatar path or URL mismatch.' USING ERRCODE = '23514';
    END IF;
    IF NEW.photo_path IS NOT NULL AND NOT private.is_user_avatar_path(NEW.photo_path,NEW.id) THEN
      IF TG_OP = 'INSERT' THEN RAISE EXCEPTION 'Invalid new legacy avatar path.' USING ERRCODE = '23514'; END IF;
      IF NEW.photo_path IS DISTINCT FROM OLD.photo_path THEN
        RAISE EXCEPTION 'Invalid new legacy avatar path.' USING ERRCODE = '23514';
      END IF;
    END IF;
    IF NEW.photo_url LIKE '%/storage/v1/object/public/avatars/%' AND NEW.photo_url ~ '[%[:cntrl:]]' THEN
      RAISE EXCEPTION 'Invalid ambiguous avatar URL.' USING ERRCODE = '23514';
    END IF;
  END IF;
  IF TG_OP <> 'INSERT' THEN
    -- SQL cannot establish the configured origin of a URL-only legacy image.
    -- Such URLs can protect a live reference, but cannot authorize deletion.
    v_old_path := OLD.photo_path;
    IF (TG_OP = 'DELETE' OR v_old_path IS DISTINCT FROM v_new_path)
      AND private.is_user_avatar_path(v_old_path, OLD.id, true) THEN
      INSERT INTO private.user_avatar_cleanup(object_path,user_id) VALUES(v_old_path,OLD.id) ON CONFLICT DO NOTHING;
    END IF;
  END IF;
  IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER user_avatar_profile_guard BEFORE INSERT OR DELETE OR UPDATE OF photo_path, photo_url ON public.user_profiles
  FOR EACH ROW EXECUTE FUNCTION private.guard_user_avatar_profile();

CREATE FUNCTION private.guard_retired_user_avatar_write() RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  IF NEW.bucket_id = 'avatars' AND split_part(NEW.name,'/',1) = 'users' THEN
    PERFORM pg_advisory_xact_lock(hashtextextended('user-avatar-retirement',0));
  ELSIF TG_OP = 'UPDATE' THEN
    IF OLD.bucket_id = 'avatars' AND split_part(OLD.name,'/',1) = 'users' THEN
      PERFORM pg_advisory_xact_lock(hashtextextended('user-avatar-retirement',0));
    END IF;
  END IF;
  IF TG_OP = 'UPDATE' THEN
    IF OLD.bucket_id = 'avatars' AND EXISTS(
      SELECT 1 FROM private.user_avatar_cleanup c WHERE c.object_path = OLD.name
    ) THEN RAISE EXCEPTION 'Avatar is retired; upload a new asset.' USING ERRCODE = '23514'; END IF;
  END IF;
  IF NEW.bucket_id = 'avatars' AND split_part(NEW.name,'/',1) = 'users' AND EXISTS(
    SELECT 1 FROM private.user_avatar_cleanup c WHERE c.object_path = NEW.name
  ) THEN RAISE EXCEPTION 'Avatar is retired; upload a new asset.' USING ERRCODE = '23514'; END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER retired_user_avatar_storage_guard BEFORE INSERT OR UPDATE ON storage.objects
  FOR EACH ROW EXECUTE FUNCTION private.guard_retired_user_avatar_write();

CREATE FUNCTION public.replace_user_avatar(p_photo_url TEXT, p_photo_path TEXT,
  p_expected_photo_path TEXT, p_expected_photo_version INTEGER) RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE v_actor TEXT := private.current_user_id_text(); v_profile public.user_profiles; v_version INTEGER;
BEGIN
  IF NOT private.is_user_avatar_path(p_photo_path,v_actor) OR p_photo_url IS NULL
    OR private.user_avatar_url_path(p_photo_url) IS DISTINCT FROM p_photo_path
    OR p_photo_url ~ '[?#%[:cntrl:]]' THEN
    RAISE EXCEPTION 'Invalid owned avatar path or URL mismatch.' USING ERRCODE = '23514';
  END IF;
  PERFORM pg_advisory_xact_lock(hashtextextended('user-avatar-retirement',0));
  SELECT * INTO v_profile FROM public.user_profiles WHERE id = v_actor FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Profile not found.'; END IF;
  IF v_profile.photo_path IS DISTINCT FROM p_expected_photo_path
    OR v_profile.photo_version IS DISTINCT FROM p_expected_photo_version THEN
    RAISE EXCEPTION 'Profile changed; retry avatar replacement.' USING ERRCODE = '40001';
  END IF;
  v_version := COALESCE(v_profile.photo_version,0) + 1;
  UPDATE public.user_profiles SET photo_path = p_photo_path, photo_url = p_photo_url,
    photo_version = v_version, updated_at = now() WHERE id = v_actor;
  RETURN jsonb_build_object('photoPath',p_photo_path,'photoVersion',v_version);
END;
$$;

CREATE FUNCTION public.list_my_user_avatar_cleanup() RETURNS TABLE(object_path TEXT)
LANGUAGE sql SECURITY DEFINER SET search_path = '' AS $$
  SELECT c.object_path FROM private.user_avatar_cleanup c
    WHERE c.user_id = private.current_user_id_text() AND c.completed_at IS NULL
    ORDER BY c.requested_at,c.object_path LIMIT 20;
$$;

CREATE FUNCTION public.request_user_avatar_cleanup(p_object_path TEXT) RETURNS BOOLEAN
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE v_actor TEXT := private.current_user_id_text();
BEGIN
  IF NOT private.is_user_avatar_path(p_object_path,v_actor) THEN RETURN false; END IF;
  PERFORM pg_advisory_xact_lock(hashtextextended('user-avatar-retirement',0));
  PERFORM 1 FROM public.user_profiles WHERE id = v_actor FOR UPDATE;
  IF private.user_avatar_is_referenced(p_object_path) THEN RETURN false; END IF;
  INSERT INTO private.user_avatar_cleanup(object_path,user_id) VALUES(p_object_path,v_actor) ON CONFLICT DO NOTHING;
  RETURN true;
END;
$$;

CREATE FUNCTION public.claim_user_avatar_cleanup(p_object_path TEXT) RETURNS BOOLEAN
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE v_owner TEXT;
BEGIN
  PERFORM pg_advisory_xact_lock(hashtextextended('user-avatar-retirement',0));
  SELECT user_id INTO v_owner FROM private.user_avatar_cleanup WHERE object_path = p_object_path AND completed_at IS NULL;
  IF NOT FOUND OR (current_setting('role',true) <> 'service_role'
    AND v_owner IS DISTINCT FROM private.current_user_id_text())
    OR NOT private.is_user_avatar_path(p_object_path,v_owner,true)
    OR private.user_avatar_is_referenced(p_object_path) THEN RETURN false; END IF;
  PERFORM 1 FROM public.user_profiles WHERE id = v_owner FOR UPDATE;
  UPDATE private.user_avatar_cleanup SET claimed_at = COALESCE(claimed_at,now()) WHERE object_path = p_object_path;
  RETURN true;
END;
$$;

CREATE FUNCTION public.complete_user_avatar_cleanup(p_object_path TEXT) RETURNS BOOLEAN
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  PERFORM pg_advisory_xact_lock(hashtextextended('user-avatar-retirement',0));
  IF EXISTS(SELECT 1 FROM storage.objects WHERE bucket_id = 'avatars' AND name = p_object_path)
    OR private.user_avatar_is_referenced(p_object_path) THEN RETURN false; END IF;
  UPDATE private.user_avatar_cleanup c SET completed_at = COALESCE(c.completed_at,now())
    WHERE c.object_path = p_object_path AND c.claimed_at IS NOT NULL
    AND (current_setting('role',true) = 'service_role' OR c.user_id = private.current_user_id_text());
  RETURN FOUND;
END;
$$;

CREATE FUNCTION public.list_user_avatar_cleanup_candidates() RETURNS TABLE(object_path TEXT)
LANGUAGE sql SECURITY DEFINER SET search_path = '' AS $$
  SELECT c.object_path FROM private.user_avatar_cleanup c WHERE c.completed_at IS NULL
    ORDER BY c.requested_at,c.object_path LIMIT 20;
$$;

REVOKE ALL ON FUNCTION private.is_user_avatar_path(TEXT,TEXT,BOOLEAN), private.user_avatar_url_path(TEXT),
  private.user_avatar_is_referenced(TEXT), private.lock_user_avatar_changes(), private.guard_user_avatar_profile(),
  private.guard_retired_user_avatar_write() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.replace_user_avatar(TEXT,TEXT,TEXT,INTEGER), public.list_my_user_avatar_cleanup(),
  public.request_user_avatar_cleanup(TEXT), public.claim_user_avatar_cleanup(TEXT), public.complete_user_avatar_cleanup(TEXT),
  public.list_user_avatar_cleanup_candidates() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.replace_user_avatar(TEXT,TEXT,TEXT,INTEGER), public.list_my_user_avatar_cleanup(),
  public.request_user_avatar_cleanup(TEXT), public.claim_user_avatar_cleanup(TEXT), public.complete_user_avatar_cleanup(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.claim_user_avatar_cleanup(TEXT), public.complete_user_avatar_cleanup(TEXT),
  public.list_user_avatar_cleanup_candidates() TO service_role;

COMMIT;
NOTIFY pgrst, 'reload schema';
