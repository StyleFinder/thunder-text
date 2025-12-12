-- Staff Invitations System
-- Allows store owners to invite staff members who inherit store integrations

-- 1. Create staff_invitations table
CREATE TABLE IF NOT EXISTS staff_invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Who sent it (the master Shopify store)
  master_shop_id UUID NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
  invited_by_user_id UUID REFERENCES shops(id) ON DELETE SET NULL,

  -- Who it's for
  invited_email TEXT NOT NULL,
  invited_name TEXT,

  -- Invitation token (for secure link)
  token TEXT UNIQUE NOT NULL,

  -- Status tracking
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'expired', 'revoked')),

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ DEFAULT NOW() + INTERVAL '7 days',
  accepted_at TIMESTAMPTZ,

  -- The user that was created when invitation was accepted
  accepted_by_user_id UUID REFERENCES shops(id) ON DELETE SET NULL,

  -- Prevent duplicate pending invites to same email for same store
  CONSTRAINT unique_pending_invitation UNIQUE (master_shop_id, invited_email, status)
);

-- Indexes for efficient lookups
CREATE INDEX IF NOT EXISTS idx_staff_invitations_master_shop ON staff_invitations(master_shop_id);
CREATE INDEX IF NOT EXISTS idx_staff_invitations_token ON staff_invitations(token);
CREATE INDEX IF NOT EXISTS idx_staff_invitations_email ON staff_invitations(invited_email);
CREATE INDEX IF NOT EXISTS idx_staff_invitations_status ON staff_invitations(status);
CREATE INDEX IF NOT EXISTS idx_staff_invitations_expires ON staff_invitations(expires_at) WHERE status = 'pending';

-- 2. Add staff-related columns to shops table
ALTER TABLE shops
  ADD COLUMN IF NOT EXISTS staff_role TEXT DEFAULT 'owner' CHECK (staff_role IN ('owner', 'staff')),
  ADD COLUMN IF NOT EXISTS invited_via_invitation_id UUID REFERENCES staff_invitations(id) ON DELETE SET NULL;

-- Index for finding staff members of a store
CREATE INDEX IF NOT EXISTS idx_shops_linked_shopify_staff ON shops(linked_shopify_domain) WHERE shop_type = 'standalone';

-- 3. Function to check invitation limits based on subscription
-- Uses shops.plan column (not subscriptions table)
CREATE OR REPLACE FUNCTION get_invitation_limit(shop_id UUID)
RETURNS INTEGER AS $$
DECLARE
  shop_plan TEXT;
  shop_status TEXT;
  invitation_limit INTEGER;
BEGIN
  -- Get the shop's current plan from shops table
  SELECT plan, subscription_status INTO shop_plan, shop_status
  FROM shops
  WHERE id = shop_id;

  -- Only count as paid if subscription is active or trialing
  IF shop_status NOT IN ('active', 'trialing') THEN
    shop_plan := 'free';
  END IF;

  -- Return limit based on plan
  -- Free = 0
  -- Starter = 3
  -- Pro = 10
  CASE shop_plan
    WHEN 'starter' THEN invitation_limit := 3;
    WHEN 'pro' THEN invitation_limit := 10;
    ELSE invitation_limit := 0;
  END CASE;

  RETURN invitation_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Function to count used invitations (pending + accepted)
CREATE OR REPLACE FUNCTION get_used_invitations(shop_id UUID)
RETURNS INTEGER AS $$
BEGIN
  RETURN (
    SELECT COUNT(*)::INTEGER
    FROM staff_invitations
    WHERE master_shop_id = shop_id
      AND status IN ('pending', 'accepted')
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Function to check if shop can send more invitations
CREATE OR REPLACE FUNCTION can_send_invitation(shop_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN get_used_invitations(shop_id) < get_invitation_limit(shop_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. Function to expire old invitations (run via cron or manually)
CREATE OR REPLACE FUNCTION expire_old_invitations()
RETURNS INTEGER AS $$
DECLARE
  expired_count INTEGER;
BEGIN
  UPDATE staff_invitations
  SET status = 'expired'
  WHERE status = 'pending'
    AND expires_at < NOW();

  GET DIAGNOSTICS expired_count = ROW_COUNT;
  RETURN expired_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7. Grant permissions
GRANT ALL ON staff_invitations TO service_role;
GRANT EXECUTE ON FUNCTION get_invitation_limit(UUID) TO service_role;
GRANT EXECUTE ON FUNCTION get_used_invitations(UUID) TO service_role;
GRANT EXECUTE ON FUNCTION can_send_invitation(UUID) TO service_role;
GRANT EXECUTE ON FUNCTION expire_old_invitations() TO service_role;

-- 8. Add RLS policies
ALTER TABLE staff_invitations ENABLE ROW LEVEL SECURITY;

-- Service role can do everything
CREATE POLICY "Service role full access to staff_invitations"
  ON staff_invitations
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- 9. Comments for documentation
COMMENT ON TABLE staff_invitations IS 'Tracks invitations sent by store owners to staff members';
COMMENT ON COLUMN staff_invitations.master_shop_id IS 'The Shopify store that owns this invitation';
COMMENT ON COLUMN staff_invitations.token IS 'Secure random token used in invitation link';
COMMENT ON COLUMN staff_invitations.status IS 'pending=awaiting acceptance, accepted=user created, expired=past 7 days, revoked=cancelled by owner';
COMMENT ON COLUMN shops.staff_role IS 'owner=original store account, staff=invited team member';
COMMENT ON COLUMN shops.invited_via_invitation_id IS 'Links staff account to the invitation they accepted';
