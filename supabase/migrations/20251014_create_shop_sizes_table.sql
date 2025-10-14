-- Create shop_sizes table for user-generated sizing sets
-- This allows shop owners to create custom sizing options for their products

CREATE TABLE IF NOT EXISTS public.shop_sizes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  store_id VARCHAR(100) NOT NULL,
  name VARCHAR(100) NOT NULL,
  sizes TEXT[] NOT NULL,
  is_default BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Create unique partial index to ensure only one default per shop
CREATE UNIQUE INDEX IF NOT EXISTS idx_shop_sizes_unique_default
  ON public.shop_sizes(store_id)
  WHERE is_default = true;

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_shop_sizes_store_id ON public.shop_sizes(store_id);
CREATE INDEX IF NOT EXISTS idx_shop_sizes_is_default ON public.shop_sizes(store_id, is_default) WHERE is_default = true;

-- Grant table-level permissions (must match category_templates exactly)
GRANT ALL PRIVILEGES ON public.shop_sizes TO postgres, anon, authenticated, service_role;

-- Enable Row Level Security
ALTER TABLE public.shop_sizes ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Allow service role full bypass
CREATE POLICY "Shop sizes accessible by service role"
  ON public.shop_sizes
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- RLS Policy: Allow anon and authenticated users full access
CREATE POLICY "Allow all operations on shop_sizes"
  ON public.shop_sizes
  FOR ALL
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

-- Add table comment
COMMENT ON TABLE public.shop_sizes IS 'Stores custom sizing sets for each shop (e.g., Women''s Standard, Plus Sizes, Numeric Sizes)';

-- Insert default sizing sets for all shops (using 'default' as placeholder)
INSERT INTO public.shop_sizes (store_id, name, sizes, is_default) VALUES
  ('default', 'Standard Sizes', ARRAY['XS', 'S', 'M', 'L', 'XL', 'XXL'], true),
  ('default', 'Plus Sizes', ARRAY['1X', '2X', '3X', '4X', '5X'], false),
  ('default', 'Numeric Sizes', ARRAY['0', '2', '4', '6', '8', '10', '12', '14', '16', '18', '20'], false),
  ('default', 'Shoe Sizes', ARRAY['5', '5.5', '6', '6.5', '7', '7.5', '8', '8.5', '9', '9.5', '10', '10.5', '11'], false),
  ('default', 'Extended Sizes', ARRAY['XXS', 'XS', 'S', 'M', 'L', 'XL', 'XXL', 'XXXL'], false)
ON CONFLICT DO NOTHING;

-- Notify PostgREST to reload schema
NOTIFY pgrst, 'reload schema';
