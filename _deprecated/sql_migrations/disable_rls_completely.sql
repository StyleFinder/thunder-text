-- COMPLETE RLS DISABLE FOR DEVELOPMENT
-- This completely disables Row Level Security for development environment
-- WARNING: This should only be used in development, not production

-- Drop all existing policies completely
DO $$ 
DECLARE
    pol record;
BEGIN
    FOR pol IN SELECT schemaname, tablename, policyname 
               FROM pg_policies 
               WHERE tablename = 'custom_categories'
    LOOP
        EXECUTE 'DROP POLICY IF EXISTS ' || quote_ident(pol.policyname) || ' ON ' || quote_ident(pol.schemaname) || '.' || quote_ident(pol.tablename);
    END LOOP;
END $$;

-- Completely disable RLS for custom_categories table
ALTER TABLE custom_categories DISABLE ROW LEVEL SECURITY;

-- Make sure stores table also has no RLS issues
DO $$ 
DECLARE
    pol record;
BEGIN
    FOR pol IN SELECT schemaname, tablename, policyname 
               FROM pg_policies 
               WHERE tablename = 'stores'
    LOOP
        EXECUTE 'DROP POLICY IF EXISTS ' || quote_ident(pol.policyname) || ' ON ' || quote_ident(pol.schemaname) || '.' || quote_ident(pol.tablename);
    END LOOP;
END $$;

ALTER TABLE stores DISABLE ROW LEVEL SECURITY;

-- Ensure the stores table exists with our development data
CREATE TABLE IF NOT EXISTS stores (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    shop_domain VARCHAR(255) UNIQUE NOT NULL,
    access_token VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Insert development store record
INSERT INTO stores (id, shop_domain, access_token) 
VALUES (
    '550e8400-e29b-41d4-a716-446655440000',
    'zunosai-staging-test-store.myshopify.com',
    'dev-token'
) ON CONFLICT (shop_domain) 
DO UPDATE SET 
    id = '550e8400-e29b-41d4-a716-446655440000',
    access_token = 'dev-token',
    updated_at = CURRENT_TIMESTAMP;

-- Ensure custom_categories table exists
CREATE TABLE IF NOT EXISTS custom_categories (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    is_default BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(store_id, name)
);

-- Insert a few test categories for development
INSERT INTO custom_categories (store_id, name, description, is_default) VALUES
    ('550e8400-e29b-41d4-a716-446655440000', 'Electronics', 'Electronic devices and gadgets', true),
    ('550e8400-e29b-41d4-a716-446655440000', 'Clothing', 'Apparel and accessories', false),
    ('550e8400-e29b-41d4-a716-446655440000', 'Home & Garden', 'Home improvement and garden supplies', false)
ON CONFLICT (store_id, name) DO NOTHING;

-- Verify the setup
SELECT 'Development store created:' as message, * FROM stores WHERE id = '550e8400-e29b-41d4-a716-446655440000';
SELECT 'Sample categories created:' as message, count(*) as category_count FROM custom_categories WHERE store_id = '550e8400-e29b-41d4-a716-446655440000';

COMMENT ON TABLE custom_categories IS 'RLS completely disabled for development environment';
COMMENT ON TABLE stores IS 'RLS completely disabled for development environment';