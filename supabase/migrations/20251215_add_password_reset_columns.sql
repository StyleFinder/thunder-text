-- Add password reset columns to shops table
-- These columns are used for the forgot password / reset password flow

ALTER TABLE shops ADD COLUMN IF NOT EXISTS reset_token_hash TEXT;
ALTER TABLE shops ADD COLUMN IF NOT EXISTS reset_token_expires TIMESTAMP WITH TIME ZONE;

-- Add index for faster reset token lookups
CREATE INDEX IF NOT EXISTS idx_shops_reset_token_hash ON shops(reset_token_hash) WHERE reset_token_hash IS NOT NULL;

COMMENT ON COLUMN shops.reset_token_hash IS 'SHA256 hash of the password reset token';
COMMENT ON COLUMN shops.reset_token_expires IS 'Expiration timestamp for the password reset token';
