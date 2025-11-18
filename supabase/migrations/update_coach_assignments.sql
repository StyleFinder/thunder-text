-- Add coach column to shops table (if not exists)
ALTER TABLE shops
ADD COLUMN IF NOT EXISTS assigned_coach text;

-- Create index for coach filtering (if not exists)
CREATE INDEX IF NOT EXISTS idx_shops_assigned_coach ON shops(assigned_coach);

-- Assign coaches to the 14 stores based on actual shop_domain values
UPDATE shops
SET assigned_coach = CASE
  WHEN shop_domain = 'test-store-1.myshopify.com' THEN 'jeff_fenn'
  WHEN shop_domain = 'test-store-2.myshopify.com' THEN 'zoe_spencer'
  WHEN shop_domain = 'test-store-1-1761313795020.myshopify.com' THEN 'erin_nussbaum'
  WHEN shop_domain = 'test-store-2-1761313795020.myshopify.com' THEN 'megan_tamayo'
  WHEN shop_domain = 'test-store-1-1761327088744.myshopify.com' THEN 'dylan_welling'
  WHEN shop_domain = 'test-store-2-1761327088744.myshopify.com' THEN 'katie_bradley'
  WHEN shop_domain = 'test-store-1-1761327101256.myshopify.com' THEN 'casey_rowe'
  WHEN shop_domain = 'test-store-2-1761327101256.myshopify.com' THEN 'jeff_fenn'
  WHEN shop_domain = 'test-store-1-1761437571530.myshopify.com' THEN 'zoe_spencer'
  WHEN shop_domain = 'test-store-2-1761437571530.myshopify.com' THEN 'erin_nussbaum'
  WHEN shop_domain = 'test-store-1-1761437587828.myshopify.com' THEN 'megan_tamayo'
  WHEN shop_domain = 'test-store-2-1761437587828.myshopify.com' THEN 'dylan_welling'
  WHEN shop_domain = 'test-function-access.myshopify.com' THEN 'katie_bradley'
  WHEN shop_domain = 'zunosai-staging-test-store.myshopify.com' THEN 'casey_rowe'
END
WHERE shop_domain IN (
  'test-store-1.myshopify.com',
  'test-store-2.myshopify.com',
  'test-store-1-1761313795020.myshopify.com',
  'test-store-2-1761313795020.myshopify.com',
  'test-store-1-1761327088744.myshopify.com',
  'test-store-2-1761327088744.myshopify.com',
  'test-store-1-1761327101256.myshopify.com',
  'test-store-2-1761327101256.myshopify.com',
  'test-store-1-1761437571530.myshopify.com',
  'test-store-2-1761437571530.myshopify.com',
  'test-store-1-1761437587828.myshopify.com',
  'test-store-2-1761437587828.myshopify.com',
  'test-function-access.myshopify.com',
  'zunosai-staging-test-store.myshopify.com'
);
