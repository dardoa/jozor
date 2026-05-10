BEGIN;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'tree_invitations'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.tree_invitations;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'activity_logs'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.activity_logs;
  END IF;
END $$;

COMMIT;

NOTIFY pgrst, 'reload schema';
