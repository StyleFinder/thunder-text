-- Shopify Billing Integration Migration
-- Adds columns for tracking Shopify App Subscription billing status
-- Uses Shopify's Managed Pricing (configured in Partner Dashboard)

-- Add Shopify billing columns to shops table
ALTER TABLE shops
  ADD COLUMN IF NOT EXISTS shopify_charge_id TEXT,
  ADD COLUMN IF NOT EXISTS shopify_subscription_status TEXT DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS shopify_plan_name TEXT,
  ADD COLUMN IF NOT EXISTS shopify_billing_interval TEXT,
  ADD COLUMN IF NOT EXISTS shopify_trial_ends_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS shopify_billing_on TIMESTAMPTZ;

-- Update the subscription_status constraint to include Shopify statuses
-- Shopify subscription statuses: PENDING, ACTIVE, DECLINED, EXPIRED, FROZEN, CANCELLED
ALTER TABLE shops DROP CONSTRAINT IF EXISTS shops_subscription_status_check;
ALTER TABLE shops ADD CONSTRAINT shops_subscription_status_check
  CHECK (subscription_status IN ('inactive', 'active', 'past_due', 'canceled', 'trialing', 'expired', 'frozen', 'pending'));

-- Add check constraint for Shopify-specific subscription statuses
ALTER TABLE shops DROP CONSTRAINT IF EXISTS shops_shopify_subscription_status_check;
ALTER TABLE shops ADD CONSTRAINT shops_shopify_subscription_status_check
  CHECK (shopify_subscription_status IN ('pending', 'active', 'declined', 'expired', 'frozen', 'cancelled'));

-- Create index for efficient billing status lookups
CREATE INDEX IF NOT EXISTS idx_shops_shopify_charge_id ON shops(shopify_charge_id);
CREATE INDEX IF NOT EXISTS idx_shops_shopify_subscription_status ON shops(shopify_subscription_status);

-- Create shopify_billing_events table for audit trail
CREATE TABLE IF NOT EXISTS shopify_billing_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id UUID REFERENCES shops(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  charge_id TEXT,
  status TEXT,
  plan_name TEXT,
  event_data JSONB DEFAULT '{}'::jsonb,
  processed_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_shopify_billing_events_shop_id ON shopify_billing_events(shop_id);
CREATE INDEX IF NOT EXISTS idx_shopify_billing_events_charge_id ON shopify_billing_events(charge_id);
CREATE INDEX IF NOT EXISTS idx_shopify_billing_events_event_type ON shopify_billing_events(event_type);

-- Enable RLS on shopify_billing_events
ALTER TABLE shopify_billing_events ENABLE ROW LEVEL SECURITY;

-- Service role can manage billing events
CREATE POLICY "Service role can manage shopify billing events" ON shopify_billing_events
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Add comments for documentation
COMMENT ON COLUMN shops.shopify_charge_id IS 'Shopify AppSubscription charge ID (gid://shopify/AppSubscription/...)';
COMMENT ON COLUMN shops.shopify_subscription_status IS 'Shopify subscription status: pending, active, declined, expired, frozen, cancelled';
COMMENT ON COLUMN shops.shopify_plan_name IS 'Name of the Shopify pricing plan';
COMMENT ON COLUMN shops.shopify_billing_interval IS 'Billing interval: EVERY_30_DAYS or ANNUAL';
COMMENT ON COLUMN shops.shopify_trial_ends_at IS 'When the Shopify trial period ends';
COMMENT ON COLUMN shops.shopify_billing_on IS 'When the current billing cycle started';

COMMENT ON TABLE shopify_billing_events IS 'Audit log of all Shopify billing events for debugging and compliance';
