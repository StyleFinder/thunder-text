-- Add is_default column to custom_sizing table and populate default sizing options

-- Add is_default column to the custom_sizing table
ALTER TABLE custom_sizing 
ADD COLUMN IF NOT EXISTS is_default BOOLEAN DEFAULT false;

-- Create index for better query performance on is_default field
CREATE INDEX IF NOT EXISTS idx_custom_sizing_is_default ON custom_sizing(is_default);

-- Insert default sizing options for the development store
INSERT INTO custom_sizing (store_id, name, sizes, is_default) VALUES 
  ('550e8400-e29b-41d4-a716-446655440000', 'One Size', ARRAY['One Size'], true),
  ('550e8400-e29b-41d4-a716-446655440000', 'XS - XL', ARRAY['XS', 'S', 'M', 'L', 'XL'], true),
  ('550e8400-e29b-41d4-a716-446655440000', 'XS - XXL', ARRAY['XS', 'S', 'M', 'L', 'XL', 'XXL'], true),
  ('550e8400-e29b-41d4-a716-446655440000', 'XS - XXXL', ARRAY['XS', 'S', 'M', 'L', 'XL', 'XXL', 'XXXL'], true),
  ('550e8400-e29b-41d4-a716-446655440000', 'Numeric (6-16)', ARRAY['6', '8', '10', '12', '14', '16'], true),
  ('550e8400-e29b-41d4-a716-446655440000', 'Numeric (28-44)', ARRAY['28', '30', '32', '34', '36', '38', '40', '42', '44'], true),
  ('550e8400-e29b-41d4-a716-446655440000', 'Children (2T-14)', ARRAY['2T', '3T', '4T', '5T', '6', '7', '8', '10', '12', '14'], true)
ON CONFLICT (store_id, name) DO NOTHING;

-- Update RLS policies to handle is_default field
-- The existing policies should still work, but let's ensure they cover the new field properly

-- Update the development bypass policy to be more explicit
DROP POLICY IF EXISTS "Development bypass for custom sizing" ON custom_sizing;
CREATE POLICY "Development bypass for custom sizing" ON custom_sizing
  FOR ALL USING (store_id = '550e8400-e29b-41d4-a716-446655440000');