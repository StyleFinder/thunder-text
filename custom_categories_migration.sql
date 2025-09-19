-- Custom Categories Migration for Thunder Text
-- Add custom product categories table for store-specific category management

-- Create custom_categories table
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

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_custom_categories_store_id ON custom_categories(store_id);
CREATE INDEX IF NOT EXISTS idx_custom_categories_name ON custom_categories(name);
CREATE INDEX IF NOT EXISTS idx_custom_categories_default ON custom_categories(store_id, is_default) WHERE is_default = TRUE;

-- Add Row Level Security (RLS)
ALTER TABLE custom_categories ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view their own custom categories"
  ON custom_categories FOR SELECT
  USING (store_id = auth.uid());

CREATE POLICY "Users can insert their own custom categories"
  ON custom_categories FOR INSERT
  WITH CHECK (store_id = auth.uid());

CREATE POLICY "Users can update their own custom categories"
  ON custom_categories FOR UPDATE
  USING (store_id = auth.uid())
  WITH CHECK (store_id = auth.uid());

CREATE POLICY "Users can delete their own custom categories"
  ON custom_categories FOR DELETE
  USING (store_id = auth.uid());

-- Add updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE 'plpgsql';

CREATE TRIGGER update_custom_categories_updated_at
  BEFORE UPDATE ON custom_categories
  FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

-- Insert default categories for existing stores (optional)
-- Uncomment the lines below if you want to add default categories for existing stores

/*
INSERT INTO custom_categories (store_id, name, description, is_default)
SELECT 
  id as store_id,
  'Fashion & Apparel' as name,
  'Clothing, shoes, accessories, and fashion items' as description,
  true as is_default
FROM stores
WHERE NOT EXISTS (
  SELECT 1 FROM custom_categories 
  WHERE store_id = stores.id AND name = 'Fashion & Apparel'
);
*/