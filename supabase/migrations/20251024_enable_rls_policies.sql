-- ============================================================================
-- Migration: Enable RLS Policies for Multi-Tenancy Security
-- Date: 2025-10-24
-- Description: Enable Row Level Security (RLS) on all tables to prevent
--              cross-store data access. Each store can only access their own data.
--
-- Security Impact: CRITICAL
-- - Prevents data leaks between stores
-- - Enforces multi-tenancy isolation
-- - Protects sensitive OAuth tokens and store data
--
-- Testing Required: See docs/RLS_TESTING_STRATEGY.md
-- ============================================================================

-- ============================================================================
-- STEP 1: Enable RLS on Core Tables
-- ============================================================================

-- Stores table - store configuration and settings
ALTER TABLE shops ENABLE ROW LEVEL SECURITY;

-- Store/User relationships (if exists)
DO $$
BEGIN
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'users') THEN
        ALTER TABLE users ENABLE ROW LEVEL SECURITY;
    END IF;
END $$;

-- Products and related tables
DO $$
BEGIN
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'products') THEN
        ALTER TABLE products ENABLE ROW LEVEL SECURITY;
    END IF;

    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'images') THEN
        ALTER TABLE images ENABLE ROW LEVEL SECURITY;
    END IF;

    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'product_descriptions') THEN
        ALTER TABLE product_descriptions ENABLE ROW LEVEL SECURITY;
    END IF;
END $$;

-- Integration and OAuth tables
DO $$
BEGIN
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'integrations') THEN
        ALTER TABLE integrations ENABLE ROW LEVEL SECURITY;
    END IF;

    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'shopify_sessions') THEN
        ALTER TABLE shopify_sessions ENABLE ROW LEVEL SECURITY;
    END IF;
END $$;

-- Template and prompt tables
DO $$
BEGIN
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'templates') THEN
        ALTER TABLE templates ENABLE ROW LEVEL SECURITY;
    END IF;

    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'category_templates') THEN
        ALTER TABLE category_templates ENABLE ROW LEVEL SECURITY;
    END IF;

    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'shop_sizes') THEN
        ALTER TABLE shop_sizes ENABLE ROW LEVEL SECURITY;
    END IF;
END $$;

-- Usage and billing tables
DO $$
BEGIN
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'usage_metrics') THEN
        ALTER TABLE usage_metrics ENABLE ROW LEVEL SECURITY;
    END IF;

    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'generation_jobs') THEN
        ALTER TABLE generation_jobs ENABLE ROW LEVEL SECURITY;
    END IF;

    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'usage_alerts') THEN
        ALTER TABLE usage_alerts ENABLE ROW LEVEL SECURITY;
    END IF;
END $$;

-- Facebook Ads tables
DO $$
BEGIN
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'facebook_ad_drafts') THEN
        ALTER TABLE facebook_ad_drafts ENABLE ROW LEVEL SECURITY;
    END IF;

    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'facebook_notification_settings') THEN
        ALTER TABLE facebook_notification_settings ENABLE ROW LEVEL SECURITY;
    END IF;

    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'facebook_alert_history') THEN
        ALTER TABLE facebook_alert_history ENABLE ROW LEVEL SECURITY;
    END IF;
END $$;

-- ============================================================================
-- STEP 2: Drop Existing Overly Permissive Policies
-- ============================================================================

-- Content samples - replace service_role-only policy
DROP POLICY IF EXISTS "Service role can manage content samples" ON content_samples;
DROP POLICY IF EXISTS "Enable all access for service role" ON content_samples;

-- Brand voice profiles
DROP POLICY IF EXISTS "Service role can manage voice profiles" ON brand_voice_profiles;
DROP POLICY IF EXISTS "Enable all access for service role" ON brand_voice_profiles;

-- Generated content
DROP POLICY IF EXISTS "Service role can manage generated content" ON generated_content;
DROP POLICY IF EXISTS "Enable all access for service role" ON generated_content;

-- Shop sizes
DROP POLICY IF EXISTS "Enable all access for service role" ON shop_sizes;

-- ============================================================================
-- STEP 3: Create Helper Function for Shop ID from Auth
-- ============================================================================

-- Get shop ID from authenticated user
-- This assumes shops.id is the primary identifier
CREATE OR REPLACE FUNCTION auth.shop_id()
RETURNS UUID AS $$
  SELECT id FROM shops
  WHERE id = auth.uid()
  LIMIT 1;
$$ LANGUAGE SQL STABLE SECURITY DEFINER;

-- Alternative: If using JWT claims
CREATE OR REPLACE FUNCTION auth.shop_id_from_jwt()
RETURNS UUID AS $$
  SELECT (auth.jwt()->>'shop_id')::UUID;
$$ LANGUAGE SQL STABLE;

-- ============================================================================
-- STEP 4: Create RLS Policies - Shops Table
-- ============================================================================

-- Shops can view and update their own record
CREATE POLICY "Shops can view own record"
  ON shops FOR SELECT
  TO authenticated
  USING (id = auth.uid());

