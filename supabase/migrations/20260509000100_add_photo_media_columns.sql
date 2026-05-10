-- Migration: Add Photo Media Columns to People
-- Description: Adds missing photo_path and photo_version columns to support 
--              advanced media synchronization in Jozor 2.0.0.

BEGIN;

ALTER TABLE public.people
  ADD COLUMN IF NOT EXISTS photo_path TEXT,
  ADD COLUMN IF NOT EXISTS photo_version INTEGER DEFAULT 0;

COMMIT;

NOTIFY pgrst, 'reload schema';
