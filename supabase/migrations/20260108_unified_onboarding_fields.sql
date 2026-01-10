-- Unified Onboarding System - Shop Profile Fields
-- Adds structured business profile data and unified onboarding tracking

-- Add shop profile fields
ALTER TABLE shops ADD COLUMN IF NOT EXISTS business_description text;
ALTER TABLE shops ADD COLUMN IF NOT EXISTS industry varchar(100);
ALTER TABLE shops ADD COLUMN IF NOT EXISTS product_types jsonb DEFAULT '[]'::jsonb;
ALTER TABLE shops ADD COLUMN IF NOT EXISTS target_market varchar(50);
ALTER TABLE shops ADD COLUMN IF NOT EXISTS business_size varchar(50);

-- Add unified onboarding tracking fields
ALTER TABLE shops ADD COLUMN IF NOT EXISTS onboarding_step integer DEFAULT 0;
ALTER TABLE shops ADD COLUMN IF NOT EXISTS shop_profile_completed boolean DEFAULT false;
ALTER TABLE shops ADD COLUMN IF NOT EXISTS voice_profile_completed boolean DEFAULT false;
ALTER TABLE shops ADD COLUMN IF NOT EXISTS business_profile_completed boolean DEFAULT false;

-- Create index for onboarding queries
CREATE INDEX IF NOT EXISTS idx_shops_onboarding_step ON shops(onboarding_step) WHERE onboarding_completed = false;

-- Comment for documentation
COMMENT ON COLUMN shops.business_description IS 'User-provided business description (1-2 sentences)';
COMMENT ON COLUMN shops.industry IS 'Business industry category';
COMMENT ON COLUMN shops.product_types IS 'Array of product type categories';
COMMENT ON COLUMN shops.target_market IS 'Target market: B2B, B2C, or Both';
COMMENT ON COLUMN shops.business_size IS 'Business size: Solo, Small, Medium, Enterprise';
COMMENT ON COLUMN shops.onboarding_step IS 'Current onboarding step (0-5): 0=not started, 1=welcome, 2=profile, 3=voice, 4=interview, 5=complete';
COMMENT ON COLUMN shops.shop_profile_completed IS 'Whether shop profile step is completed';
COMMENT ON COLUMN shops.voice_profile_completed IS 'Whether brand voice profile step is completed';
COMMENT ON COLUMN shops.business_profile_completed IS 'Whether business profile interview is completed';
