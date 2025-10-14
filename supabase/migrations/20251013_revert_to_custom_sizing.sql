-- Revert back to custom_sizing table name and fix permissions properly
ALTER TABLE IF EXISTS public.size_options RENAME TO custom_sizing;

-- Rename indexes back
ALTER INDEX IF EXISTS idx_size_options_store_id RENAME TO idx_custom_sizing_store_id;
ALTER INDEX IF EXISTS idx_size_options_store_default RENAME TO idx_custom_sizing_store_default;

-- Drop any existing policies
DROP POLICY IF EXISTS "Size options accessible by service role" ON public.custom_sizing;
DROP POLICY IF EXISTS "Sizing accessible by service role" ON public.custom_sizing;
DROP POLICY IF EXISTS "Templates accessible by service role" ON public.custom_sizing;

-- Create fresh policy with exact same pattern as category_templates
CREATE POLICY "Templates accessible by service role"
  ON public.custom_sizing
  FOR ALL
  TO public
  USING (true);

-- Grant explicit permissions to all roles
GRANT ALL ON public.custom_sizing TO postgres, service_role, authenticator, anon;

-- Force PostgREST schema reload
NOTIFY pgrst, 'reload schema';
