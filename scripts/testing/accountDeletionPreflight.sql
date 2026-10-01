-- Read-only, aggregate-only hosted preflight. Does not execute deletion RPCs.
BEGIN READ ONLY;
SET LOCAL statement_timeout = '15s';
SELECT jsonb_build_object(
  'queueMigrationPresent', to_regclass('private.account_deletion_jobs') IS NOT NULL,
  'sessionMigrationPresent', to_regclass('private.account_session_generations') IS NOT NULL,
  'billingEventFunctionPresent', to_regprocedure('public.process_paddle_subscription_event(text,timestamptz,text,text,text,text,text,timestamptz,text)') IS NOT NULL,
  'treesWithoutOwnerProfile', (SELECT count(*) FROM public.trees t LEFT JOIN public.user_profiles p ON p.id = t.owner_id WHERE p.id IS NULL),
  'nativeOwnersWithoutProfile', (SELECT count(*) FROM auth.users u WHERE EXISTS (
    SELECT 1 FROM public.trees t WHERE t.owner_id = u.id::text
  ) AND NOT EXISTS (SELECT 1 FROM public.user_profiles p WHERE p.id = u.id::text)),
  'missingOwnerCategories', (
    SELECT coalesce(jsonb_agg(to_jsonb(summary)), '[]'::jsonb)
    FROM (
      SELECT
        CASE
          WHEN u.id IS NOT NULL AND u.email ~ '^test-(user|owner|viewer)-[0-9a-f-]+@example[.]com$' THEN 'native-test-email-pattern'
          WHEN u.id IS NOT NULL THEN 'native-other'
          WHEN t.owner_id = 'e2e-user' THEN 'repository-e2e-subject'
          WHEN t.owner_id IN ('mobile-user', 'verify-user') THEN 'legacy-test-like-subject'
          WHEN t.owner_id ~ '^google-[0-9a-f-]{36}$' THEN 'custom-google-test-pattern'
          WHEN t.owner_id ~ '^[0-9]{15,}$' THEN 'custom-numeric-subject'
          ELSE 'custom-other'
        END AS category,
        count(DISTINCT t.owner_id) AS owners,
        count(*) AS trees,
        count(*) FILTER (WHERE t.name ~* '(test|fixture|synthetic|integration)') AS test_named_trees,
        (SELECT count(*) FROM public.people person WHERE person.tree_id = ANY(array_agg(t.id))) AS people
      FROM public.trees t
      LEFT JOIN public.user_profiles p ON p.id = t.owner_id
      LEFT JOIN auth.users u ON u.id::text = t.owner_id
      WHERE p.id IS NULL
      GROUP BY 1
      ORDER BY 1
    ) summary
  ),
  'openSubscriptions', (SELECT count(*) FROM public.subscriptions WHERE status IS DISTINCT FROM 'canceled'),
  'nativeAccountsOwningRetainedObjects', (
    SELECT count(DISTINCT u.id) FROM auth.users u JOIN storage.objects o
      ON coalesce(nullif(to_jsonb(o)->>'owner_id', ''), to_jsonb(o)->>'owner') = u.id::text
    WHERE NOT ((o.bucket_id = 'avatars' AND starts_with(o.name, 'users/' || u.id::text || '/'))
      OR (o.bucket_id IN ('avatars', 'person-media') AND EXISTS (
        SELECT 1 FROM public.trees t WHERE t.owner_id = u.id::text AND t.id::text = split_part(o.name, '/', 1)
      )))
  )
) AS preflight;
ROLLBACK;
