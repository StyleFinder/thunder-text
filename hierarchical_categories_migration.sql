-- Hierarchical Categories Migration
-- Adds support for parent-child category relationships

-- First, apply the complete RLS disable if not already done
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

ALTER TABLE custom_categories DISABLE ROW LEVEL SECURITY;

-- Add parent_id column to support hierarchical structure
ALTER TABLE custom_categories 
ADD COLUMN IF NOT EXISTS parent_id UUID REFERENCES custom_categories(id) ON DELETE CASCADE,
ADD COLUMN IF NOT EXISTS category_level INTEGER DEFAULT 0, -- 0 for parent, 1 for child, 2 for grandchild, etc.
ADD COLUMN IF NOT EXISTS sort_order INTEGER DEFAULT 0; -- For custom ordering

-- Update the unique constraint to allow same names under different parents
ALTER TABLE custom_categories DROP CONSTRAINT IF EXISTS custom_categories_store_id_name_key;
ALTER TABLE custom_categories DROP CONSTRAINT IF EXISTS unique_category_per_parent;

-- Add new unique constraint that includes parent_id
ALTER TABLE custom_categories 
ADD CONSTRAINT unique_category_per_parent 
UNIQUE (store_id, name, parent_id);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_custom_categories_parent_id ON custom_categories(parent_id);
CREATE INDEX IF NOT EXISTS idx_custom_categories_store_parent ON custom_categories(store_id, parent_id);
CREATE INDEX IF NOT EXISTS idx_custom_categories_level ON custom_categories(category_level);

-- Insert development store if not exists
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

-- Clear existing categories to start fresh with hierarchical structure
DELETE FROM custom_categories WHERE store_id = '550e8400-e29b-41d4-a716-446655440000';

-- Insert sample hierarchical categories for development - Clothing-focused structure
-- Main Parent Category: Clothing
INSERT INTO custom_categories (id, store_id, name, description, parent_id, category_level, sort_order, is_default) VALUES
    ('11111111-1111-1111-1111-111111111111', '550e8400-e29b-41d4-a716-446655440000', 'Clothing', 'Apparel and accessories', NULL, 0, 1, true);

-- Sub-categories under Clothing
INSERT INTO custom_categories (store_id, name, description, parent_id, category_level, sort_order) VALUES
    ('550e8400-e29b-41d4-a716-446655440000', 'Tops', 'T-shirts, blouses, shirts', '11111111-1111-1111-1111-111111111111', 1, 1),
    ('550e8400-e29b-41d4-a716-446655440000', 'Sweaters', 'Pullovers, cardigans, hoodies', '11111111-1111-1111-1111-111111111111', 1, 2),
    ('550e8400-e29b-41d4-a716-446655440000', 'Jackets', 'Coats, blazers, outerwear', '11111111-1111-1111-1111-111111111111', 1, 3),
    ('550e8400-e29b-41d4-a716-446655440000', 'Jeans', 'Denim pants and shorts', '11111111-1111-1111-1111-111111111111', 1, 4),
    ('550e8400-e29b-41d4-a716-446655440000', 'Jewelry', 'Necklaces, earrings, rings', '11111111-1111-1111-1111-111111111111', 1, 5),
    ('550e8400-e29b-41d4-a716-446655440000', 'Dresses', 'Casual, formal, and party dresses', '11111111-1111-1111-1111-111111111111', 1, 6),
    ('550e8400-e29b-41d4-a716-446655440000', 'Pants', 'Trousers, leggings, casual pants', '11111111-1111-1111-1111-111111111111', 1, 7),
    ('550e8400-e29b-41d4-a716-446655440000', 'Shoes', 'Sneakers, boots, heels, sandals', '11111111-1111-1111-1111-111111111111', 1, 8),
    ('550e8400-e29b-41d4-a716-446655440000', 'Accessories', 'Bags, belts, scarves, hats', '11111111-1111-1111-1111-111111111111', 1, 9);

-- Create a view for easier querying of hierarchical data
CREATE OR REPLACE VIEW category_hierarchy AS
SELECT 
    c.id,
    c.store_id,
    c.name,
    c.description,
    c.parent_id,
    c.category_level,
    c.sort_order,
    c.is_default,
    c.created_at,
    c.updated_at,
    p.name as parent_name,
    -- Full path for breadcrumb display
    CASE 
        WHEN c.parent_id IS NULL THEN c.name
        ELSE p.name || ' > ' || c.name
    END as full_path
FROM custom_categories c
LEFT JOIN custom_categories p ON c.parent_id = p.id
ORDER BY c.store_id, c.sort_order, c.name;

-- Create function to get all children of a category (safely replace if exists)
CREATE OR REPLACE FUNCTION get_category_children(category_id UUID)
RETURNS TABLE(
    id UUID,
    store_id UUID,
    name VARCHAR(255),
    description TEXT,
    parent_id UUID,
    category_level INTEGER,
    sort_order INTEGER,
    is_default BOOLEAN,
    created_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ
) AS $$
BEGIN
    RETURN QUERY
    WITH RECURSIVE category_tree AS (
        -- Base case: direct children
        SELECT c.id, c.store_id, c.name, c.description, c.parent_id, 
               c.category_level, c.sort_order, c.is_default, c.created_at, c.updated_at
        FROM custom_categories c
        WHERE c.parent_id = category_id
        
        UNION ALL
        
        -- Recursive case: children of children
        SELECT c.id, c.store_id, c.name, c.description, c.parent_id,
               c.category_level, c.sort_order, c.is_default, c.created_at, c.updated_at
        FROM custom_categories c
        INNER JOIN category_tree ct ON c.parent_id = ct.id
    )
    SELECT * FROM category_tree ORDER BY sort_order, name;
END;
$$ LANGUAGE plpgsql;

-- Verify the hierarchical structure
SELECT 'Hierarchical categories created:' as message;
SELECT 
    CASE WHEN parent_id IS NULL THEN '📁 ' || name ELSE '  📄 ' || name END as category_display,
    category_level,
    full_path
FROM category_hierarchy 
WHERE store_id = '550e8400-e29b-41d4-a716-446655440000'
ORDER BY sort_order, name;

COMMENT ON TABLE custom_categories IS 'Hierarchical product categories with parent-child relationships';
COMMENT ON VIEW category_hierarchy IS 'View for easier querying of category hierarchy with parent names';
COMMENT ON FUNCTION get_category_children IS 'Recursive function to get all children of a category';