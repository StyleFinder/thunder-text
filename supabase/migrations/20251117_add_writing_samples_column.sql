-- Migration: Add writing_samples column to business_profiles
-- Date: 2025-11-17
-- Description: Add column to store user's writing examples for Step 5 of brand voice wizard

ALTER TABLE business_profiles
ADD COLUMN IF NOT EXISTS writing_samples TEXT;

COMMENT ON COLUMN business_profiles.writing_samples IS 'User-provided writing examples for brand voice (Step 5 of wizard)';
