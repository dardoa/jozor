-- MUTATION: requires explicit approval and independent linked-project verification.
-- Only the two inspected legacy function grants change. This is NOT a migration.
-- Does not drain in-flight work, block old HTTP handlers, or cancel issued checkouts.
BEGIN;
SET LOCAL lock_timeout = '3s';
SET LOCAL statement_timeout = '15s';
LOCK TABLE supabase_migrations.schema_migrations IN SHARE MODE;

DO $pause$
DECLARE
  target record;
  targets constant jsonb := '[
    {"signature":"private.delete_my_profile_data()","fingerprint":"558e38ea6d833cf3943aef7b61a2c4aa"},
    {"signature":"public.delete_my_profile_data()","fingerprint":"0edca5226647aa8fde9ff66fc1b3d08c"}
  ]';
BEGIN
  IF (SELECT max(version) FROM supabase_migrations.schema_migrations)
      IS DISTINCT FROM '20260907000100'
    OR to_regclass('private.account_deletion_jobs') IS NOT NULL
    OR to_regclass('private.account_checkout_attempts') IS NOT NULL
    OR to_regclass('private.account_session_generations') IS NOT NULL THEN
    RAISE EXCEPTION 'Admission pause refused: inspected legacy schema changed';
  END IF;

  IF (SELECT count(*) FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
      WHERE n.nspname IN ('public', 'private') AND p.proname = 'delete_my_profile_data') <> 2 THEN
    RAISE EXCEPTION 'Admission pause refused: legacy function surface changed';
  END IF;

  -- Validate both targets before revoking either; any failure rolls back both.
  FOR target IN SELECT * FROM jsonb_to_recordset(targets) AS t(signature text, fingerprint text)
  LOOP
    IF to_regprocedure(target.signature) IS NULL
      OR md5(pg_get_functiondef(to_regprocedure(target.signature))) IS DISTINCT FROM target.fingerprint THEN
      RAISE EXCEPTION 'Admission pause refused: legacy function definition changed';
    END IF;
    IF NOT has_function_privilege('authenticated', target.signature, 'EXECUTE')
      OR has_function_privilege('authenticated', target.signature, 'EXECUTE WITH GRANT OPTION')
      OR has_function_privilege('anon', target.signature, 'EXECUTE') THEN
      RAISE EXCEPTION 'Admission pause refused: inspected execution grants changed';
    END IF;
  END LOOP;

  REVOKE EXECUTE ON FUNCTION public.delete_my_profile_data() FROM authenticated;
  REVOKE EXECUTE ON FUNCTION private.delete_my_profile_data() FROM authenticated;

  FOR target IN SELECT * FROM jsonb_to_recordset(targets) AS t(signature text, fingerprint text)
  LOOP
    IF has_function_privilege('authenticated', target.signature, 'EXECUTE')
      OR has_function_privilege('anon', target.signature, 'EXECUTE') THEN
      RAISE EXCEPTION 'Admission pause refused: inherited execution path remains';
    END IF;
  END LOOP;
END;
$pause$;
COMMIT;
