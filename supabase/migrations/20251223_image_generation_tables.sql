-- Image Generation Feature Migration
-- Creates tables for AI image generation, storage, and usage tracking

-- ============================================
-- 1. Generated Images (persistent image library)
-- ============================================
CREATE TABLE IF NOT EXISTS generated_images (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id UUID NOT NULL REFERENCES shops(id) ON DELETE CASCADE,

  -- Conversation tracking
  conversation_id TEXT NOT NULL,

  -- Image data
  image_url TEXT NOT NULL,
  storage_path TEXT, -- Path in Supabase storage for cleanup

  -- Generation details
  prompt TEXT NOT NULL,
  reference_image_url TEXT,
  provider TEXT NOT NULL, -- 'google' or 'openai'
  model TEXT NOT NULL,
  cost_cents INT NOT NULL DEFAULT 0,
  aspect_ratio TEXT DEFAULT '1:1',

  -- Status
  is_final BOOLEAN DEFAULT false, -- True when saved to library

  -- Product association
  product_id TEXT, -- Shopify product ID

  -- Timestamps and expiration
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL -- 30 days from creation
);

-- Indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_generated_images_shop_id ON generated_images(shop_id);
CREATE INDEX IF NOT EXISTS idx_generated_images_conversation_id ON generated_images(conversation_id);
CREATE INDEX IF NOT EXISTS idx_generated_images_is_final ON generated_images(is_final);
CREATE INDEX IF NOT EXISTS idx_generated_images_expires_at ON generated_images(expires_at);
CREATE INDEX IF NOT EXISTS idx_generated_images_product_id ON generated_images(product_id);

-- Composite index for library queries
CREATE INDEX IF NOT EXISTS idx_generated_images_library
  ON generated_images(shop_id, is_final, expires_at DESC)
  WHERE is_final = true;

-- ============================================
-- 2. Image Generation Usage (lightweight tracking)
-- ============================================
CREATE TABLE IF NOT EXISTS image_generation_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id UUID NOT NULL REFERENCES shops(id) ON DELETE CASCADE,

  -- Generation details
  provider TEXT NOT NULL,
  model TEXT NOT NULL,
  cost_cents INT NOT NULL DEFAULT 0,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for usage queries
CREATE INDEX IF NOT EXISTS idx_image_generation_usage_shop_id ON image_generation_usage(shop_id);
CREATE INDEX IF NOT EXISTS idx_image_generation_usage_created_at ON image_generation_usage(created_at DESC);

-- Composite index for monthly usage queries
CREATE INDEX IF NOT EXISTS idx_image_generation_usage_monthly
  ON image_generation_usage(shop_id, created_at DESC);

-- ============================================
-- 3. Enable RLS (Row Level Security)
-- ============================================
ALTER TABLE generated_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE image_generation_usage ENABLE ROW LEVEL SECURITY;

-- Service role policies (API routes use service role)
CREATE POLICY "Service role full access to generated_images" ON generated_images
  FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "Service role full access to image_generation_usage" ON image_generation_usage
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- ============================================
-- 4. Helper Functions
-- ============================================

-- Function to get monthly image generation usage for a shop
CREATE OR REPLACE FUNCTION get_monthly_image_usage(p_shop_id UUID)
RETURNS TABLE(
  used_count BIGINT,
  total_cost_cents BIGINT,
  limit_count INT,
  remaining_count BIGINT
) AS $$
DECLARE
  shop_plan TEXT;
  usage_limit INT;
BEGIN
  -- Get shop's plan
  SELECT COALESCE(plan, 'starter') INTO shop_plan FROM shops WHERE id = p_shop_id;

  -- Determine limit based on plan
  CASE shop_plan
    WHEN 'pro' THEN usage_limit := 100;
    WHEN 'starter' THEN usage_limit := 50;
    ELSE usage_limit := 50;
  END CASE;

  RETURN QUERY
  SELECT
    COUNT(*)::BIGINT as used_count,
    COALESCE(SUM(cost_cents), 0)::BIGINT as total_cost_cents,
    usage_limit as limit_count,
    GREATEST(0, usage_limit - COUNT(*))::BIGINT as remaining_count
  FROM image_generation_usage
  WHERE shop_id = p_shop_id
    AND created_at >= date_trunc('month', NOW());
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to cleanup expired images
CREATE OR REPLACE FUNCTION cleanup_expired_images()
RETURNS INT AS $$
DECLARE
  deleted_count INT;
BEGIN
  -- Delete expired images (storage files should be cleaned separately via cron job)
  DELETE FROM generated_images
  WHERE expires_at < NOW();

  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get image library with expiration info
CREATE OR REPLACE FUNCTION get_image_library(
  p_shop_id UUID,
  p_limit INT DEFAULT 20,
  p_offset INT DEFAULT 0
)
RETURNS TABLE(
  id UUID,
  conversation_id TEXT,
  image_url TEXT,
  prompt TEXT,
  provider TEXT,
  model TEXT,
  cost_cents INT,
  aspect_ratio TEXT,
  product_id TEXT,
  created_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  days_until_expiration INT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    gi.id,
    gi.conversation_id,
    gi.image_url,
    gi.prompt,
    gi.provider,
    gi.model,
    gi.cost_cents,
    gi.aspect_ratio,
    gi.product_id,
    gi.created_at,
    gi.expires_at,
    GREATEST(0, EXTRACT(DAY FROM gi.expires_at - NOW())::INT) as days_until_expiration
  FROM generated_images gi
  WHERE gi.shop_id = p_shop_id
    AND gi.is_final = true
    AND gi.expires_at > NOW()
  ORDER BY gi.created_at DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 5. Supabase Storage Bucket (must be created via Dashboard or API)
-- ============================================
-- Note: The 'generated-images' bucket should be created manually with:
-- - Public access: true (for serving images)
-- - File size limit: 10MB
-- - Allowed MIME types: image/png, image/jpeg, image/webp
-- - Lifecycle rule: Delete objects after 30 days (optional, we handle via DB)

-- ============================================
-- 6. Comments for documentation
-- ============================================
COMMENT ON TABLE generated_images IS 'Stores generated AI images with 30-day expiration';
COMMENT ON TABLE image_generation_usage IS 'Lightweight usage tracking for monthly limits';
COMMENT ON COLUMN generated_images.is_final IS 'True when user saves image to their library';
COMMENT ON COLUMN generated_images.expires_at IS 'Auto-deletion date (30 days from creation)';
COMMENT ON COLUMN generated_images.storage_path IS 'Path in Supabase storage for cleanup';

COMMENT ON FUNCTION get_monthly_image_usage IS 'Get current months image generation usage and limits';
COMMENT ON FUNCTION cleanup_expired_images IS 'Delete expired images from database';
COMMENT ON FUNCTION get_image_library IS 'Get shop image library with expiration countdown';
