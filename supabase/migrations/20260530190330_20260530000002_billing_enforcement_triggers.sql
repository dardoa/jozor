BEGIN;

-- 1. Trigger to enforce max 1 tree for Free tier
CREATE OR REPLACE FUNCTION private.enforce_tree_creation_limit()
RETURNS TRIGGER AS $$
DECLARE
  v_tier TEXT;
  v_tree_count INTEGER;
BEGIN
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

DROP TRIGGER IF EXISTS trg_enforce_tree_creation_limit ON public.trees;
CREATE TRIGGER trg_enforce_tree_creation_limit
BEFORE INSERT ON public.trees
FOR EACH ROW
EXECUTE FUNCTION private.enforce_tree_creation_limit();


-- 2. Trigger to enforce max 100 people in people table for Free tier (silently ignores insertions)
CREATE OR REPLACE FUNCTION private.enforce_people_limit()
RETURNS TRIGGER AS $$
DECLARE
  v_owner_id TEXT;
  v_tier TEXT;
  v_people_count INTEGER;
BEGIN
  SELECT owner_id INTO v_owner_id FROM public.trees WHERE id = NEW.tree_id;
  v_tier := COALESCE((SELECT tier FROM public.user_profiles WHERE id = v_owner_id), 'free');
  
  IF v_tier = 'free' THEN
    SELECT count(*) INTO v_people_count FROM public.people WHERE tree_id = NEW.tree_id;
    IF v_people_count >= 100 THEN
      -- Return NULL to silently ignore the insert and avoid crashing offline sync replication
      RETURN NULL;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, private, pg_temp;

DROP TRIGGER IF EXISTS trg_enforce_people_limit ON public.people;
CREATE TRIGGER trg_enforce_people_limit
BEFORE INSERT ON public.people
FOR EACH ROW
EXECUTE FUNCTION private.enforce_people_limit();


-- 3. Trigger to enforce max 100 people in tree_operations table for Free tier (silently ignores ADD_NODE operations)
CREATE OR REPLACE FUNCTION private.enforce_tree_operations_limit()
RETURNS TRIGGER AS $$
DECLARE
  v_owner_id TEXT;
  v_tier TEXT;
  v_people_count INTEGER;
BEGIN
  IF NEW.type = 'ADD_NODE' THEN
    SELECT owner_id INTO v_owner_id FROM public.trees WHERE id = NEW.tree_id;
    v_tier := COALESCE((SELECT tier FROM public.user_profiles WHERE id = v_owner_id), 'free');
    
    IF v_tier = 'free' THEN
      SELECT count(*) INTO v_people_count FROM public.people WHERE tree_id = NEW.tree_id;
      IF v_people_count >= 100 THEN
        -- Return NULL to silently ignore the operation insert and avoid crashing offline sync replication
        RETURN NULL;
      END IF;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, private, pg_temp;

DROP TRIGGER IF EXISTS trg_enforce_tree_operations_limit ON public.tree_operations;
CREATE TRIGGER trg_enforce_tree_operations_limit
BEFORE INSERT ON public.tree_operations
FOR EACH ROW
EXECUTE FUNCTION private.enforce_tree_operations_limit();


-- 4. Trigger to enforce collaborator and invitation limits
CREATE OR REPLACE FUNCTION private.enforce_collaborator_limits()
RETURNS TRIGGER AS $$
DECLARE
  v_owner_id TEXT;
  v_tier TEXT;
  v_active_count INTEGER;
  v_pending_count INTEGER;
BEGIN
  SELECT owner_id INTO v_owner_id FROM public.trees WHERE id = NEW.tree_id;
  v_tier := COALESCE((SELECT tier FROM public.user_profiles WHERE id = v_owner_id), 'free');
  
  IF v_tier = 'family' THEN
    RETURN NEW;
  END IF;
  
  -- Count active collaborators
  SELECT count(*) INTO v_active_count FROM public.tree_collaborators WHERE tree_id = NEW.tree_id;
  
  -- Count pending invitations
  SELECT count(*) INTO v_pending_count FROM public.tree_invitations 
  WHERE tree_id = NEW.tree_id AND status = 'pending' AND expires_at > NOW();
  
  IF v_tier = 'free' THEN
    RAISE EXCEPTION 'Free tier trees cannot have collaborators. Please upgrade to Pro or Family.';
  ELSIF v_tier = 'pro' THEN
    IF (v_active_count + v_pending_count) >= 1 THEN
      RAISE EXCEPTION 'Pro tier trees are limited to exactly 1 Co-Editor. Please upgrade to Family for unlimited collaborators.';
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, private, pg_temp;

DROP TRIGGER IF EXISTS trg_enforce_collaborator_limits ON public.tree_collaborators;
CREATE TRIGGER trg_enforce_collaborator_limits
BEFORE INSERT ON public.tree_collaborators
FOR EACH ROW
EXECUTE FUNCTION private.enforce_collaborator_limits();

DROP TRIGGER IF EXISTS trg_enforce_invitation_limits ON public.tree_invitations;
CREATE TRIGGER trg_enforce_invitation_limits
BEFORE INSERT ON public.tree_invitations
FOR EACH ROW
EXECUTE FUNCTION private.enforce_collaborator_limits();

COMMIT;

NOTIFY pgrst, 'reload schema';;
