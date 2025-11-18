-- Migration: Add Brand Voice Wizard columns to business_profiles
-- Date: 2025-11-17
-- Description: Add all brand voice wizard fields (tone sliders, linguistics, value pillars, audience)

-- Add tone slider columns (0-10 scale)
ALTER TABLE business_profiles
ADD COLUMN IF NOT EXISTS tone_playful_serious INTEGER DEFAULT 5 CHECK (tone_playful_serious >= 0 AND tone_playful_serious <= 10),
ADD COLUMN IF NOT EXISTS tone_casual_elevated INTEGER DEFAULT 5 CHECK (tone_casual_elevated >= 0 AND tone_casual_elevated <= 10),
ADD COLUMN IF NOT EXISTS tone_trendy_classic INTEGER DEFAULT 5 CHECK (tone_trendy_classic >= 0 AND tone_trendy_classic <= 10),
ADD COLUMN IF NOT EXISTS tone_friendly_professional INTEGER DEFAULT 5 CHECK (tone_friendly_professional >= 0 AND tone_friendly_professional <= 10),
ADD COLUMN IF NOT EXISTS tone_simple_detailed INTEGER DEFAULT 5 CHECK (tone_simple_detailed >= 0 AND tone_simple_detailed <= 10),
ADD COLUMN IF NOT EXISTS tone_bold_soft INTEGER DEFAULT 5 CHECK (tone_bold_soft >= 0 AND tone_bold_soft <= 10);

-- Add linguistics columns
ALTER TABLE business_profiles
ADD COLUMN IF NOT EXISTS customer_term TEXT,
ADD COLUMN IF NOT EXISTS signature_sentence TEXT;

-- Add value pillars column (array)
ALTER TABLE business_profiles
ADD COLUMN IF NOT EXISTS value_pillars TEXT[];

-- Add audience description column
ALTER TABLE business_profiles
ADD COLUMN IF NOT EXISTS audience_description TEXT;

-- Add wizard completion tracking
ALTER TABLE business_profiles
ADD COLUMN IF NOT EXISTS wizard_completed BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS wizard_completed_at TIMESTAMPTZ;

-- Add comments for documentation
COMMENT ON COLUMN business_profiles.tone_playful_serious IS 'Brand voice tone: 0 = Playful, 10 = Serious (Step 1)';
COMMENT ON COLUMN business_profiles.tone_casual_elevated IS 'Brand voice tone: 0 = Casual, 10 = Elevated (Step 1)';
COMMENT ON COLUMN business_profiles.tone_trendy_classic IS 'Brand voice tone: 0 = Trendy, 10 = Classic (Step 1)';
COMMENT ON COLUMN business_profiles.tone_friendly_professional IS 'Brand voice tone: 0 = Friendly, 10 = Professional (Step 1)';
COMMENT ON COLUMN business_profiles.tone_simple_detailed IS 'Brand voice tone: 0 = Simple, 10 = Detailed (Step 1)';
COMMENT ON COLUMN business_profiles.tone_bold_soft IS 'Brand voice tone: 0 = Bold, 10 = Soft (Step 1)';
COMMENT ON COLUMN business_profiles.customer_term IS 'What the brand calls their customers (Step 2)';
COMMENT ON COLUMN business_profiles.signature_sentence IS 'Brand signature closing sentence (Step 2)';
COMMENT ON COLUMN business_profiles.value_pillars IS 'Array of 3-5 brand value pillars (Step 3)';
COMMENT ON COLUMN business_profiles.audience_description IS 'Target audience description (Step 4)';
COMMENT ON COLUMN business_profiles.wizard_completed IS 'True if brand voice wizard has been completed';
COMMENT ON COLUMN business_profiles.wizard_completed_at IS 'Timestamp when brand voice wizard was completed';
