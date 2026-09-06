BEGIN;

-- Restrictive policy also closes older permissive/ALL policy combinations.
CREATE POLICY tree_operations_editor_payload_only ON public.tree_operations
  AS RESTRICTIVE FOR SELECT TO authenticated
  USING (private.is_tree_owner(tree_id) OR private.is_tree_collaborator(tree_id, 'editor'));
REVOKE SELECT ON public.tree_operations FROM anon;

CREATE TABLE public.tree_change_signals (
  tree_id UUID PRIMARY KEY REFERENCES public.trees(id) ON DELETE CASCADE,
  revision BIGINT NOT NULL DEFAULT 1
);
ALTER TABLE public.tree_change_signals ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.tree_change_signals FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.tree_change_signals TO authenticated;
CREATE POLICY tree_change_signals_member_read ON public.tree_change_signals FOR SELECT TO authenticated
  USING (private.is_tree_owner(tree_id) OR private.is_tree_collaborator(tree_id, 'viewer'));

CREATE FUNCTION private.emit_tree_change_signal() RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE v_tree UUID;
BEGIN
  v_tree := CASE WHEN TG_OP = 'DELETE' THEN OLD.tree_id ELSE NEW.tree_id END;
  IF EXISTS (SELECT 1 FROM public.trees WHERE id = v_tree) THEN
    INSERT INTO public.tree_change_signals(tree_id) VALUES (v_tree)
    ON CONFLICT (tree_id) DO UPDATE SET revision = public.tree_change_signals.revision + 1;
  END IF;
  RETURN NULL;
END;
$$;
REVOKE ALL ON FUNCTION private.emit_tree_change_signal() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER trg_signal_person_change AFTER INSERT OR UPDATE OR DELETE ON public.people
  FOR EACH ROW EXECUTE FUNCTION private.emit_tree_change_signal();
CREATE TRIGGER trg_signal_relationship_change AFTER INSERT OR UPDATE OR DELETE ON public.relationships
  FOR EACH ROW EXECUTE FUNCTION private.emit_tree_change_signal();
CREATE TRIGGER trg_signal_tree_operation AFTER INSERT ON public.tree_operations
  FOR EACH ROW EXECUTE FUNCTION private.emit_tree_change_signal();

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.tree_change_signals;
  END IF;
END $$;

COMMIT;
NOTIFY pgrst, 'reload schema';
