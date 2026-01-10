-- ============================================================================
-- AI Coaches File Storage Bucket
-- Migration: 20251229_ai_coaches_file_storage
-- Purpose: Create storage bucket for coach chat file attachments
-- ============================================================================

-- Create the coach-files storage bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'coach-files',
  'coach-files',
  true, -- Public bucket for easy access (files are organized by store_id)
  10485760, -- 10MB max file size
  ARRAY[
    -- Documents
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/msword',
    'application/vnd.google-apps.document',
    -- Spreadsheets
    'text/csv',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-excel',
    'application/vnd.google-apps.spreadsheet',
    -- Images
    'image/png',
    'image/jpeg',
    'image/webp',
    -- Text
    'text/plain',
    'text/markdown'
  ]::text[]
)
ON CONFLICT (id) DO UPDATE SET
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- ============================================================================
-- RLS Policies for coach-files bucket
-- ============================================================================

-- Policy: Service role can do anything
CREATE POLICY "Service role has full access to coach files"
ON storage.objects FOR ALL
TO service_role
USING (bucket_id = 'coach-files')
WITH CHECK (bucket_id = 'coach-files');

-- Policy: Anyone can read files (public bucket)
-- Files are organized as: coach-uploads/{store_id}/{file_id}{extension}
CREATE POLICY "Public read access to coach files"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'coach-files');

-- Policy: Authenticated users can upload to their own folder
-- This allows direct client uploads if needed in the future
CREATE POLICY "Users can upload to their own folder"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'coach-files' AND
  (storage.foldername(name))[1] = 'coach-uploads' AND
  (storage.foldername(name))[2] = auth.uid()::text
);

-- Policy: Users can delete their own files
CREATE POLICY "Users can delete their own files"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'coach-files' AND
  (storage.foldername(name))[1] = 'coach-uploads' AND
  (storage.foldername(name))[2] = auth.uid()::text
);

-- ============================================================================
-- Indexes for efficient file lookup
-- ============================================================================

-- Note: storage.objects already has indexes on bucket_id and name
-- No additional indexes needed for this use case
