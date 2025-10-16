-- Add facebook_page_id column to integrations table
-- This stores the Facebook Page ID needed for creating ad creatives

ALTER TABLE integrations
ADD COLUMN IF NOT EXISTS facebook_page_id TEXT;

-- Add comment explaining the column
COMMENT ON COLUMN integrations.facebook_page_id IS 'Facebook Page ID associated with this integration. Required for creating ad creatives with object_story_spec.';

-- Create index for faster lookups by shop and provider
CREATE INDEX IF NOT EXISTS idx_integrations_shop_provider_active
ON integrations(shop_id, provider, is_active)
WHERE is_active = true;
