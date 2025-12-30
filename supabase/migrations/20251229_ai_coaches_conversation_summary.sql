-- Migration: Add conversation summary caching
-- Date: 2025-12-29
-- Description: Adds summary caching columns to ai_coach_conversations for performance optimization
--   The summary is cached to avoid regenerating it on every chat request

-- Add summary columns to ai_coach_conversations
ALTER TABLE ai_coach_conversations
  ADD COLUMN IF NOT EXISTS context_summary TEXT,
  ADD COLUMN IF NOT EXISTS summary_message_count INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS summary_updated_at TIMESTAMPTZ;

-- Comment on columns
COMMENT ON COLUMN ai_coach_conversations.context_summary IS 'Cached summary of older messages (messages 11-50)';
COMMENT ON COLUMN ai_coach_conversations.summary_message_count IS 'Number of messages included in the cached summary';
COMMENT ON COLUMN ai_coach_conversations.summary_updated_at IS 'When the summary was last regenerated';
