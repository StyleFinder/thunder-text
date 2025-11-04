-- Migration: Business Profile Interview System
-- Date: 2025-10-28
-- Description: Complete system for 21-question business profile interview
--   Creates tables for interview prompts, business profiles, responses, and master profiles

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- TABLE 1: interview_prompts
-- Description: Master list of 21 interview questions (system-managed)
-- ============================================================================
CREATE TABLE IF NOT EXISTS interview_prompts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- Identification
  prompt_key VARCHAR(100) UNIQUE NOT NULL,
  category VARCHAR(100) NOT NULL,

  -- Question Content
  question_number INTEGER NOT NULL,
  question_text TEXT NOT NULL,
  context_text TEXT, -- The italic explanatory text under question
  help_text TEXT, -- The callout box tip

  -- Display & Validation
  display_order INTEGER NOT NULL,
  is_required BOOLEAN DEFAULT true,
  min_words INTEGER DEFAULT 20,
  suggested_words INTEGER DEFAULT 100,

  -- Metadata
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for ordering questions
CREATE INDEX idx_interview_prompts_order ON interview_prompts(display_order) WHERE is_active = true;

-- ============================================================================
-- TABLE 2: business_profiles
-- Description: One per store - tracks interview progress and stores AI-generated profile
-- ============================================================================
CREATE TABLE IF NOT EXISTS business_profiles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  store_id UUID NOT NULL REFERENCES shops(id) ON DELETE CASCADE,

  -- Interview Progress Tracking
  interview_status VARCHAR(20) DEFAULT 'not_started',
    -- 'not_started', 'in_progress', 'completed', 'regenerating'
  current_question_number INTEGER DEFAULT 0, -- Track progress (0-21)
  questions_completed INTEGER DEFAULT 0,
  total_questions INTEGER DEFAULT 21,

  -- AI-Generated Master Profile (created after interview completion)
  master_profile_text TEXT, -- Full comprehensive profile
  profile_summary TEXT, -- Executive summary (300-500 words)

  -- Structured Profile Components (JSONB for flexibility)
  business_foundation JSONB, -- Story, description, results (Q1-3)
  market_positioning JSONB, -- Competition, trends, customer journey (Q4-6)
  ideal_customer_profile JSONB, -- Best/worst clients, pain points, desires (Q7-11)
  customer_challenges JSONB, -- Hidden problems, objections, FAQ (Q12-14)
  business_model JSONB, -- Lead gen, pricing, growth strategy (Q15-17)
  brand_identity JSONB, -- Reputation, communication style, values (Q18-20)
  strategic_vision JSONB, -- 3-5 year vision (Q21)

  -- Voice Guidelines (derived from responses)
  voice_tone TEXT,
  voice_style TEXT,
  voice_vocabulary JSONB,
  voice_personality TEXT,

  -- Versioning
  profile_version INTEGER DEFAULT 1,
  is_current BOOLEAN DEFAULT true,

  -- Generation Metadata
  tokens_used INTEGER,
  generation_time_ms INTEGER,

  -- Timestamps
  interview_started_at TIMESTAMPTZ,
  interview_completed_at TIMESTAMPTZ,
  profile_generated_at TIMESTAMPTZ,
  last_edited_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_business_profiles_store ON business_profiles(store_id);
CREATE INDEX idx_business_profiles_status ON business_profiles(store_id, interview_status);
CREATE UNIQUE INDEX idx_business_profiles_current ON business_profiles(store_id) WHERE is_current = true;

-- ============================================================================
-- TABLE 3: business_profile_responses
-- Description: Individual Q&A pairs - stores owner's answers to each question
-- ============================================================================
CREATE TABLE IF NOT EXISTS business_profile_responses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  business_profile_id UUID NOT NULL REFERENCES business_profiles(id) ON DELETE CASCADE,

  -- Question Reference
  prompt_key VARCHAR(100) NOT NULL,
  question_number INTEGER NOT NULL,

  -- The Response
  response_text TEXT NOT NULL,
  word_count INTEGER,
  character_count INTEGER,

  -- Response Metadata
  response_order INTEGER, -- Order answered (may differ from question_number)
  response_version INTEGER DEFAULT 1, -- Track if they re-answer
  is_current BOOLEAN DEFAULT true, -- Latest answer for this prompt

  -- Edit History
  original_response TEXT, -- First answer
  edited_count INTEGER DEFAULT 0,

  -- Timestamps
  first_answered_at TIMESTAMPTZ DEFAULT NOW(),
  last_edited_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_responses_profile ON business_profile_responses(business_profile_id);
