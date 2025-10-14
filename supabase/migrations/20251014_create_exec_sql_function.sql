-- Create exec_sql function to bypass PostgREST table access issues
-- This allows executing parameterized SQL queries directly

CREATE OR REPLACE FUNCTION public.exec_sql(query text, params text[] DEFAULT '{}')
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result jsonb;
BEGIN
  -- Execute the query with parameters and return as JSONB
  EXECUTE format('SELECT jsonb_agg(row_to_json(t)) FROM (%s) t', query)
  INTO result
  USING params[1], params[2], params[3], params[4], params[5];

  RETURN COALESCE(result, '[]'::jsonb);
END;
$$;

-- Grant execute permission to service_role (used by supabaseAdmin)
GRANT EXECUTE ON FUNCTION public.exec_sql(text, text[]) TO service_role;

-- Add comment
COMMENT ON FUNCTION public.exec_sql IS 'Execute parameterized SQL queries and return results as JSONB. Used to bypass PostgREST table permission caching.';

-- Notify PostgREST to reload schema
NOTIFY pgrst, 'reload schema';
