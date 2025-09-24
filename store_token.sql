-- Store the access token from your Private App
-- Replace 'shpat_YOUR_TOKEN_HERE' with the actual token from Shopify

INSERT INTO shops (
  shop_domain,
  access_token,
  scope,
  is_active
) VALUES (
  'zunosai-staging-test-store.myshopify.com',
  'shpat_YOUR_TOKEN_HERE', -- <-- REPLACE THIS WITH YOUR TOKEN
  'read_products,write_products,read_product_listings,read_inventory,write_inventory',
  true
)
ON CONFLICT (shop_domain)
DO UPDATE SET
  access_token = EXCLUDED.access_token,
  is_active = true,
  updated_at = NOW();

-- Verify the token was stored
SELECT shop_domain,
       LEFT(access_token, 20) || '...' as token_preview,
       is_active,
       installed_at
FROM shops
WHERE shop_domain = 'zunosai-staging-test-store.myshopify.com';