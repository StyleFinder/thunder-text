-- Fix shop_sizes PostgREST cache issue by using RPC function bypass
-- Root cause: PostgREST schema cache not reloading after table recreation
-- Solution: Create SECURITY DEFINER function that bypasses PostgREST table permissions

-- Update RLS policy to match category_templates (use {public} role)
DROP POLICY IF EXISTS "Shop sizes accessible by service role" ON shop_sizes;
DROP POLICY IF EXISTS "Allow all operations on shop_sizes" ON shop_sizes;

CREATE POLICY "Shop sizes accessible by all roles"
  ON shop_sizes
  FOR ALL
  TO public
  USING (true)
  WITH CHECK (true);

-- Create RPC function to fetch shop sizes (bypasses PostgREST table cache)
CREATE OR REPLACE FUNCTION get_shop_sizes_for_api(shop_id_param UUID)
RETURNS TABLE (
  id UUID,
  store_id UUID,
  name VARCHAR,
  sizes TEXT[],
  is_default BOOLEAN,
  is_active BOOLEAN,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
)
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT
    id,
    store_id,
    name,
    sizes,
    is_default,
    is_active,
    created_at,
    updated_at
  FROM shop_sizes
  WHERE is_active = true
    AND (store_id = shop_id_param OR store_id IS NULL)
  ORDER BY is_default DESC, name ASC;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION get_shop_sizes_for_api(UUID) TO service_role, anon, authenticated;

COMMENT ON FUNCTION get_shop_sizes_for_api IS 'Fetch shop sizes for a given shop ID. Uses SECURITY DEFINER to bypass PostgREST table permission cache issue.';

-- Notify PostgREST to reload schema
NOTIFY pgrst, 'reload schema';
