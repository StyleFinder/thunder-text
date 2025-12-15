-- Comprehensive RLS Fix for Development Environment
-- This completely disables RLS for development or provides super permissive policies

-- Drop existing policies to avoid conflicts
DROP POLICY IF EXISTS "Development bypass for categories SELECT" ON custom_categories;
DROP POLICY IF EXISTS "Development bypass for categories INSERT" ON custom_categories;
DROP POLICY IF EXISTS "Development bypass for categories UPDATE" ON custom_categories;
DROP POLICY IF EXISTS "Development bypass for categories DELETE" ON custom_categories;

-- Drop any other existing policies (just in case)
DROP POLICY IF EXISTS "Enable read access for all users" ON custom_categories;
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON custom_categories;
DROP POLICY IF EXISTS "Enable update for authenticated users" ON custom_categories;
DROP POLICY IF EXISTS "Enable delete for authenticated users" ON custom_categories;
DROP POLICY IF EXISTS "Users can view own store categories" ON custom_categories;
DROP POLICY IF EXISTS "Users can create categories for own store" ON custom_categories;
DROP POLICY IF EXISTS "Users can update own store categories" ON custom_categories;
DROP POLICY IF EXISTS "Users can delete own store categories" ON custom_categories;

-- OPTION 1: Completely disable RLS for development (most permissive)
-- ALTER TABLE custom_categories DISABLE ROW LEVEL SECURITY;

-- OPTION 2: Super permissive policies (safer than disabling RLS completely)
-- These allow ALL operations regardless of authentication status

CREATE POLICY "Allow all SELECT operations" ON custom_categories
  FOR SELECT USING (true);

CREATE POLICY "Allow all INSERT operations" ON custom_categories
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow all UPDATE operations" ON custom_categories
  FOR UPDATE USING (true) WITH CHECK (true);

CREATE POLICY "Allow all DELETE operations" ON custom_categories
  FOR DELETE USING (true);

-- Make sure RLS is enabled but with permissive policies
ALTER TABLE custom_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE custom_categories FORCE ROW LEVEL SECURITY;

-- Also check if the stores table exists and has proper structure
-- If not, create a minimal version for development
CREATE TABLE IF NOT EXISTS stores (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    shop_domain VARCHAR(255) UNIQUE NOT NULL,
    access_token VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Insert a development store record if it doesn't exist
INSERT INTO stores (id, shop_domain, access_token) 
VALUES (
    '550e8400-e29b-41d4-a716-446655440000', -- Static UUID for development
    'zunosai-staging-test-store.myshopify.com',
    'dev-token'
) ON CONFLICT (shop_domain) DO NOTHING;

-- Also ensure permissive policies on stores table for development
DROP POLICY IF EXISTS "Allow all stores operations" ON stores;
CREATE POLICY "Allow all stores operations" ON stores FOR ALL USING (true) WITH CHECK (true);
ALTER TABLE stores ENABLE ROW LEVEL SECURITY;

COMMENT ON TABLE custom_categories IS 'Custom categories with super permissive RLS policies for development';