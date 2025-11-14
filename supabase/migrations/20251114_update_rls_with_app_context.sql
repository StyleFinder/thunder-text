-- Update RLS policies with app-scoped context
-- Part of Phase 2: App-Scoped Authorization
-- This migration adds app_name checks to RLS policies for proper data isolation

-- =====================================================
-- Helper function: Extract app from JWT claims
-- =====================================================
CREATE OR REPLACE FUNCTION get_jwt_app()
RETURNS TEXT AS $$
BEGIN
  -- Extract 'app' claim from JWT token
  -- Format: current_setting('request.jwt.claims')::json->>'app'
  RETURN COALESCE(
    current_setting('request.jwt.claims', true)::json->>'app',
    'thundertext'  -- Default fallback
  );
EXCEPTION
  WHEN OTHERS THEN
    RETURN 'thundertext';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

COMMENT ON FUNCTION get_jwt_app() IS 'Extract app claim from JWT token (thundertext/ace/suite)';

-- =====================================================
-- Helper function: Check if user has app access
-- =====================================================
CREATE OR REPLACE FUNCTION has_app_access(required_app TEXT, row_app TEXT)
RETURNS BOOLEAN AS $$
DECLARE
  jwt_app TEXT;
BEGIN
  jwt_app := get_jwt_app();

  -- Suite subscription has access to all apps
  IF jwt_app = 'suite' THEN
    RETURN true;
  END IF;

  -- Direct app match
  IF jwt_app = required_app THEN
    RETURN true;
  END IF;

  -- Row is suite-wide data (accessible by any app)
  IF row_app = 'suite' THEN
    RETURN true;
  END IF;

  RETURN false;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

COMMENT ON FUNCTION has_app_access(TEXT, TEXT) IS 'Check if JWT app claim allows access to row app_name';

-- =====================================================
-- 1. Update shops table RLS policies
-- =====================================================

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can read their shop" ON shops;
DROP POLICY IF EXISTS "Users can update their shop" ON shops;

-- Service role has full access (keep existing)
-- CREATE POLICY "Service role has full access to shops" already exists

-- Users can read their shop with app access check
CREATE POLICY "Users can read their shop with app access"
  ON shops
  FOR SELECT
  TO authenticated
  USING (
    shop_domain = current_setting('request.jwt.claims', true)::json->>'shop'
    AND has_app_access(app_name, app_name)
  );

-- Users can update their shop with app access check
CREATE POLICY "Users can update their shop with app access"
  ON shops
  FOR UPDATE
  TO authenticated
  USING (
    shop_domain = current_setting('request.jwt.claims', true)::json->>'shop'
    AND has_app_access(app_name, app_name)
  )
  WITH CHECK (
    shop_domain = current_setting('request.jwt.claims', true)::json->>'shop'
    AND has_app_access(app_name, app_name)
  );

-- =====================================================
-- 2. Update product_descriptions table RLS policies
-- =====================================================

DROP POLICY IF EXISTS "Users can read their shop's product_descriptions" ON product_descriptions;
DROP POLICY IF EXISTS "Users can create product_descriptions for their shop" ON product_descriptions;
DROP POLICY IF EXISTS "Users can update their shop's product_descriptions" ON product_descriptions;
DROP POLICY IF EXISTS "Users can delete their shop's product_descriptions" ON product_descriptions;

-- Read policy with app context
CREATE POLICY "Users can read their shop's product descriptions with app access"
  ON product_descriptions
  FOR SELECT
  TO authenticated
  USING (
    shop_id IN (
      SELECT id FROM shops
      WHERE shop_domain = current_setting('request.jwt.claims', true)::json->>'shop'
    )
    AND has_app_access(app_name, app_name)
  );

-- Insert policy with app context
CREATE POLICY "Users can create product descriptions for their shop and app"
  ON product_descriptions
  FOR INSERT
  TO authenticated
  WITH CHECK (
    shop_id IN (
      SELECT id FROM shops
      WHERE shop_domain = current_setting('request.jwt.claims', true)::json->>'shop'
    )
    AND app_name = get_jwt_app()
  );

