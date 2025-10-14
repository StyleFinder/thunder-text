-- Fix shop_sizes table to match category_templates schema
-- Change store_id from VARCHAR to UUID to match shops.id foreign key

-- Drop the table and recreate with correct types
DROP TABLE IF EXISTS public.shop_sizes CASCADE;

CREATE TABLE public.shop_sizes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  store_id UUID, -- Nullable UUID like category_templates
  name VARCHAR(100) NOT NULL,
  sizes TEXT[] NOT NULL,
  is_default BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create unique partial index to ensure only one default per shop
CREATE UNIQUE INDEX idx_shop_sizes_unique_default
  ON public.shop_sizes(store_id)
  WHERE is_default = true;

-- Create indexes for performance
CREATE INDEX idx_shop_sizes_store_id ON public.shop_sizes(store_id);
CREATE INDEX idx_shop_sizes_is_default ON public.shop_sizes(store_id, is_default) WHERE is_default = true;

-- Grant all privileges to match category_templates exactly
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

-- Insert default sizing sets with NULL store_id (like category_templates uses NULL for defaults)
INSERT INTO public.shop_sizes (store_id, name, sizes, is_default) VALUES
  (NULL, 'Standard Sizes', ARRAY['XS', 'S', 'M', 'L', 'XL', 'XXL'], true),
  (NULL, 'Plus Sizes', ARRAY['1X', '2X', '3X', '4X', '5X'], false),
  (NULL, 'Numeric Sizes', ARRAY['0', '2', '4', '6', '8', '10', '12', '14', '16', '18', '20'], false),
  (NULL, 'Shoe Sizes', ARRAY['5', '5.5', '6', '6.5', '7', '7.5', '8', '8.5', '9', '9.5', '10', '10.5', '11'], false),
  (NULL, 'Extended Sizes', ARRAY['XXS', 'XS', 'S', 'M', 'L', 'XL', 'XXL', 'XXXL'], false)
ON CONFLICT DO NOTHING;

NOTIFY pgrst, 'reload schema';
