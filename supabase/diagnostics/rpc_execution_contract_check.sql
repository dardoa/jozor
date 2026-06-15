-- Read-only RPC execution contract check.
-- An empty result means live browser RPCs remain callable by the intended role
-- and retired tree-edit RPCs remain unavailable to browser roles.

WITH expected_contract(
  function_signature,
  role_name,
  should_execute,
  contract_reason
) AS (
  VALUES
    (
      'public.sync_tree_batch(jsonb)',
      'authenticated',
      true,
      'The active delta sync client flushes outgoing operations through this RPC.'
    ),
    (
      'public.sync_tree_batch(jsonb)',
      'anon',
      false,
      'Anonymous users must not mutate tree state.'
    ),
    (
      'public.create_person_and_relationship(uuid,text,jsonb,text,text)',
      'authenticated',
      false,
      'The application no longer uses this legacy tree-edit RPC.'
    ),
    (
      'public.create_person_and_relationship(uuid,text,jsonb,text,text)',
      'anon',
      false,
      'Anonymous users must not execute legacy tree-edit RPCs.'
    ),
    (
      'public.delete_person_and_relations(uuid,text,text)',
      'authenticated',
      false,
      'The application no longer uses this legacy tree-edit RPC.'
    ),
    (
      'public.delete_person_and_relations(uuid,text,text)',
      'anon',
      false,
      'Anonymous users must not execute legacy tree-edit RPCs.'
    )
),
resolved_contract AS (
  SELECT
    expected_contract.*,
    to_regprocedure(expected_contract.function_signature) AS function_oid
  FROM expected_contract
),
actual_contract AS (
  SELECT
    resolved_contract.*,
    CASE
      WHEN resolved_contract.function_oid IS NULL THEN false
      ELSE has_function_privilege(
        resolved_contract.role_name,
        resolved_contract.function_oid,
        'EXECUTE'
      )
    END AS can_execute
  FROM resolved_contract
)
SELECT
  function_signature,
  role_name,
  should_execute,
  can_execute,
  CASE
    WHEN function_oid IS NULL AND should_execute
      THEN 'required RPC is missing'
    WHEN function_oid IS NULL
      THEN 'retired RPC is absent; no privilege violation'
    WHEN can_execute AND NOT should_execute
      THEN 'browser role has unexpected EXECUTE privilege'
    ELSE 'required browser role is missing EXECUTE privilege'
  END AS violation,
  contract_reason
FROM actual_contract
WHERE
  (function_oid IS NULL AND should_execute)
  OR (function_oid IS NOT NULL AND can_execute IS DISTINCT FROM should_execute)
ORDER BY function_signature, role_name;
