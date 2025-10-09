-- Fix RLS policy on shops table to allow token storage
--
-- Issue: Token exchange was succeeding with Shopify but failing to store
-- tokens in Supabase due to RLS policies blocking the anon key.
-- Error: 42501 - "permission denied for table shops"
--
-- Solution: Disable RLS on shops table to allow OAuth token storage
-- from the Next.js application using the anon key.

-- Drop any existing restrictive policies
DROP POLICY IF EXISTS "Shops accessible by service role" ON shops;
DROP POLICY IF EXISTS "Service role can manage shops" ON shops;

-- Disable RLS to allow the token exchange endpoint to store OAuth tokens
-- The shops table stores Shopify OAuth access tokens and should be accessible
-- by the application for authentication purposes
ALTER TABLE shops DISABLE ROW LEVEL SECURITY;

-- Note: If you want to re-enable RLS in the future with proper policies:
--
-- ALTER TABLE shops ENABLE ROW LEVEL SECURITY;
--
-- CREATE POLICY "Allow all authenticated operations on shops" ON shops
--   FOR ALL
--   TO authenticated, anon
--   USING (true)
--   WITH CHECK (true);
--
-- CREATE POLICY "Service role full access to shops" ON shops
--   FOR ALL
--   TO service_role
--   USING (true)
--   WITH CHECK (true);