-- Update policy with app context
CREATE POLICY "Users can update their shop's product descriptions with app access"
  ON product_descriptions
  FOR UPDATE
  TO authenticated
  USING (
    shop_id IN (
      SELECT id FROM shops
      WHERE shop_domain = current_setting('request.jwt.claims', true)::json->>'shop'
    )
    AND has_app_access(app_name, app_name)
  )
  WITH CHECK (
    shop_id IN (
      SELECT id FROM shops
      WHERE shop_domain = current_setting('request.jwt.claims', true)::json->>'shop'
    )
    AND has_app_access(app_name, app_name)
  );

-- Delete policy with app context
CREATE POLICY "Users can delete their shop's product descriptions with app access"
  ON product_descriptions
  FOR DELETE
  TO authenticated
  USING (
    shop_id IN (
      SELECT id FROM shops
      WHERE shop_domain = current_setting('request.jwt.claims', true)::json->>'shop'
    )
    AND has_app_access(app_name, app_name)
  );

-- =====================================================
-- 3. Update ad_library table RLS policies
-- =====================================================

DROP POLICY IF EXISTS "Users can read their shop's ads" ON ad_library;
DROP POLICY IF EXISTS "Users can create ads for their shop" ON ad_library;
DROP POLICY IF EXISTS "Users can update their shop's ads" ON ad_library;
DROP POLICY IF EXISTS "Users can delete their shop's ads" ON ad_library;

-- Read policy with app context
CREATE POLICY "Users can read their shop's ads with app access"
  ON ad_library
  FOR SELECT
  TO authenticated
  USING (
    shop_id IN (
      SELECT id FROM shops
      WHERE shop_domain = current_setting('request.jwt.claims', true)::json->>'shop'
    )
    AND has_app_access(app_name, app_name)
  );

-- Insert policy with app context
CREATE POLICY "Users can create ads for their shop and app"
  ON ad_library
  FOR INSERT
  TO authenticated
  WITH CHECK (
    shop_id IN (
      SELECT id FROM shops
      WHERE shop_domain = current_setting('request.jwt.claims', true)::json->>'shop'
    )
    AND app_name = get_jwt_app()
  );

-- Update policy with app context
CREATE POLICY "Users can update their shop's ads with app access"
  ON ad_library
  FOR UPDATE
  TO authenticated
  USING (
    shop_id IN (
      SELECT id FROM shops
      WHERE shop_domain = current_setting('request.jwt.claims', true)::json->>'shop'
    )
    AND has_app_access(app_name, app_name)
  )
  WITH CHECK (
    shop_id IN (
      SELECT id FROM shops
      WHERE shop_domain = current_setting('request.jwt.claims', true)::json->>'shop'
    )
    AND has_app_access(app_name, app_name)
  );

-- Delete policy with app context
CREATE POLICY "Users can delete their shop's ads with app access"
  ON ad_library
  FOR DELETE
  TO authenticated
  USING (
    shop_id IN (
      SELECT id FROM shops
      WHERE shop_domain = current_setting('request.jwt.claims', true)::json->>'shop'
    )
    AND has_app_access(app_name, app_name)
  );

-- =====================================================
-- 4. Update facebook_ad_drafts table RLS policies
-- =====================================================

DROP POLICY IF EXISTS "Users can read their shop's facebook_ad_drafts" ON facebook_ad_drafts;
DROP POLICY IF EXISTS "Users can create facebook_ad_drafts for their shop" ON facebook_ad_drafts;
DROP POLICY IF EXISTS "Users can update their shop's facebook_ad_drafts" ON facebook_ad_drafts;
DROP POLICY IF EXISTS "Users can delete their shop's facebook_ad_drafts" ON facebook_ad_drafts;

-- Read policy with app context
CREATE POLICY "Users can read their shop's facebook ad drafts with app access"
  ON facebook_ad_drafts
  FOR SELECT
  TO authenticated
  USING (
    shop_id IN (
      SELECT id FROM shops
      WHERE shop_domain = current_setting('request.jwt.claims', true)::json->>'shop'
    )
    AND has_app_access(app_name, app_name)
  );

