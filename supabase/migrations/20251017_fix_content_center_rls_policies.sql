-- Fix Content Center RLS policies to match working shop_sizes pattern
-- Issue: content_samples uses service_role policy, but shop_sizes uses public policy
-- Solution: Replace service_role policies with public policies (matches working pattern)

-- ============================================================================
-- DROP EXISTING RESTRICTIVE POLICIES
-- ============================================================================

DROP POLICY IF EXISTS "Service role can manage content samples" ON content_samples;
DROP POLICY IF EXISTS "Service role can manage voice profiles" ON brand_voice_profiles;
DROP POLICY IF EXISTS "Service role can manage generated content" ON generated_content;

-- ============================================================================
-- CREATE PUBLIC POLICIES (MATCHING shop_sizes PATTERN)
-- ============================================================================

-- Policy for content_samples (matching shop_sizes pattern)
CREATE POLICY "Content samples accessible by all roles"
  ON content_samples FOR ALL
  TO public
  USING (true)
  WITH CHECK (true);

-- Policy for brand_voice_profiles (matching shop_sizes pattern)
CREATE POLICY "Voice profiles accessible by all roles"
  ON brand_voice_profiles FOR ALL
  TO public
  USING (true)
  WITH CHECK (true);

-- Policy for generated_content (matching shop_sizes pattern)
CREATE POLICY "Generated content accessible by all roles"
  ON generated_content FOR ALL
  TO public
  USING (true)
  WITH CHECK (true);

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON POLICY "Content samples accessible by all roles" ON content_samples IS
  'Matches shop_sizes RLS pattern - public role includes anon, authenticated, and service_role';

COMMENT ON POLICY "Voice profiles accessible by all roles" ON brand_voice_profiles IS
  'Matches shop_sizes RLS pattern - public role includes anon, authenticated, and service_role';

COMMENT ON POLICY "Generated content accessible by all roles" ON generated_content IS
  'Matches shop_sizes RLS pattern - public role includes anon, authenticated, and service_role';

-- Notify PostgREST to reload schema
NOTIFY pgrst, 'reload schema';
