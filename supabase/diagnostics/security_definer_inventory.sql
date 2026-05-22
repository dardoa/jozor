-- Read-only inventory for SECURITY DEFINER redesign planning.
-- Run against the linked project before writing migrations that move/revoke
-- helper functions. This query does not modify schema or data.
--
-- Supabase CLI returns one result set for SQL files, so this query emits a
-- single section/payload result set containing both functions and policies.

WITH target_functions AS (
  SELECT unnest(ARRAY[
    'accept_tree_invitation',
    'accept_tree_invitation_by_id',
    'revoke_tree_invitation',
    'decline_tree_invitation',
    'create_tree_invitation',
    'create_tree_with_root',
    'create_person_and_relationship',
    'delete_person_and_relations',
    'replace_tree_content',
    'sync_tree_batch',
    'prune_tree_operations',
    'prune_activity_logs',
    'claim_collaborator_memberships',
    'can_edit_tree',
    'is_tree_owner',
    'is_tree_collaborator',
    'current_user_id_text',
    'current_user_email_text'
  ]) AS function_name
),
function_rows AS (
  SELECT
    'function' AS section,
    p.proname AS item_name,
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
      'execute_grantees', array_agg(DISTINCT grantee.rolname ORDER BY grantee.rolname)
        FILTER (WHERE has_function_privilege(grantee.oid, p.oid, 'EXECUTE')),
      'function_definition', pg_get_functiondef(p.oid)
    ) AS payload
  FROM pg_proc p
  JOIN pg_namespace n ON n.oid = p.pronamespace
  JOIN target_functions tf ON tf.function_name = p.proname
  CROSS JOIN pg_roles grantee
  WHERE n.nspname = 'public'
    AND grantee.rolname IN ('anon', 'authenticated', 'service_role', 'postgres')
  GROUP BY n.nspname, p.oid, p.proname, p.prosecdef, p.proconfig, p.proacl
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
    AND (
      qual ILIKE '%current_user_id_text%'
      OR qual ILIKE '%current_user_email_text%'
      OR qual ILIKE '%is_tree_collaborator%'
      OR qual ILIKE '%is_tree_owner%'
      OR qual ILIKE '%can_edit_tree%'
      OR with_check ILIKE '%current_user_id_text%'
      OR with_check ILIKE '%current_user_email_text%'
      OR with_check ILIKE '%is_tree_collaborator%'
      OR with_check ILIKE '%is_tree_owner%'
      OR with_check ILIKE '%can_edit_tree%'
    )
)
SELECT section, item_name, payload
FROM function_rows
UNION ALL
SELECT section, item_name, payload
FROM policy_rows
ORDER BY section, item_name;

