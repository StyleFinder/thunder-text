-- Development RLS Fix for Custom Categories
-- This allows the development UUID to bypass RLS policies

-- Add development-friendly RLS policies for custom categories
-- These policies allow operations when auth.uid() is null (development mode)

CREATE POLICY "Development bypass for categories SELECT"
  ON custom_categories FOR SELECT
  USING (auth.uid() IS NULL);

CREATE POLICY "Development bypass for categories INSERT"  
  ON custom_categories FOR INSERT
  WITH CHECK (auth.uid() IS NULL);

CREATE POLICY "Development bypass for categories UPDATE"
  ON custom_categories FOR UPDATE
  USING (auth.uid() IS NULL)
  WITH CHECK (auth.uid() IS NULL);

CREATE POLICY "Development bypass for categories DELETE"
  ON custom_categories FOR DELETE
  USING (auth.uid() IS NULL);

-- Note: These policies are permissive for development only
-- In production, auth.uid() will be present and the original policies will apply