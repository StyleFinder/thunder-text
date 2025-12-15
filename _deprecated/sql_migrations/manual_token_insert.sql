-- Manual token insertion if you already have one
-- Replace 'your-actual-token-here' with your real Shopify access token

INSERT INTO shops (
  shop_domain,
  access_token,
  scope,
  is_active
) VALUES (
  'zunosai-staging-test-store.myshopify.com',
  'your-actual-token-here', -- Replace this!
  'read_products,write_products',
  true
)
ON CONFLICT (shop_domain)
DO UPDATE SET
  access_token = EXCLUDED.access_token,
  is_active = true,
  updated_at = NOW();