CREATE POLICY "Shops can update own record"
  ON shops FOR UPDATE
  TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- Service role has full access (for admin operations)
CREATE POLICY "Service role full access to shops"
  ON shops FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ============================================================================
-- STEP 5: Create RLS Policies - Content Center Tables
-- ============================================================================

-- Content Samples: Shops can only access their own samples
CREATE POLICY "Shops access own content samples"
  ON content_samples FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Service role full access to content samples"
  ON content_samples FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Brand Voice Profiles: Shops can only access their own profiles
CREATE POLICY "Shops access own voice profiles"
  ON brand_voice_profiles FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Service role full access to voice profiles"
  ON brand_voice_profiles FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Generated Content: Shops can only access their own content
CREATE POLICY "Shops access own generated content"
  ON generated_content FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Service role full access to generated content"
  ON generated_content FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ============================================================================
-- STEP 6: Create RLS Policies - Shop Sizes
-- ============================================================================

CREATE POLICY "Shops access own sizing data"
  ON shop_sizes FOR ALL
  TO authenticated
  USING (store_id = auth.uid())
  WITH CHECK (store_id = auth.uid());

CREATE POLICY "Service role full access to shop sizes"
  ON shop_sizes FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ============================================================================
-- STEP 7: Create RLS Policies - Products and Related Tables
-- ============================================================================

-- Products: Filter by store_id
DO $$
BEGIN
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'products') THEN
        EXECUTE '
        CREATE POLICY "Shops access own products"
          ON products FOR ALL
          TO authenticated
          USING (store_id = auth.uid())
          WITH CHECK (store_id = auth.uid());

        CREATE POLICY "Service role full access to products"
          ON products FOR ALL
          TO service_role
          USING (true)
          WITH CHECK (true);
        ';
    END IF;
END $$;

-- Images: Filter through product relationship
DO $$
BEGIN
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'images') THEN
        EXECUTE '
        CREATE POLICY "Shops access own product images"
          ON images FOR ALL
          TO authenticated
          USING (
            product_id IN (
              SELECT id FROM products WHERE store_id = auth.uid()
            )
          )
          WITH CHECK (
            product_id IN (
              SELECT id FROM products WHERE store_id = auth.uid()
            )
          );

        CREATE POLICY "Service role full access to images"
          ON images FOR ALL
          TO service_role
          USING (true)
          WITH CHECK (true);
        ';
    END IF;
END $$;

-- Product Descriptions
DO $$
BEGIN
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'product_descriptions') THEN
        EXECUTE '
        CREATE POLICY "Shops access own product descriptions"
          ON product_descriptions FOR ALL
          TO authenticated
          USING (shop_id = auth.uid())
          WITH CHECK (shop_id = auth.uid());

        CREATE POLICY "Service role full access to product descriptions"
          ON product_descriptions FOR ALL
          TO service_role
          USING (true)
          WITH CHECK (true);
        ';
    END IF;
END $$;

-- ============================================================================
-- STEP 8: Create RLS Policies - Templates
-- ============================================================================

-- Category Templates: Global templates (store_id IS NULL) visible to all
-- Store-specific templates only visible to that store
DO $$
BEGIN
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'category_templates') THEN
        EXECUTE '
        CREATE POLICY "Shops view global and own templates"
          ON category_templates FOR SELECT
          TO authenticated
          USING (
            store_id IS NULL  -- Global templates
            OR store_id = auth.uid()  -- Own templates
          );

        CREATE POLICY "Shops manage own templates"
          ON category_templates FOR INSERT, UPDATE, DELETE
          TO authenticated
          USING (store_id = auth.uid())
          WITH CHECK (store_id = auth.uid());

        CREATE POLICY "Service role full access to category templates"
          ON category_templates FOR ALL
          TO service_role
          USING (true)
          WITH CHECK (true);
        ';
    END IF;
END $$;

-- Templates table (if different from category_templates)
DO $$
BEGIN
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'templates') THEN
        EXECUTE '
        CREATE POLICY "Shops access own templates"
          ON templates FOR ALL
          TO authenticated
          USING (store_id = auth.uid())
          WITH CHECK (store_id = auth.uid());

        CREATE POLICY "Service role full access to templates"
          ON templates FOR ALL
          TO service_role
          USING (true)
          WITH CHECK (true);
        ';
    END IF;
END $$;

-- ============================================================================
-- STEP 9: Create RLS Policies - Integrations (CRITICAL - Contains OAuth Tokens)
-- ============================================================================

DO $$
BEGIN
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'integrations') THEN
        EXECUTE '
        CREATE POLICY "Shops access own integrations"
          ON integrations FOR ALL
          TO authenticated
          USING (shop_id = auth.uid())
          WITH CHECK (shop_id = auth.uid());

        CREATE POLICY "Service role full access to integrations"
          ON integrations FOR ALL
          TO service_role
          USING (true)
          WITH CHECK (true);
        ';
    END IF;
END $$;

