-- Read-only SECURITY DEFINER boundary check.
-- An empty result means no browser role can directly execute a public
-- SECURITY DEFINER function and no private trigger helper is executable by a
-- browser role with schema access.

WITH browser_roles(role_name) AS (
  VALUES ('anon'::text), ('authenticated'::text)
),
function_boundary AS (
  SELECT
    n.nspname AS schema_name,
    p.oid,
    p.oid::regprocedure::text AS function_signature,
    p.prosecdef,
    EXISTS (
      SELECT 1
      FROM pg_trigger trigger_row
      WHERE trigger_row.tgfoid = p.oid
        AND NOT trigger_row.tgisinternal
    ) AS is_trigger_function
  FROM pg_proc p
  JOIN pg_namespace n ON n.oid = p.pronamespace
  WHERE n.nspname IN ('public', 'private')
)
SELECT
  function_boundary.schema_name,
  function_boundary.function_signature,
  browser_roles.role_name,
  CASE
    WHEN function_boundary.schema_name = 'public'
      THEN 'browser role can execute a public SECURITY DEFINER function'
    ELSE 'browser role can execute a private trigger helper'
  END AS violation
FROM function_boundary
CROSS JOIN browser_roles
WHERE function_boundary.prosecdef
  AND has_function_privilege(
    browser_roles.role_name,
    function_boundary.oid,
    'EXECUTE'
  )
  AND has_schema_privilege(
    browser_roles.role_name,
    function_boundary.schema_name,
    'USAGE'
  )
  AND (
    function_boundary.schema_name = 'public'
    OR function_boundary.is_trigger_function
  )
ORDER BY
  function_boundary.schema_name,
  function_boundary.function_signature,
  browser_roles.role_name;
