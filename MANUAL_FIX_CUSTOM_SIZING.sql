-- MANUAL FIX: Create custom_sizing table in production Supabase database
-- Run this SQL in the Supabase Dashboard SQL Editor for project: upkmmwvbspgeanotzknk

-- 1. Create the custom_sizing table
CREATE TABLE IF NOT EXISTS public.custom_sizing (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL,
  name TEXT NOT NULL,
  sizes TEXT[] NOT NULL,
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Add foreign key constraint to shops table
ALTER TABLE public.custom_sizing
DROP CONSTRAINT IF EXISTS custom_sizing_store_id_fkey;

ALTER TABLE public.custom_sizing
ADD CONSTRAINT custom_sizing_store_id_fkey
FOREIGN KEY (store_id) REFERENCES public.shops(id) ON DELETE CASCADE;

-- 3. Create index for performance
CREATE INDEX IF NOT EXISTS idx_custom_sizing_store_id
ON public.custom_sizing(store_id);

-- 4. Enable RLS (Row Level Security)
ALTER TABLE public.custom_sizing ENABLE ROW LEVEL SECURITY;

-- 5. Create RLS policy to allow shop owners to see their own sizing options
CREATE POLICY "Users can view their own custom sizing"
  ON public.custom_sizing
  FOR SELECT
  USING (true); -- Adjust based on your auth requirements

-- 6. Initialize 7 default sizing options for existing shops
INSERT INTO public.custom_sizing (store_id, name, sizes, is_default)
SELECT
  s.id,
  'One Size',
  ARRAY['One Size'],
  true
FROM public.shops s
WHERE NOT EXISTS (
  SELECT 1 FROM public.custom_sizing cs
  WHERE cs.store_id = s.id AND cs.name = 'One Size'
);

INSERT INTO public.custom_sizing (store_id, name, sizes, is_default)
SELECT
  s.id,
  'XS - XL',
  ARRAY['XS', 'S', 'M', 'L', 'XL'],
  true
FROM public.shops s
WHERE NOT EXISTS (
  SELECT 1 FROM public.custom_sizing cs
  WHERE cs.store_id = s.id AND cs.name = 'XS - XL'
);

INSERT INTO public.custom_sizing (store_id, name, sizes, is_default)
SELECT
  s.id,
  'XS - XXL',
  ARRAY['XS', 'S', 'M', 'L', 'XL', 'XXL'],
  true
FROM public.shops s
WHERE NOT EXISTS (
  SELECT 1 FROM public.custom_sizing cs
  WHERE cs.store_id = s.id AND cs.name = 'XS - XXL'
);

INSERT INTO public.custom_sizing (store_id, name, sizes, is_default)
SELECT
  s.id,
  'XS - XXXL',
  ARRAY['XS', 'S', 'M', 'L', 'XL', 'XXL', 'XXXL'],
  true
FROM public.shops s
WHERE NOT EXISTS (
  SELECT 1 FROM public.custom_sizing cs
  WHERE cs.store_id = s.id AND cs.name = 'XS - XXXL'
);

INSERT INTO public.custom_sizing (store_id, name, sizes, is_default)
SELECT
  s.id,
  'Numeric (6-16)',
  ARRAY['6', '8', '10', '12', '14', '16'],
  true
FROM public.shops s
WHERE NOT EXISTS (
  SELECT 1 FROM public.custom_sizing cs
  WHERE cs.store_id = s.id AND cs.name = 'Numeric (6-16)'
);

INSERT INTO public.custom_sizing (store_id, name, sizes, is_default)
SELECT
  s.id,
  'Numeric (28-44)',
  ARRAY['28', '30', '32', '34', '36', '38', '40', '42', '44'],
  true
FROM public.shops s
WHERE NOT EXISTS (
  SELECT 1 FROM public.custom_sizing cs
  WHERE cs.store_id = s.id AND cs.name = 'Numeric (28-44)'
);

INSERT INTO public.custom_sizing (store_id, name, sizes, is_default)
SELECT
  s.id,
  'Children (2T-14)',
  ARRAY['2T', '3T', '4T', '5T', '6', '7', '8', '10', '12', '14'],
  true
FROM public.shops s
WHERE NOT EXISTS (
  SELECT 1 FROM public.custom_sizing cs
  WHERE cs.store_id = s.id AND cs.name = 'Children (2T-14)'
);

-- 7. Verify the data was inserted
SELECT COUNT(*) as total_sizing_options FROM public.custom_sizing;
SELECT s.shop_domain, COUNT(cs.id) as sizing_options_count
FROM public.shops s
LEFT JOIN public.custom_sizing cs ON cs.store_id = s.id
GROUP BY s.id, s.shop_domain;
