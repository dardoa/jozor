-- Legacy Google Drive sharing has been disabled in the application.
-- Google Drive remains available for personal backup/sync, but shared-tree
-- authorization now flows through trees + tree_collaborators only.

ALTER TABLE public.tree_shares
  DROP COLUMN IF EXISTS drive_file_id;
