-- Create table for storing Shopify sessions (official library)
CREATE TABLE IF NOT EXISTS shopify_sessions (
  id TEXT PRIMARY KEY,
  shop TEXT NOT NULL,
  state TEXT,
  is_online BOOLEAN DEFAULT false,
  scope TEXT,
  expires TIMESTAMPTZ,
  access_token TEXT,
  online_access_info JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_shopify_sessions_shop ON shopify_sessions(shop);
CREATE INDEX IF NOT EXISTS idx_shopify_sessions_expires ON shopify_sessions(expires);

-- Enable Row Level Security
ALTER TABLE shopify_sessions ENABLE ROW LEVEL SECURITY;

-- Create RLS policies (only service role can access)
CREATE POLICY "Service role can manage sessions" ON shopify_sessions
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Add trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_shopify_sessions_updated_at
  BEFORE UPDATE ON shopify_sessions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();