-- Migration: AI Coaches System
-- Date: 2025-12-29
-- Description: Complete AI coaches system for personalized boutique coaching
--   Creates tables for coach templates, instances, conversations, and messages

-- ============================================================================
-- TABLE 1: ai_coach_templates
-- Description: Admin-managed coach templates with Mustache placeholders
-- ============================================================================
CREATE TABLE IF NOT EXISTS ai_coach_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Identification
  coach_key TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,

  -- Template Content (with {{PLACEHOLDER}} syntax)
  system_prompt_template TEXT NOT NULL,
  conversation_starters_template JSONB NOT NULL DEFAULT '[]'::jsonb,
  instructions_md_template TEXT NOT NULL,

  -- Versioning
  version INTEGER NOT NULL DEFAULT 1,
  is_active BOOLEAN DEFAULT TRUE,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for active template lookups
CREATE INDEX IF NOT EXISTS idx_coach_templates_key
  ON ai_coach_templates(coach_key)
  WHERE is_active = TRUE;

-- ============================================================================
-- TABLE 2: ai_coach_instances
-- Description: Per-store rendered coach prompts (cached after rendering)
-- ============================================================================
CREATE TABLE IF NOT EXISTS ai_coach_instances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES shops(id) ON DELETE CASCADE,

  -- Coach Reference
  coach_key TEXT NOT NULL,
  template_version INTEGER NOT NULL,
  profile_version INTEGER NOT NULL,

  -- Rendered Content (Mustache placeholders replaced with store data)
  rendered_system_prompt TEXT NOT NULL,
  rendered_conversation_starters JSONB NOT NULL DEFAULT '[]'::jsonb,
  rendered_instructions_md TEXT NOT NULL,

  -- Status
  is_active BOOLEAN DEFAULT TRUE,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Unique constraint: one active instance per coach per version combination
  UNIQUE(store_id, coach_key, template_version, profile_version)
);

-- Indexes for coach instance lookups
CREATE INDEX IF NOT EXISTS idx_coach_instances_store
  ON ai_coach_instances(store_id);
CREATE INDEX IF NOT EXISTS idx_coach_instances_active
  ON ai_coach_instances(store_id, coach_key)
  WHERE is_active = TRUE;

-- ============================================================================
-- TABLE 3: ai_coach_conversations
-- Description: Chat sessions between store owners and AI coaches
-- ============================================================================
CREATE TABLE IF NOT EXISTS ai_coach_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES shops(id) ON DELETE CASCADE,

  -- Conversation Details
  coach_key TEXT NOT NULL,
  title TEXT,
  message_count INTEGER DEFAULT 0,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for conversation lookups
CREATE INDEX IF NOT EXISTS idx_coach_conversations_store
  ON ai_coach_conversations(store_id);
CREATE INDEX IF NOT EXISTS idx_coach_conversations_recent
  ON ai_coach_conversations(store_id, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_coach_conversations_coach
  ON ai_coach_conversations(store_id, coach_key);

-- ============================================================================
-- TABLE 4: ai_coach_messages
-- Description: Individual messages within conversations
-- ============================================================================
CREATE TABLE IF NOT EXISTS ai_coach_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES ai_coach_conversations(id) ON DELETE CASCADE,

  -- Message Content
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'tool')),
  content TEXT NOT NULL,

  -- Tool Call Data (for assistant tool invocations)
  tool_name TEXT,
  tool_payload JSONB,

  -- Usage Tracking
  tokens_used INTEGER,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for message retrieval
CREATE INDEX IF NOT EXISTS idx_coach_messages_conversation
  ON ai_coach_messages(conversation_id, created_at);

-- ============================================================================
-- TABLE 5: ai_builder_packs
-- Description: Downloadable markdown files with all coach prompts
-- ============================================================================
CREATE TABLE IF NOT EXISTS ai_builder_packs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES shops(id) ON DELETE CASCADE,

  -- Version Tracking
  profile_version INTEGER NOT NULL,
  template_version INTEGER NOT NULL,

  -- Content
  pack_md TEXT NOT NULL,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),

  -- One pack per version combination
  UNIQUE(store_id, profile_version, template_version)
);

