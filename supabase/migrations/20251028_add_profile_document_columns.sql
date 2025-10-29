-- Migration: Add columns for storing 6 individual generated documents
-- Created: 2025-10-28
-- Purpose: Store each AI-generated document separately for easy access and updates

-- Add columns for the 6 generated documents
ALTER TABLE business_profiles
ADD COLUMN IF NOT EXISTS market_research TEXT,
ADD COLUMN IF NOT EXISTS ideal_customer_avatar TEXT,
ADD COLUMN IF NOT EXISTS pain_point_strategy TEXT,
ADD COLUMN IF NOT EXISTS mission_vision_values TEXT,
ADD COLUMN IF NOT EXISTS positioning_statement TEXT,
ADD COLUMN IF NOT EXISTS ai_engine_instructions TEXT,
ADD COLUMN IF NOT EXISTS profile_summary TEXT;

-- Add generation metadata columns
ALTER TABLE business_profiles
ADD COLUMN IF NOT EXISTS generation_tokens_used INTEGER,
ADD COLUMN IF NOT EXISTS generation_time_ms INTEGER,
ADD COLUMN IF NOT EXISTS last_generated_at TIMESTAMPTZ;

-- Add index for faster lookups on generated profiles
CREATE INDEX IF NOT EXISTS idx_business_profiles_generated
ON business_profiles(store_id, last_generated_at DESC)
WHERE last_generated_at IS NOT NULL;

-- Add comments
COMMENT ON COLUMN business_profiles.market_research IS 'Generated market research analysis document';
COMMENT ON COLUMN business_profiles.ideal_customer_avatar IS 'Generated ideal customer avatar (ICA) document';
COMMENT ON COLUMN business_profiles.pain_point_strategy IS 'Generated pain point and content strategy document';
COMMENT ON COLUMN business_profiles.mission_vision_values IS 'Generated brand mission, vision, and values document';
COMMENT ON COLUMN business_profiles.positioning_statement IS 'Generated brand positioning statement document';
COMMENT ON COLUMN business_profiles.ai_engine_instructions IS 'Generated AI engine custom instructions document';
COMMENT ON COLUMN business_profiles.profile_summary IS 'Executive summary of the complete business profile';
COMMENT ON COLUMN business_profiles.generation_tokens_used IS 'Total tokens used in profile generation';
COMMENT ON COLUMN business_profiles.generation_time_ms IS 'Time taken to generate profile in milliseconds';
COMMENT ON COLUMN business_profiles.last_generated_at IS 'Timestamp of last profile generation';
