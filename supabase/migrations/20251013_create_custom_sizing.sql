-- Create custom_sizing table for Thunder Text
-- Stores user-defined size sets for product creation

CREATE TABLE IF NOT EXISTS public.custom_sizing (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  sizes TEXT[] NOT NULL,
  is_default BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index on store_id for faster lookups
CREATE INDEX IF NOT EXISTS idx_custom_sizing_store_id ON public.custom_sizing(store_id);
CREATE INDEX IF NOT EXISTS idx_custom_sizing_store_default ON public.custom_sizing(store_id, is_default);

-- Enable Row Level Security
ALTER TABLE public.custom_sizing ENABLE ROW LEVEL SECURITY;

-- Create RLS policy matching category_templates pattern (qual: true)
CREATE POLICY "Sizing accessible by service role"
  ON public.custom_sizing
  FOR ALL
  TO public
  USING (true);

-- Grant permissions
GRANT ALL ON public.custom_sizing TO postgres, service_role;

-- Comments for documentation
COMMENT ON TABLE public.custom_sizing IS 'Stores custom size sets for each shop (e.g., S/M/L, XS-XXL, numeric sizes)';
COMMENT ON COLUMN public.custom_sizing.name IS 'User-defined name for this size set (e.g., "Standard Sizes", "Extended Sizes")';
COMMENT ON COLUMN public.custom_sizing.sizes IS 'Array of size values, auto-capitalized on save';
COMMENT ON COLUMN public.custom_sizing.is_default IS 'Only one size set per store can be marked as default';
