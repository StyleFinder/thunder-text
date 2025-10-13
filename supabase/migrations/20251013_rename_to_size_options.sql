-- Rename custom_sizing to size_options to work around PostgREST cache issue
-- The old table name had cached permission issues in PostgREST

ALTER TABLE IF EXISTS public.custom_sizing RENAME TO size_options;

-- Rename indexes
ALTER INDEX IF EXISTS idx_custom_sizing_store_id RENAME TO idx_size_options_store_id;
ALTER INDEX IF EXISTS idx_custom_sizing_store_default RENAME TO idx_size_options_store_default;

-- Update RLS policy name
DROP POLICY IF EXISTS "Sizing accessible by service role" ON public.size_options;
CREATE POLICY "Size options accessible by service role"
  ON public.size_options
  FOR ALL
  TO public
  USING (true);

-- Update table comments
COMMENT ON TABLE public.size_options IS 'Stores custom size sets for each shop (e.g., S/M/L, XS-XXL, numeric sizes)';

-- Notify PostgREST to reload schema
NOTIFY pgrst, 'reload schema';
