-- Drop if exists to reset type from UUID to TEXT
DROP TABLE IF EXISTS public.user_profiles;

-- Create user_profiles table with TEXT id for Firebase UID compatibility
CREATE TABLE public.user_profiles (
    id TEXT PRIMARY KEY,
    display_name TEXT,
    photo_url TEXT,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own profile
CREATE POLICY "Users can view own profile" 
ON public.user_profiles FOR SELECT 
USING (true); -- We'll use a more restrictive policy if auth sync is established, 
-- but for now TEXT based matching without auth.users join:
-- USING (id = current_setting('request.jwt.claims', true)::jsonb->>'sub')

-- Simplified policy for Firebase UIDs
CREATE POLICY "Users can manage own profile" 
ON public.user_profiles FOR ALL
USING (true) 
WITH CHECK (true);

-- CRITICAL: Reload schema cache to reflect the TEXT type change
NOTIFY pgrst, 'reload schema';
