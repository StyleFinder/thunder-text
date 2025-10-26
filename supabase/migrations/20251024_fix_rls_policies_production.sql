-- ============================================================================
-- Migration: Fix RLS Policies in Production
-- Date: 2025-10-24
-- Description: Replace broken "accessible by all roles" policies with proper
--              store_id isolation policies. The previous migration
--              (20251017_fix_content_center_rls_policies.sql) created insecure
--              policies with USING (true) which allowed all access.
--
-- Security Impact: CRITICAL - Fixes complete lack of multi-tenant isolation
-- ============================================================================

-- Step 1: Drop the broken "accessible by all roles" policies
DROP POLICY IF EXISTS "Content samples accessible by all roles" ON content_samples;
DROP POLICY IF EXISTS "Brand voice profiles accessible by all roles" ON brand_voice_profiles;
DROP POLICY IF EXISTS "Voice profiles accessible by all roles" ON brand_voice_profiles;
DROP POLICY IF EXISTS "Generated content accessible by all roles" ON generated_content;
DROP POLICY IF EXISTS "Shops accessible by service role" ON shops;
DROP POLICY IF EXISTS "Service role can manage voice profiles" ON brand_voice_profiles;
DROP POLICY IF EXISTS "Service role can manage generated content" ON generated_content;

-- Step 2: Enable RLS on shops table (was disabled)
ALTER TABLE shops ENABLE ROW LEVEL SECURITY;

-- Step 3: Create proper RLS policies for content_samples
CREATE POLICY "Shops access own content samples"
  ON content_samples FOR ALL
  TO authenticated
  USING (store_id = auth.uid())
  WITH CHECK (store_id = auth.uid());

CREATE POLICY "Service role full access to content samples"
  ON content_samples FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Step 4: Create proper RLS policies for brand_voice_profiles
CREATE POLICY "Shops access own voice profiles"
  ON brand_voice_profiles FOR ALL
  TO authenticated
  USING (store_id = auth.uid())
  WITH CHECK (store_id = auth.uid());

CREATE POLICY "Service role full access to voice profiles"
  ON brand_voice_profiles FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Step 5: Create proper RLS policies for generated_content
CREATE POLICY "Shops access own generated content"
  ON generated_content FOR ALL
  TO authenticated
  USING (store_id = auth.uid())
  WITH CHECK (store_id = auth.uid());

CREATE POLICY "Service role full access to generated content"
  ON generated_content FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Step 6: Create proper RLS policies for shops
CREATE POLICY "Shops can view own record"
  ON shops FOR SELECT
  TO authenticated
  USING (id = auth.uid());

CREATE POLICY "Shops can update own record"
  ON shops FOR UPDATE
  TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

CREATE POLICY "Service role full access to shops"
  ON shops FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ============================================================================
-- VERIFICATION
-- ============================================================================
-- Run this query to verify policies are correct:
--
-- SELECT schemaname, tablename, policyname, roles, qual, with_check
-- FROM pg_policies
-- WHERE schemaname = 'public'
--   AND tablename IN ('content_samples', 'brand_voice_profiles', 'generated_content', 'shops')
-- ORDER BY tablename, policyname;
--
-- Expected: All authenticated policies should have "(store_id = auth.uid())"
--           or "(id = auth.uid())" in qual and with_check columns
