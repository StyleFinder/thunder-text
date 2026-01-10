-- Migration: AI Coaches - Extend Business Profiles
-- Date: 2025-12-29
-- Description: Add coach-specific fields to existing business_profiles table
--   These fields capture brand context needed for AI coach personalization

-- ============================================================================
-- EXTEND business_profiles TABLE
-- ============================================================================

-- Add coach-specific fields to existing business_profiles table
ALTER TABLE business_profiles
  ADD COLUMN IF NOT EXISTS discount_comfort_level TEXT
    CHECK (discount_comfort_level IN ('low', 'moderate', 'aggressive')),
  ADD COLUMN IF NOT EXISTS return_policy_summary TEXT,
  ADD COLUMN IF NOT EXISTS shipping_policy_summary TEXT,
  ADD COLUMN IF NOT EXISTS inventory_size TEXT
    CHECK (inventory_size IN ('small', 'medium', 'large')),
  ADD COLUMN IF NOT EXISTS owner_time_constraint TEXT
    CHECK (owner_time_constraint IN ('very_limited', 'moderate', 'flexible')),
  ADD COLUMN IF NOT EXISTS primary_goal_this_season TEXT,
  ADD COLUMN IF NOT EXISTS coach_profile_version INTEGER DEFAULT 1;

-- ============================================================================
-- INDEXES
-- ============================================================================

-- Index for coach queries (find stores with coach profiles)
CREATE INDEX IF NOT EXISTS idx_business_profiles_coach_version
  ON business_profiles(store_id, coach_profile_version)
  WHERE coach_profile_version IS NOT NULL;

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON COLUMN business_profiles.discount_comfort_level IS 'How comfortable the owner is with discounting: low, moderate, aggressive';
COMMENT ON COLUMN business_profiles.return_policy_summary IS 'Brief summary of return policy for CS coach context';
COMMENT ON COLUMN business_profiles.shipping_policy_summary IS 'Brief summary of shipping policy for CS coach context';
COMMENT ON COLUMN business_profiles.inventory_size IS 'Relative inventory size: small (<100), medium (100-500), large (500+)';
COMMENT ON COLUMN business_profiles.owner_time_constraint IS 'Owner availability: very_limited, moderate, flexible';
COMMENT ON COLUMN business_profiles.primary_goal_this_season IS 'Main business goal for the current season';
COMMENT ON COLUMN business_profiles.coach_profile_version IS 'Version number for coach profile data, triggers re-render when incremented';
