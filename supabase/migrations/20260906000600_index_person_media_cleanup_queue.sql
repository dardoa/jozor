CREATE INDEX person_media_cleanup_claimed_tree_idx
  ON private.person_media_cleanup(tree_id) WHERE claimed_at IS NOT NULL;
CREATE INDEX person_media_cleanup_pending_idx
  ON private.person_media_cleanup(checked_at NULLS FIRST, requested_at, object_path)
  WHERE completed_at IS NULL;
