-- Create set_store_context function for setting RLS context
-- This function allows setting the current store context for Row Level Security

CREATE OR REPLACE FUNCTION set_store_context(store_uuid UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Set the store_id in the session for RLS policies to use
  PERFORM set_config('app.current_store_id', store_uuid::text, false);
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION set_store_context(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION set_store_context(UUID) TO service_role;

-- Add comment for documentation
COMMENT ON FUNCTION set_store_context IS 'Sets the current store context for Row Level Security policies. Used by API routes to establish store context for operations.';
