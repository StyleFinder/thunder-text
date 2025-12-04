-- Add onboarding and user type fields to shops table
ALTER TABLE shops
ADD COLUMN IF NOT EXISTS onboarding_completed BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS onboarding_completed_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS user_type TEXT DEFAULT 'store' CHECK (user_type IN ('store', 'coach'));

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_shops_onboarding ON shops(onboarding_completed);
CREATE INDEX IF NOT EXISTS idx_shops_user_type ON shops(user_type);

-- Add comment for documentation
COMMENT ON COLUMN shops.onboarding_completed IS 'Whether the store owner has completed the welcome/onboarding flow';
COMMENT ON COLUMN shops.onboarding_completed_at IS 'Timestamp when onboarding was completed';
COMMENT ON COLUMN shops.user_type IS 'Type of user: store (Shopify merchant) or coach (BHB consultant)';
