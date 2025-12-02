-- Multi-User Architecture Migration
-- Supports Shopify users, standalone users, and coaches

-- 1. Update shops table to support both Shopify and standalone users
ALTER TABLE shops
  ADD COLUMN IF NOT EXISTS shop_type TEXT DEFAULT 'shopify' CHECK (shop_type IN ('shopify', 'standalone')),
  ADD COLUMN IF NOT EXISTS email TEXT,
  ADD COLUMN IF NOT EXISTS password_hash TEXT,
  ADD COLUMN IF NOT EXISTS shopify_scope TEXT;

-- Add index for email lookups (only for standalone users)
CREATE INDEX IF NOT EXISTS idx_shops_email ON shops(email) WHERE shop_type = 'standalone';

-- Add index for shop_type
CREATE INDEX IF NOT EXISTS idx_shops_type ON shops(shop_type);

-- 2. Create coaches table
CREATE TABLE IF NOT EXISTS coaches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  role TEXT DEFAULT 'coach' CHECK (role IN ('coach', 'admin')),
  is_active BOOLEAN DEFAULT TRUE,
  email_notifications_enabled BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for coach email lookups
CREATE INDEX IF NOT EXISTS idx_coaches_email ON coaches(email);

-- 3. Link shops to coaches (for BHB coach assignment)
ALTER TABLE shops
  ADD COLUMN IF NOT EXISTS coach_id UUID REFERENCES coaches(id) ON DELETE SET NULL;

-- Index for coach assignments
CREATE INDEX IF NOT EXISTS idx_shops_coach_id ON shops(coach_id);

-- 4. Create products table for standalone users (Shopify users use GraphQL API)
CREATE TABLE IF NOT EXISTS products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id UUID NOT NULL REFERENCES shops(id) ON DELETE CASCADE,

  -- Product details
  title TEXT NOT NULL,
  description TEXT,
  price DECIMAL(10, 2),
  compare_at_price DECIMAL(10, 2),

  -- Media
  images JSONB DEFAULT '[]'::jsonb, -- [{src: "url", alt: "text"}]

  -- Categorization
  product_type TEXT,
  tags TEXT[],

  -- Future: multi-variant support
  variants JSONB DEFAULT '[]'::jsonb,

  -- Status
  is_active BOOLEAN DEFAULT TRUE,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for products
CREATE INDEX IF NOT EXISTS idx_products_shop_id ON products(shop_id);
CREATE INDEX IF NOT EXISTS idx_products_is_active ON products(is_active);

-- 5. Create user_sessions table (optional, for analytics and security)
CREATE TABLE IF NOT EXISTS user_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id UUID REFERENCES shops(id) ON DELETE CASCADE,
  coach_id UUID REFERENCES coaches(id) ON DELETE CASCADE,

  session_type TEXT NOT NULL CHECK (session_type IN ('shopify_oauth', 'email_password')),

  -- Session metadata
  ip_address TEXT,
  user_agent TEXT,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ,

  -- Constraint: must have either shop_id OR coach_id
  CONSTRAINT user_sessions_check CHECK (
    (shop_id IS NOT NULL AND coach_id IS NULL) OR
    (shop_id IS NULL AND coach_id IS NOT NULL)
  )
);

-- Indexes for sessions
CREATE INDEX IF NOT EXISTS idx_user_sessions_shop_id ON user_sessions(shop_id);
CREATE INDEX IF NOT EXISTS idx_user_sessions_coach_id ON user_sessions(coach_id);
CREATE INDEX IF NOT EXISTS idx_user_sessions_expires_at ON user_sessions(expires_at);

-- 6. Migrate existing coach_assigned field to coach_id
-- This will be done after coaches are seeded (separate script)

-- 7. Update triggers for updated_at timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply to coaches table
DROP TRIGGER IF EXISTS set_coaches_updated_at ON coaches;
CREATE TRIGGER set_coaches_updated_at
    BEFORE UPDATE ON coaches
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Apply to products table
DROP TRIGGER IF EXISTS set_products_updated_at ON products;
CREATE TRIGGER set_products_updated_at
    BEFORE UPDATE ON products
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- 8. Grant permissions to service_role
GRANT ALL ON coaches TO service_role;
GRANT ALL ON products TO service_role;
GRANT ALL ON user_sessions TO service_role;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO service_role;

-- 9. Add comments for documentation
COMMENT ON TABLE coaches IS 'BHB coaches who monitor store performance and pixel health';
COMMENT ON TABLE products IS 'Product catalog for standalone (non-Shopify) users';
COMMENT ON TABLE user_sessions IS 'Track user sessions for security and analytics';
COMMENT ON COLUMN shops.shop_type IS 'shopify: Shopify OAuth users, standalone: Email/password users';
COMMENT ON COLUMN shops.email IS 'Required for standalone users (login), optional for Shopify (notifications)';
COMMENT ON COLUMN shops.password_hash IS 'Only used for standalone users, NULL for Shopify';
