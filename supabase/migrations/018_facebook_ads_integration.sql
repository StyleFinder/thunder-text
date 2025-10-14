-- Migration: 018_facebook_ads_integration.sql
-- Purpose: Add Facebook Ads integration tables and functions
-- Date: 2025-10-14

-- ============================================================================
-- PART 1: Create integrations table for OAuth providers
-- ============================================================================

CREATE TABLE IF NOT EXISTS integrations (
  -- Identity
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id UUID NOT NULL REFERENCES shops(id) ON DELETE CASCADE,

  -- Provider Information
  provider TEXT NOT NULL CHECK (provider IN ('facebook', 'meta', 'google', 'klaviyo')),
  provider_account_id TEXT NOT NULL, -- Facebook user ID, Google account ID, etc.
  provider_account_name TEXT, -- Display name from provider

  -- OAuth Tokens (encrypted)
  encrypted_access_token TEXT NOT NULL,
  encrypted_refresh_token TEXT, -- Some providers don't use refresh tokens
  token_expires_at TIMESTAMPTZ, -- When access token expires

  -- Status
  is_active BOOLEAN DEFAULT true,
  last_synced_at TIMESTAMPTZ,

  -- Additional metadata (provider-specific data)
  additional_metadata JSONB DEFAULT '{}',
  -- Example for Facebook:
  -- {
  --   "business_id": "123456789",
  --   "business_name": "My Boutique Business",
  --   "ad_account_id": "act_123456789",
  --   "ad_account_name": "My Ad Account",
  --   "permissions_granted": ["ads_management", "ads_read", "business_management"]
  -- }

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Unique constraint: one integration per provider per shop
  UNIQUE(shop_id, provider)
);

-- Indexes for performance
CREATE INDEX idx_integrations_shop_id ON integrations(shop_id);
CREATE INDEX idx_integrations_provider ON integrations(provider);
CREATE INDEX idx_integrations_is_active ON integrations(shop_id, provider, is_active);

-- Enable Row Level Security
ALTER TABLE integrations ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Service role can manage all integrations
CREATE POLICY "Service role can manage integrations" ON integrations
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Auto-update timestamp trigger
CREATE TRIGGER update_integrations_updated_at
  BEFORE UPDATE ON integrations
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Add comment for documentation
COMMENT ON TABLE integrations IS 'OAuth integrations for external services (Facebook, Meta, Google, Klaviyo)';
COMMENT ON COLUMN integrations.encrypted_access_token IS 'AES-256-GCM encrypted access token';
COMMENT ON COLUMN integrations.additional_metadata IS 'Provider-specific data like business IDs, account info, permissions';

-- ============================================================================
-- PART 2: Create product_descriptions table
-- ============================================================================

CREATE TABLE IF NOT EXISTS product_descriptions (
  -- Identity
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id UUID NOT NULL REFERENCES shops(id) ON DELETE CASCADE,

  -- Source Product
  shopify_product_id TEXT NOT NULL,
  shopify_product_title TEXT NOT NULL,
  shopify_product_handle TEXT,

  -- Generated Content
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  short_description TEXT, -- For social media (125 chars max)
  long_description TEXT, -- For product pages

  -- Metadata
  generation_metadata JSONB DEFAULT '{}',
  -- Example:
  -- {
  --   "ai_model": "gpt-4",
  --   "prompt_template": "boutique_product",
  --   "category": "dresses",
  --   "generation_time_ms": 2341
  -- }

  -- Status
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'archived', 'draft')),

  -- Usage Tracking
  used_in_shopify BOOLEAN DEFAULT false,
  used_in_facebook_ads BOOLEAN DEFAULT false,
  facebook_ads_created INTEGER DEFAULT 0,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(shop_id, shopify_product_id)
);

-- Indexes
CREATE INDEX idx_product_desc_shop_id ON product_descriptions(shop_id);
CREATE INDEX idx_product_desc_shopify_product ON product_descriptions(shopify_product_id);
CREATE INDEX idx_product_desc_status ON product_descriptions(status);
CREATE INDEX idx_product_desc_created_at ON product_descriptions(created_at DESC);

-- Enable RLS
ALTER TABLE product_descriptions ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Service role can manage all descriptions
CREATE POLICY "Service role can manage product_descriptions" ON product_descriptions
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Auto-update timestamp trigger
CREATE TRIGGER update_product_desc_updated_at
  BEFORE UPDATE ON product_descriptions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Add comments
COMMENT ON TABLE product_descriptions IS 'AI-generated product descriptions used for multiple purposes (Shopify, Facebook Ads, etc.)';
COMMENT ON COLUMN product_descriptions.short_description IS 'Shortened version for social media (125 characters max)';
COMMENT ON COLUMN product_descriptions.facebook_ads_created IS 'Counter incremented when ad is successfully submitted';

-- ============================================================================
-- PART 3: Create facebook_ad_drafts table
-- ============================================================================

