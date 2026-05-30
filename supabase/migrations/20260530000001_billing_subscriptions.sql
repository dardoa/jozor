-- Migration: Billing Subscriptions Schema
-- Description: Adds 'tier' to user_profiles, creates subscriptions and ai_monthly_usage tables, and configures RLS.

BEGIN;

-- 1. Add tier column to public.user_profiles
ALTER TABLE public.user_profiles
  ADD COLUMN IF NOT EXISTS tier TEXT NOT NULL DEFAULT 'free',
  ADD CONSTRAINT chk_user_profiles_tier CHECK (tier IN ('free', 'pro', 'family'));

-- 2. Create public.subscriptions table
CREATE TABLE IF NOT EXISTS public.subscriptions (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
    paddle_customer_id TEXT,
    status TEXT NOT NULL,
    plan_id TEXT NOT NULL,
    current_period_end TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_subscriptions_user_id UNIQUE (user_id)
);

-- Create index on subscriptions user_id
CREATE INDEX IF NOT EXISTS idx_subscriptions_user_id ON public.subscriptions(user_id);

-- 3. Create public.ai_monthly_usage table
CREATE TABLE IF NOT EXISTS public.ai_monthly_usage (
    user_id TEXT PRIMARY KEY REFERENCES public.user_profiles(id) ON DELETE CASCADE,
    cloud_requests_used INTEGER NOT NULL DEFAULT 0,
    cloud_requests_limit INTEGER NOT NULL DEFAULT 30,
    reset_at TIMESTAMPTZ NOT NULL DEFAULT NOW() + INTERVAL '1 month',
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. Enable RLS
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_monthly_usage ENABLE ROW LEVEL SECURITY;

-- 5. Drop existing policies if they exist
DROP POLICY IF EXISTS "subscriptions_owner_read" ON public.subscriptions;
DROP POLICY IF EXISTS "ai_usage_owner_read" ON public.ai_monthly_usage;

-- 6. Create RLS Policies
CREATE POLICY "subscriptions_owner_read" ON public.subscriptions
    FOR SELECT USING (user_id = public.current_user_id_text());

CREATE POLICY "ai_usage_owner_read" ON public.ai_monthly_usage
    FOR SELECT USING (user_id = public.current_user_id_text());

-- 7. Grant and Revoke Privileges
REVOKE ALL ON public.subscriptions FROM public, anon;
GRANT SELECT ON public.subscriptions TO authenticated;
GRANT ALL ON public.subscriptions TO service_role;

REVOKE ALL ON public.ai_monthly_usage FROM public, anon;
GRANT SELECT ON public.ai_monthly_usage TO authenticated;
GRANT ALL ON public.ai_monthly_usage TO service_role;

COMMIT;

NOTIFY pgrst, 'reload schema';
