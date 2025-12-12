-- Allow standalone shops (email/password users) without Shopify credentials
-- The original access_token column was NOT NULL, which prevents standalone user creation

-- Drop NOT NULL constraint from shopify_access_token if it exists
-- Use DO block to conditionally alter based on actual column state
DO $$
BEGIN
  -- Check if shopify_access_token column has NOT NULL constraint
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'shops'
    AND column_name = 'shopify_access_token'
    AND is_nullable = 'NO'
  ) THEN
    ALTER TABLE shops ALTER COLUMN shopify_access_token DROP NOT NULL;
    RAISE NOTICE 'Dropped NOT NULL from shopify_access_token';
  END IF;

  -- Also check for legacy access_token column (in case it wasn't renamed)
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'shops'
    AND column_name = 'access_token'
    AND is_nullable = 'NO'
  ) THEN
    ALTER TABLE shops ALTER COLUMN access_token DROP NOT NULL;
    RAISE NOTICE 'Dropped NOT NULL from access_token';
  END IF;
END $$;

-- Add comment explaining the change
COMMENT ON COLUMN shops.shopify_access_token IS 'Shopify API access token - NULL for standalone (email/password) users';
