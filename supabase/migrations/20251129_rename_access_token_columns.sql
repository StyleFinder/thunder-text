-- Fix column mismatch between local and production databases
-- Production has shopify_access_token/shopify_access_token_legacy
-- Local migrations had access_token
-- This migration aligns them

-- Check if access_token exists and rename it
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'shops'
    AND column_name = 'access_token'
  ) THEN
    -- Rename access_token to shopify_access_token
    ALTER TABLE shops RENAME COLUMN access_token TO shopify_access_token;
    RAISE NOTICE 'Renamed access_token to shopify_access_token';
  END IF;
END $$;

-- Add shopify_access_token_legacy if it doesn't exist
ALTER TABLE shops ADD COLUMN IF NOT EXISTS shopify_access_token_legacy TEXT;

-- Update the get_shop_token function to use the correct column names
DROP FUNCTION IF EXISTS get_shop_token(TEXT);

CREATE OR REPLACE FUNCTION get_shop_token(
  p_shop_domain TEXT
)
RETURNS TABLE (
  access_token TEXT,
  scope TEXT
)
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    COALESCE(shops.shopify_access_token, shops.shopify_access_token_legacy) as access_token,
    shops.scope
  FROM shops
  WHERE shops.shop_domain = p_shop_domain
    AND shops.is_active = true
  LIMIT 1;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION get_shop_token(TEXT) TO anon, authenticated, service_role;

-- Add comments
COMMENT ON COLUMN shops.shopify_access_token IS 'Current Shopify API access token';
COMMENT ON COLUMN shops.shopify_access_token_legacy IS 'Legacy Shopify API access token for backwards compatibility';
COMMENT ON FUNCTION get_shop_token(TEXT) IS 'Retrieves shop access token using SECURITY DEFINER to bypass PostgREST permissions. Prefers shopify_access_token over legacy token.';
