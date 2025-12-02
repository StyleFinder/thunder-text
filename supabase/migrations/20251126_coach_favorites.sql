-- Create coach_favorites table to track which stores coaches have starred
CREATE TABLE IF NOT EXISTS coach_favorites (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  coach_email TEXT NOT NULL,
  shop_id UUID NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(coach_email, shop_id)
);

-- Create index for faster lookups by coach
CREATE INDEX idx_coach_favorites_coach_email ON coach_favorites(coach_email);

-- Create index for faster lookups by shop
CREATE INDEX idx_coach_favorites_shop_id ON coach_favorites(shop_id);

-- Add RLS policies
ALTER TABLE coach_favorites ENABLE ROW LEVEL SECURITY;

-- Policy: Coaches can view their own favorites
CREATE POLICY "Coaches can view own favorites"
  ON coach_favorites
  FOR SELECT
  USING (auth.jwt() ->> 'email' = coach_email);

-- Policy: Coaches can insert their own favorites
CREATE POLICY "Coaches can insert own favorites"
  ON coach_favorites
  FOR INSERT
  WITH CHECK (auth.jwt() ->> 'email' = coach_email);

-- Policy: Coaches can delete their own favorites
CREATE POLICY "Coaches can delete own favorites"
  ON coach_favorites
  FOR DELETE
  USING (auth.jwt() ->> 'email' = coach_email);

-- Grant permissions to service role for API operations
GRANT ALL ON coach_favorites TO service_role;
