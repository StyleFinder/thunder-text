-- Thunder Text Incremental Migration
-- This adds Thunder Text specific tables while preserving existing data
-- Run this in Supabase SQL Editor: https://app.supabase.com/project/upkmmwvbspgeanotzknk/sql/new

-- Enable Row Level Security (if not already enabled)
ALTER DEFAULT PRIVILEGES REVOKE EXECUTE ON FUNCTIONS FROM PUBLIC;
ALTER DEFAULT PRIVILEGES IN SCHEMA PUBLIC REVOKE EXECUTE ON FUNCTIONS FROM PUBLIC;

-- Create stores table (maps to existing profiles/shopify_sessions if needed)
CREATE TABLE IF NOT EXISTS stores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_domain TEXT NOT NULL UNIQUE,
  access_token TEXT NOT NULL,
  plan TEXT DEFAULT 'starter' CHECK (plan IN ('starter', 'professional', 'enterprise', 'enterprise_plus')),
  settings JSONB DEFAULT '{}',
  usage_limits INTEGER DEFAULT 500,
  current_usage INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add Thunder Text specific columns to existing products table if they don't exist
DO $$
BEGIN
    -- Check if store_id column exists in products table
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                  WHERE table_name = 'products' AND column_name = 'store_id') THEN
        ALTER TABLE products ADD COLUMN store_id UUID REFERENCES stores(id) ON DELETE CASCADE;
    END IF;
    
    -- Check if shopify_product_id column exists
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                  WHERE table_name = 'products' AND column_name = 'shopify_product_id') THEN
        ALTER TABLE products ADD COLUMN shopify_product_id TEXT;
    END IF;
    
    -- Check if generated_data column exists
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                  WHERE table_name = 'products' AND column_name = 'generated_data') THEN
        ALTER TABLE products ADD COLUMN generated_data JSONB DEFAULT '{}';
    END IF;
    
    -- Check if status column exists
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                  WHERE table_name = 'products' AND column_name = 'status') THEN
        ALTER TABLE products ADD COLUMN status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'error'));
    END IF;
END $$;

-- Create images table (for Thunder Text image analysis)
CREATE TABLE IF NOT EXISTS images (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  analysis_results JSONB DEFAULT '{}',
  processed_at TIMESTAMP WITH TIME ZONE,
  storage_path TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enhance existing templates table with Thunder Text columns
DO $$
BEGIN
    -- Check if store_id column exists in templates table
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                  WHERE table_name = 'templates' AND column_name = 'store_id') THEN
        ALTER TABLE templates ADD COLUMN store_id UUID REFERENCES stores(id) ON DELETE CASCADE;
    END IF;
    
    -- Check if category column exists
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                  WHERE table_name = 'templates' AND column_name = 'category') THEN
        ALTER TABLE templates ADD COLUMN category TEXT;
    END IF;
    
    -- Check if variables column exists
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                  WHERE table_name = 'templates' AND column_name = 'variables') THEN
        ALTER TABLE templates ADD COLUMN variables JSONB DEFAULT '{}';
    END IF;
    
    -- Check if is_default column exists
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                  WHERE table_name = 'templates' AND column_name = 'is_default') THEN
        ALTER TABLE templates ADD COLUMN is_default BOOLEAN DEFAULT false;
    END IF;
END $$;

-- Create generation_jobs table (enhanced version of existing generation_history)
CREATE TABLE IF NOT EXISTS generation_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  product_ids UUID[] NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'error')),
  results JSONB DEFAULT '{}',
  ai_cost DECIMAL(10,4) DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create usage_metrics table for billing tracking
CREATE TABLE IF NOT EXISTS usage_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  generations_count INTEGER DEFAULT 0,
  ai_tokens_used INTEGER DEFAULT 0,
  period DATE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(store_id, period)
);

-- Create subscription_plans table (only if it doesn't exist)
CREATE TABLE IF NOT EXISTS subscription_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  price DECIMAL(10,2) NOT NULL,
  included_generations INTEGER NOT NULL,
  overage_rate DECIMAL(10,4) NOT NULL,
  features JSONB DEFAULT '{}',
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create usage_alerts table
CREATE TABLE IF NOT EXISTS usage_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  threshold_type TEXT NOT NULL CHECK (threshold_type IN ('usage_limit', 'cost_limit', 'quality_score')),
  threshold_value INTEGER NOT NULL,
  triggered_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  resolved_at TIMESTAMP WITH TIME ZONE,
  message TEXT
);

-- Create performance_data table
CREATE TABLE IF NOT EXISTS performance_data (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  conversion_rate DECIMAL(5,4),
  seo_score INTEGER CHECK (seo_score >= 0 AND seo_score <= 100),
  click_through_rate DECIMAL(5,4),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(product_id)
);

