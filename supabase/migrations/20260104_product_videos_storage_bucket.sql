-- Product Videos Storage Bucket Migration
-- Creates the storage bucket for product videos if it doesn't exist
-- and sets up public read access policies

-- ============================================================================
-- CREATE STORAGE BUCKET
-- ============================================================================

-- Create the product-videos storage bucket (public for read access)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'product-videos',
  'product-videos',
  true,
  104857600, -- 100MB limit
  ARRAY['video/mp4', 'video/webm', 'video/quicktime']
)
ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = 104857600,
  allowed_mime_types = ARRAY['video/mp4', 'video/webm', 'video/quicktime'];

-- ============================================================================
-- STORAGE POLICIES
-- ============================================================================

-- Drop existing policies if they exist (to avoid conflicts)
DROP POLICY IF EXISTS "Public read access for product videos" ON storage.objects;
DROP POLICY IF EXISTS "Service role can upload product videos" ON storage.objects;
DROP POLICY IF EXISTS "Service role can update product videos" ON storage.objects;
DROP POLICY IF EXISTS "Service role can delete product videos" ON storage.objects;

-- Allow public read access to all product videos
CREATE POLICY "Public read access for product videos"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'product-videos');

-- Allow service role to upload videos
CREATE POLICY "Service role can upload product videos"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'product-videos');

-- Allow service role to update videos (for upsert)
CREATE POLICY "Service role can update product videos"
  ON storage.objects FOR UPDATE
  USING (bucket_id = 'product-videos');

-- Allow service role to delete videos (for cleanup)
CREATE POLICY "Service role can delete product videos"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'product-videos');

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON TABLE storage.buckets IS 'Storage buckets for file uploads';
