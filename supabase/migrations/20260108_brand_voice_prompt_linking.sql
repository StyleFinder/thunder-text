-- Migration: Brand Voice Prompt Linking
-- Purpose: Add optional linking between system_prompts and brand_voice_profiles
--          for stores that want to associate their prompts with specific voice profiles
-- Date: 2026-01-08

-- Add brand_voice_profile_id to system_prompts for optional linking
-- This allows system_prompts to reference a specific voice profile
ALTER TABLE system_prompts
ADD COLUMN IF NOT EXISTS brand_voice_profile_id UUID
  REFERENCES brand_voice_profiles(id) ON DELETE SET NULL;

-- Add uses_brand_voice flag to indicate if prompt should use brand voice
-- When true, generation will fetch and apply the linked or current voice profile
ALTER TABLE system_prompts
ADD COLUMN IF NOT EXISTS uses_brand_voice BOOLEAN DEFAULT false;

-- Add index for efficient lookups
CREATE INDEX IF NOT EXISTS idx_system_prompts_brand_voice_profile_id
  ON system_prompts(brand_voice_profile_id)
  WHERE brand_voice_profile_id IS NOT NULL;

-- Add comment for documentation
COMMENT ON COLUMN system_prompts.brand_voice_profile_id IS
  'Optional link to a specific brand voice profile. If null but uses_brand_voice is true, uses the current active profile.';

COMMENT ON COLUMN system_prompts.uses_brand_voice IS
  'When true, product descriptions using this prompt will incorporate the stores brand voice profile.';

-- Note: No data migration needed - existing system_prompts will have:
--   brand_voice_profile_id: NULL
--   uses_brand_voice: false (default)
-- This is the expected state for backwards compatibility.
-- The unified prompt builder handles voice retrieval independently of these fields.
