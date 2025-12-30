-- Migration: Rename primary_goal_this_season to primary_goal_this_quarter
-- Date: 2025-12-29
-- Description: Rename column for clarity - "quarter" is a more defined time period than "season"

-- ============================================================================
-- RENAME COLUMN
-- ============================================================================

-- Rename the column from seasonal to quarterly terminology
ALTER TABLE business_profiles
  RENAME COLUMN primary_goal_this_season TO primary_goal_this_quarter;

-- ============================================================================
-- UPDATE COMMENTS
-- ============================================================================

COMMENT ON COLUMN business_profiles.primary_goal_this_quarter IS 'Main business goal for the current quarter';
