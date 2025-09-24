-- Shopify OAuth Token Storage Migration
-- This migration creates the necessary tables for storing Shopify access tokens

-- Create shops table to store shop information and access tokens
CREATE TABLE IF NOT EXISTS shops (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  shop_domain TEXT NOT NULL UNIQUE, -- e.g., 'zunosai-staging-test-store.myshopify.com'
  access_token TEXT NOT NULL, -- Encrypted Shopify access token
  scope TEXT, -- Granted OAuth scopes
  is_active BOOLEAN DEFAULT true,
  installed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_used_at TIMESTAMP WITH TIME ZONE,
  metadata JSONB DEFAULT '{}' -- Additional shop metadata
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_shops_domain ON shops(shop_domain);
CREATE INDEX IF NOT EXISTS idx_shops_active ON shops(is_active);

-- Enable Row Level Security
ALTER TABLE shops ENABLE ROW LEVEL SECURITY;

-- Create a policy that allows the service role to manage shops
-- In production, you'd want more restrictive policies
CREATE POLICY "Service role can manage shops"
  ON shops
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Create a function to update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to auto-update updated_at
CREATE TRIGGER update_shops_updated_at
  BEFORE UPDATE ON shops
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

-- Create a function to update last_used_at when token is accessed
CREATE OR REPLACE FUNCTION update_shop_last_used(p_shop_domain TEXT)
RETURNS VOID AS $$
BEGIN
  UPDATE shops
  SET last_used_at = NOW()
  WHERE shop_domain = p_shop_domain;
END;
$$ LANGUAGE plpgsql;

-- Insert/Update function for OAuth callback
CREATE OR REPLACE FUNCTION upsert_shop_token(
  p_shop_domain TEXT,
  p_access_token TEXT,
  p_scope TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_shop_id UUID;
BEGIN
  INSERT INTO shops (shop_domain, access_token, scope)
  VALUES (p_shop_domain, p_access_token, p_scope)
  ON CONFLICT (shop_domain)
  DO UPDATE SET
    access_token = EXCLUDED.access_token,
    scope = COALESCE(EXCLUDED.scope, shops.scope),
    is_active = true,
    updated_at = NOW()
  RETURNING id INTO v_shop_id;

  RETURN v_shop_id;
END;
$$ LANGUAGE plpgsql;

-- Function to get access token for a shop
CREATE OR REPLACE FUNCTION get_shop_access_token(p_shop_domain TEXT)
RETURNS TEXT AS $$
DECLARE
  v_access_token TEXT;
BEGIN
  SELECT access_token INTO v_access_token
  FROM shops
  WHERE shop_domain = p_shop_domain
    AND is_active = true;

  -- Update last_used_at if token found
  IF v_access_token IS NOT NULL THEN
    PERFORM update_shop_last_used(p_shop_domain);
  END IF;

  RETURN v_access_token;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT SELECT ON shops TO anon, authenticated;
GRANT EXECUTE ON FUNCTION get_shop_access_token TO anon, authenticated;
GRANT EXECUTE ON FUNCTION upsert_shop_token TO anon, authenticated;