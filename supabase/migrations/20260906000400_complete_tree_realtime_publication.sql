-- Hosted projects may have these tables enabled manually. Fresh environments
-- must reproduce the same editor/permission feeds without dashboard steps.
DO $$
DECLARE v_table TEXT;
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime' AND NOT puballtables) THEN
    FOREACH v_table IN ARRAY ARRAY['tree_operations', 'tree_collaborators', 'tree_change_signals'] LOOP
      IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime'
          AND schemaname = 'public' AND tablename = v_table) THEN
        EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE public.%I', v_table);
      END IF;
    END LOOP;
  END IF;
END $$;
