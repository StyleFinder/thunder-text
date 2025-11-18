-- Create ad_library table for store-specific ad management
-- This table stores ads created by users, separate from aie_ad_examples (best practices)

CREATE TABLE IF NOT EXISTS ad_library (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id uuid NOT NULL REFERENCES shops(id) ON DELETE CASCADE,

  -- Link to the AIE generation that created this ad
  ad_request_id uuid REFERENCES aie_ad_requests(id) ON DELETE SET NULL,
  variant_id uuid REFERENCES aie_ad_variants(id) ON DELETE SET NULL,

  -- Ad status lifecycle
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'paused', 'archived')),

  -- Ad content (editable by user)
  headline text NOT NULL,
  primary_text text NOT NULL,
  description text,
  cta text NOT NULL,

  -- Ad metadata
  platform text NOT NULL,  -- meta, instagram, google, tiktok, pinterest
  campaign_goal text NOT NULL,  -- conversion, awareness, engagement, traffic, app_installs
  variant_type text,  -- emotional, benefit, ugc, etc.

  -- Additional data
  image_urls jsonb DEFAULT '[]'::jsonb,  -- Array of image URLs
  product_metadata jsonb DEFAULT '{}'::jsonb,  -- Product info used in generation

  -- Performance metrics (manually entered or synced from Meta Ads)
  impressions integer DEFAULT 0,
  clicks integer DEFAULT 0,
  conversions integer DEFAULT 0,
  spend numeric(10, 2) DEFAULT 0,
  revenue numeric(10, 2) DEFAULT 0,

  -- Calculated metrics (can be computed on read)
  ctr numeric(5, 2),  -- Click-through rate
  cpc numeric(10, 2),  -- Cost per click
  cpa numeric(10, 2),  -- Cost per acquisition
  roas numeric(10, 2),  -- Return on ad spend

  -- Admin curation tracking (for future best practices promotion)
  promoted_to_best_practice boolean DEFAULT false,
  promoted_at timestamptz,
  promoted_by uuid,

  -- Timestamps
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  published_at timestamptz,  -- When moved from draft to active
  archived_at timestamptz
);

-- Create indexes for common queries
CREATE INDEX IF NOT EXISTS idx_ad_library_shop_id ON ad_library(shop_id);
CREATE INDEX IF NOT EXISTS idx_ad_library_status ON ad_library(status);
CREATE INDEX IF NOT EXISTS idx_ad_library_shop_status ON ad_library(shop_id, status);
CREATE INDEX IF NOT EXISTS idx_ad_library_platform ON ad_library(platform);
CREATE INDEX IF NOT EXISTS idx_ad_library_created_at ON ad_library(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ad_library_promoted ON ad_library(promoted_to_best_practice) WHERE promoted_to_best_practice = true;

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_ad_library_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER ad_library_updated_at
  BEFORE UPDATE ON ad_library
  FOR EACH ROW
  EXECUTE FUNCTION update_ad_library_updated_at();

-- RLS Policies (service_role has full access, users can access their shop's ads)
ALTER TABLE ad_library ENABLE ROW LEVEL SECURITY;

-- Service role has full access
CREATE POLICY "Service role has full access to ad_library"
  ON ad_library
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Authenticated users can read their shop's ads
CREATE POLICY "Users can read their shop's ads"
  ON ad_library
  FOR SELECT
  TO authenticated
  USING (shop_id IN (
    SELECT id FROM shops WHERE shop_domain = current_setting('request.jwt.claims', true)::json->>'shop'
  ));

-- Authenticated users can insert ads for their shop
CREATE POLICY "Users can create ads for their shop"
  ON ad_library
  FOR INSERT
  TO authenticated
  WITH CHECK (shop_id IN (
    SELECT id FROM shops WHERE shop_domain = current_setting('request.jwt.claims', true)::json->>'shop'
  ));

-- Authenticated users can update their shop's ads
CREATE POLICY "Users can update their shop's ads"
  ON ad_library
  FOR UPDATE
  TO authenticated
  USING (shop_id IN (
    SELECT id FROM shops WHERE shop_domain = current_setting('request.jwt.claims', true)::json->>'shop'
  ))
  WITH CHECK (shop_id IN (
    SELECT id FROM shops WHERE shop_domain = current_setting('request.jwt.claims', true)::json->>'shop'
  ));

-- Authenticated users can delete their shop's ads
CREATE POLICY "Users can delete their shop's ads"
  ON ad_library
  FOR DELETE
  TO authenticated
  USING (shop_id IN (
    SELECT id FROM shops WHERE shop_domain = current_setting('request.jwt.claims', true)::json->>'shop'
  ));

-- Grant permissions
GRANT ALL ON ad_library TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON ad_library TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON ad_library TO anon;

-- Add comment
COMMENT ON TABLE ad_library IS 'Store-specific ad library for managing user-created ads with draft/active/archived states and performance tracking';