-- Index for builder pack lookups
CREATE INDEX IF NOT EXISTS idx_builder_packs_store
  ON ai_builder_packs(store_id);

-- ============================================================================
-- RLS POLICIES
-- ============================================================================

-- Enable RLS on all tables
ALTER TABLE ai_coach_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_coach_instances ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_coach_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_coach_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_builder_packs ENABLE ROW LEVEL SECURITY;

-- Templates: public read (admin write via service_role)
CREATE POLICY "Anyone can view active coach templates"
  ON ai_coach_templates FOR SELECT
  USING (is_active = TRUE);

-- Instances: service_role only (rendered prompts are sensitive)
CREATE POLICY "Service role manages coach instances"
  ON ai_coach_instances FOR ALL
  TO service_role
  USING (TRUE)
  WITH CHECK (TRUE);

-- Conversations: service_role only
CREATE POLICY "Service role manages coach conversations"
  ON ai_coach_conversations FOR ALL
  TO service_role
  USING (TRUE)
  WITH CHECK (TRUE);

-- Messages: service_role only
CREATE POLICY "Service role manages coach messages"
  ON ai_coach_messages FOR ALL
  TO service_role
  USING (TRUE)
  WITH CHECK (TRUE);

-- Builder Packs: service_role only
CREATE POLICY "Service role manages builder packs"
  ON ai_builder_packs FOR ALL
  TO service_role
  USING (TRUE)
  WITH CHECK (TRUE);

-- ============================================================================
-- TRIGGERS
-- ============================================================================

-- Auto-update timestamps for ai_coach_templates
CREATE TRIGGER update_coach_templates_updated_at
  BEFORE UPDATE ON ai_coach_templates
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Auto-update timestamps for ai_coach_instances
CREATE TRIGGER update_coach_instances_updated_at
  BEFORE UPDATE ON ai_coach_instances
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Auto-update timestamps for ai_coach_conversations
CREATE TRIGGER update_coach_conversations_updated_at
  BEFORE UPDATE ON ai_coach_conversations
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- HELPER FUNCTIONS
-- ============================================================================

-- Function to increment message count on conversation
CREATE OR REPLACE FUNCTION increment_coach_conversation_message_count()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE ai_coach_conversations
  SET message_count = message_count + 1,
      updated_at = NOW()
  WHERE id = NEW.conversation_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-increment message count
CREATE TRIGGER trigger_increment_message_count
  AFTER INSERT ON ai_coach_messages
  FOR EACH ROW
  EXECUTE FUNCTION increment_coach_conversation_message_count();

-- ============================================================================
-- GRANTS
-- ============================================================================

GRANT ALL ON ai_coach_templates TO service_role;
GRANT ALL ON ai_coach_instances TO service_role;
GRANT ALL ON ai_coach_conversations TO service_role;
GRANT ALL ON ai_coach_messages TO service_role;
GRANT ALL ON ai_builder_packs TO service_role;

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON TABLE ai_coach_templates IS 'Admin-managed coach templates with Mustache placeholders for personalization';
COMMENT ON TABLE ai_coach_instances IS 'Per-store rendered coach prompts cached after template rendering';
COMMENT ON TABLE ai_coach_conversations IS 'Chat sessions between store owners and AI coaches';
COMMENT ON TABLE ai_coach_messages IS 'Individual messages within coach conversations';
COMMENT ON TABLE ai_builder_packs IS 'Downloadable markdown files containing all rendered coach prompts';

COMMENT ON COLUMN ai_coach_templates.coach_key IS 'Unique identifier: owner_coach, promo_coach, inventory_coach, cs_coach, ops_coach';
COMMENT ON COLUMN ai_coach_templates.system_prompt_template IS 'System prompt with {{PLACEHOLDER}} syntax for Mustache rendering';
COMMENT ON COLUMN ai_coach_instances.template_version IS 'Version of template used for rendering';
COMMENT ON COLUMN ai_coach_instances.profile_version IS 'Version of business profile used for rendering';
COMMENT ON COLUMN ai_coach_messages.role IS 'Message role: user, assistant, or tool';
