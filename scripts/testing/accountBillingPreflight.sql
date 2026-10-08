-- Read-only summaries; never return identities, credentials or provider payloads.
BEGIN READ ONLY;
SET LOCAL statement_timeout = '15s';
SELECT jsonb_build_object(
  'localSubscriptionModel', jsonb_build_object(
    'uniqueSubscriptionPerUser', EXISTS (
      SELECT 1 FROM pg_constraint c WHERE c.conrelid = 'public.subscriptions'::regclass
        AND c.contype = 'u' AND pg_get_constraintdef(c.oid) = 'UNIQUE (user_id)'
    ),
    'eventFunctionReplacesIdOnUserConflict', coalesce(pg_get_functiondef(to_regprocedure(
      'public.process_paddle_subscription_event(text,timestamptz,text,text,text,text,text,timestamptz,text)'
    )) ~* 'ON CONFLICT \(user_id\) DO UPDATE SET\s+id = EXCLUDED.id', false)
  ),
  'subscriptions', (SELECT coalesce(jsonb_agg(to_jsonb(summary)), '[]') FROM (
    SELECT status,
      id ~ '^sub_[a-z0-9]{26}$' AS provider_id_format,
      coalesce(paddle_customer_id ~ '^ctm_[a-z0-9]{26}$', false) AS customer_id_format,
      coalesce(plan_id ~ '^pri_[a-z0-9]{26}$', false) AS price_id_format,
      id ~* '(test|mock|fixture)' AS test_like_id,
      count(*) AS records,
      count(*) FILTER (WHERE current_period_end < now()) AS past_period_end,
      min(last_event_occurred_at) AS earliest_event, max(last_event_occurred_at) AS latest_event
    FROM public.subscriptions GROUP BY 1, 2, 3, 4, 5 ORDER BY 1, 2, 3, 4, 5
  ) summary),
  'checkoutActivity', (SELECT jsonb_build_object('users', count(*), 'latestRequestedAt', max(last_requested_at)) FROM private.checkout_rate_limits),
  'processedEvents', (SELECT jsonb_build_object('total', count(*),
    'providerIdFormat', count(*) FILTER (WHERE event_id ~ '^evt_[a-z0-9]{26}$'),
    'latestProcessedAt', max(processed_at)) FROM private.processed_paddle_webhook_events),
  'repositoryFixtureSignature', (SELECT jsonb_build_object(
    'subscriptions', count(*),
    'matchingNativeTestAccounts', count(*) FILTER (WHERE EXISTS (
      SELECT 1 FROM auth.users u WHERE u.id::text = s.user_id
        AND u.email ~ '^test-user-[0-9a-f-]{36}@example\.com$'
    ))) FROM public.subscriptions s
    WHERE s.id ~ '^sub_[0-9a-f-]{36}$'
      AND s.paddle_customer_id ~ '^cust_[0-9a-f-]{36}$'
      AND s.plan_id = 'pro_monthly_price_id'),
  'webhookDiagnostics', (SELECT coalesce(jsonb_agg(to_jsonb(summary)), '[]') FROM (
    SELECT processing_status, count(*) AS records, max(received_at) AS latest_received_at
    FROM public.billing_webhook_diagnostics GROUP BY processing_status ORDER BY processing_status
  ) summary)
) AS billing_preflight;
ROLLBACK;
