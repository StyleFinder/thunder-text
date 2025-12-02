-- Create coach_notes table for storing coaching notes on store dashboards
CREATE TABLE IF NOT EXISTS coach_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id UUID NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
  coach_id UUID NOT NULL REFERENCES coaches(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Indexes for faster queries
  CONSTRAINT coach_notes_shop_id_fkey FOREIGN KEY (shop_id) REFERENCES shops(id),
  CONSTRAINT coach_notes_coach_id_fkey FOREIGN KEY (coach_id) REFERENCES coaches(id)
);

-- Create index for querying notes by shop
CREATE INDEX IF NOT EXISTS idx_coach_notes_shop_id ON coach_notes(shop_id);

-- Create index for querying notes by coach
CREATE INDEX IF NOT EXISTS idx_coach_notes_coach_id ON coach_notes(coach_id);

-- Create index for sorting by date
CREATE INDEX IF NOT EXISTS idx_coach_notes_created_at ON coach_notes(created_at DESC);

-- Enable RLS
ALTER TABLE coach_notes ENABLE ROW LEVEL SECURITY;

-- Policy: Service role can manage all notes
CREATE POLICY "Service role can manage coach_notes"
ON coach_notes
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- Policy: Coaches can view all notes (for collaboration)
CREATE POLICY "Coaches can view all notes"
ON coach_notes
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM coaches
    WHERE coaches.id = auth.uid()
  )
);

-- Policy: Coaches can insert their own notes
CREATE POLICY "Coaches can insert their own notes"
ON coach_notes
FOR INSERT
TO authenticated
WITH CHECK (
  coach_id = auth.uid() AND
  EXISTS (
    SELECT 1 FROM coaches
    WHERE coaches.id = auth.uid()
  )
);

-- Policy: Coaches can update their own notes
CREATE POLICY "Coaches can update their own notes"
ON coach_notes
FOR UPDATE
TO authenticated
USING (coach_id = auth.uid())
WITH CHECK (coach_id = auth.uid());

-- Policy: Coaches can delete their own notes
CREATE POLICY "Coaches can delete their own notes"
ON coach_notes
FOR DELETE
TO authenticated
USING (coach_id = auth.uid());

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_coach_notes_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_coach_notes_updated_at_trigger
BEFORE UPDATE ON coach_notes
FOR EACH ROW
EXECUTE FUNCTION update_coach_notes_updated_at();

-- Grant permissions
GRANT ALL ON TABLE coach_notes TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE coach_notes TO authenticated;
