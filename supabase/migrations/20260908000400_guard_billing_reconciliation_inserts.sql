BEGIN;

-- Operator-only maintenance, deliberately not a public/PostgREST write endpoint.
CREATE TABLE private.account_billing_reconciliation_receipts (
  request_id uuid PRIMARY KEY,
  payload_hash text NOT NULL CHECK (payload_hash ~ '^[0-9a-f]{64}$'),
  inserted_count integer NOT NULL CHECK (inserted_count BETWEEN 1 AND 20),
  completed_at timestamptz NOT NULL DEFAULT clock_timestamp()
);
REVOKE ALL ON private.account_billing_reconciliation_receipts FROM PUBLIC, anon, authenticated, service_role;

CREATE FUNCTION private.billing_reconciliation_keys(value jsonb, keys text[])
RETURNS boolean LANGUAGE sql IMMUTABLE SET search_path = '' AS $$
  SELECT CASE WHEN jsonb_typeof(value) = 'object'
    THEN value ?& keys AND value - keys = '{}'::jsonb ELSE false END;
$$;
CREATE FUNCTION private.billing_reconciliation_timestamp(value jsonb, nullable boolean DEFAULT false)
RETURNS boolean LANGUAGE plpgsql IMMUTABLE SET search_path = '' AS $$
DECLARE stamp timestamptz;
BEGIN
  IF value = 'null'::jsonb THEN RETURN nullable; END IF;
  IF jsonb_typeof(value) IS DISTINCT FROM 'string' OR (value #>> '{}') !~
    '^\d{4}-\d{2}-\d{2}T([01]\d|2[0-3]):[0-5]\d:[0-5]\d(\.\d{1,6})?(Z|[+-]([01]\d|2[0-3]):[0-5]\d)$'
    THEN RETURN false; END IF;
  stamp := (value #>> '{}')::timestamptz;
  RETURN isfinite(stamp);
EXCEPTION WHEN OTHERS THEN RETURN false;
END;
$$;
REVOKE ALL ON FUNCTION private.billing_reconciliation_keys(jsonb, text[]),
  private.billing_reconciliation_timestamp(jsonb, boolean) FROM PUBLIC, anon, authenticated, service_role;

CREATE FUNCTION private.apply_account_billing_insert_batch(p_batch jsonb)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  account jsonb; item jsonb; key text; expected_keys text[];
  row_keys text[] := ARRAY['id','user_id','paddle_customer_id','status','plan_id',
    'current_period_end','last_event_occurred_at','entitlement_tier'];
  before_row public.subscriptions%ROWTYPE; actual_row public.subscriptions%ROWTYPE;
  profile public.user_profiles%ROWTYPE;
  receipt private.account_billing_reconciliation_receipts%ROWTYPE;
  batch_request_id uuid; fingerprint text; observed timestamptz;
  total integer := 0; claimed integer; strongest text; customer text;
BEGIN
  -- An earlier repeatable-read snapshot could hide a newly committed ledger row
  -- even after taking the maintenance fence. Require fresh statement snapshots.
  IF current_setting('transaction_isolation') <> 'read committed' THEN
    RAISE EXCEPTION 'BILLING_RECONCILIATION_ISOLATION_REQUIRED';
  END IF;
  IF octet_length(p_batch::text) > 262144 OR NOT private.billing_reconciliation_keys(p_batch,
      ARRAY['version','request_id','observed_at','snapshot_fingerprint','price_ids','accounts'])
    OR p_batch->'version' IS DISTINCT FROM '1'::jsonb
    OR jsonb_typeof(p_batch->'request_id') IS DISTINCT FROM 'string'
    OR p_batch->>'request_id' !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
    OR NOT private.billing_reconciliation_timestamp(p_batch->'observed_at')
    OR jsonb_typeof(p_batch->'snapshot_fingerprint') IS DISTINCT FROM 'string'
    OR p_batch->>'snapshot_fingerprint' !~ '^[0-9a-f]{64}$'
    OR NOT private.billing_reconciliation_keys(p_batch->'price_ids', ARRAY['pro','family'])
    OR jsonb_typeof(p_batch->'accounts') IS DISTINCT FROM 'array' THEN
    RAISE EXCEPTION 'INVALID_BILLING_RECONCILIATION';
  END IF;
  IF jsonb_array_length(p_batch->'accounts') NOT BETWEEN 1 AND 10 THEN RAISE EXCEPTION 'INVALID_BILLING_RECONCILIATION'; END IF;
  FOREACH key IN ARRAY ARRAY['pro','family'] LOOP
    IF jsonb_typeof(p_batch->'price_ids'->key) IS DISTINCT FROM 'string'
      OR p_batch->'price_ids'->>key !~ '^pri_[a-z0-9]{26}$' THEN RAISE EXCEPTION 'INVALID_BILLING_RECONCILIATION'; END IF;
  END LOOP;
  IF p_batch->'price_ids'->>'pro' = p_batch->'price_ids'->>'family' THEN RAISE EXCEPTION 'INVALID_BILLING_RECONCILIATION'; END IF;
  observed := (p_batch->>'observed_at')::timestamptz;

  FOR account IN SELECT value FROM jsonb_array_elements(p_batch->'accounts') LOOP
    IF NOT private.billing_reconciliation_keys(account, ARRAY['user_id','tier','updated_at','before','inserts'])
      OR jsonb_typeof(account->'user_id') IS DISTINCT FROM 'string' OR account->>'user_id' !~ '^[A-Za-z0-9_-]{1,128}$'
      OR jsonb_typeof(account->'tier') IS DISTINCT FROM 'string' OR account->>'tier' NOT IN ('free','pro','family')
      OR NOT private.billing_reconciliation_timestamp(account->'updated_at')
      OR jsonb_typeof(account->'before') IS DISTINCT FROM 'array' OR jsonb_typeof(account->'inserts') IS DISTINCT FROM 'array'
      THEN RAISE EXCEPTION 'INVALID_BILLING_RECONCILIATION'; END IF;
    IF jsonb_array_length(account->'before') NOT BETWEEN 1 AND 100 OR jsonb_array_length(account->'inserts') NOT BETWEEN 1 AND 20
      THEN RAISE EXCEPTION 'INVALID_BILLING_RECONCILIATION'; END IF;
    total := total + jsonb_array_length(account->'inserts');
    FOREACH key IN ARRAY ARRAY['before','inserts'] LOOP
      expected_keys := row_keys || CASE WHEN key = 'before' THEN ARRAY['updated_at'] ELSE ARRAY[]::text[] END;
      FOR item IN SELECT value FROM jsonb_array_elements(account->key) LOOP
        IF NOT private.billing_reconciliation_keys(item, expected_keys)
          OR jsonb_typeof(item->'id') IS DISTINCT FROM 'string' OR item->>'id' !~ '^sub_[a-z0-9]{26}$'
          OR item->'user_id' IS DISTINCT FROM account->'user_id'
          OR jsonb_typeof(item->'paddle_customer_id') IS DISTINCT FROM 'string' OR item->>'paddle_customer_id' !~ '^ctm_[a-z0-9]{26}$'
          OR jsonb_typeof(item->'status') IS DISTINCT FROM 'string' OR item->>'status' NOT IN ('active','trialing','paused','past_due','canceled')
          OR jsonb_typeof(item->'plan_id') IS DISTINCT FROM 'string'
          OR item->>'plan_id' NOT IN (p_batch->'price_ids'->>'pro', p_batch->'price_ids'->>'family')
          OR jsonb_typeof(item->'entitlement_tier') IS DISTINCT FROM 'string'
          OR item->>'entitlement_tier' IS DISTINCT FROM (CASE WHEN item->>'status' IN ('active','trialing')
            THEN CASE WHEN item->>'plan_id' = p_batch->'price_ids'->>'pro' THEN 'pro' ELSE 'family' END ELSE 'free' END)
          OR NOT private.billing_reconciliation_timestamp(item->'current_period_end', item->>'status' NOT IN ('active','trialing'))
          OR NOT private.billing_reconciliation_timestamp(item->'last_event_occurred_at', key = 'before')
          OR (key = 'before' AND NOT private.billing_reconciliation_timestamp(item->'updated_at'))
          THEN RAISE EXCEPTION 'INVALID_BILLING_RECONCILIATION'; END IF;
        IF key = 'inserts' AND (item->>'last_event_occurred_at')::timestamptz > observed + interval '30 seconds'
          THEN RAISE EXCEPTION 'INVALID_BILLING_RECONCILIATION'; END IF;
      END LOOP;
    END LOOP;
    IF (SELECT count(DISTINCT value->>'id') FROM jsonb_array_elements((account->'before') || (account->'inserts')))
        <> jsonb_array_length(account->'before') + jsonb_array_length(account->'inserts') THEN
      RAISE EXCEPTION 'INVALID_BILLING_RECONCILIATION';
    END IF;
  END LOOP;
  IF total > 20 OR (SELECT count(DISTINCT value->>'user_id') FROM jsonb_array_elements(p_batch->'accounts'))
    <> jsonb_array_length(p_batch->'accounts') THEN RAISE EXCEPTION 'INVALID_BILLING_RECONCILIATION'; END IF;
  IF (SELECT count(*) <> count(DISTINCT entries.value->>'id') FROM jsonb_array_elements(p_batch->'accounts') a,
    LATERAL jsonb_array_elements((a->'before') || (a->'inserts')) entries) THEN RAISE EXCEPTION 'INVALID_BILLING_RECONCILIATION'; END IF;

  batch_request_id := (p_batch->>'request_id')::uuid;
  fingerprint := encode(sha256(convert_to(p_batch::text, 'UTF8')), 'hex');
  -- Claim and writes share one transaction. Exact retries return a receipt without
  -- replaying inserts or overwriting subsequent webhook updates, even after expiry.
  INSERT INTO private.account_billing_reconciliation_receipts(request_id, payload_hash, inserted_count)
    VALUES (batch_request_id, fingerprint, total) ON CONFLICT DO NOTHING;
  GET DIAGNOSTICS claimed = ROW_COUNT;
  SELECT * INTO receipt FROM private.account_billing_reconciliation_receipts r WHERE r.request_id = batch_request_id;
  IF receipt.payload_hash IS DISTINCT FROM fingerprint THEN RAISE EXCEPTION 'BILLING_RECONCILIATION_REQUEST_CONFLICT'; END IF;
  IF claimed = 0 THEN RETURN jsonb_build_object('requestId', receipt.request_id, 'insertedCount', receipt.inserted_count,
    'completedAt', receipt.completed_at, 'replayed', true); END IF;
  IF observed < clock_timestamp() - interval '5 minutes' OR observed > clock_timestamp() + interval '30 seconds'
    THEN RAISE EXCEPTION 'BILLING_RECONCILIATION_EXPIRED'; END IF;

  -- Short maintenance write fence also covers customer-ownership rows outside the
  -- affected accounts. Fail fast on existing writers/row locks instead of waiting
  -- behind webhook/deletion lock order. No table rows outside the batch are changed.
  LOCK TABLE public.subscriptions IN SHARE ROW EXCLUSIVE MODE NOWAIT;
  FOR account IN SELECT value FROM jsonb_array_elements(p_batch->'accounts') ORDER BY value->>'user_id' LOOP
    SELECT * INTO profile FROM public.user_profiles WHERE id = account->>'user_id' FOR UPDATE NOWAIT;
    IF NOT FOUND OR profile.tier IS DISTINCT FROM account->>'tier'
      OR profile.updated_at IS DISTINCT FROM (account->>'updated_at')::timestamptz THEN RAISE EXCEPTION 'BILLING_RECONCILIATION_STALE'; END IF;
    IF EXISTS (SELECT 1 FROM private.account_deletion_jobs WHERE user_id = profile.id) THEN
      RAISE EXCEPTION 'BILLING_RECONCILIATION_DELETION_FENCE';
    END IF;
    IF EXISTS (SELECT 1 FROM private.account_checkout_attempts WHERE user_id = profile.id AND resolved_at IS NULL) THEN
      RAISE EXCEPTION 'BILLING_RECONCILIATION_PENDING_CHECKOUT';
    END IF;
    IF (SELECT count(*) FROM public.subscriptions WHERE user_id = profile.id) <> jsonb_array_length(account->'before') THEN
      RAISE EXCEPTION 'BILLING_RECONCILIATION_STALE';
    END IF;
    FOR item IN SELECT value FROM jsonb_array_elements(account->'before') LOOP
      SELECT * INTO before_row FROM jsonb_populate_record(NULL::public.subscriptions, item);
      SELECT * INTO actual_row FROM public.subscriptions WHERE id = before_row.id FOR UPDATE NOWAIT;
      IF NOT FOUND OR (actual_row.user_id, actual_row.paddle_customer_id, actual_row.status, actual_row.plan_id,
        actual_row.current_period_end, actual_row.last_event_occurred_at, actual_row.entitlement_tier, actual_row.updated_at)
        IS DISTINCT FROM (before_row.user_id, before_row.paddle_customer_id, before_row.status, before_row.plan_id,
        before_row.current_period_end, before_row.last_event_occurred_at, before_row.entitlement_tier, before_row.updated_at)
        THEN RAISE EXCEPTION 'BILLING_RECONCILIATION_STALE'; END IF;
    END LOOP;
    customer := account->'before'->0->>'paddle_customer_id';
    IF EXISTS (SELECT 1 FROM public.subscriptions WHERE
      (user_id = profile.id AND paddle_customer_id IS DISTINCT FROM customer)
      OR (user_id <> profile.id AND paddle_customer_id = customer)) THEN RAISE EXCEPTION 'BILLING_RECONCILIATION_IDENTITY_CONFLICT'; END IF;
    FOR item IN SELECT value FROM jsonb_array_elements(account->'inserts') LOOP
      IF item->>'paddle_customer_id' IS DISTINCT FROM customer THEN RAISE EXCEPTION 'BILLING_RECONCILIATION_IDENTITY_CONFLICT'; END IF;
      IF EXISTS (SELECT 1 FROM private.account_deletion_jobs WHERE item->>'id' = ANY(subscription_ids)) THEN
        RAISE EXCEPTION 'BILLING_RECONCILIATION_DELETION_FENCE';
      END IF;
      IF EXISTS (SELECT 1 FROM public.subscriptions WHERE id = item->>'id') THEN RAISE EXCEPTION 'BILLING_RECONCILIATION_STALE'; END IF;
      INSERT INTO public.subscriptions(id, user_id, paddle_customer_id, status, plan_id, current_period_end, last_event_occurred_at, entitlement_tier)
        VALUES (item->>'id', profile.id, customer, item->>'status', item->>'plan_id',
          (item->>'current_period_end')::timestamptz, (item->>'last_event_occurred_at')::timestamptz, item->>'entitlement_tier');
    END LOOP;
    SELECT CASE max(CASE WHEN status IN ('active','trialing') THEN CASE entitlement_tier WHEN 'family' THEN 2 WHEN 'pro' THEN 1 ELSE 0 END ELSE 0 END)
      WHEN 2 THEN 'family' WHEN 1 THEN 'pro' ELSE 'free' END INTO strongest FROM public.subscriptions WHERE user_id = profile.id;
    IF strongest IS DISTINCT FROM profile.tier THEN RAISE EXCEPTION 'BILLING_RECONCILIATION_TIER_CHANGE'; END IF;
  END LOOP;
  RETURN jsonb_build_object('requestId', receipt.request_id, 'insertedCount', receipt.inserted_count,
    'completedAt', receipt.completed_at, 'replayed', false);
END;
$$;
REVOKE ALL ON FUNCTION private.apply_account_billing_insert_batch(jsonb) FROM PUBLIC, anon, authenticated, service_role;

COMMIT;
