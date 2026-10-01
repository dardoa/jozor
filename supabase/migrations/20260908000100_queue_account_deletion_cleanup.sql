BEGIN;

-- Deliberately independent of profiles/Auth: work must survive their deletion.
CREATE TABLE private.account_deletion_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id text NOT NULL,
  receipt_hash text UNIQUE CHECK (receipt_hash ~ '^[0-9a-f]{64}$'),
  auth_id uuid,
  tree_ids uuid[] NOT NULL,
  subscription_ids text[] NOT NULL DEFAULT '{}',
  stage text NOT NULL DEFAULT 'storage' CHECK (stage IN ('storage', 'auth', 'complete')),
  requested_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz,
  next_attempt_at timestamptz NOT NULL DEFAULT now(),
  attempts integer NOT NULL DEFAULT 0,
  lease_token uuid,
  lease_until timestamptz,
  last_error_code text CHECK (last_error_code IN ('storage_failed', 'auth_failed'))
);
CREATE UNIQUE INDEX account_deletion_pending_user ON private.account_deletion_jobs(user_id) WHERE completed_at IS NULL;
CREATE INDEX account_deletion_pending_queue ON private.account_deletion_jobs(next_attempt_at, requested_at) WHERE completed_at IS NULL;
CREATE TABLE private.account_deletion_objects (
  job_id uuid NOT NULL REFERENCES private.account_deletion_jobs(id),
  bucket text NOT NULL CHECK (bucket IN ('avatars', 'person-media')),
  object_path text NOT NULL,
  deleted_at timestamptz,
  PRIMARY KEY (job_id, bucket, object_path)
);
CREATE INDEX account_deletion_retired_path ON private.account_deletion_objects(bucket, object_path);
REVOKE ALL ON private.account_deletion_jobs, private.account_deletion_objects FROM PUBLIC, anon, authenticated;

CREATE TABLE private.account_checkout_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id text NOT NULL,
  requested_at timestamptz NOT NULL DEFAULT now(), transaction_id text UNIQUE,
  resolved_at timestamptz
);
CREATE INDEX account_checkout_pending ON private.account_checkout_attempts(user_id) WHERE resolved_at IS NULL;
REVOKE ALL ON private.account_checkout_attempts FROM PUBLIC, anon, authenticated;

CREATE FUNCTION private.inventory_account_deletion_objects(p_job_id uuid)
RETURNS void LANGUAGE sql SECURITY DEFINER SET search_path = '' AS $$
  INSERT INTO private.account_deletion_objects(job_id, bucket, object_path)
  SELECT j.id, o.bucket_id, o.name FROM private.account_deletion_jobs j
  JOIN storage.objects o ON
    (o.bucket_id = 'avatars' AND starts_with(o.name, 'users/' || j.user_id || '/'))
    OR (o.bucket_id IN ('avatars', 'person-media') AND split_part(o.name, '/', 1) = ANY(j.tree_ids::text[]))
  WHERE j.id = p_job_id AND j.completed_at IS NULL
  ON CONFLICT (job_id, bucket, object_path) DO UPDATE SET deleted_at = NULL;
$$;
REVOKE ALL ON FUNCTION private.inventory_account_deletion_objects(uuid) FROM PUBLIC, anon, authenticated;

