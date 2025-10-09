-- Create shops table for storing Shopify OAuth access tokens
-- This table is separate from 'stores' and used specifically for Shopify authentication

CREATE TABLE IF NOT EXISTS shops (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_domain TEXT NOT NULL UNIQUE,
  access_token TEXT NOT NULL,
  scope TEXT,
  is_active BOOLEAN DEFAULT true,
  installed_at TIMESTAMPTZ DEFAULT NOW(),
  last_used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_shops_shop_domain ON shops(shop_domain);
CREATE INDEX IF NOT EXISTS idx_shops_is_active ON shops(is_active);

-- Enable Row Level Security
ALTER TABLE shops ENABLE ROW LEVEL SECURITY;

-- Create RLS policy for service role access
-- Service role bypasses RLS by default, but we'll add explicit policy for clarity
CREATE POLICY "Service role can manage shops" ON shops
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Add trigger to update updated_at timestamp
CREATE TRIGGER update_shops_updated_at
  BEFORE UPDATE ON shops
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Add comment for documentation
COMMENT ON TABLE shops IS 'Stores Shopify OAuth access tokens and shop installation status';
COMMENT ON COLUMN shops.shop_domain IS 'Full Shopify domain (e.g., example.myshopify.com)';
COMMENT ON COLUMN shops.access_token IS 'OAuth access token from Shopify token exchange';
COMMENT ON COLUMN shops.scope IS 'Comma-separated list of granted OAuth scopes';
COMMENT ON COLUMN shops.is_active IS 'Whether the shop has the app currently installed';
COMMENT ON COLUMN shops.installed_at IS 'Timestamp when app was first installed';
COMMENT ON COLUMN shops.last_used_at IS 'Timestamp of last API call or token exchange';
