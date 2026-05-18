-- Migration: Add Reply Support to Tree Discussions
-- Description: Adds fields to support quoting and replying to messages.

BEGIN;

ALTER TABLE public.tree_discussions 
  ADD COLUMN IF NOT EXISTS reply_to_message_id UUID REFERENCES public.tree_discussions(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS reply_to_user_name TEXT,
  ADD COLUMN IF NOT EXISTS reply_to_content TEXT;

COMMIT;
