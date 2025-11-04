-- BHB Dashboard Schema
-- Purpose: Create admin authentication for Ads Coach dashboard
-- Note: Campaign performance data is fetched real-time from Facebook API
--       via existing getCampaignInsights() function, no need for snapshots table

-- ============================================================================
-- PART 1: Admin Users Table
-- ============================================================================

CREATE TABLE IF NOT EXISTS admin_users (
  -- Identity
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Credentials
  email TEXT NOT NULL UNIQUE,
  encrypted_password TEXT NOT NULL, -- bcrypt hash

  -- Profile
  full_name TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'ads_coach' CHECK (role IN ('ads_coach', 'super_admin')),

  -- Status
  is_active BOOLEAN DEFAULT true,
  last_login_at TIMESTAMPTZ,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_admin_users_email ON admin_users(email);
CREATE INDEX idx_admin_users_role ON admin_users(role);
CREATE INDEX idx_admin_users_is_active ON admin_users(is_active);

-- Enable RLS
ALTER TABLE admin_users ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Service role can manage all admin users
CREATE POLICY "Service role can manage admin_users" ON admin_users
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Auto-update timestamp trigger
CREATE TRIGGER update_admin_users_updated_at
  BEFORE UPDATE ON admin_users
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

COMMENT ON TABLE admin_users IS 'Admin users with access to BHB Dashboard (Ads Coaches and Super Admins)';
COMMENT ON COLUMN admin_users.role IS 'ads_coach = can view all shops performance, super_admin = full access';

-- ============================================================================
-- PART 2: Grant Permissions
-- ============================================================================

-- Grant table permissions to service_role
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE admin_users TO service_role;

-- ============================================================================
-- PART 3: Reload PostgREST Cache
-- ============================================================================

NOTIFY pgrst, 'reload schema';