-- Migration: Add focus_id to trees table (Fixed with TEXT type)
-- Generated on: 2026-02-19

-- Add focus_id column to trees table as TEXT to match people.id
ALTER TABLE trees 
ADD COLUMN IF NOT EXISTS focus_id TEXT REFERENCES people(id) ON DELETE SET NULL;

-- Add comment for documentation
COMMENT ON COLUMN trees.focus_id IS 'The primary person (root) to focus on when loading this tree.';

-- Refresh PostgREST schema cache
NOTIFY pgrst, 'reload schema';