CREATE FUNCTION private.request_account_deletion(p_receipt_hash text DEFAULT NULL)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE uid text := private.current_user_id_text(); recipient text; job uuid; roots uuid[]; native_id uuid;
BEGIN
  IF uid IS NULL OR uid !~ '^[A-Za-z0-9_-]{1,128}$' THEN RAISE EXCEPTION 'Missing authenticated user'; END IF;
  IF p_receipt_hash IS NOT NULL AND p_receipt_hash !~ '^[0-9a-f]{64}$' THEN RAISE EXCEPTION 'Invalid deletion receipt'; END IF;
  -- Serializes onboarding and tree ownership changes with the inventory boundary.
  PERFORM 1 FROM public.user_profiles WHERE id = uid FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Missing authenticated user'; END IF;
  IF EXISTS (SELECT 1 FROM private.account_checkout_attempts WHERE user_id = uid AND resolved_at IS NULL) THEN
    RAISE EXCEPTION 'ACCOUNT_HAS_PENDING_CHECKOUT';
  END IF;
  PERFORM 1 FROM public.subscriptions WHERE user_id = uid FOR UPDATE;
  IF EXISTS (SELECT 1 FROM public.subscriptions WHERE user_id = uid AND status IS DISTINCT FROM 'canceled') THEN
    RAISE EXCEPTION 'ACCOUNT_HAS_OPEN_SUBSCRIPTION';
  END IF;
  roots := ARRAY(SELECT id FROM public.trees WHERE owner_id = uid ORDER BY id FOR UPDATE);
  SELECT id INTO native_id FROM auth.users WHERE id::text = uid;
  -- Auth cannot remove an owner of retained Storage objects. Refuse admission
  -- before deleting SQL data; never erase another owner's tree to work around it.
  IF native_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM storage.objects o
    WHERE coalesce(nullif(to_jsonb(o)->>'owner_id', ''), to_jsonb(o)->>'owner') = uid
      AND NOT ((o.bucket_id = 'avatars' AND starts_with(o.name, 'users/' || uid || '/'))
        OR (o.bucket_id IN ('avatars', 'person-media') AND split_part(o.name, '/', 1) = ANY(roots::text[])))
  ) THEN RAISE EXCEPTION 'ACCOUNT_HAS_RETAINED_UPLOADS'; END IF;
  INSERT INTO private.account_deletion_jobs(user_id, auth_id, tree_ids, receipt_hash, subscription_ids)
    VALUES (uid, native_id, roots, p_receipt_hash, ARRAY(SELECT id::text FROM public.subscriptions WHERE user_id = uid)) RETURNING id INTO job;
  PERFORM private.inventory_account_deletion_objects(job);
  recipient := nullif(lower(auth.jwt()->>'email'), '');
  DELETE FROM public.tree_collaborators WHERE collaborator_uid = uid OR lower(email) = recipient;
  DELETE FROM public.tree_invitations WHERE invited_uid = uid OR accepted_by = uid OR lower(invited_email) = recipient;
  DELETE FROM public.user_keys WHERE user_id = uid;
  DELETE FROM public.trees WHERE owner_id = uid;
  -- Existing BEFORE DELETE trigger revokes sessions in this same transaction.
  DELETE FROM public.user_profiles WHERE id = uid;
  RETURN job;
END;
$$;
REVOKE ALL ON FUNCTION private.request_account_deletion(text) FROM PUBLIC, anon, authenticated;

CREATE FUNCTION public.request_account_deletion(p_receipt_hash text DEFAULT NULL)
RETURNS uuid LANGUAGE sql SECURITY INVOKER SET search_path = '' AS $$ SELECT private.request_account_deletion(p_receipt_hash); $$;
REVOKE ALL ON FUNCTION public.request_account_deletion(text) FROM PUBLIC, anon, authenticated;

-- A new RPC must not bypass a full or partial pause of the legacy entry points.
-- Missing legacy functions also fail closed. Reopening a paused target is separate.
DO $$
BEGIN
  IF coalesce(has_function_privilege('authenticated', to_regprocedure('private.delete_my_profile_data()'), 'EXECUTE'), false)
     AND coalesce(has_function_privilege('authenticated', to_regprocedure('public.delete_my_profile_data()'), 'EXECUTE'), false) THEN
    GRANT EXECUTE ON FUNCTION private.request_account_deletion(text), public.request_account_deletion(text) TO authenticated;
  END IF;
END;
$$;

-- A high-entropy receipt grants status only, never account or worker authority.
CREATE FUNCTION public.get_account_deletion_status(p_receipt_hash text)
RETURNS text LANGUAGE sql SECURITY DEFINER SET search_path = '' AS $$
  SELECT CASE WHEN completed_at IS NULL THEN 'pending' ELSE 'complete' END
  FROM private.account_deletion_jobs WHERE receipt_hash = p_receipt_hash
    AND requested_at > now() - interval '90 days';
