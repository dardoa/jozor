-- current_user_email_text() is not called by application code or current RLS
-- policies. Keep the helper for internal compatibility, but remove direct
-- REST/RPC execution from browser-authenticated roles.

BEGIN;

DO $legacy_email$
BEGIN
  IF to_regprocedure('public.current_user_email_text()') IS NOT NULL THEN
    REVOKE EXECUTE ON FUNCTION public.current_user_email_text() FROM authenticated;
    REVOKE EXECUTE ON FUNCTION public.current_user_email_text() FROM anon;
    REVOKE EXECUTE ON FUNCTION public.current_user_email_text() FROM PUBLIC;
  END IF;
END;
$legacy_email$;

COMMIT;

NOTIFY pgrst, 'reload schema';
