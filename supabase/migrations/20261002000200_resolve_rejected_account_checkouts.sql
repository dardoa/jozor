BEGIN;

ALTER TABLE private.account_checkout_attempts ADD COLUMN resolution_reason TEXT
  CHECK (resolution_reason IS NULL OR resolution_reason = 'rejected');

CREATE FUNCTION public.resolve_rejected_account_checkout(p_user_id TEXT, p_attempt_id UUID)
RETURNS BOOLEAN LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE v_attempt private.account_checkout_attempts%ROWTYPE;
BEGIN
  IF p_user_id IS NULL OR p_attempt_id IS NULL THEN RETURN false; END IF;
  PERFORM 1 FROM public.user_profiles WHERE id = p_user_id FOR UPDATE;
  IF NOT FOUND THEN RETURN false; END IF;
  SELECT * INTO v_attempt FROM private.account_checkout_attempts
    WHERE id = p_attempt_id AND user_id = p_user_id FOR UPDATE;
  IF NOT FOUND OR v_attempt.transaction_id IS NOT NULL THEN RETURN false; END IF;
  IF v_attempt.resolution_reason = 'rejected' THEN RETURN v_attempt.resolved_at IS NOT NULL; END IF;
  IF v_attempt.resolved_at IS NOT NULL OR v_attempt.resolution_reason IS NOT NULL THEN RETURN false; END IF;
  UPDATE private.account_checkout_attempts SET resolution_reason = 'rejected', resolved_at = now()
    WHERE id = p_attempt_id;
  RETURN true;
END;
$$;
REVOKE ALL ON FUNCTION public.resolve_rejected_account_checkout(TEXT,UUID) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.resolve_rejected_account_checkout(TEXT,UUID) TO service_role;

CREATE OR REPLACE FUNCTION public.record_account_checkout(p_attempt_id UUID, p_transaction_id TEXT,
  p_canceled BOOLEAN DEFAULT false, p_subscription_id TEXT DEFAULT NULL)
RETURNS BOOLEAN LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE attempt private.account_checkout_attempts%ROWTYPE;
BEGIN
  SELECT * INTO attempt FROM private.account_checkout_attempts WHERE id = p_attempt_id FOR UPDATE;
  IF NOT FOUND OR attempt.resolution_reason = 'rejected' THEN RETURN false; END IF;
  IF p_transaction_id IS NULL OR p_transaction_id !~ '^txn_[a-z0-9]+$'
    OR (attempt.transaction_id IS NOT NULL AND attempt.transaction_id <> p_transaction_id) THEN RETURN false; END IF;
  UPDATE private.account_checkout_attempts SET transaction_id = p_transaction_id,
    resolved_at = CASE WHEN p_canceled OR EXISTS (
      SELECT 1 FROM public.subscriptions WHERE user_id = attempt.user_id AND id = p_subscription_id
    ) THEN now() ELSE resolved_at END WHERE id = p_attempt_id;
  RETURN true;
END;
$$;
REVOKE ALL ON FUNCTION public.record_account_checkout(UUID,TEXT,BOOLEAN,TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.record_account_checkout(UUID,TEXT,BOOLEAN,TEXT) TO service_role;

COMMIT;
NOTIFY pgrst, 'reload schema';
