-- Migration: Billing and sync safety hardening
-- Description: Applies narrow, idempotent corrections after the SaaS rollout.

BEGIN;

-- Keep checkpoint retention active after the server-side checkpoint migration.
DROP TRIGGER IF EXISTS prune_old_checkpoints_trigger ON public.tree_checkpoints;
CREATE TRIGGER prune_old_checkpoints_trigger
AFTER INSERT ON public.tree_checkpoints
FOR EACH ROW
EXECUTE FUNCTION private.prune_old_checkpoints_and_ops();

-- Serialize tree creation per owner to prevent concurrent Free-tier bypasses.
CREATE OR REPLACE FUNCTION private.enforce_tree_creation_limit()
RETURNS TRIGGER AS $$
DECLARE
  v_tier TEXT;
  v_tree_count INTEGER;
BEGIN
  PERFORM pg_advisory_xact_lock(hashtext(NEW.owner_id));
  v_tier := COALESCE((SELECT tier FROM public.user_profiles WHERE id = NEW.owner_id), 'free');

  IF v_tier = 'free' THEN
    SELECT count(*) INTO v_tree_count FROM public.trees WHERE owner_id = NEW.owner_id;
    IF v_tree_count >= 1 THEN
      RAISE EXCEPTION 'Free tier is limited to 1 family tree. Please upgrade to Pro or Family.';
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, private, pg_temp;

REVOKE EXECUTE ON FUNCTION private.enforce_tree_creation_limit() FROM PUBLIC, anon, authenticated;

-- Allow idempotent UPSERT retries at capacity while rejecting person 101.
CREATE OR REPLACE FUNCTION private.enforce_people_limit()
RETURNS TRIGGER AS $$
DECLARE
  v_owner_id TEXT;
  v_tier TEXT;
  v_people_count INTEGER;
BEGIN
  SELECT owner_id INTO v_owner_id FROM public.trees WHERE id = NEW.tree_id FOR UPDATE;
  v_tier := COALESCE((SELECT tier FROM public.user_profiles WHERE id = v_owner_id), 'free');

  IF v_tier = 'free' AND NOT EXISTS (
    SELECT 1 FROM public.people WHERE id = NEW.id AND tree_id = NEW.tree_id
  ) THEN
    SELECT count(*) INTO v_people_count FROM public.people WHERE tree_id = NEW.tree_id;
    IF v_people_count >= 100 THEN
      RAISE EXCEPTION 'Free tier limit reached. Please upgrade to add more family members.' USING ERRCODE = 'P0001';
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, private, pg_temp;

REVOKE EXECUTE ON FUNCTION private.enforce_people_limit() FROM PUBLIC, anon, authenticated;

-- The legacy operation trigger rejected person 100 after the people insert.
DROP TRIGGER IF EXISTS trg_enforce_tree_operations_limit ON public.tree_operations;
DROP FUNCTION IF EXISTS private.enforce_tree_operations_limit();

-- Prevent focus_id from referencing a person in a different tree.
CREATE OR REPLACE FUNCTION private.enforce_tree_focus_integrity()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.focus_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.people WHERE id = NEW.focus_id AND tree_id = NEW.id
  ) THEN
    RAISE EXCEPTION 'Focus person must belong to the same tree.' USING ERRCODE = '23514';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, private, pg_temp;

REVOKE EXECUTE ON FUNCTION private.enforce_tree_focus_integrity() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trg_enforce_tree_focus_integrity ON public.trees;
CREATE TRIGGER trg_enforce_tree_focus_integrity
BEFORE INSERT OR UPDATE OF focus_id ON public.trees
FOR EACH ROW
EXECUTE FUNCTION private.enforce_tree_focus_integrity();

-- Return the accepted batch length instead of a stale ROW_COUNT from the
-- private implementation. The private function still owns atomic execution.
CREATE OR REPLACE FUNCTION public.sync_tree_batch(
  p_ops JSONB
) RETURNS INTEGER AS $$
BEGIN
  IF p_ops IS NULL OR jsonb_typeof(p_ops) <> 'array' OR jsonb_array_length(p_ops) = 0 THEN
    RETURN private.sync_tree_batch(p_ops);
  END IF;

  PERFORM private.sync_tree_batch(p_ops);
  RETURN jsonb_array_length(p_ops);
END;
$$ LANGUAGE plpgsql SECURITY INVOKER SET search_path = public, private, pg_temp;

REVOKE ALL ON FUNCTION public.sync_tree_batch(JSONB) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.sync_tree_batch(JSONB) TO authenticated;

COMMIT;
