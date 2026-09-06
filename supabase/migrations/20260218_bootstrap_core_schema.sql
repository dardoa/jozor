-- Migration: Bootstrap Core Schema
-- Description: Creates the foundational Supabase schema required by the
--              application in fresh environments before later incremental
--              migrations add security, RPCs, and hardening.

BEGIN;
CREATE EXTENSION IF NOT EXISTS pgcrypto;
-- Fresh installations need this before the first ownership policies. Existing
-- deployments may already use the later private-schema wrapper; leave it intact.
DO $bootstrap$
BEGIN
  IF to_regprocedure('public.current_user_id_text()') IS NULL THEN
    EXECUTE $definition$
      CREATE FUNCTION public.current_user_id_text()
      RETURNS text LANGUAGE sql STABLE SECURITY INVOKER
      SET search_path = ''
      AS $body$ SELECT auth.jwt() ->> 'sub' $body$
    $definition$;
  END IF;
END;
$bootstrap$;
-- =========================================================
-- Core tables
-- =========================================================

CREATE TABLE IF NOT EXISTS public.trees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id TEXT NOT NULL,
  name TEXT NOT NULL,
  is_public BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS public.people (
  id TEXT PRIMARY KEY,
  tree_id UUID NOT NULL REFERENCES public.trees(id) ON DELETE CASCADE,
  first_name TEXT,
  last_name TEXT,
  middle_name TEXT,
  birth_name TEXT,
  nick_name TEXT,
  suffix TEXT,
  gender TEXT,
  birth_date DATE,
  death_date DATE,
  birth_place TEXT,
  death_place TEXT,
  bio TEXT,
  profession TEXT,
  company TEXT,
  interests TEXT,
  photo_url TEXT,
  email TEXT,
  website TEXT,
  blog TEXT,
  address TEXT,
  custom_fields JSONB NOT NULL DEFAULT '{}'::jsonb,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb
);
ALTER TABLE public.trees
  ADD COLUMN IF NOT EXISTS focus_id TEXT,
  ADD COLUMN IF NOT EXISTS settings JSONB NOT NULL DEFAULT '{}'::jsonb;
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'trees_focus_id_fkey'
  ) THEN
    ALTER TABLE public.trees
      ADD CONSTRAINT trees_focus_id_fkey
      FOREIGN KEY (focus_id) REFERENCES public.people(id) ON DELETE SET NULL;
  END IF;
END $$;
CREATE TABLE IF NOT EXISTS public.relationships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tree_id UUID NOT NULL REFERENCES public.trees(id) ON DELETE CASCADE,
  person_id TEXT NOT NULL REFERENCES public.people(id) ON DELETE CASCADE,
  relative_id TEXT NOT NULL REFERENCES public.people(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS public.tree_operations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tree_id UUID NOT NULL REFERENCES public.trees(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL,
  type TEXT NOT NULL,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  version_seq BIGINT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS public.tree_collaborators (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tree_id UUID NOT NULL REFERENCES public.trees(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  collaborator_uid TEXT,
  role TEXT NOT NULL,
  invited_by TEXT,
  invited_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS public.tree_shares (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tree_id UUID NOT NULL REFERENCES public.trees(id) ON DELETE CASCADE,
  owner_uid TEXT NOT NULL,
  drive_file_id TEXT,
  collaborators JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS public.user_profiles (
  id TEXT PRIMARY KEY,
  display_name TEXT,
  photo_url TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS public.user_keys (
  user_id TEXT PRIMARY KEY,
  google_refresh_token TEXT NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS public.activity_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tree_id UUID NOT NULL REFERENCES public.trees(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL,
  user_email TEXT NOT NULL,
  action_type TEXT NOT NULL,
  details JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
-- =========================================================
-- Indexes and uniqueness
-- =========================================================

CREATE INDEX IF NOT EXISTS idx_trees_owner_id ON public.trees(owner_id);
CREATE INDEX IF NOT EXISTS idx_trees_created_at ON public.trees(created_at);
CREATE INDEX IF NOT EXISTS idx_people_tree_id ON public.people(tree_id);
CREATE INDEX IF NOT EXISTS idx_people_tree_id_first_name ON public.people(tree_id, first_name);
CREATE INDEX IF NOT EXISTS idx_relationships_tree_id ON public.relationships(tree_id);
CREATE INDEX IF NOT EXISTS idx_relationships_person_id ON public.relationships(person_id);
CREATE INDEX IF NOT EXISTS idx_relationships_relative_id ON public.relationships(relative_id);
CREATE UNIQUE INDEX IF NOT EXISTS uq_relationships_tree_person_relative_type
  ON public.relationships(tree_id, person_id, relative_id, type);
CREATE INDEX IF NOT EXISTS idx_tree_operations_tree_id ON public.tree_operations(tree_id);
CREATE UNIQUE INDEX IF NOT EXISTS uq_tree_operations_tree_version
  ON public.tree_operations(tree_id, version_seq);
CREATE INDEX IF NOT EXISTS idx_tree_collaborators_tree_id ON public.tree_collaborators(tree_id);
CREATE UNIQUE INDEX IF NOT EXISTS uq_tree_collaborators_tree_email
  ON public.tree_collaborators(tree_id, email);
CREATE UNIQUE INDEX IF NOT EXISTS uq_tree_shares_tree_id ON public.tree_shares(tree_id);
CREATE INDEX IF NOT EXISTS idx_tree_shares_owner_uid ON public.tree_shares(owner_uid);
CREATE INDEX IF NOT EXISTS idx_activity_logs_tree_id_created_at
  ON public.activity_logs(tree_id, created_at DESC);
-- =========================================================
-- Storage bucket
-- =========================================================

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'storage'
      AND table_name = 'buckets'
  ) THEN
    INSERT INTO storage.buckets (id, name, public)
    VALUES ('avatars', 'avatars', true)
    ON CONFLICT (id) DO NOTHING;
  END IF;
END $$;
COMMIT;
NOTIFY pgrst, 'reload schema';