$$;
REVOKE ALL ON FUNCTION public.get_account_deletion_status(text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_account_deletion_status(text) TO service_role;

CREATE FUNCTION public.get_account_deletion_queue_health()
RETURNS jsonb LANGUAGE sql SECURITY DEFINER SET search_path = '' AS $$
  SELECT jsonb_build_object(
    'pendingJobs', count(*) FILTER (WHERE completed_at IS NULL),
    'retryingJobs', count(*) FILTER (WHERE completed_at IS NULL AND last_error_code IS NOT NULL),
    'oldestPendingSeconds', coalesce(greatest(0, extract(epoch FROM now() - min(requested_at) FILTER (WHERE completed_at IS NULL))), 0),
    'pendingCheckoutAttempts', (SELECT count(*) FROM private.account_checkout_attempts WHERE resolved_at IS NULL)
  ) FROM private.account_deletion_jobs;
$$;
REVOKE ALL ON FUNCTION public.get_account_deletion_queue_health() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_account_deletion_queue_health() TO service_role;

CREATE FUNCTION public.begin_account_checkout(p_user_id text)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE attempt uuid;
BEGIN
  PERFORM 1 FROM public.user_profiles WHERE id = p_user_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Account is not active'; END IF;
  IF EXISTS (SELECT 1 FROM private.account_deletion_jobs WHERE user_id = p_user_id AND completed_at IS NULL) THEN
    RAISE EXCEPTION 'ACCOUNT_DELETION_PENDING';
  END IF;
  INSERT INTO private.account_checkout_attempts(user_id) VALUES (p_user_id) RETURNING id INTO attempt;
  RETURN attempt;
END;
$$;
CREATE FUNCTION public.record_account_checkout(p_attempt_id uuid, p_transaction_id text, p_canceled boolean DEFAULT false, p_subscription_id text DEFAULT NULL)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE attempt private.account_checkout_attempts%ROWTYPE;
BEGIN
  SELECT * INTO attempt FROM private.account_checkout_attempts WHERE id = p_attempt_id FOR UPDATE;
  IF NOT FOUND THEN RETURN false; END IF;
  IF p_transaction_id IS NULL OR p_transaction_id !~ '^txn_[a-z0-9]+$'
    OR (attempt.transaction_id IS NOT NULL AND attempt.transaction_id <> p_transaction_id) THEN RETURN false; END IF;
  UPDATE private.account_checkout_attempts SET transaction_id = p_transaction_id,
    resolved_at = CASE WHEN p_canceled OR EXISTS (SELECT 1 FROM public.subscriptions WHERE user_id = attempt.user_id AND id = p_subscription_id)
      THEN now() ELSE resolved_at END WHERE id = p_attempt_id;
  RETURN true;
END;
$$;
CREATE FUNCTION public.get_pending_account_checkouts(p_user_id text)
RETURNS jsonb LANGUAGE sql SECURITY DEFINER SET search_path = '' AS $$
  SELECT coalesce(jsonb_agg(jsonb_build_object('id', id, 'transactionId', transaction_id) ORDER BY requested_at), '[]')
  FROM (SELECT id, transaction_id, requested_at FROM private.account_checkout_attempts
    WHERE user_id = p_user_id AND resolved_at IS NULL ORDER BY requested_at LIMIT 21) attempts;
$$;
REVOKE ALL ON FUNCTION public.begin_account_checkout(text), public.record_account_checkout(uuid, text, boolean, text), public.get_pending_account_checkouts(text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.begin_account_checkout(text), public.record_account_checkout(uuid, text, boolean, text), public.get_pending_account_checkouts(text) TO service_role;

-- Older direct RPC clients must also enqueue cleanup, never bypass it.
CREATE OR REPLACE FUNCTION private.delete_my_profile_data()
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN PERFORM private.request_account_deletion(); END;
$$;

CREATE FUNCTION private.fence_account_deletion_writes()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  IF TG_TABLE_NAME = 'user_profiles' THEN
    IF EXISTS (SELECT 1 FROM private.account_deletion_jobs WHERE user_id = NEW.id AND completed_at IS NULL) THEN
      RAISE EXCEPTION 'ACCOUNT_DELETION_PENDING';
    END IF;
  ELSE
    PERFORM 1 FROM public.user_profiles WHERE id = NEW.owner_id FOR SHARE;
    IF NOT FOUND THEN RAISE EXCEPTION 'Account is not active'; END IF;
    IF EXISTS (SELECT 1 FROM private.account_deletion_jobs WHERE NEW.id = ANY(tree_ids) AND completed_at IS NULL) THEN
      RAISE EXCEPTION 'ACCOUNT_DELETION_PENDING';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION private.fence_account_deletion_writes() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER fence_account_deletion_onboarding BEFORE INSERT OR UPDATE OF id ON public.user_profiles
FOR EACH ROW EXECUTE FUNCTION private.fence_account_deletion_writes();
CREATE TRIGGER fence_account_deletion_tree_owner BEFORE INSERT OR UPDATE OF owner_id ON public.trees
FOR EACH ROW EXECUTE FUNCTION private.fence_account_deletion_writes();

-- Exact retired keys cannot be reused by a new account while an old worker is
-- finishing an already-issued request. New uploads must use a new object key.
CREATE FUNCTION private.fence_account_deletion_object_reuse()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  IF EXISTS (SELECT 1 FROM private.account_deletion_objects WHERE bucket = NEW.bucket_id AND object_path = NEW.name) THEN
    RAISE EXCEPTION 'Storage object is retired; use a new object key';
  END IF;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION private.fence_account_deletion_object_reuse() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER fence_account_deletion_object_reuse BEFORE INSERT OR UPDATE ON storage.objects
FOR EACH ROW EXECUTE FUNCTION private.fence_account_deletion_object_reuse();

CREATE FUNCTION public.claim_account_deletion_cleanup(p_job_id uuid DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE job private.account_deletion_jobs%ROWTYPE; batch jsonb;
BEGIN
  SELECT * INTO job FROM private.account_deletion_jobs
    WHERE completed_at IS NULL AND next_attempt_at <= now() AND (lease_until IS NULL OR lease_until < now())
      AND (p_job_id IS NULL OR id = p_job_id)
    ORDER BY next_attempt_at, requested_at, id FOR UPDATE SKIP LOCKED LIMIT 1;
  IF NOT FOUND THEN RETURN NULL; END IF;
  PERFORM private.inventory_account_deletion_objects(job.id);
  SELECT coalesce(jsonb_agg(jsonb_build_object('bucket', bucket, 'path', object_path) ORDER BY bucket, object_path), '[]')
    INTO batch FROM (SELECT bucket, object_path FROM private.account_deletion_objects
      WHERE job_id = job.id AND deleted_at IS NULL ORDER BY bucket, object_path LIMIT 100) objects;
  UPDATE private.account_deletion_jobs SET
    lease_token = gen_random_uuid(), lease_until = now() + interval '5 minutes', attempts = attempts + 1,
    stage = CASE WHEN jsonb_array_length(batch) > 0 THEN 'storage' ELSE 'auth' END
    WHERE id = job.id RETURNING * INTO job;
  RETURN jsonb_build_object('id', job.id, 'userId', job.user_id, 'authId', job.auth_id, 'treeIds', job.tree_ids,
    'stage', job.stage, 'leaseToken', job.lease_token, 'objects', batch);
END;
$$;

CREATE FUNCTION public.finish_account_deletion_cleanup(p_job_id uuid, p_lease_token uuid)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE job private.account_deletion_jobs%ROWTYPE;
BEGIN
  SELECT * INTO job FROM private.account_deletion_jobs WHERE id = p_job_id FOR UPDATE;
  IF NOT FOUND OR job.completed_at IS NOT NULL OR p_lease_token IS NULL OR job.lease_token IS NULL
    OR job.lease_until IS NULL OR job.lease_token IS DISTINCT FROM p_lease_token OR job.lease_until <= now() THEN RETURN false; END IF;
  IF job.stage = 'storage' THEN
    IF EXISTS (SELECT 1 FROM (SELECT bucket, object_path FROM private.account_deletion_objects
        WHERE job_id = job.id AND deleted_at IS NULL ORDER BY bucket, object_path LIMIT 100) batch
      JOIN storage.objects o ON o.bucket_id = batch.bucket AND o.name = batch.object_path) THEN RETURN false; END IF;
    UPDATE private.account_deletion_objects SET deleted_at = now() WHERE (job_id, bucket, object_path) IN
      (SELECT job_id, bucket, object_path FROM private.account_deletion_objects WHERE job_id = job.id AND deleted_at IS NULL
        ORDER BY bucket, object_path LIMIT 100);
  ELSE
    IF job.auth_id IS NOT NULL AND EXISTS (SELECT 1 FROM auth.users WHERE id = job.auth_id) THEN RETURN false; END IF;
    PERFORM private.inventory_account_deletion_objects(job.id);
    IF EXISTS (SELECT 1 FROM private.account_deletion_objects WHERE job_id = job.id AND deleted_at IS NULL) THEN RETURN false; END IF;
    UPDATE private.account_deletion_jobs SET completed_at = now(), stage = 'complete' WHERE id = job.id;
  END IF;
  UPDATE private.account_deletion_jobs SET lease_token = NULL, lease_until = NULL,
    next_attempt_at = now(), last_error_code = NULL WHERE id = job.id;
  RETURN true;
END;
$$;

CREATE FUNCTION public.retry_account_deletion_cleanup(p_job_id uuid, p_lease_token uuid)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  UPDATE private.account_deletion_jobs SET lease_token = NULL, lease_until = NULL,
    next_attempt_at = now() + make_interval(secs => least(3600, 30 * power(2, least(attempts, 6))::integer)),
    last_error_code = CASE WHEN stage = 'auth' THEN 'auth_failed' ELSE 'storage_failed' END
    WHERE id = p_job_id AND lease_token = p_lease_token AND completed_at IS NULL AND lease_until > now();
  RETURN FOUND;
END;
$$;
REVOKE ALL ON FUNCTION public.claim_account_deletion_cleanup(uuid), public.finish_account_deletion_cleanup(uuid, uuid),
  public.retry_account_deletion_cleanup(uuid, uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.claim_account_deletion_cleanup(uuid), public.finish_account_deletion_cleanup(uuid, uuid),
  public.retry_account_deletion_cleanup(uuid, uuid) TO service_role;

COMMIT;
NOTIFY pgrst, 'reload schema';
