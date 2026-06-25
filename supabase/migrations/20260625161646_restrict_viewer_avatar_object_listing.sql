-- Restrict avatar object metadata listing for viewer collaborators.
--
-- Context:
-- people_secure masks photo_path/photo_url/gallery/voiceNotes for living or
-- private people when the caller is a viewer. The storage bucket is still a
-- legacy public bucket, so this migration does not change URL serving behavior.
-- It does, however, close the avoidable side channel where a viewer could list
-- storage.objects metadata for a whole tree folder and discover hidden object
-- paths for masked people.

BEGIN;

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
          OR private.is_tree_collaborator(split_part(name, '/', 1)::UUID, 'editor')
        )
      )
    )
  );

COMMIT;

NOTIFY pgrst, 'reload schema';
