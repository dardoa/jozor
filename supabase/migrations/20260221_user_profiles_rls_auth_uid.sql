-- RLS: Restrict user_profiles so users can only access their own row.
-- Uses auth.uid() for JWT 'sub' claim (works when Supabase JWT sub = Firebase UID).
-- For non-UUID Firebase UIDs, auth.jwt() ->> 'sub' is used as fallback so id (TEXT) matches.

-- Drop existing permissive policies
DROP POLICY IF EXISTS "Users can view own profile" ON public.user_profiles;
DROP POLICY IF EXISTS "Users can manage own profile" ON public.user_profiles;

-- Helper: current user id from JWT (sub claim as text)
-- auth.uid()::text works when sub is UUID; (auth.jwt() ->> 'sub') works for any string (e.g. Firebase UID)
CREATE OR REPLACE FUNCTION public.current_user_id_text()
RETURNS TEXT AS $$
  SELECT auth.jwt() ->> 'sub';
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- SELECT: only own profile
CREATE POLICY "Users can view own profile"
ON public.user_profiles FOR SELECT
USING (id = public.current_user_id_text());

-- INSERT: only for own id (e.g. on first sign-up)
CREATE POLICY "Users can insert own profile"
ON public.user_profiles FOR INSERT
WITH CHECK (id = public.current_user_id_text());

-- UPDATE: only own profile
CREATE POLICY "Users can update own profile"
ON public.user_profiles FOR UPDATE
USING (id = public.current_user_id_text())
WITH CHECK (id = public.current_user_id_text());

-- DELETE: only own profile
CREATE POLICY "Users can delete own profile"
ON public.user_profiles FOR DELETE
USING (id = public.current_user_id_text());

NOTIFY pgrst, 'reload schema';
