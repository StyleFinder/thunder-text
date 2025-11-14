-- Add app_name column for app-scoped data isolation
-- Part of Phase 2: App-Scoped Authorization
-- This migration adds app_name to key tables to support ThunderText/ACE separation

-- =====================================================
-- 1. Add app_name column to shops table
-- =====================================================
ALTER TABLE shops
  ADD COLUMN IF NOT EXISTS app_name TEXT DEFAULT 'thundertext'
  CHECK (app_name IN ('thundertext', 'ace', 'suite'));

CREATE INDEX IF NOT EXISTS idx_shops_app_name ON shops(app_name);

COMMENT ON COLUMN shops.app_name IS 'App subscription: thundertext ($29), ace ($49), or suite ($99 - both apps)';

-- =====================================================
-- 2. Add app_name column to integrations table
-- =====================================================
ALTER TABLE integrations
  ADD COLUMN IF NOT EXISTS app_name TEXT DEFAULT 'thundertext'
  CHECK (app_name IN ('thundertext', 'ace', 'suite'));

CREATE INDEX IF NOT EXISTS idx_integrations_app_name ON integrations(app_name);
CREATE INDEX IF NOT EXISTS idx_integrations_shop_app ON integrations(shop_id, app_name);

COMMENT ON COLUMN integrations.app_name IS 'App context for this integration (thundertext/ace/suite)';

-- =====================================================
-- 3. Add app_name column to product_descriptions table
-- =====================================================
ALTER TABLE product_descriptions
  ADD COLUMN IF NOT EXISTS app_name TEXT DEFAULT 'thundertext'
  CHECK (app_name IN ('thundertext', 'ace', 'suite'));

CREATE INDEX IF NOT EXISTS idx_product_descriptions_app_name ON product_descriptions(app_name);
CREATE INDEX IF NOT EXISTS idx_product_descriptions_shop_app ON product_descriptions(shop_id, app_name);

COMMENT ON COLUMN product_descriptions.app_name IS 'App that created this product description';

-- =====================================================
-- 4. Add app_name column to facebook_ad_drafts table
-- =====================================================
ALTER TABLE facebook_ad_drafts
  ADD COLUMN IF NOT EXISTS app_name TEXT DEFAULT 'ace'
  CHECK (app_name IN ('thundertext', 'ace', 'suite'));

CREATE INDEX IF NOT EXISTS idx_facebook_ad_drafts_app_name ON facebook_ad_drafts(app_name);
CREATE INDEX IF NOT EXISTS idx_facebook_ad_drafts_shop_app ON facebook_ad_drafts(shop_id, app_name);

COMMENT ON COLUMN facebook_ad_drafts.app_name IS 'App that created this ad draft (typically ACE)';

-- =====================================================
-- 5. Add app_name column to business_profiles table
-- =====================================================
ALTER TABLE business_profiles
  ADD COLUMN IF NOT EXISTS app_name TEXT DEFAULT 'thundertext'
  CHECK (app_name IN ('thundertext', 'ace', 'suite'));

CREATE INDEX IF NOT EXISTS idx_business_profiles_app_name ON business_profiles(app_name);
CREATE INDEX IF NOT EXISTS idx_business_profiles_shop_app ON business_profiles(shop_id, app_name);

COMMENT ON COLUMN business_profiles.app_name IS 'App context for this business profile';

-- =====================================================
-- 6. Add app_name column to ad_library table
-- =====================================================
ALTER TABLE ad_library
  ADD COLUMN IF NOT EXISTS app_name TEXT DEFAULT 'ace'
  CHECK (app_name IN ('thundertext', 'ace', 'suite'));

CREATE INDEX IF NOT EXISTS idx_ad_library_app_name ON ad_library(app_name);
CREATE INDEX IF NOT EXISTS idx_ad_library_shop_app ON ad_library(shop_id, app_name);

COMMENT ON COLUMN ad_library.app_name IS 'App that created this ad (typically ACE)';

-- =====================================================
-- 7. Add app_name column to aie_ad_requests table
-- =====================================================
ALTER TABLE aie_ad_requests
  ADD COLUMN IF NOT EXISTS app_name TEXT DEFAULT 'ace'
  CHECK (app_name IN ('thundertext', 'ace', 'suite'));

CREATE INDEX IF NOT EXISTS idx_aie_ad_requests_app_name ON aie_ad_requests(app_name);
CREATE INDEX IF NOT EXISTS idx_aie_ad_requests_shop_app ON aie_ad_requests(shop_id, app_name);

COMMENT ON COLUMN aie_ad_requests.app_name IS 'App that requested this ad generation';

-- =====================================================
-- 8. Add app_name column to aie_ad_variants table
-- =====================================================
ALTER TABLE aie_ad_variants
  ADD COLUMN IF NOT EXISTS app_name TEXT DEFAULT 'ace'
  CHECK (app_name IN ('thundertext', 'ace', 'suite'));

CREATE INDEX IF NOT EXISTS idx_aie_ad_variants_app_name ON aie_ad_variants(app_name);

COMMENT ON COLUMN aie_ad_variants.app_name IS 'App context for this ad variant';

-- =====================================================
-- 9. Add app_name column to coach_assignments table
-- =====================================================
ALTER TABLE coach_assignments
  ADD COLUMN IF NOT EXISTS app_name TEXT DEFAULT 'thundertext'
  CHECK (app_name IN ('thundertext', 'ace', 'suite'));

CREATE INDEX IF NOT EXISTS idx_coach_assignments_app_name ON coach_assignments(app_name);
CREATE INDEX IF NOT EXISTS idx_coach_assignments_shop_app ON coach_assignments(shop_id, app_name);

COMMENT ON COLUMN coach_assignments.app_name IS 'App this coaching assignment belongs to';

-- =====================================================
-- 10. Add app_name column to writing_reports table
-- =====================================================
ALTER TABLE writing_reports
  ADD COLUMN IF NOT EXISTS app_name TEXT DEFAULT 'thundertext'
  CHECK (app_name IN ('thundertext', 'ace', 'suite'));

CREATE INDEX IF NOT EXISTS idx_writing_reports_app_name ON writing_reports(app_name);
CREATE INDEX IF NOT EXISTS idx_writing_reports_shop_app ON writing_reports(shop_id, app_name);

COMMENT ON COLUMN writing_reports.app_name IS 'App context for this writing report';

-- =====================================================
-- Migration Summary
-- =====================================================
-- Tables updated: 10
-- Indexes created: 20 (1 per table + 1 composite per data table)
-- Default values:
--   - thundertext: shops, product_descriptions, business_profiles, coach_assignments, writing_reports
--   - ace: facebook_ad_drafts, ad_library, aie_ad_requests, aie_ad_variants
--   - integrations: thundertext (neutral default)
--
-- Next Steps (Phase 2 continued):
-- 1. Update RLS policies to check app_name
-- 2. Update API middleware to set app context
-- 3. Test data isolation between apps
