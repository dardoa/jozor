CREATE FUNCTION public.count_pending_person_media_cleanup(p_tree_id UUID)
RETURNS BIGINT LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
  SELECT count(*) FROM private.person_media_cleanup WHERE tree_id = p_tree_id AND completed_at IS NULL;
$$;
REVOKE ALL ON FUNCTION public.count_pending_person_media_cleanup(UUID) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.count_pending_person_media_cleanup(UUID) TO service_role;
NOTIFY pgrst, 'reload schema';
