BEGIN;

-- Preserve the existing entitlement as provisional legacy evidence. Provider
-- reconciliation is a separate, reviewed operation; this migration deletes none.
ALTER TABLE public.subscriptions ADD COLUMN entitlement_tier text NOT NULL DEFAULT 'free'
  CHECK (entitlement_tier IN ('free', 'pro', 'family'));
UPDATE public.subscriptions s SET entitlement_tier = COALESCE(p.tier, 'free')
  FROM public.user_profiles p WHERE p.id = s.user_id AND s.status IN ('active', 'trialing');
ALTER TABLE public.subscriptions DROP CONSTRAINT uq_subscriptions_user_id;
COMMENT ON COLUMN public.subscriptions.entitlement_tier IS
  'Per-subscription contribution from a verified billing event; migrated values preserve the legacy profile tier until provider reconciliation.';

-- The public entry point retains the deletion/checkout fence from 20260908000200.
CREATE OR REPLACE FUNCTION private.process_paddle_subscription_event_before_deletion_fence(
  p_event_id text, p_occurred_at timestamptz, p_user_id text, p_subscription_id text,
  p_customer_id text, p_status text, p_plan_id text, p_current_period_end timestamptz, p_tier text
) RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  previous public.subscriptions%ROWTYPE;
  inserted_count integer;
  effective_tier text;
  contribution text;
BEGIN
  IF NULLIF(btrim(p_event_id), '') IS NULL OR NULLIF(btrim(p_user_id), '') IS NULL
    OR NULLIF(btrim(p_subscription_id), '') IS NULL OR NULLIF(btrim(p_customer_id), '') IS NULL
    OR NULLIF(btrim(p_plan_id), '') IS NULL OR p_occurred_at IS NULL OR NOT isfinite(p_occurred_at)
    OR p_tier IS NULL OR p_tier NOT IN ('free', 'pro', 'family')
    OR p_status IS NULL OR p_status NOT IN ('active', 'trialing', 'past_due', 'paused', 'canceled')
    OR (p_current_period_end IS NOT NULL AND NOT isfinite(p_current_period_end)) THEN
    RAISE EXCEPTION 'INVALID_SUBSCRIPTION_EVENT';
  END IF;
  contribution := CASE WHEN p_status IN ('active', 'trialing') THEN p_tier ELSE 'free' END;

  INSERT INTO private.processed_paddle_webhook_events (event_id, occurred_at)
    VALUES (p_event_id, p_occurred_at) ON CONFLICT (event_id) DO NOTHING;
  GET DIAGNOSTICS inserted_count = ROW_COUNT;
  IF inserted_count = 0 THEN RETURN false; END IF;

  -- Serialize aggregation even when the first event creates the profile.
  INSERT INTO public.user_profiles (id, tier, created_at, updated_at)
    VALUES (p_user_id, 'free', now(), now()) ON CONFLICT (id) DO NOTHING;
  PERFORM 1 FROM public.user_profiles WHERE id = p_user_id FOR UPDATE;
  SELECT * INTO previous FROM public.subscriptions WHERE id = p_subscription_id FOR UPDATE;
  IF FOUND THEN
    IF previous.user_id IS DISTINCT FROM p_user_id
      OR (previous.paddle_customer_id IS NOT NULL AND previous.paddle_customer_id <> p_customer_id) THEN
      RAISE EXCEPTION 'SUBSCRIPTION_IDENTITY_CONFLICT';
    END IF;
    IF p_occurred_at < previous.last_event_occurred_at THEN RETURN false; END IF;
    IF p_occurred_at = previous.last_event_occurred_at THEN
      IF previous.status = p_status AND previous.plan_id = p_plan_id
        AND previous.paddle_customer_id IS NOT DISTINCT FROM p_customer_id
        AND previous.current_period_end IS NOT DISTINCT FROM p_current_period_end
        AND previous.entitlement_tier = contribution THEN RETURN false; END IF;
      RAISE EXCEPTION 'SUBSCRIPTION_EVENT_TIME_CONFLICT';
    END IF;
  END IF;

  INSERT INTO public.subscriptions AS existing (
    id, user_id, paddle_customer_id, status, plan_id, current_period_end,
    last_event_occurred_at, entitlement_tier, updated_at
  ) VALUES (
    p_subscription_id, p_user_id, p_customer_id, p_status, p_plan_id, p_current_period_end,
    p_occurred_at, contribution, now()
  ) ON CONFLICT (id) DO UPDATE SET
    paddle_customer_id = EXCLUDED.paddle_customer_id, status = EXCLUDED.status,
    plan_id = EXCLUDED.plan_id, current_period_end = EXCLUDED.current_period_end,
    last_event_occurred_at = EXCLUDED.last_event_occurred_at,
    entitlement_tier = EXCLUDED.entitlement_tier, updated_at = now()
  WHERE existing.user_id = EXCLUDED.user_id
    AND (existing.paddle_customer_id IS NULL OR existing.paddle_customer_id = EXCLUDED.paddle_customer_id);
  GET DIAGNOSTICS inserted_count = ROW_COUNT;
  -- A concurrent first event for another owner must not steal an existing ID.
  IF inserted_count = 0 THEN RAISE EXCEPTION 'SUBSCRIPTION_IDENTITY_CONFLICT'; END IF;

  SELECT CASE COALESCE(max(CASE entitlement_tier WHEN 'family' THEN 2 WHEN 'pro' THEN 1 ELSE 0 END), 0)
    WHEN 2 THEN 'family' WHEN 1 THEN 'pro' ELSE 'free' END INTO effective_tier
    FROM public.subscriptions WHERE user_id = p_user_id AND status IN ('active', 'trialing');
  UPDATE public.user_profiles SET tier = effective_tier, updated_at = now() WHERE id = p_user_id;

  -- Usage is per account, not per subscription. Billing events cannot replenish
  -- usage or move an established quota window; reserve_ai_usage_atomic owns resets.
  IF effective_tier IN ('pro', 'family') THEN
    INSERT INTO public.ai_monthly_usage (user_id, cloud_requests_limit, reset_at, updated_at)
      VALUES (p_user_id, 30, now() + interval '1 month', now())
      ON CONFLICT (user_id) DO NOTHING;
  END IF;
  RETURN true;
END;
$$;
REVOKE ALL ON FUNCTION private.process_paddle_subscription_event_before_deletion_fence(text, timestamptz, text, text, text, text, text, timestamptz, text)
  FROM PUBLIC, anon, authenticated, service_role;

COMMIT;
NOTIFY pgrst, 'reload schema';
