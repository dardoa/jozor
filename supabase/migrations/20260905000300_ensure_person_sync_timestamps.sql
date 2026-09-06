-- Fresh core schemas omitted timestamps consumed by the existing sync RPCs.
-- Preserve deployed columns and their values; do not replay historical RPCs.
BEGIN;
ALTER TABLE public.people
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
COMMIT;
NOTIFY pgrst, 'reload schema';
