-- Pin wrapper search paths reported by Supabase security advisors and prevent
-- direct RPC execution of a trigger-only function. Trigger execution is not
-- affected by revoking client EXECUTE privileges.

BEGIN;

ALTER FUNCTION private.is_valid_uuid(TEXT)
  SET search_path = pg_catalog, pg_temp;

ALTER FUNCTION public.ensure_user_profile(TEXT, TEXT, TEXT)
  SET search_path = public, private, pg_temp;
ALTER FUNCTION public.update_my_profile(JSONB)
  SET search_path = public, private, pg_temp;
ALTER FUNCTION public.update_user_tour_status(BOOLEAN)
  SET search_path = public, private, pg_temp;
ALTER FUNCTION public.delete_my_profile_data()
  SET search_path = public, private, pg_temp;
ALTER FUNCTION public.import_tree_content(UUID, JSONB, JSONB)
  SET search_path = public, private, pg_temp;
ALTER FUNCTION public.replace_tree_content(UUID, JSONB, JSONB)
  SET search_path = public, private, pg_temp;
ALTER FUNCTION public.update_person_photo(TEXT, UUID, TEXT, TEXT, INTEGER)
  SET search_path = public, private, pg_temp;
ALTER FUNCTION public.update_user_avatar(TEXT, TEXT, INTEGER)
  SET search_path = public, private, pg_temp;

REVOKE ALL ON FUNCTION public.trg_assert_tree_collaborator_limits()
  FROM PUBLIC, anon, authenticated;

COMMIT;

NOTIFY pgrst, 'reload schema';
