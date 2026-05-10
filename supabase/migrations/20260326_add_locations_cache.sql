-- Migration: Add Global Locations Cache
-- Description: Creates a global caching table to store geocoded coordinates from Nominatim API
-- to prevent redundant API calls across all users and trees.

-- 1. Create the table
CREATE TABLE IF NOT EXISTS public.locations_cache (
    place_name TEXT PRIMARY KEY,
    resolved_name TEXT,
    lat NUMERIC,
    lng NUMERIC,
    status TEXT NOT NULL,
    last_checked TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Enable RLS
ALTER TABLE public.locations_cache ENABLE ROW LEVEL SECURITY;

-- 3. Policies
-- Allow public read access (any authenticated or anon user can benefit from the cache)
DROP POLICY IF EXISTS "Allow public read access to locations cache" ON public.locations_cache;
CREATE POLICY "Allow public read access to locations cache"
    ON public.locations_cache
    FOR SELECT
    USING (true);

-- Allow authenticated users to insert new locations
DROP POLICY IF EXISTS "Allow authenticated users to insert locations cache" ON public.locations_cache;
CREATE POLICY "Allow authenticated users to insert locations cache"
    ON public.locations_cache
    FOR INSERT
    TO authenticated
    WITH CHECK (true);

-- Allow authenticated users to update locations (e.g. updating 'pending' to 'resolved')
DROP POLICY IF EXISTS "Allow authenticated users to update locations cache" ON public.locations_cache;
CREATE POLICY "Allow authenticated users to update locations cache"
    ON public.locations_cache
    FOR UPDATE
    TO authenticated
    USING (true);
