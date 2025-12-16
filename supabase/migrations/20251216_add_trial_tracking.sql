-- Add trial tracking to prevent multiple free trials across plan changes
-- A shop should only get a 14-day trial ONCE, regardless of which paid plan they choose

-- Add has_used_trial column to shops table
ALTER TABLE shops
  ADD COLUMN IF NOT EXISTS has_used_trial BOOLEAN DEFAULT FALSE;

-- Add first_trial_started_at to track when the trial began (useful for audit)
ALTER TABLE shops
  ADD COLUMN IF NOT EXISTS first_trial_started_at TIMESTAMPTZ;

-- Create index for efficient lookup
CREATE INDEX IF NOT EXISTS idx_shops_has_used_trial ON shops(has_used_trial);

-- Add comments for documentation
COMMENT ON COLUMN shops.has_used_trial IS 'Whether this shop has ever used a 14-day free trial. Once true, no more trials allowed.';
COMMENT ON COLUMN shops.first_trial_started_at IS 'Timestamp when the shop first started a trial period';

-- Update existing shops that have ever had a trial to mark them as having used their trial
-- This prevents existing trial users from getting another trial if they cancel and re-subscribe
UPDATE shops
SET has_used_trial = TRUE,
    first_trial_started_at = COALESCE(shopify_trial_ends_at - INTERVAL '14 days', subscription_current_period_end - INTERVAL '14 days', created_at)
WHERE subscription_status = 'trialing'
   OR shopify_subscription_status = 'active'
   OR shopify_trial_ends_at IS NOT NULL
   OR plan IN ('starter', 'pro');
