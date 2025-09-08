-- Thunder Text Database Migration
-- Apply this to your Supabase project: ***REMOVED***
-- Go to: https://app.supabase.com/project/***REMOVED***/sql/new
-- Copy and paste this entire script, then click "Run"

-- Enable Row Level Security
ALTER DEFAULT PRIVILEGES REVOKE EXECUTE ON FUNCTIONS FROM PUBLIC;
ALTER DEFAULT PRIVILEGES IN SCHEMA PUBLIC REVOKE EXECUTE ON FUNCTIONS FROM PUBLIC;

-- Create stores table
CREATE TABLE stores (
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

-- Create products table
CREATE TABLE products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  shopify_product_id TEXT NOT NULL,
  generated_data JSONB DEFAULT '{}',
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'error')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(store_id, shopify_product_id)
);

-- Create images table
CREATE TABLE images (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  analysis_results JSONB DEFAULT '{}',
  processed_at TIMESTAMP WITH TIME ZONE,
  storage_path TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create templates table
CREATE TABLE templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  content TEXT NOT NULL,
  category TEXT,
  variables JSONB DEFAULT '{}',
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(store_id, name)
);

-- Create generation_jobs table
CREATE TABLE generation_jobs (
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
CREATE TABLE usage_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  generations_count INTEGER DEFAULT 0,
  ai_tokens_used INTEGER DEFAULT 0,
  period DATE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(store_id, period)
);

-- Create subscription_plans table
CREATE TABLE subscription_plans (
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
CREATE TABLE usage_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  threshold_type TEXT NOT NULL CHECK (threshold_type IN ('usage_limit', 'cost_limit', 'quality_score')),
  threshold_value INTEGER NOT NULL,
  triggered_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  resolved_at TIMESTAMP WITH TIME ZONE,
  message TEXT
);

-- Create performance_data table
CREATE TABLE performance_data (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  conversion_rate DECIMAL(5,4),
  seo_score INTEGER CHECK (seo_score >= 0 AND seo_score <= 100),
  click_through_rate DECIMAL(5,4),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(product_id)
);

-- Create indexes for performance
CREATE INDEX idx_stores_shop_domain ON stores(shop_domain);
CREATE INDEX idx_products_store_id ON products(store_id);
CREATE INDEX idx_products_shopify_id ON products(shopify_product_id);
CREATE INDEX idx_products_status ON products(status);
CREATE INDEX idx_images_product_id ON images(product_id);
CREATE INDEX idx_templates_store_id ON templates(store_id);
CREATE INDEX idx_generation_jobs_store_id ON generation_jobs(store_id);
CREATE INDEX idx_generation_jobs_status ON generation_jobs(status);
CREATE INDEX idx_usage_metrics_store_period ON usage_metrics(store_id, period);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Add updated_at triggers
CREATE TRIGGER update_stores_updated_at BEFORE UPDATE ON stores FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_products_updated_at BEFORE UPDATE ON products FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_templates_updated_at BEFORE UPDATE ON templates FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_generation_jobs_updated_at BEFORE UPDATE ON generation_jobs FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert default subscription plans
INSERT INTO subscription_plans (name, price, included_generations, overage_rate, features) VALUES
('Starter', 29.00, 500, 0.15, '{"basic_templates": true, "standard_support": true, "single_store": true}'),
('Professional', 79.00, 2000, 0.12, '{"advanced_templates": true, "priority_support": true, "bulk_processing": true, "analytics": true, "google_shopping": true}'),
('Enterprise', 199.00, 5000, 0.10, '{"multi_store": true, "custom_templates": true, "dedicated_support": true, "api_access": true, "team_collaboration": true, "advanced_analytics": true}'),
('Enterprise Plus', 499.00, 15000, 0.08, '{"white_label": true, "custom_integrations": true, "dedicated_account_manager": true, "sla_guarantees": true, "unlimited_batch_size": true}');

-- Enable Row Level Security policies
ALTER TABLE stores ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE images ENABLE ROW LEVEL SECURITY;
ALTER TABLE templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE generation_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE usage_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE usage_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE performance_data ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
-- Stores: Users can only see their own store
CREATE POLICY "Users can view own store" ON stores FOR SELECT USING (auth.uid()::text = id::text OR shop_domain = current_setting('request.jwt.claims', true)::json->>'shop');
CREATE POLICY "Users can update own store" ON stores FOR UPDATE USING (auth.uid()::text = id::text OR shop_domain = current_setting('request.jwt.claims', true)::json->>'shop');

