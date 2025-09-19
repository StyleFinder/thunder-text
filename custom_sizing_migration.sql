-- Custom Sizing Management Migration
-- This creates the custom_sizing table for store owners to manage their own sizing options

-- Create custom_sizing table
CREATE TABLE IF NOT EXISTS custom_sizing (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  store_id UUID NOT NULL,
  name VARCHAR(255) NOT NULL,
  sizes TEXT[] NOT NULL DEFAULT '{}',
  is_active BOOLEAN DEFAULT true,
  is_default BOOLEAN DEFAULT false, -- New field to identify default/built-in sizing
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_custom_sizing_store_id ON custom_sizing(store_id);
CREATE INDEX IF NOT EXISTS idx_custom_sizing_active ON custom_sizing(is_active);
CREATE INDEX IF NOT EXISTS idx_custom_sizing_name ON custom_sizing(store_id, name);

-- Ensure unique sizing names per store
ALTER TABLE custom_sizing 
DROP CONSTRAINT IF EXISTS unique_sizing_name_per_store;

ALTER TABLE custom_sizing 
ADD CONSTRAINT unique_sizing_name_per_store 
UNIQUE (store_id, name);

-- Add updated_at trigger
CREATE OR REPLACE FUNCTION update_custom_sizing_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_custom_sizing_updated_at ON custom_sizing;
CREATE TRIGGER update_custom_sizing_updated_at
  BEFORE UPDATE ON custom_sizing
  FOR EACH ROW
  EXECUTE FUNCTION update_custom_sizing_updated_at();

-- Insert default sizing options for development
INSERT INTO custom_sizing (store_id, name, sizes, is_default) VALUES 
  ('550e8400-e29b-41d4-a716-446655440000', 'One Size', ARRAY['One Size'], true),
  ('550e8400-e29b-41d4-a716-446655440000', 'XS - XL', ARRAY['XS', 'S', 'M', 'L', 'XL'], true),
  ('550e8400-e29b-41d4-a716-446655440000', 'XS - XXL', ARRAY['XS', 'S', 'M', 'L', 'XL', 'XXL'], true),
  ('550e8400-e29b-41d4-a716-446655440000', 'XS - XXXL', ARRAY['XS', 'S', 'M', 'L', 'XL', 'XXL', 'XXXL'], true),
  ('550e8400-e29b-41d4-a716-446655440000', 'Numeric (6-16)', ARRAY['6', '8', '10', '12', '14', '16'], true),
  ('550e8400-e29b-41d4-a716-446655440000', 'Numeric (28-44)', ARRAY['28', '30', '32', '34', '36', '38', '40', '42', '44'], true),
  ('550e8400-e29b-41d4-a716-446655440000', 'Children (2T-14)', ARRAY['2T', '3T', '4T', '5T', '6', '7', '8', '10', '12', '14'], true)
ON CONFLICT (store_id, name) DO NOTHING;

-- RLS (Row Level Security) Policies for production
-- Enable RLS on the custom_sizing table
ALTER TABLE custom_sizing ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view their own custom sizing" ON custom_sizing;
DROP POLICY IF EXISTS "Users can create their own custom sizing" ON custom_sizing;
DROP POLICY IF EXISTS "Users can update their own custom sizing" ON custom_sizing;
DROP POLICY IF EXISTS "Users can delete their own custom sizing" ON custom_sizing;

-- Create RLS policies for production
CREATE POLICY "Users can view their own custom sizing" ON custom_sizing
  FOR SELECT USING (auth.uid() = store_id);

CREATE POLICY "Users can create their own custom sizing" ON custom_sizing
  FOR INSERT WITH CHECK (auth.uid() = store_id);

CREATE POLICY "Users can update their own custom sizing" ON custom_sizing
  FOR UPDATE USING (auth.uid() = store_id);

CREATE POLICY "Users can delete their own custom sizing" ON custom_sizing
  FOR DELETE USING (auth.uid() = store_id);

-- Development RLS policy for bypass mode (allows all operations for development UUID)
CREATE POLICY "Development bypass for custom sizing" ON custom_sizing
  FOR ALL USING (store_id = '550e8400-e29b-41d4-a716-446655440000');

-- Grant permissions
GRANT ALL ON custom_sizing TO authenticated;
GRANT ALL ON custom_sizing TO anon;