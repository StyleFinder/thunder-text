-- Create hot_takes table for coach tips and tricks
CREATE TABLE IF NOT EXISTS hot_takes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  coach_id UUID, -- Reference to coach who created it (can be NULL for system tips)
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  published_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_hot_takes_is_active ON hot_takes(is_active);
CREATE INDEX IF NOT EXISTS idx_hot_takes_published_at ON hot_takes(published_at DESC);
CREATE INDEX IF NOT EXISTS idx_hot_takes_coach_id ON hot_takes(coach_id);

-- Add comment for documentation
COMMENT ON TABLE hot_takes IS 'Tips and tricks from coaches displayed on store owner dashboards';
COMMENT ON COLUMN hot_takes.title IS 'Short title/headline for the tip';
COMMENT ON COLUMN hot_takes.content IS 'Full content of the tip (supports markdown)';
COMMENT ON COLUMN hot_takes.coach_id IS 'ID of the coach who created this tip';
COMMENT ON COLUMN hot_takes.is_active IS 'Whether this tip is currently active/visible';
COMMENT ON COLUMN hot_takes.published_at IS 'When this tip was published (for sorting)';

-- Add updated_at trigger
CREATE TRIGGER update_hot_takes_updated_at
  BEFORE UPDATE ON hot_takes
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security
ALTER TABLE hot_takes ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Store owners can view active hot takes
CREATE POLICY "Store owners can view active hot takes"
  ON hot_takes FOR SELECT
  USING (is_active = true);

-- Coaches can view all hot takes
CREATE POLICY "Coaches can view all hot takes"
  ON hot_takes FOR SELECT
  USING (true); -- Will be restricted by application logic based on user role

-- Coaches can create hot takes
CREATE POLICY "Coaches can create hot takes"
  ON hot_takes FOR INSERT
  WITH CHECK (true); -- Will be restricted by application logic based on user role

-- Coaches can update their own hot takes
CREATE POLICY "Coaches can update hot takes"
  ON hot_takes FOR UPDATE
  USING (true); -- Will be restricted by application logic based on user role

-- Coaches can delete their own hot takes
CREATE POLICY "Coaches can delete hot takes"
  ON hot_takes FOR DELETE
  USING (true); -- Will be restricted by application logic based on user role