-- Create indexes for performance (only if they don't exist)
CREATE INDEX IF NOT EXISTS idx_stores_shop_domain ON stores(shop_domain);
CREATE INDEX IF NOT EXISTS idx_products_store_id ON products(store_id);
CREATE INDEX IF NOT EXISTS idx_products_shopify_id ON products(shopify_product_id);
CREATE INDEX IF NOT EXISTS idx_products_status ON products(status);
CREATE INDEX IF NOT EXISTS idx_images_product_id ON images(product_id);
CREATE INDEX IF NOT EXISTS idx_templates_store_id ON templates(store_id);
CREATE INDEX IF NOT EXISTS idx_generation_jobs_store_id ON generation_jobs(store_id);
CREATE INDEX IF NOT EXISTS idx_generation_jobs_status ON generation_jobs(status);
CREATE INDEX IF NOT EXISTS idx_usage_metrics_store_period ON usage_metrics(store_id, period);

-- Create or replace updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Add updated_at triggers (only if they don't exist)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_stores_updated_at') THEN
        CREATE TRIGGER update_stores_updated_at BEFORE UPDATE ON stores 
        FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_products_updated_at') THEN
        CREATE TRIGGER update_products_updated_at BEFORE UPDATE ON products 
        FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_templates_updated_at') THEN
        CREATE TRIGGER update_templates_updated_at BEFORE UPDATE ON templates 
        FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_generation_jobs_updated_at') THEN
        CREATE TRIGGER update_generation_jobs_updated_at BEFORE UPDATE ON generation_jobs 
        FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    END IF;
END $$;

-- Insert default subscription plans (only if they don't exist)
INSERT INTO subscription_plans (name, price, included_generations, overage_rate, features) 
SELECT * FROM (VALUES
    ('Starter', 29.00, 500, 0.15, '{"basic_templates": true, "standard_support": true, "single_store": true}'::jsonb),
    ('Professional', 79.00, 2000, 0.12, '{"advanced_templates": true, "priority_support": true, "bulk_processing": true, "analytics": true, "google_shopping": true}'::jsonb),
    ('Enterprise', 199.00, 5000, 0.10, '{"multi_store": true, "custom_templates": true, "dedicated_support": true, "api_access": true, "team_collaboration": true, "advanced_analytics": true}'::jsonb),
    ('Enterprise Plus', 499.00, 15000, 0.08, '{"white_label": true, "custom_integrations": true, "dedicated_account_manager": true, "sla_guarantees": true, "unlimited_batch_size": true}'::jsonb)
) AS new_plans(name, price, included_generations, overage_rate, features)
WHERE NOT EXISTS (SELECT 1 FROM subscription_plans WHERE subscription_plans.name = new_plans.name);

-- Enable Row Level Security policies on new tables
ALTER TABLE stores ENABLE ROW LEVEL SECURITY;
ALTER TABLE images ENABLE ROW LEVEL SECURITY;
ALTER TABLE generation_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE usage_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE usage_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE performance_data ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for new tables only
-- Stores: Users can only see their own store
DROP POLICY IF EXISTS "Users can view own store" ON stores;
CREATE POLICY "Users can view own store" ON stores FOR SELECT USING (auth.uid()::text = id::text OR shop_domain = current_setting('request.jwt.claims', true)::json->>'shop');

DROP POLICY IF EXISTS "Users can update own store" ON stores;
CREATE POLICY "Users can update own store" ON stores FOR UPDATE USING (auth.uid()::text = id::text OR shop_domain = current_setting('request.jwt.claims', true)::json->>'shop');

-- Images: Users can only see images from their products
DROP POLICY IF EXISTS "Users can view own images" ON images;
CREATE POLICY "Users can view own images" ON images FOR SELECT USING (product_id IN (SELECT id FROM products WHERE store_id IN (SELECT id FROM stores WHERE auth.uid()::text = id::text OR shop_domain = current_setting('request.jwt.claims', true)::json->>'shop')));

DROP POLICY IF EXISTS "Users can insert own images" ON images;
CREATE POLICY "Users can insert own images" ON images FOR INSERT WITH CHECK (product_id IN (SELECT id FROM products WHERE store_id IN (SELECT id FROM stores WHERE auth.uid()::text = id::text OR shop_domain = current_setting('request.jwt.claims', true)::json->>'shop')));

DROP POLICY IF EXISTS "Users can update own images" ON images;
CREATE POLICY "Users can update own images" ON images FOR UPDATE USING (product_id IN (SELECT id FROM products WHERE store_id IN (SELECT id FROM stores WHERE auth.uid()::text = id::text OR shop_domain = current_setting('request.jwt.claims', true)::json->>'shop')));

-- Generation jobs: Users can only see their own jobs
DROP POLICY IF EXISTS "Users can view own jobs" ON generation_jobs;
CREATE POLICY "Users can view own jobs" ON generation_jobs FOR SELECT USING (store_id IN (SELECT id FROM stores WHERE auth.uid()::text = id::text OR shop_domain = current_setting('request.jwt.claims', true)::json->>'shop'));

DROP POLICY IF EXISTS "Users can insert own jobs" ON generation_jobs;
CREATE POLICY "Users can insert own jobs" ON generation_jobs FOR INSERT WITH CHECK (store_id IN (SELECT id FROM stores WHERE auth.uid()::text = id::text OR shop_domain = current_setting('request.jwt.claims', true)::json->>'shop'));

DROP POLICY IF EXISTS "Users can update own jobs" ON generation_jobs;
CREATE POLICY "Users can update own jobs" ON generation_jobs FOR UPDATE USING (store_id IN (SELECT id FROM stores WHERE auth.uid()::text = id::text OR shop_domain = current_setting('request.jwt.claims', true)::json->>'shop'));

-- Usage metrics: Users can only see their own usage
DROP POLICY IF EXISTS "Users can view own usage" ON usage_metrics;
CREATE POLICY "Users can view own usage" ON usage_metrics FOR SELECT USING (store_id IN (SELECT id FROM stores WHERE auth.uid()::text = id::text OR shop_domain = current_setting('request.jwt.claims', true)::json->>'shop'));

DROP POLICY IF EXISTS "Users can insert own usage" ON usage_metrics;
CREATE POLICY "Users can insert own usage" ON usage_metrics FOR INSERT WITH CHECK (store_id IN (SELECT id FROM stores WHERE auth.uid()::text = id::text OR shop_domain = current_setting('request.jwt.claims', true)::json->>'shop'));

DROP POLICY IF EXISTS "Users can update own usage" ON usage_metrics;
CREATE POLICY "Users can update own usage" ON usage_metrics FOR UPDATE USING (store_id IN (SELECT id FROM stores WHERE auth.uid()::text = id::text OR shop_domain = current_setting('request.jwt.claims', true)::json->>'shop'));

-- Usage alerts: Users can only see their own alerts
DROP POLICY IF EXISTS "Users can view own alerts" ON usage_alerts;
CREATE POLICY "Users can view own alerts" ON usage_alerts FOR SELECT USING (store_id IN (SELECT id FROM stores WHERE auth.uid()::text = id::text OR shop_domain = current_setting('request.jwt.claims', true)::json->>'shop'));

-- Performance data: Users can only see performance for their products
DROP POLICY IF EXISTS "Users can view own performance data" ON performance_data;
CREATE POLICY "Users can view own performance data" ON performance_data FOR SELECT USING (product_id IN (SELECT id FROM products WHERE store_id IN (SELECT id FROM stores WHERE auth.uid()::text = id::text OR shop_domain = current_setting('request.jwt.claims', true)::json->>'shop')));

-- Create a store record for the existing data migration
-- This will help connect existing data to the new Thunder Text structure
INSERT INTO stores (shop_domain, access_token, plan, current_usage, usage_limits)
SELECT 
    'existing-store.myshopify.com' as shop_domain,
    'temp_token_will_be_updated_on_oauth' as access_token,
    'professional' as plan,
    COALESCE((SELECT COUNT(*) FROM generation_history), 0) as current_usage,
    2000 as usage_limits
WHERE NOT EXISTS (SELECT 1 FROM stores WHERE shop_domain = 'existing-store.myshopify.com');

-- Update existing products to link to the store (if they don't have store_id)
UPDATE products 
SET store_id = (SELECT id FROM stores WHERE shop_domain = 'existing-store.myshopify.com' LIMIT 1)
WHERE store_id IS NULL;

-- Update existing templates to link to the store (if they don't have store_id)  
UPDATE templates
SET store_id = (SELECT id FROM stores WHERE shop_domain = 'existing-store.myshopify.com' LIMIT 1)
WHERE store_id IS NULL;

-- Migration complete notification
DO $$
BEGIN
    RAISE NOTICE 'Thunder Text incremental migration completed successfully!';
    RAISE NOTICE 'New tables created: stores, images, generation_jobs, usage_metrics, subscription_plans, usage_alerts, performance_data';
    RAISE NOTICE 'Existing tables enhanced: products, templates';
    RAISE NOTICE 'Your existing data has been preserved and linked to the new structure.';
END $$;