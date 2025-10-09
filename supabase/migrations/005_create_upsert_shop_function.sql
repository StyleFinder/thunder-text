-- Create SECURITY DEFINER function to bypass PostgREST permission issues
-- Parameters are in alphabetical order to match PostgREST RPC call expectations

DROP FUNCTION IF EXISTS upsert_shop_token(TEXT, TEXT, TEXT);

CREATE OR REPLACE FUNCTION upsert_shop_token(
  p_access_token TEXT,
  p_scope TEXT DEFAULT '',
  p_shop_domain TEXT DEFAULT NULL
)
RETURNS TABLE (
  result_shop_domain TEXT,
  result_is_active BOOLEAN,
  result_updated_at TIMESTAMPTZ
)
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  -- Validate required parameter
  IF p_shop_domain IS NULL THEN
    RAISE EXCEPTION 'p_shop_domain is required';
  END IF;

  -- Upsert shop token
  RETURN QUERY
  INSERT INTO shops (shop_domain, access_token, scope, is_active, updated_at)
  VALUES (p_shop_domain, p_access_token, p_scope, true, NOW())
  ON CONFLICT (shop_domain)
  DO UPDATE SET
    access_token = EXCLUDED.access_token,
    scope = EXCLUDED.scope,
    is_active = true,
    updated_at = NOW()
  RETURNING shops.shop_domain, shops.is_active, shops.updated_at;
END;
$$;

-- Grant execute permissions to all roles
GRANT EXECUTE ON FUNCTION upsert_shop_token(TEXT, TEXT, TEXT) TO anon, authenticated, service_role;

-- Add helpful comment
COMMENT ON FUNCTION upsert_shop_token(TEXT, TEXT, TEXT) IS
  'Upserts Shopify access token using SECURITY DEFINER to bypass PostgREST permissions. Parameters are alphabetically ordered for PostgREST RPC compatibility.';
