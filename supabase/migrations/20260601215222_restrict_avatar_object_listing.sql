-- Public avatar URLs are served by the public bucket without a broad
-- storage.objects SELECT policy. Restrict metadata listing to signed-in users
-- who own the profile folder or can access the related tree.

BEGIN;

DROP POLICY IF EXISTS "Avatar Public Read" ON storage.objects;
DROP POLICY IF EXISTS "Avatar Authenticated Read" ON storage.objects;

CREATE POLICY "Avatar Authenticated Read" ON storage.objects
  FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'avatars'
    AND (
      (
        split_part(name, '/', 1) = 'users'
        AND split_part(name, '/', 2) = private.current_user_id_text()
      )
      OR (
        private.is_valid_uuid(split_part(name, '/', 1))
        AND (
          private.is_tree_owner(split_part(name, '/', 1)::UUID)
          OR private.is_tree_collaborator(split_part(name, '/', 1)::UUID, 'viewer')
        )
      )
    )
  );

COMMIT;
