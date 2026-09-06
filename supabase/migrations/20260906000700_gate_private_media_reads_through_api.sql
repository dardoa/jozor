-- CDN hits can outlive a collaborator downgrade even with cacheControl=0.
-- All person-media bytes must go through the authenticated app gateway.
-- SELECT remains available only for SDK management operations; existing
-- owner/editor policies still determine which objects can be managed.
BEGIN;

DROP POLICY IF EXISTS "Person Media Gateway Read Boundary" ON storage.objects;
CREATE POLICY "Person Media Gateway Read Boundary" ON storage.objects
  AS RESTRICTIVE FOR SELECT TO anon, authenticated
  USING (
    bucket_id <> 'person-media'
    OR storage.allow_any_operation(ARRAY[
      'object.list', 'object.list_v2',
      'object.upload', 'object.upload_update',
      'object.delete', 'object.delete_many'
    ])
  );

COMMIT;
NOTIFY pgrst, 'reload schema';
