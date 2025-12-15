-- Migration: Create atomic increment function for shop usage counters
-- Purpose: SECURITY FIX - Prevent race conditions in usage tracking
--
-- The previous GET+UPDATE pattern allowed concurrent requests to bypass usage limits.
-- This RPC function performs an atomic increment, ensuring accurate usage tracking.
--
-- Related: src/lib/billing/usage.ts - incrementUsage()

-- Create the atomic increment function
CREATE OR REPLACE FUNCTION increment_shop_usage(
  p_shop_id UUID,
  p_column_name TEXT
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Validate column name to prevent SQL injection
  -- Only allow specific column names
  IF p_column_name NOT IN ('product_descriptions_used', 'ads_created') THEN
    RAISE EXCEPTION 'Invalid column name: %', p_column_name;
  END IF;

  -- Perform atomic increment using dynamic SQL
  -- COALESCE handles NULL values, treating them as 0
  EXECUTE format(
    'UPDATE shops SET %I = COALESCE(%I, 0) + 1, updated_at = NOW() WHERE id = $1',
    p_column_name,
    p_column_name
  ) USING p_shop_id;
END;
$$;

-- Grant execute permission to service role (used by admin client)
GRANT EXECUTE ON FUNCTION increment_shop_usage(UUID, TEXT) TO service_role;

-- Add comment for documentation
COMMENT ON FUNCTION increment_shop_usage(UUID, TEXT) IS
  'Atomically increments a usage counter on the shops table. Used to prevent race conditions in billing/usage tracking.';
