BEGIN;

CREATE TABLE IF NOT EXISTS public.push_reminder_deliveries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  dedupe_key TEXT NOT NULL,
  notification_type TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_push_reminder_deliveries_user_dedupe
  ON public.push_reminder_deliveries(user_id, dedupe_key);

CREATE INDEX IF NOT EXISTS idx_push_reminder_deliveries_created_at
  ON public.push_reminder_deliveries(created_at DESC);

ALTER TABLE public.push_reminder_deliveries ENABLE ROW LEVEL SECURITY;

COMMIT;

NOTIFY pgrst, 'reload schema';
