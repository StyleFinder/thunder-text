-- Add Stripe billing columns to shops table
-- Supports Free, Starter ($19), and Pro ($34) subscription tiers

-- Add subscription-related columns
ALTER TABLE shops
  ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT,
  ADD COLUMN IF NOT EXISTS stripe_subscription_id TEXT,
  ADD COLUMN IF NOT EXISTS plan TEXT DEFAULT 'free',
  ADD COLUMN IF NOT EXISTS subscription_status TEXT DEFAULT 'inactive',
  ADD COLUMN IF NOT EXISTS subscription_current_period_end TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS product_descriptions_used INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS ads_created INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS usage_reset_date TIMESTAMPTZ DEFAULT NOW();

-- Add check constraint for valid plans
ALTER TABLE shops DROP CONSTRAINT IF EXISTS shops_plan_check;
ALTER TABLE shops ADD CONSTRAINT shops_plan_check
  CHECK (plan IN ('free', 'starter', 'pro'));

-- Add check constraint for valid subscription statuses
ALTER TABLE shops DROP CONSTRAINT IF EXISTS shops_subscription_status_check;
ALTER TABLE shops ADD CONSTRAINT shops_subscription_status_check
  CHECK (subscription_status IN ('inactive', 'active', 'past_due', 'canceled', 'trialing'));

-- Create indexes for efficient lookups
CREATE INDEX IF NOT EXISTS idx_shops_stripe_customer_id ON shops(stripe_customer_id);
CREATE INDEX IF NOT EXISTS idx_shops_stripe_subscription_id ON shops(stripe_subscription_id);
CREATE INDEX IF NOT EXISTS idx_shops_plan ON shops(plan);
CREATE INDEX IF NOT EXISTS idx_shops_subscription_status ON shops(subscription_status);

-- Create billing_events table for audit trail
CREATE TABLE IF NOT EXISTS billing_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id UUID REFERENCES shops(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  stripe_event_id TEXT,
  stripe_subscription_id TEXT,
  stripe_customer_id TEXT,
  event_data JSONB DEFAULT '{}'::jsonb,
  processed_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_billing_events_shop_id ON billing_events(shop_id);
CREATE INDEX IF NOT EXISTS idx_billing_events_stripe_event_id ON billing_events(stripe_event_id);
CREATE INDEX IF NOT EXISTS idx_billing_events_event_type ON billing_events(event_type);

-- Enable RLS on billing_events
ALTER TABLE billing_events ENABLE ROW LEVEL SECURITY;

-- Service role can manage billing events
CREATE POLICY "Service role can manage billing events" ON billing_events
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Add comments for documentation
COMMENT ON COLUMN shops.stripe_customer_id IS 'Stripe customer ID for this shop';
COMMENT ON COLUMN shops.stripe_subscription_id IS 'Active Stripe subscription ID';
COMMENT ON COLUMN shops.plan IS 'Current subscription plan: free, starter, or pro';
COMMENT ON COLUMN shops.subscription_status IS 'Stripe subscription status: inactive, active, past_due, canceled, trialing';
COMMENT ON COLUMN shops.subscription_current_period_end IS 'When the current billing period ends';
COMMENT ON COLUMN shops.product_descriptions_used IS 'Number of product descriptions generated this billing period';
COMMENT ON COLUMN shops.ads_created IS 'Number of ads created this billing period';
COMMENT ON COLUMN shops.usage_reset_date IS 'When usage counters were last reset';

COMMENT ON TABLE billing_events IS 'Audit log of all Stripe billing events for debugging and compliance';
