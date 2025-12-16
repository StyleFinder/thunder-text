-- Create llms_settings table for storing AI Discovery configuration per shop
-- This tracks llms.txt generation settings, sync schedule, and status

CREATE TABLE IF NOT EXISTS llms_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id UUID NOT NULL REFERENCES shops(id) ON DELETE CASCADE,

  -- Content type selection (what to include in llms.txt)
  include_products BOOLEAN DEFAULT true,
  include_collections BOOLEAN DEFAULT false,
  include_blog_posts BOOLEAN DEFAULT false,

  -- Auto-sync scheduling
  sync_schedule TEXT DEFAULT 'none' CHECK (sync_schedule IN ('none', 'daily', 'weekly')),

  -- Status tracking
  last_generated_at TIMESTAMPTZ,
  next_sync_at TIMESTAMPTZ,
  last_product_count INTEGER DEFAULT 0,
  last_collection_count INTEGER DEFAULT 0,
  last_blog_post_count INTEGER DEFAULT 0,

  -- Publish settings (for future auto-publish feature)
  auto_publish BOOLEAN DEFAULT false,
  publish_theme_id TEXT,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Ensure one settings record per shop
  UNIQUE(shop_id)
);

-- Create index for shop lookup
CREATE INDEX IF NOT EXISTS idx_llms_settings_shop_id ON llms_settings(shop_id);

-- Create index for scheduled sync lookups
CREATE INDEX IF NOT EXISTS idx_llms_settings_next_sync ON llms_settings(next_sync_at)
  WHERE sync_schedule != 'none' AND next_sync_at IS NOT NULL;

-- Enable Row Level Security
ALTER TABLE llms_settings ENABLE ROW LEVEL SECURITY;

-- Create RLS policy for service role access
CREATE POLICY "Service role can manage llms_settings" ON llms_settings
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Add trigger to update updated_at timestamp
CREATE TRIGGER update_llms_settings_updated_at
  BEFORE UPDATE ON llms_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Add comments for documentation
COMMENT ON TABLE llms_settings IS 'Stores AI Discovery (llms.txt) configuration for each shop';
COMMENT ON COLUMN llms_settings.include_products IS 'Whether to include products in llms.txt';
COMMENT ON COLUMN llms_settings.include_collections IS 'Whether to include collections in llms.txt';
COMMENT ON COLUMN llms_settings.include_blog_posts IS 'Whether to include blog posts in llms.txt';
COMMENT ON COLUMN llms_settings.sync_schedule IS 'Auto-sync frequency: none, daily, or weekly';
COMMENT ON COLUMN llms_settings.last_generated_at IS 'Timestamp of last successful generation';
COMMENT ON COLUMN llms_settings.next_sync_at IS 'Scheduled time for next auto-sync';