CREATE INDEX idx_responses_prompt ON business_profile_responses(business_profile_id, prompt_key);
CREATE INDEX idx_responses_order ON business_profile_responses(business_profile_id, response_order);
CREATE UNIQUE INDEX idx_responses_current
  ON business_profile_responses(business_profile_id, prompt_key)
  WHERE is_current = true;

-- ============================================================================
-- TABLE 4: profile_generation_history
-- Description: Track each time master profile is generated/regenerated
-- ============================================================================
CREATE TABLE IF NOT EXISTS profile_generation_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  business_profile_id UUID NOT NULL REFERENCES business_profiles(id) ON DELETE CASCADE,

  -- Generation Details
  profile_version INTEGER NOT NULL,
  master_profile_text TEXT NOT NULL,
  generation_prompt TEXT, -- The prompt used to generate

  -- AI Metadata
  model_used VARCHAR(50),
  tokens_used INTEGER,
  generation_time_ms INTEGER,

  -- Quality Metrics
  profile_word_count INTEGER,
  validation_passed BOOLEAN,
  validation_issues TEXT[],

  -- Timestamps
  generated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_generation_history_profile ON profile_generation_history(business_profile_id, generated_at DESC);

-- ============================================================================
-- RLS POLICIES
-- ============================================================================

-- interview_prompts - Public read (system-managed, no user writes)
ALTER TABLE interview_prompts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active prompts"
  ON interview_prompts FOR SELECT
  USING (is_active = true);

-- business_profiles - Store owners only
ALTER TABLE business_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Store owners view own profiles"
  ON business_profiles FOR SELECT
  USING (store_id IN (
    SELECT id FROM shops WHERE shop_domain = current_setting('request.headers.authorization', true)
  ));

CREATE POLICY "Store owners create own profiles"
  ON business_profiles FOR INSERT
  WITH CHECK (store_id IN (
    SELECT id FROM shops WHERE shop_domain = current_setting('request.headers.authorization', true)
  ));

CREATE POLICY "Store owners update own profiles"
  ON business_profiles FOR UPDATE
  USING (store_id IN (
    SELECT id FROM shops WHERE shop_domain = current_setting('request.headers.authorization', true)
  ));

-- business_profile_responses - Store owners only
ALTER TABLE business_profile_responses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Store owners view own responses"
  ON business_profile_responses FOR SELECT
  USING (business_profile_id IN (
    SELECT id FROM business_profiles
    WHERE store_id IN (
      SELECT id FROM shops WHERE shop_domain = current_setting('request.headers.authorization', true)
    )
  ));

CREATE POLICY "Store owners insert own responses"
  ON business_profile_responses FOR INSERT
  WITH CHECK (business_profile_id IN (
    SELECT id FROM business_profiles
    WHERE store_id IN (
      SELECT id FROM shops WHERE shop_domain = current_setting('request.headers.authorization', true)
    )
  ));

CREATE POLICY "Store owners update own responses"
  ON business_profile_responses FOR UPDATE
  USING (business_profile_id IN (
    SELECT id FROM business_profiles
    WHERE store_id IN (
      SELECT id FROM shops WHERE shop_domain = current_setting('request.headers.authorization', true)
    )
  ));

-- profile_generation_history - Store owners only
ALTER TABLE profile_generation_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Store owners view own generation history"
  ON profile_generation_history FOR SELECT
  USING (business_profile_id IN (
    SELECT id FROM business_profiles
    WHERE store_id IN (
      SELECT id FROM shops WHERE shop_domain = current_setting('request.headers.authorization', true)
    )
  ));

-- ============================================================================
-- HELPER FUNCTIONS
-- ============================================================================

