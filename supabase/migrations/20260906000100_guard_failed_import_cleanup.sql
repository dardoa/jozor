-- A retry must never delete a tree which acquired content while the client was offline.
CREATE OR REPLACE FUNCTION public.cleanup_failed_import_tree(p_tree_id uuid, p_finalize boolean DEFAULT false)
RETURNS text
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_owner text;
  v_uid text := auth.uid()::text;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Authentication required' USING ERRCODE = '42501'; END IF;
  SELECT t.owner_id::text INTO v_owner FROM public.trees t WHERE t.id = p_tree_id FOR UPDATE;
  -- Missing and inaccessible trees have the same non-destructive result.
  IF NOT FOUND OR v_owner <> v_uid THEN RETURN 'review-required'; END IF;
  IF EXISTS (SELECT 1 FROM public.people p WHERE p.tree_id = p_tree_id)
    OR EXISTS (SELECT 1 FROM public.tree_collaborators c WHERE c.tree_id = p_tree_id) THEN
    RETURN 'review-required';
  END IF;
  IF NOT p_finalize THEN RETURN 'ready'; END IF;
  IF EXISTS (SELECT 1 FROM storage.objects o WHERE o.bucket_id IN ('person-media', 'avatars') AND o.name LIKE p_tree_id::text || '/%') THEN
    RETURN 'review-required';
  END IF;
  DELETE FROM public.trees WHERE id = p_tree_id;
  RETURN 'removed';
END;
$$;
REVOKE ALL ON FUNCTION public.cleanup_failed_import_tree(uuid, boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.cleanup_failed_import_tree(uuid, boolean) TO authenticated;
