CREATE SCHEMA IF NOT EXISTS private;

CREATE TABLE IF NOT EXISTS private.ai_proxy_rate_limits (
  user_id TEXT PRIMARY KEY,
  window_started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  request_count INTEGER NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

REVOKE ALL ON TABLE private.ai_proxy_rate_limits FROM PUBLIC, anon, authenticated;
GRANT ALL ON TABLE private.ai_proxy_rate_limits TO service_role;

CREATE OR REPLACE FUNCTION public.check_ai_proxy_rate_limit(
  p_user_id TEXT,
  p_tier TEXT
)
RETURNS TABLE (
  allowed BOOLEAN,
  request_count INTEGER,
  request_limit INTEGER,
  window_seconds INTEGER,
  retry_after_seconds INTEGER,
  reset_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, private, pg_temp
AS $$
DECLARE
  v_limit INTEGER;
  v_window_seconds INTEGER := 60;
  v_window INTERVAL := INTERVAL '60 seconds';
  v_row private.ai_proxy_rate_limits%ROWTYPE;
  v_reset_at TIMESTAMPTZ;
BEGIN
  IF p_user_id IS NULL OR LENGTH(TRIM(p_user_id)) = 0 THEN
    RAISE EXCEPTION 'user id is required';
  END IF;

  v_limit := CASE LOWER(COALESCE(p_tier, 'free'))
    WHEN 'family' THEN 60
    WHEN 'pro' THEN 12
    ELSE 0
  END;

  IF v_limit <= 0 THEN
    RETURN QUERY SELECT
      FALSE,
      0,
      v_limit,
      v_window_seconds,
      v_window_seconds,
      NOW() + v_window;
    RETURN;
  END IF;

  INSERT INTO private.ai_proxy_rate_limits (user_id, window_started_at, request_count, updated_at)
  VALUES (p_user_id, NOW(), 1, NOW())
  ON CONFLICT (user_id) DO UPDATE
  SET
    window_started_at = CASE
      WHEN private.ai_proxy_rate_limits.window_started_at < NOW() - v_window THEN NOW()
      ELSE private.ai_proxy_rate_limits.window_started_at
    END,
    request_count = CASE
      WHEN private.ai_proxy_rate_limits.window_started_at < NOW() - v_window THEN 1
      ELSE private.ai_proxy_rate_limits.request_count + 1
    END,
    updated_at = NOW()
  RETURNING * INTO v_row;

  v_reset_at := v_row.window_started_at + v_window;

  RETURN QUERY SELECT
    v_row.request_count <= v_limit,
    v_row.request_count,
    v_limit,
    v_window_seconds,
    GREATEST(0, CEIL(EXTRACT(EPOCH FROM (v_reset_at - NOW())))::INTEGER),
    v_reset_at;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.check_ai_proxy_rate_limit(TEXT, TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.check_ai_proxy_rate_limit(TEXT, TEXT) TO service_role;
