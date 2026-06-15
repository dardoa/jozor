-- Trigger functions execute through their bound triggers and do not require
-- direct EXECUTE privileges for browser roles.

BEGIN;

REVOKE ALL ON FUNCTION private.prune_old_checkpoints_and_ops()
  FROM PUBLIC, anon, authenticated;

REVOKE ALL ON FUNCTION private.enforce_collaborator_limits()
  FROM PUBLIC, anon, authenticated;

COMMIT;
