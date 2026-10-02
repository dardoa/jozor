BEGIN;

-- Keep the existing subscription/quota transaction, but serialize its entry
-- against deletion and disallow old billing events from resurrecting accounts.
ALTER FUNCTION public.process_paddle_subscription_event(text, timestamptz, text, text, text, text, text, timestamptz, text)
  SET SCHEMA private;
ALTER FUNCTION private.process_paddle_subscription_event(text, timestamptz, text, text, text, text, text, timestamptz, text)
  RENAME TO process_paddle_subscription_event_before_deletion_fence;
REVOKE ALL ON FUNCTION private.process_paddle_subscription_event_before_deletion_fence(text, timestamptz, text, text, text, text, text, timestamptz, text)
  FROM PUBLIC, anon, authenticated, service_role;

CREATE FUNCTION public.process_paddle_subscription_event(
  p_event_id text, p_occurred_at timestamptz, p_user_id text, p_subscription_id text,
  p_customer_id text, p_status text, p_plan_id text, p_current_period_end timestamptz,
  p_tier text, p_checkout_attempt_id text DEFAULT NULL
) RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE last_deletion timestamptz; valid_attempt uuid; processed boolean; profile_exists boolean;
BEGIN
  PERFORM 1 FROM public.user_profiles WHERE id = p_user_id FOR UPDATE;
  profile_exists := FOUND;
  SELECT max(requested_at) INTO last_deletion FROM private.account_deletion_jobs WHERE user_id = p_user_id;
  IF p_checkout_attempt_id ~ '^[0-9a-fA-F-]{36}$' THEN
    SELECT id INTO valid_attempt FROM private.account_checkout_attempts
      WHERE id::text = p_checkout_attempt_id AND user_id = p_user_id
        AND (last_deletion IS NULL OR requested_at > last_deletion);
  END IF;
  IF last_deletion IS NOT NULL THEN
    IF EXISTS (SELECT 1 FROM private.account_deletion_jobs WHERE user_id = p_user_id AND p_subscription_id = ANY(subscription_ids))
      OR p_occurred_at <= last_deletion THEN
      IF p_status = 'canceled' THEN RETURN false; END IF;
      RAISE EXCEPTION 'ACCOUNT_DELETED_BILLING_REVIEW';
    END IF;
    IF NOT profile_exists OR valid_attempt IS NULL THEN RAISE EXCEPTION 'ACCOUNT_DELETED_BILLING_REVIEW'; END IF;
  END IF;
  processed := private.process_paddle_subscription_event_before_deletion_fence(p_event_id, p_occurred_at, p_user_id,
    p_subscription_id, p_customer_id, p_status, p_plan_id, p_current_period_end, p_tier);
  IF processed AND valid_attempt IS NOT NULL THEN
    UPDATE private.account_checkout_attempts SET resolved_at = now() WHERE id = valid_attempt;
  END IF;
  RETURN processed;
END;
$$;
REVOKE ALL ON FUNCTION public.process_paddle_subscription_event(text, timestamptz, text, text, text, text, text, timestamptz, text, text)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.process_paddle_subscription_event(text, timestamptz, text, text, text, text, text, timestamptz, text, text)
  TO service_role;

COMMIT;
NOTIFY pgrst, 'reload schema';