-- Function to get or create business profile for a store
CREATE OR REPLACE FUNCTION get_or_create_business_profile(p_store_id UUID)
RETURNS UUID AS $$
DECLARE
  v_profile_id UUID;
BEGIN
  -- Try to get current profile
  SELECT id INTO v_profile_id
  FROM business_profiles
  WHERE store_id = p_store_id AND is_current = true
  LIMIT 1;

  -- Create if doesn't exist
  IF v_profile_id IS NULL THEN
    INSERT INTO business_profiles (store_id, interview_status)
    VALUES (p_store_id, 'not_started')
    RETURNING id INTO v_profile_id;
  END IF;

  RETURN v_profile_id;
END;
$$ LANGUAGE plpgsql;

-- Function to update interview progress
CREATE OR REPLACE FUNCTION update_interview_progress(p_profile_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE business_profiles
  SET
    questions_completed = (
      SELECT COUNT(DISTINCT prompt_key)
      FROM business_profile_responses
      WHERE business_profile_id = p_profile_id AND is_current = true
    ),
    current_question_number = (
      SELECT COALESCE(MAX(question_number), 0)
      FROM business_profile_responses
      WHERE business_profile_id = p_profile_id AND is_current = true
    ),
    interview_status = CASE
      WHEN (
        SELECT COUNT(DISTINCT prompt_key)
        FROM business_profile_responses
        WHERE business_profile_id = p_profile_id AND is_current = true
      ) >= 21 THEN 'completed'
      WHEN (
        SELECT COUNT(*)
        FROM business_profile_responses
        WHERE business_profile_id = p_profile_id
      ) > 0 THEN 'in_progress'
      ELSE 'not_started'
    END,
    updated_at = NOW()
  WHERE id = p_profile_id;
END;
$$ LANGUAGE plpgsql;

-- Function to calculate word count
CREATE OR REPLACE FUNCTION count_words(p_text TEXT)
RETURNS INTEGER AS $$
BEGIN
  RETURN array_length(regexp_split_to_array(trim(p_text), '\s+'), 1);
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- ============================================================================
-- TRIGGERS
-- ============================================================================

-- Auto-update timestamps
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_business_profiles_updated_at
  BEFORE UPDATE ON business_profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trigger_responses_updated_at
  BEFORE UPDATE ON business_profile_responses
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

-- Auto-calculate word count on response insert/update
CREATE OR REPLACE FUNCTION auto_calculate_response_metadata()
RETURNS TRIGGER AS $$
BEGIN
  NEW.word_count = count_words(NEW.response_text);
  NEW.character_count = length(NEW.response_text);

  -- Set first_answered_at only on insert
  IF TG_OP = 'INSERT' THEN
    NEW.first_answered_at = NOW();
  END IF;

  -- Track edits
  IF TG_OP = 'UPDATE' AND OLD.response_text != NEW.response_text THEN
    NEW.edited_count = OLD.edited_count + 1;
    NEW.last_edited_at = NOW();
    IF NEW.original_response IS NULL THEN
      NEW.original_response = OLD.response_text;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_auto_response_metadata
  BEFORE INSERT OR UPDATE ON business_profile_responses
  FOR EACH ROW
  EXECUTE FUNCTION auto_calculate_response_metadata();

-- ============================================================================
-- COMMENTS FOR DOCUMENTATION
-- ============================================================================

COMMENT ON TABLE interview_prompts IS 'Master list of 21 business profile interview questions';
COMMENT ON TABLE business_profiles IS 'Business profile for each store, tracks interview progress and AI-generated master profile';
COMMENT ON TABLE business_profile_responses IS 'Individual answers to each interview question, versioned and editable';
COMMENT ON TABLE profile_generation_history IS 'History of all profile generations/regenerations with metadata';

COMMENT ON COLUMN business_profiles.interview_status IS 'not_started, in_progress, completed, regenerating';
COMMENT ON COLUMN business_profiles.master_profile_text IS 'Full AI-generated master profile combining all responses';
COMMENT ON COLUMN business_profile_responses.is_current IS 'Only one current response per question per profile';
COMMENT ON COLUMN business_profile_responses.response_version IS 'Increments each time store owner edits their answer';