-- Products: Users can only see products from their store
CREATE POLICY "Users can view own products" ON products FOR SELECT USING (store_id IN (SELECT id FROM stores WHERE auth.uid()::text = id::text OR shop_domain = current_setting('request.jwt.claims', true)::json->>'shop'));
CREATE POLICY "Users can insert own products" ON products FOR INSERT WITH CHECK (store_id IN (SELECT id FROM stores WHERE auth.uid()::text = id::text OR shop_domain = current_setting('request.jwt.claims', true)::json->>'shop'));
CREATE POLICY "Users can update own products" ON products FOR UPDATE USING (store_id IN (SELECT id FROM stores WHERE auth.uid()::text = id::text OR shop_domain = current_setting('request.jwt.claims', true)::json->>'shop'));
CREATE POLICY "Users can delete own products" ON products FOR DELETE USING (store_id IN (SELECT id FROM stores WHERE auth.uid()::text = id::text OR shop_domain = current_setting('request.jwt.claims', true)::json->>'shop'));

-- Images: Users can only see images from their products
CREATE POLICY "Users can view own images" ON images FOR SELECT USING (product_id IN (SELECT id FROM products WHERE store_id IN (SELECT id FROM stores WHERE auth.uid()::text = id::text OR shop_domain = current_setting('request.jwt.claims', true)::json->>'shop')));
CREATE POLICY "Users can insert own images" ON images FOR INSERT WITH CHECK (product_id IN (SELECT id FROM products WHERE store_id IN (SELECT id FROM stores WHERE auth.uid()::text = id::text OR shop_domain = current_setting('request.jwt.claims', true)::json->>'shop')));
CREATE POLICY "Users can update own images" ON images FOR UPDATE USING (product_id IN (SELECT id FROM products WHERE store_id IN (SELECT id FROM stores WHERE auth.uid()::text = id::text OR shop_domain = current_setting('request.jwt.claims', true)::json->>'shop')));

-- Templates: Users can only see their own templates
CREATE POLICY "Users can view own templates" ON templates FOR SELECT USING (store_id IN (SELECT id FROM stores WHERE auth.uid()::text = id::text OR shop_domain = current_setting('request.jwt.claims', true)::json->>'shop'));
CREATE POLICY "Users can insert own templates" ON templates FOR INSERT WITH CHECK (store_id IN (SELECT id FROM stores WHERE auth.uid()::text = id::text OR shop_domain = current_setting('request.jwt.claims', true)::json->>'shop'));
CREATE POLICY "Users can update own templates" ON templates FOR UPDATE USING (store_id IN (SELECT id FROM stores WHERE auth.uid()::text = id::text OR shop_domain = current_setting('request.jwt.claims', true)::json->>'shop'));
CREATE POLICY "Users can delete own templates" ON templates FOR DELETE USING (store_id IN (SELECT id FROM stores WHERE auth.uid()::text = id::text OR shop_domain = current_setting('request.jwt.claims', true)::json->>'shop'));

-- Generation jobs: Users can only see their own jobs
CREATE POLICY "Users can view own jobs" ON generation_jobs FOR SELECT USING (store_id IN (SELECT id FROM stores WHERE auth.uid()::text = id::text OR shop_domain = current_setting('request.jwt.claims', true)::json->>'shop'));
CREATE POLICY "Users can insert own jobs" ON generation_jobs FOR INSERT WITH CHECK (store_id IN (SELECT id FROM stores WHERE auth.uid()::text = id::text OR shop_domain = current_setting('request.jwt.claims', true)::json->>'shop'));
CREATE POLICY "Users can update own jobs" ON generation_jobs FOR UPDATE USING (store_id IN (SELECT id FROM stores WHERE auth.uid()::text = id::text OR shop_domain = current_setting('request.jwt.claims', true)::json->>'shop'));

-- Usage metrics: Users can only see their own usage
CREATE POLICY "Users can view own usage" ON usage_metrics FOR SELECT USING (store_id IN (SELECT id FROM stores WHERE auth.uid()::text = id::text OR shop_domain = current_setting('request.jwt.claims', true)::json->>'shop'));
CREATE POLICY "Users can insert own usage" ON usage_metrics FOR INSERT WITH CHECK (store_id IN (SELECT id FROM stores WHERE auth.uid()::text = id::text OR shop_domain = current_setting('request.jwt.claims', true)::json->>'shop'));
CREATE POLICY "Users can update own usage" ON usage_metrics FOR UPDATE USING (store_id IN (SELECT id FROM stores WHERE auth.uid()::text = id::text OR shop_domain = current_setting('request.jwt.claims', true)::json->>'shop'));

-- Usage alerts: Users can only see their own alerts
CREATE POLICY "Users can view own alerts" ON usage_alerts FOR SELECT USING (store_id IN (SELECT id FROM stores WHERE auth.uid()::text = id::text OR shop_domain = current_setting('request.jwt.claims', true)::json->>'shop'));

-- Performance data: Users can only see performance for their products
CREATE POLICY "Users can view own performance data" ON performance_data FOR SELECT USING (product_id IN (SELECT id FROM products WHERE store_id IN (SELECT id FROM stores WHERE auth.uid()::text = id::text OR shop_domain = current_setting('request.jwt.claims', true)::json->>'shop')));

-- Subscription plans: Everyone can read plans (no policy needed for public read access)