-- Preserve legacy public URLs, but restrict object metadata and mutations.
-- Older permissive policies are OR-ed with newer policies, not overridden.
BEGIN;

CREATE OR REPLACE FUNCTION private.can_manage_avatar_object(p_name TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql STABLE
SET search_path = pg_catalog, private, pg_temp
AS $$
DECLARE
  v_parts TEXT[];
  v_actor TEXT := NULLIF(private.current_user_id_text(), '');
BEGIN
  IF v_actor IS NULL OR p_name IS NULL OR length(p_name) > 1024
     OR position(chr(92) IN p_name) > 0 OR p_name ~ '[[:cntrl:]]' THEN
    RETURN false;
  END IF;
  v_parts := string_to_array(p_name, '/');
  IF cardinality(v_parts) < 2 OR EXISTS (
    SELECT 1 FROM unnest(v_parts) AS part WHERE part IN ('', '.', '..')
  ) THEN
    RETURN false;
  END IF;
  IF v_parts[1] = 'users' THEN
    RETURN cardinality(v_parts) >= 3 AND v_parts[2] = v_actor;
  END IF;
  -- Validate before casting; malformed paths must deny, not raise a UUID error.
  IF NOT private.is_valid_uuid(v_parts[1]) THEN RETURN false; END IF;
  RETURN private.is_tree_owner(v_parts[1]::UUID)
    OR private.is_tree_collaborator(v_parts[1]::UUID, 'editor');
END;
$$;

REVOKE ALL ON FUNCTION private.can_manage_avatar_object(TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION private.can_manage_avatar_object(TEXT) TO authenticated, service_role;

DROP POLICY IF EXISTS "Allow Auth Uploads" ON storage.objects;
DROP POLICY IF EXISTS "Allow Authenticated Upload 1oj01fe_0" ON storage.objects;
DROP POLICY IF EXISTS "Allow Authenticated Upload 1oj01fe_2" ON storage.objects;
DROP POLICY IF EXISTS "Allow Authenticated Upload 1oj01fe_3" ON storage.objects;
-- This legacy policy accidentally compared the tree name, not the object path.
DROP POLICY IF EXISTS "Tree Owner Avatar Management" ON storage.objects;
DROP POLICY IF EXISTS "User Profile Avatar Management" ON storage.objects;

DROP POLICY IF EXISTS "Avatar Authenticated Read" ON storage.objects;
DROP POLICY IF EXISTS "Avatar Authenticated Insert" ON storage.objects;
DROP POLICY IF EXISTS "Avatar Authenticated Update" ON storage.objects;
DROP POLICY IF EXISTS "Avatar Authenticated Delete" ON storage.objects;

CREATE POLICY "Avatar Authenticated Read" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'avatars' AND private.can_manage_avatar_object(name));
CREATE POLICY "Avatar Authenticated Insert" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'avatars' AND private.can_manage_avatar_object(name));
CREATE POLICY "Avatar Authenticated Update" ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'avatars' AND private.can_manage_avatar_object(name))
  WITH CHECK (bucket_id = 'avatars' AND private.can_manage_avatar_object(name));
CREATE POLICY "Avatar Authenticated Delete" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'avatars' AND private.can_manage_avatar_object(name));

-- Also constrain any remaining or subsequently added permissive policy.
DROP POLICY IF EXISTS "Avatar Authenticated Boundary" ON storage.objects;
CREATE POLICY "Avatar Authenticated Boundary" ON storage.objects
  AS RESTRICTIVE FOR ALL TO authenticated
  USING (bucket_id <> 'avatars' OR private.can_manage_avatar_object(name))
  WITH CHECK (bucket_id <> 'avatars' OR private.can_manage_avatar_object(name));
DROP POLICY IF EXISTS "Avatar Anonymous Boundary" ON storage.objects;
CREATE POLICY "Avatar Anonymous Boundary" ON storage.objects
  AS RESTRICTIVE FOR ALL TO anon
  USING (bucket_id <> 'avatars') WITH CHECK (bucket_id <> 'avatars');

COMMIT;
NOTIFY pgrst, 'reload schema';
