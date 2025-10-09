-- Consolidate stores table into shops table to eliminate confusion
-- The shops table has the actual data and is actively used
-- The stores table is empty and unused

-- Step 1: Add missing columns from stores to shops
ALTER TABLE shops ADD COLUMN IF NOT EXISTS plan TEXT DEFAULT 'free';
ALTER TABLE shops ADD COLUMN IF NOT EXISTS settings JSONB DEFAULT '{}'::jsonb;
ALTER TABLE shops ADD COLUMN IF NOT EXISTS usage_limits INTEGER DEFAULT 100;
ALTER TABLE shops ADD COLUMN IF NOT EXISTS current_usage INTEGER DEFAULT 0;

-- Step 2: Add created_at if it doesn't exist
ALTER TABLE shops ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Step 3: Update foreign keys from stores to shops
-- Drop existing constraints on tables that reference stores
ALTER TABLE products DROP CONSTRAINT IF EXISTS products_store_id_fkey;
ALTER TABLE generation_jobs DROP CONSTRAINT IF EXISTS generation_jobs_store_id_fkey;
ALTER TABLE usage_metrics DROP CONSTRAINT IF EXISTS usage_metrics_store_id_fkey;
ALTER TABLE usage_alerts DROP CONSTRAINT IF EXISTS usage_alerts_store_id_fkey;

-- Add new constraints pointing to shops
ALTER TABLE products
  ADD CONSTRAINT products_store_id_fkey
  FOREIGN KEY (store_id) REFERENCES shops(id) ON DELETE CASCADE;

ALTER TABLE generation_jobs
  ADD CONSTRAINT generation_jobs_store_id_fkey
  FOREIGN KEY (store_id) REFERENCES shops(id) ON DELETE CASCADE;

ALTER TABLE usage_metrics
  ADD CONSTRAINT usage_metrics_store_id_fkey
  FOREIGN KEY (store_id) REFERENCES shops(id) ON DELETE CASCADE;

ALTER TABLE usage_alerts
  ADD CONSTRAINT usage_alerts_store_id_fkey
  FOREIGN KEY (store_id) REFERENCES shops(id) ON DELETE CASCADE;

-- Step 4: Drop RLS policies that reference stores table
DROP POLICY IF EXISTS "Users can view own products" ON products;
DROP POLICY IF EXISTS "Users can insert own products" ON products;
DROP POLICY IF EXISTS "Users can update own products" ON products;
DROP POLICY IF EXISTS "Users can delete own products" ON products;
DROP POLICY IF EXISTS "Users can view own images" ON images;
DROP POLICY IF EXISTS "Users can insert own images" ON images;
DROP POLICY IF EXISTS "Users can update own images" ON images;
DROP POLICY IF EXISTS "Users can view own templates" ON templates;
DROP POLICY IF EXISTS "Users can insert own templates" ON templates;
DROP POLICY IF EXISTS "Users can update own templates" ON templates;
DROP POLICY IF EXISTS "Users can delete own templates" ON templates;
DROP POLICY IF EXISTS "Users can view own jobs" ON generation_jobs;
DROP POLICY IF EXISTS "Users can insert own jobs" ON generation_jobs;
DROP POLICY IF EXISTS "Users can update own jobs" ON generation_jobs;
DROP POLICY IF EXISTS "Users can view own usage" ON usage_metrics;
DROP POLICY IF EXISTS "Users can insert own usage" ON usage_metrics;
DROP POLICY IF EXISTS "Users can update own usage" ON usage_metrics;
DROP POLICY IF EXISTS "Users can view own alerts" ON usage_alerts;
DROP POLICY IF EXISTS "Users can view own performance data" ON performance_data;

-- Step 5: Drop the unused stores table (now safe after removing policy dependencies)
DROP TABLE IF EXISTS stores CASCADE;

-- Step 6: Add helpful indexes on the new columns
CREATE INDEX IF NOT EXISTS idx_shops_plan ON shops(plan);
CREATE INDEX IF NOT EXISTS idx_shops_is_active ON shops(is_active);

-- Add comments for documentation
COMMENT ON TABLE shops IS 'Primary store table containing Shopify OAuth credentials, settings, and subscription information. This is the single source of truth for all store data.';
COMMENT ON COLUMN shops.access_token IS 'Shopify API access token for making authenticated requests';
COMMENT ON COLUMN shops.plan IS 'Subscription plan tier (free, basic, pro, etc.)';
COMMENT ON COLUMN shops.settings IS 'Store-specific settings and preferences stored as JSON';
COMMENT ON COLUMN shops.usage_limits IS 'Monthly usage limit based on subscription plan';
COMMENT ON COLUMN shops.current_usage IS 'Current month usage count';