-- ============================================================================
-- STEP 10: Create RLS Policies - Shopify Sessions
-- ============================================================================

DO $$
BEGIN
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'shopify_sessions') THEN
        EXECUTE '
        CREATE POLICY "Shops access own sessions"
          ON shopify_sessions FOR ALL
          TO authenticated
          USING (shop = (SELECT shop_domain FROM shops WHERE id = auth.uid()));

        CREATE POLICY "Service role full access to sessions"
          ON shopify_sessions FOR ALL
          TO service_role
          USING (true)
          WITH CHECK (true);
        ';
    END IF;
END $$;

-- ============================================================================
-- STEP 11: Create RLS Policies - Usage and Billing
-- ============================================================================

-- Usage metrics
DO $$
BEGIN
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'usage_metrics') THEN
        EXECUTE '
        CREATE POLICY "Shops view own usage metrics"
          ON usage_metrics FOR SELECT
          TO authenticated
          USING (store_id = auth.uid());

        CREATE POLICY "Service role full access to usage metrics"
          ON usage_metrics FOR ALL
          TO service_role
          USING (true)
          WITH CHECK (true);
        ';
    END IF;
END $$;

-- Generation jobs
DO $$
BEGIN
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'generation_jobs') THEN
        EXECUTE '
        CREATE POLICY "Shops access own generation jobs"
          ON generation_jobs FOR ALL
          TO authenticated
          USING (store_id = auth.uid())
          WITH CHECK (store_id = auth.uid());

        CREATE POLICY "Service role full access to generation jobs"
          ON generation_jobs FOR ALL
          TO service_role
          USING (true)
          WITH CHECK (true);
        ';
    END IF;
END $$;

-- Usage alerts
DO $$
BEGIN
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'usage_alerts') THEN
        EXECUTE '
        CREATE POLICY "Shops view own usage alerts"
          ON usage_alerts FOR SELECT
          TO authenticated
          USING (store_id = auth.uid());

        CREATE POLICY "Service role full access to usage alerts"
          ON usage_alerts FOR ALL
          TO service_role
          USING (true)
          WITH CHECK (true);
        ';
    END IF;
END $$;

-- ============================================================================
-- STEP 12: Create RLS Policies - Facebook Ads
-- ============================================================================

-- Facebook ad drafts
DO $$
BEGIN
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'facebook_ad_drafts') THEN
        EXECUTE '
        CREATE POLICY "Shops access own ad drafts"
          ON facebook_ad_drafts FOR ALL
          TO authenticated
          USING (shop_id = auth.uid())
          WITH CHECK (shop_id = auth.uid());

        CREATE POLICY "Service role full access to ad drafts"
          ON facebook_ad_drafts FOR ALL
          TO service_role
          USING (true)
          WITH CHECK (true);
        ';
    END IF;
END $$;

-- Facebook notification settings
DO $$
BEGIN
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'facebook_notification_settings') THEN
        EXECUTE '
        CREATE POLICY "Shops access own notification settings"
          ON facebook_notification_settings FOR ALL
          TO authenticated
          USING (shop_id = auth.uid())
          WITH CHECK (shop_id = auth.uid());

        CREATE POLICY "Service role full access to notification settings"
          ON facebook_notification_settings FOR ALL
          TO service_role
          USING (true)
          WITH CHECK (true);
        ';
    END IF;
END $$;

-- Facebook alert history
DO $$
BEGIN
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'facebook_alert_history') THEN
        EXECUTE '
        CREATE POLICY "Shops access own alert history"
          ON facebook_alert_history FOR ALL
          TO authenticated
          USING (shop_id = auth.uid())
          WITH CHECK (shop_id = auth.uid());

        CREATE POLICY "Service role full access to alert history"
          ON facebook_alert_history FOR ALL
          TO service_role
          USING (true)
          WITH CHECK (true);
        ';
    END IF;
END $$;

-- ============================================================================
-- STEP 13: Verify RLS is Enabled
-- ============================================================================

-- This query will show all tables with RLS enabled
-- Run this manually after migration to verify:
--
-- SELECT schemaname, tablename, rowsecurity
-- FROM pg_tables
-- WHERE schemaname = 'public'
-- ORDER BY tablename;

-- ============================================================================
-- ROLLBACK INSTRUCTIONS
-- ============================================================================

-- If this migration causes issues, you can rollback by running:
--
-- ALTER TABLE shops DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE content_samples DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE brand_voice_profiles DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE generated_content DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE shop_sizes DISABLE ROW LEVEL SECURITY;
-- (Repeat for all other tables)
--
-- Or restore from backup:
-- psql < backup-before-rls.sql

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================

-- Next steps:
-- 1. Run tests: npm run test -- rls-integration.test.ts
-- 2. Verify multi-tenancy: Try accessing other store's data (should fail)
-- 3. Check API routes: All routes should respect RLS
-- 4. Performance test: Query times should be <1 second
-- 5. Update SECURITY_ACTION_PLAN.md - Mark Task 1 complete
