-- Read-only inventory for SECURITY DEFINER redesign planning.
-- Run against the linked project before writing migrations that move/revoke
-- helper functions. This query does not modify schema or data.

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
)
SELECT
  n.nspname AS schema_name,
  p.proname AS function_name,
  pg_get_function_identity_arguments(p.oid) AS arguments,
  CASE
    WHEN p.prosecdef THEN 'SECURITY DEFINER'
    ELSE 'SECURITY INVOKER'
  END AS security_mode,
  p.proconfig AS function_config,
  p.proacl AS raw_acl,
  array_agg(DISTINCT grantee.rolname ORDER BY grantee.rolname)
    FILTER (WHERE has_function_privilege(grantee.oid, p.oid, 'EXECUTE')) AS execute_grantees,
  pg_get_functiondef(p.oid) AS function_definition
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
JOIN target_functions tf ON tf.function_name = p.proname
CROSS JOIN pg_roles grantee
WHERE n.nspname = 'public'
  AND grantee.rolname IN ('anon', 'authenticated', 'service_role', 'postgres')
GROUP BY n.nspname, p.oid, p.proname, p.prosecdef, p.proconfig, p.proacl
ORDER BY p.proname, arguments;

SELECT
  schemaname,
  tablename,
  policyname,
  cmd,
  roles,
  qual,
  with_check
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
ORDER BY tablename, policyname;
