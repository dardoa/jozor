BEGIN;

CREATE TABLE IF NOT EXISTS public.push_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  endpoint TEXT NOT NULL,
  keys JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_push_subscriptions_user_id
  ON public.push_subscriptions(user_id);

CREATE UNIQUE INDEX IF NOT EXISTS uq_push_subscriptions_endpoint
  ON public.push_subscriptions(endpoint);

CREATE OR REPLACE FUNCTION public.set_push_subscriptions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_push_subscriptions_updated_at ON public.push_subscriptions;

CREATE TRIGGER trg_push_subscriptions_updated_at
BEFORE UPDATE ON public.push_subscriptions
FOR EACH ROW
EXECUTE FUNCTION public.set_push_subscriptions_updated_at();

ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "push_subscriptions_owner_all" ON public.push_subscriptions;

CREATE POLICY "push_subscriptions_owner_all" ON public.push_subscriptions
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

COMMIT;

NOTIFY pgrst, 'reload schema';