-- Insert policy with app context
CREATE POLICY "Users can create facebook ad drafts for their shop and app"
  ON facebook_ad_drafts
  FOR INSERT
  TO authenticated
  WITH CHECK (
    shop_id IN (
      SELECT id FROM shops
      WHERE shop_domain = current_setting('request.jwt.claims', true)::json->>'shop'
    )
    AND app_name = get_jwt_app()
  );

-- Update policy with app context
CREATE POLICY "Users can update their shop's facebook ad drafts with app access"
  ON facebook_ad_drafts
  FOR UPDATE
  TO authenticated
  USING (
    shop_id IN (
      SELECT id FROM shops
      WHERE shop_domain = current_setting('request.jwt.claims', true)::json->>'shop'
    )
    AND has_app_access(app_name, app_name)
  )
  WITH CHECK (
    shop_id IN (
      SELECT id FROM shops
      WHERE shop_domain = current_setting('request.jwt.claims', true)::json->>'shop'
    )
    AND has_app_access(app_name, app_name)
  );

-- Delete policy with app context
CREATE POLICY "Users can delete their shop's facebook ad drafts with app access"
  ON facebook_ad_drafts
  FOR DELETE
  TO authenticated
  USING (
    shop_id IN (
      SELECT id FROM shops
      WHERE shop_domain = current_setting('request.jwt.claims', true)::json->>'shop'
    )
    AND has_app_access(app_name, app_name)
  );

-- =====================================================
-- 5. Update business_profiles table RLS policies
-- =====================================================

DROP POLICY IF EXISTS "Users can read their shop's business_profiles" ON business_profiles;
DROP POLICY IF EXISTS "Users can create business_profiles for their shop" ON business_profiles;
DROP POLICY IF EXISTS "Users can update their shop's business_profiles" ON business_profiles;
DROP POLICY IF EXISTS "Users can delete their shop's business_profiles" ON business_profiles;

-- Read policy with app context
CREATE POLICY "Users can read their shop's business profiles with app access"
  ON business_profiles
  FOR SELECT
  TO authenticated
  USING (
    shop_id IN (
      SELECT id FROM shops
      WHERE shop_domain = current_setting('request.jwt.claims', true)::json->>'shop'
    )
    AND has_app_access(app_name, app_name)
  );

-- Insert policy with app context
CREATE POLICY "Users can create business profiles for their shop and app"
  ON business_profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (
    shop_id IN (
      SELECT id FROM shops
      WHERE shop_domain = current_setting('request.jwt.claims', true)::json->>'shop'
    )
    AND app_name = get_jwt_app()
  );

-- Update policy with app context
CREATE POLICY "Users can update their shop's business profiles with app access"
  ON business_profiles
  FOR UPDATE
  TO authenticated
  USING (
    shop_id IN (
      SELECT id FROM shops
      WHERE shop_domain = current_setting('request.jwt.claims', true)::json->>'shop'
    )
    AND has_app_access(app_name, app_name)
  )
  WITH CHECK (
    shop_id IN (
      SELECT id FROM shops
      WHERE shop_domain = current_setting('request.jwt.claims', true)::json->>'shop'
    )
    AND has_app_access(app_name, app_name)
  );

-- Delete policy with app context
CREATE POLICY "Users can delete their shop's business profiles with app access"
  ON business_profiles
  FOR DELETE
  TO authenticated
  USING (
    shop_id IN (
      SELECT id FROM shops
      WHERE shop_domain = current_setting('request.jwt.claims', true)::json->>'shop'
    )
    AND has_app_access(app_name, app_name)
  );

-- =====================================================
-- Migration Summary
-- =====================================================
-- Functions created: 2 (get_jwt_app, has_app_access)
-- Tables updated with RLS: 5
--   - shops (2 policies)
--   - product_descriptions (4 policies)
--   - ad_library (4 policies)
--   - facebook_ad_drafts (4 policies)
--   - business_profiles (4 policies)
-- Total policies: 18
--
-- App Access Logic:
-- 1. Suite subscription → Access to all app data
-- 2. ThunderText subscription → Only thundertext app_name rows
-- 3. ACE subscription → Only ace app_name rows
-- 4. Suite-tagged rows → Accessible by any subscription
--
-- Next Steps (Phase 2 continued):
-- 1. Apply migrations to database
-- 2. Test JWT app context isolation
-- 3. Update API middleware to set JWT claims properly
