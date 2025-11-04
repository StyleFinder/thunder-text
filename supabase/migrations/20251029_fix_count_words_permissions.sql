-- Grant execute permission on count_words function
-- This fixes the "permission denied for function count_words" error

GRANT EXECUTE ON FUNCTION count_words(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION count_words(TEXT) TO service_role;