CREATE TABLE facebook_ad_drafts (
  -- Identity
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id UUID NOT NULL REFERENCES shops(id) ON DELETE CASCADE,

  -- Source Data (product description in Thunder Text)
  product_description_id UUID REFERENCES product_descriptions(id) ON DELETE SET NULL,
  shopify_product_id TEXT, -- For reference even if description deleted

  -- Ad Content (user can edit from product description)
  ad_title TEXT NOT NULL CHECK (char_length(ad_title) <= 125),
  ad_copy TEXT NOT NULL CHECK (char_length(ad_copy) <= 125),
  image_urls TEXT[] NOT NULL CHECK (array_length(image_urls, 1) <= 10),
  selected_image_url TEXT, -- User-selected primary image

  -- Facebook Campaign Selection
  facebook_campaign_id TEXT NOT NULL, -- From Facebook API
  facebook_campaign_name TEXT NOT NULL, -- For display purposes
  facebook_ad_account_id TEXT, -- Which ad account this belongs to

  -- Submission Status
  status TEXT NOT NULL DEFAULT 'draft' CHECK (
    status IN ('draft', 'submitting', 'submitted', 'failed', 'cancelled')
  ),
  facebook_ad_id TEXT, -- Populated after successful submission
  facebook_adset_id TEXT, -- The adset within the campaign (if needed)
  facebook_creative_id TEXT, -- The creative ID from Facebook

  -- Error Handling
  error_message TEXT,
  error_code TEXT, -- Facebook API error code
  retry_count INTEGER DEFAULT 0 CHECK (retry_count >= 0 AND retry_count <= 5),
  last_retry_at TIMESTAMPTZ,

  -- Metadata
  facebook_ad_format TEXT DEFAULT 'single_image', -- Future: carousel, video
  submission_metadata JSONB DEFAULT '{}',
  -- Example:
  -- {
  --   "api_request": {...},
  --   "api_response": {...},
  --   "submission_duration_ms": 1243
  -- }

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  submitted_at TIMESTAMPTZ -- When successfully submitted to Facebook
);

-- Indexes for performance
CREATE INDEX idx_fb_ad_drafts_shop_id ON facebook_ad_drafts(shop_id);
CREATE INDEX idx_fb_ad_drafts_status ON facebook_ad_drafts(status);
CREATE INDEX idx_fb_ad_drafts_created_at ON facebook_ad_drafts(created_at DESC);
CREATE INDEX idx_fb_ad_drafts_shopify_product ON facebook_ad_drafts(shopify_product_id);
CREATE INDEX idx_fb_ad_drafts_product_desc ON facebook_ad_drafts(product_description_id);
CREATE INDEX idx_fb_ad_drafts_fb_campaign ON facebook_ad_drafts(facebook_campaign_id);

-- Enable RLS
ALTER TABLE facebook_ad_drafts ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Service role can manage all drafts
CREATE POLICY "Service role can manage fb_ad_drafts" ON facebook_ad_drafts
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Auto-update timestamp trigger
CREATE TRIGGER update_fb_ad_drafts_updated_at
  BEFORE UPDATE ON facebook_ad_drafts
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Add comments
COMMENT ON TABLE facebook_ad_drafts IS 'Track all Facebook ad creation attempts with full audit trail and retry capability';
COMMENT ON COLUMN facebook_ad_drafts.status IS 'draft = not submitted, submitting = in progress, submitted = success, failed = error, cancelled = user cancelled';
COMMENT ON COLUMN facebook_ad_drafts.retry_count IS 'Number of submission attempts (max 5)';

-- ============================================================================
-- PART 4: Database Functions
-- ============================================================================

-- Function: Increment facebook_ads_created when ad is submitted
CREATE OR REPLACE FUNCTION increment_facebook_ads_count()
RETURNS TRIGGER AS $$
BEGIN
  -- Only increment when status changes TO 'submitted' (not when already submitted)
  IF NEW.status = 'submitted' AND (OLD.status IS NULL OR OLD.status != 'submitted') THEN
    -- Increment counter if product_description_id exists
    IF NEW.product_description_id IS NOT NULL THEN
      UPDATE product_descriptions
      SET
        facebook_ads_created = facebook_ads_created + 1,
        used_in_facebook_ads = true,
        updated_at = NOW()
      WHERE id = NEW.product_description_id;
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger: Auto-increment Facebook ad count
CREATE TRIGGER fb_ad_submitted_increment
  AFTER UPDATE ON facebook_ad_drafts
  FOR EACH ROW
  WHEN (NEW.status = 'submitted' AND (OLD.status IS NULL OR OLD.status != 'submitted'))
  EXECUTE FUNCTION increment_facebook_ads_count();

-- Function: Log Facebook API operations (extends existing security logging)
CREATE OR REPLACE FUNCTION log_facebook_operation(
  p_operation_type TEXT,
  p_success BOOLEAN,
  p_shop_id UUID DEFAULT NULL,
  p_error_message TEXT DEFAULT NULL,
  p_metadata JSONB DEFAULT NULL
) RETURNS VOID AS $$
BEGIN
  -- Insert into a facebook_operation_logs table if it exists
  -- Otherwise, this is a placeholder for future logging implementation
  -- For now, we'll just use RAISE NOTICE for development
  RAISE NOTICE 'Facebook Operation: % | Success: % | Shop: % | Error: % | Metadata: %',
    p_operation_type, p_success, p_shop_id, p_error_message, p_metadata;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute to service role
GRANT EXECUTE ON FUNCTION log_facebook_operation TO service_role;

-- Add comment
COMMENT ON FUNCTION log_facebook_operation IS 'Log Facebook API operations for audit trail';

-- ============================================================================
-- PART 5: Grants and Permissions
-- ============================================================================

-- Grant permissions to service_role for all new tables
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE integrations TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE product_descriptions TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE facebook_ad_drafts TO service_role;

-- Grant usage on sequences (for id generation)
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO service_role;

-- ============================================================================
-- PART 6: Reload PostgREST cache
-- ============================================================================

-- Notify PostgREST to reload schema cache
NOTIFY pgrst, 'reload schema';
