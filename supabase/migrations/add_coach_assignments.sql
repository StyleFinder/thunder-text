-- Add coach column to shops table
ALTER TABLE shops
ADD COLUMN IF NOT EXISTS assigned_coach text;

-- Create index for coach filtering
CREATE INDEX IF NOT EXISTS idx_shops_assigned_coach ON shops(assigned_coach);

-- Randomly assign coaches to the 14 test stores
UPDATE shops
SET assigned_coach = CASE
  WHEN shop_domain = 'sallys-chic-collection.myshopify.com' THEN 'jeff_fenn'
  WHEN shop_domain = 'janes-forever-young.myshopify.com' THEN 'zoe_spencer'
  WHEN shop_domain = 'emilys-trendy-threads.myshopify.com' THEN 'erin_nussbaum'
  WHEN shop_domain = 'sophias-style-studio.myshopify.com' THEN 'megan_tamayo'
  WHEN shop_domain = 'olivias-wardrobe-wonders.myshopify.com' THEN 'dylan_welling'
  WHEN shop_domain = 'isabels-elegant-edge.myshopify.com' THEN 'katie_bradley'
  WHEN shop_domain = 'charlottes-closet-classics.myshopify.com' THEN 'casey_rowe'
  WHEN shop_domain = 'amelia-s-fashion-finds.myshopify.com' THEN 'jeff_fenn'
  WHEN shop_domain = 'mias-modern-mode.myshopify.com' THEN 'zoe_spencer'
  WHEN shop_domain = 'harper-s-haute-haven.myshopify.com' THEN 'erin_nussbaum'
  WHEN shop_domain = 'evelyn-s-exquisite-ensemble.myshopify.com' THEN 'megan_tamayo'
  WHEN shop_domain = 'abigail-s-accessory-atelier.myshopify.com' THEN 'dylan_welling'
  WHEN shop_domain = 'ella-s-essential-emporium.myshopify.com' THEN 'katie_bradley'
  WHEN shop_domain = 'elizabeth-s-elegant-boutique.myshopify.com' THEN 'casey_rowe'
END
WHERE is_active = true;
