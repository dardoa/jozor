-- current_user_email_text() is not called by application code or current RLS
-- policies. Keep the helper for internal compatibility, but remove direct
-- REST/RPC execution from browser-authenticated roles.

BEGIN;

REVOKE EXECUTE ON FUNCTION public.current_user_email_text() FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.current_user_email_text() FROM anon;
REVOKE EXECUTE ON FUNCTION public.current_user_email_text() FROM PUBLIC;

COMMIT;

NOTIFY pgrst, 'reload schema';
