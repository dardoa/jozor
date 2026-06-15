-- Read-only inventory for SECURITY DEFINER boundaries.
-- Reports every function in public/private instead of relying on a stale
-- hand-maintained function list.

WITH function_rows AS (
  SELECT
    'function' AS section,
    n.nspname || '.' || p.proname || '(' ||
      pg_get_function_identity_arguments(p.oid) || ')' AS item_name,
    jsonb_build_object(
      'schema_name', n.nspname,
      'function_name', p.proname,
      'arguments', pg_get_function_identity_arguments(p.oid),
      'security_mode', CASE
        WHEN p.prosecdef THEN 'SECURITY DEFINER'
        ELSE 'SECURITY INVOKER'
      END,
      'function_config', p.proconfig,
      'raw_acl', p.proacl,
      'execute_grantees', ARRAY(
        SELECT role_name
        FROM unnest(ARRAY['anon', 'authenticated', 'service_role', 'postgres'])
          AS role_name
        WHERE has_function_privilege(role_name, p.oid, 'EXECUTE')
        ORDER BY role_name
      ),
      'schema_usage_grantees', ARRAY(
        SELECT role_name
        FROM unnest(ARRAY['anon', 'authenticated', 'service_role', 'postgres'])
          AS role_name
        WHERE has_schema_privilege(role_name, n.oid, 'USAGE')
        ORDER BY role_name
      ),
      'trigger_tables', ARRAY(
        SELECT DISTINCT trigger_table.relname
        FROM pg_trigger trigger_row
        JOIN pg_class trigger_table ON trigger_table.oid = trigger_row.tgrelid
        WHERE trigger_row.tgfoid = p.oid
          AND NOT trigger_row.tgisinternal
        ORDER BY trigger_table.relname
      ),
      'function_definition', pg_get_functiondef(p.oid)
    ) AS payload
  FROM pg_proc p
  JOIN pg_namespace n ON n.oid = p.pronamespace
  WHERE n.nspname IN ('public', 'private')
),
policy_rows AS (
  SELECT
    'policy' AS section,
    tablename || '.' || policyname AS item_name,
    jsonb_build_object(
      'schemaname', schemaname,
      'tablename', tablename,
      'policyname', policyname,
      'cmd', cmd,
      'roles', roles,
      'qual', qual,
      'with_check', with_check
    ) AS payload
  FROM pg_policies
  WHERE schemaname = 'public'
    AND concat_ws(' ', qual, with_check) ~
      '(current_user_id_text|current_user_email_text|is_tree_collaborator|is_tree_owner|can_edit_tree)'
)
SELECT section, item_name, payload
FROM function_rows
UNION ALL
SELECT section, item_name, payload
FROM policy_rows
ORDER BY section, item_name;
