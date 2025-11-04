-- ============================================================================
-- Migration: Add RPC functions for themes access
-- Date: 2025-11-04
-- Description: SECURITY DEFINER functions to bypass PostgREST permission layer
-- ============================================================================

-- Function to get all active themes
-- SECURITY DEFINER allows this to execute with postgres privileges, bypassing PostgREST restrictions
CREATE OR REPLACE FUNCTION get_active_themes()
RETURNS TABLE (
  id UUID,
  slug TEXT,
  name TEXT,
  description TEXT,
  category TEXT,
  active_start TEXT,
  active_end TEXT,
  is_active BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    t.id,
    t.slug,
    t.name,
    t.description,
    t.category,
    t.active_start,
    t.active_end,
    t.is_active
  FROM themes t
  WHERE t.is_active = true
  ORDER BY t.category ASC, t.name ASC;
END;
$$;

COMMENT ON FUNCTION get_active_themes IS 'Retrieves all active themes, bypassing PostgREST permission layer with SECURITY DEFINER';

-- Grant execute permission to authenticated and anon roles
GRANT EXECUTE ON FUNCTION get_active_themes() TO authenticated;
GRANT EXECUTE ON FUNCTION get_active_themes() TO anon;
GRANT EXECUTE ON FUNCTION get_active_themes() TO service_role;
