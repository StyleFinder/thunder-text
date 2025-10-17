-- Force complete reset of content_samples table with correct permissions from start
-- This migration drops and recreates to bypass PostgREST cache issues

-- Drop existing table completely
DROP TABLE IF EXISTS public.content_samples CASCADE;

-- Recreate with correct public RLS policy from the start
CREATE TABLE public.content_samples (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  store_id UUID NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
  sample_text TEXT NOT NULL,
  sample_type VARCHAR(50) NOT NULL CHECK (sample_type IN ('blog', 'email', 'description', 'other')),
  word_count INTEGER NOT NULL CHECK (word_count >= 500 AND word_count <= 5000),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes BEFORE enabling RLS
CREATE INDEX idx_content_samples_store_id ON public.content_samples(store_id);
CREATE INDEX idx_content_samples_active ON public.content_samples(store_id, is_active) WHERE is_active = true;
CREATE INDEX idx_content_samples_created ON public.content_samples(store_id, created_at DESC);

-- Grant permissions BEFORE enabling RLS (match shop_sizes exactly)
GRANT ALL PRIVILEGES ON public.content_samples TO postgres, anon, authenticated, service_role;

-- Enable RLS with public policy (matching shop_sizes pattern exactly)
ALTER TABLE public.content_samples ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Content samples accessible by all roles"
  ON public.content_samples
  FOR ALL
  TO public
  USING (true)
  WITH CHECK (true);

-- Add table comment
COMMENT ON TABLE public.content_samples IS 'User-uploaded content samples for brand voice profile training';

-- Notify PostgREST to reload schema
NOTIFY pgrst, 'reload schema';
