-- Create SECURITY DEFINER function to retrieve shop tokens
-- This bypasses PostgREST permission issues for reads

DROP FUNCTION IF EXISTS get_shop_token(TEXT);

CREATE OR REPLACE FUNCTION get_shop_token(
  p_shop_domain TEXT
)
RETURNS TABLE (
  access_token TEXT,
  scope TEXT
)
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT shops.access_token, shops.scope
  FROM shops
  WHERE shops.shop_domain = p_shop_domain
    AND shops.is_active = true
  LIMIT 1;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION get_shop_token(TEXT) TO anon, authenticated, service_role;

-- Add comment
COMMENT ON FUNCTION get_shop_token(TEXT) IS
  'Retrieves shop access token using SECURITY DEFINER to bypass PostgREST permissions';
