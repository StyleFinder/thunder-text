-- ============================================================================
-- AI Coach Messages - File Attachments Column
-- Migration: 20251229_ai_coach_messages_file_attachments
-- Purpose: Add file_attachments JSONB column to store file metadata separately
--          from message content for token efficiency
-- ============================================================================

-- Add file_attachments column to ai_coach_messages table
-- This stores metadata about attached files without the full content
-- Structure: [{id, name, category, size, url}]
ALTER TABLE ai_coach_messages
  ADD COLUMN IF NOT EXISTS file_attachments JSONB DEFAULT NULL;

-- Add comment for documentation
COMMENT ON COLUMN ai_coach_messages.file_attachments IS
  'File attachment metadata (id, name, category, size, url) - content stored in Supabase Storage';

-- Create index for queries that filter by file presence
CREATE INDEX IF NOT EXISTS idx_coach_messages_has_files
  ON ai_coach_messages ((file_attachments IS NOT NULL))
  WHERE file_attachments IS NOT NULL;
