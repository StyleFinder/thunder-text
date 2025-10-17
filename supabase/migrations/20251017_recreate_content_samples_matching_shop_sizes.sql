-- Recreate content_samples table to EXACTLY match shop_sizes pattern
-- This fixes the PostgREST schema issue by using the proven working pattern

-- Drop the table completely
DROP TABLE IF EXISTS public.content_samples CASCADE;

-- Recreate with EXACT same pattern as shop_sizes
CREATE TABLE public.content_samples (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  store_id UUID, -- Nullable like shop_sizes (no foreign key constraint)
  sample_text TEXT NOT NULL,
  sample_type VARCHAR(50) NOT NULL CHECK (sample_type IN ('blog', 'email', 'description', 'other')),
  word_count INTEGER NOT NULL CHECK (word_count >= 500 AND word_count <= 5000),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes (same pattern as shop_sizes)
CREATE INDEX idx_content_samples_store_id ON public.content_samples(store_id);
CREATE INDEX idx_content_samples_active ON public.content_samples(store_id, is_active) WHERE is_active = true;

-- Grant all privileges (EXACT same as shop_sizes)
GRANT ALL PRIVILEGES ON public.content_samples TO postgres, anon, authenticated, service_role;

-- Enable Row Level Security
ALTER TABLE public.content_samples ENABLE ROW LEVEL SECURITY;

-- RLS Policy 1: Allow service role full bypass (EXACT same as shop_sizes)
CREATE POLICY "Content samples accessible by service role"
  ON public.content_samples
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- RLS Policy 2: Allow anon and authenticated users full access (EXACT same as shop_sizes)
CREATE POLICY "Allow all operations on content_samples"
  ON public.content_samples
  FOR ALL
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

NOTIFY pgrst, 'reload schema';
