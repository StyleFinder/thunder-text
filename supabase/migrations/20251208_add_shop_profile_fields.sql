-- Add shop profile fields for store information
-- These fields can be edited by coaches and admins on the store detail page

ALTER TABLE shops
  ADD COLUMN IF NOT EXISTS owner_name TEXT,
  ADD COLUMN IF NOT EXISTS owner_phone TEXT,
  ADD COLUMN IF NOT EXISTS industry_niche TEXT,
  ADD COLUMN IF NOT EXISTS years_in_business INTEGER,
  ADD COLUMN IF NOT EXISTS city TEXT,
  ADD COLUMN IF NOT EXISTS state TEXT,
  ADD COLUMN IF NOT EXISTS store_type TEXT CHECK (store_type IS NULL OR store_type IN ('online', 'brick-and-mortar', 'both')),
  ADD COLUMN IF NOT EXISTS ecommerce_platform TEXT CHECK (ecommerce_platform IS NULL OR ecommerce_platform IN ('shopify', 'woocommerce', 'bigcommerce', 'custom', 'other')),
  ADD COLUMN IF NOT EXISTS advertising_goals TEXT;

-- Add comments for documentation
COMMENT ON COLUMN shops.owner_name IS 'Name of the store owner';
COMMENT ON COLUMN shops.owner_phone IS 'Phone number of the store owner';
COMMENT ON COLUMN shops.industry_niche IS 'Industry or niche of the store (e.g., Women''s Clothing, Baby Goods)';
COMMENT ON COLUMN shops.years_in_business IS 'Number of years the store has been in business';
COMMENT ON COLUMN shops.city IS 'City where the store is located';
COMMENT ON COLUMN shops.state IS 'State/region where the store is located';
COMMENT ON COLUMN shops.store_type IS 'Type of store: online, brick-and-mortar, or both';
COMMENT ON COLUMN shops.ecommerce_platform IS 'E-commerce platform used by the store';
COMMENT ON COLUMN shops.advertising_goals IS 'Store advertising goals and objectives';
