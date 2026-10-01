-- Catalog/aggregate inspection only. Never invoke account or billing functions.
BEGIN READ ONLY;
SET LOCAL statement_timeout = '15s';
SELECT jsonb_build_object(
  'observedAt', now(),
  'readOnly', current_setting('transaction_read_only') = 'on',
  'latestMigration', (SELECT max(version) FROM supabase_migrations.schema_migrations),
  'queuePresent', to_regclass('private.account_deletion_jobs') IS NOT NULL,
  'checkoutIntentsPresent', to_regclass('private.account_checkout_attempts') IS NOT NULL,
  'sessionFencePresent', to_regclass('private.account_session_generations') IS NOT NULL,
  'functions', (
    SELECT coalesce(jsonb_agg(jsonb_build_object(
      'schema', n.nspname,
      'name', p.proname,
      'arguments', pg_get_function_identity_arguments(p.oid),
      'securityDefiner', p.prosecdef,
      'owner', pg_get_userbyid(p.proowner),
      'definitionFingerprint', md5(pg_get_functiondef(p.oid)),
      'executeGrants', (
        SELECT jsonb_agg(jsonb_build_object(
          'grantee', CASE WHEN a.grantee = 0 THEN 'PUBLIC' ELSE pg_get_userbyid(a.grantee) END,
          'grantor', pg_get_userbyid(a.grantor),
          'grantable', a.is_grantable
        ) ORDER BY a.grantee, a.grantor)
        FROM aclexplode(coalesce(p.proacl, acldefault('f', p.proowner))) a
        WHERE a.privilege_type = 'EXECUTE'
      ),
      'anonExecute', has_function_privilege('anon', p.oid, 'EXECUTE'),
      'authenticatedExecute', has_function_privilege('authenticated', p.oid, 'EXECUTE'),
      'serviceExecute', has_function_privilege('service_role', p.oid, 'EXECUTE'),
      'authenticatedSchemaUsage', has_schema_privilege('authenticated', n.oid, 'USAGE')
    ) ORDER BY n.nspname, p.proname, p.oid), '[]'::jsonb)
    FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname IN ('public', 'private')
      AND p.proname IN ('delete_my_profile_data', 'request_account_deletion', 'begin_account_checkout')
  ),
  'profileDeleteSurface', jsonb_build_object(
    'authenticatedTableDelete', has_table_privilege('authenticated', 'public.user_profiles', 'DELETE'),
    'anonTableDelete', has_table_privilege('anon', 'public.user_profiles', 'DELETE'),
    'rlsEnabled', (SELECT relrowsecurity FROM pg_class WHERE oid = 'public.user_profiles'::regclass),
    'deletePolicies', (SELECT coalesce(jsonb_agg(jsonb_build_object(
      'name', policyname, 'roles', roles, 'command', cmd, 'using', qual
    ) ORDER BY policyname), '[]'::jsonb)
      FROM pg_policies WHERE schemaname = 'public' AND tablename = 'user_profiles' AND cmd IN ('ALL', 'DELETE'))
  ),
  'activity', jsonb_build_object(
    'latestCheckoutRequestedAt', (SELECT max(last_requested_at) FROM private.checkout_rate_limits),
    'latestWebhookProcessedAt', (SELECT max(processed_at) FROM private.processed_paddle_webhook_events),
    'observedActiveAccountOrBillingStatements', (
      SELECT count(*) FROM pg_stat_activity
      WHERE pid <> pg_backend_pid() AND datname = current_database() AND state = 'active'
        AND query ~* '(delete_my_profile_data|request_account_deletion|begin_account_checkout|process_paddle_subscription_event)'
    )
  )
) AS admission_coverage;
ROLLBACK;
