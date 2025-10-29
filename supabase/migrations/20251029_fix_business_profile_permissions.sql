-- Fix permission denied errors for business profile interview system
-- This migration adds SECURITY DEFINER to functions that need elevated permissions

-- Recreate count_words function with SECURITY DEFINER
DROP FUNCTION IF EXISTS count_words(TEXT);

CREATE OR REPLACE FUNCTION count_words(p_text TEXT)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
IMMUTABLE
AS $$
BEGIN
  IF p_text IS NULL OR trim(p_text) = '' THEN
    RETURN 0;
  END IF;
  RETURN array_length(regexp_split_to_array(trim(p_text), '\s+'), 1);
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION count_words(TEXT) TO anon;
GRANT EXECUTE ON FUNCTION count_words(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION count_words(TEXT) TO service_role;

-- Update auto_calculate_response_metadata function with SECURITY DEFINER
CREATE OR REPLACE FUNCTION auto_calculate_response_metadata()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Calculate word count
  NEW.word_count := count_words(NEW.response_text);

  -- Calculate character count
  NEW.character_count := length(NEW.response_text);

  -- Set first answered timestamp on INSERT
  IF TG_OP = 'INSERT' THEN
    NEW.first_answered_at := NOW();
  END IF;

  -- Track edits on UPDATE
  IF TG_OP = 'UPDATE' AND OLD.response_text != NEW.response_text THEN
    NEW.edited_count := OLD.edited_count + 1;
    NEW.last_edited_at := NOW();
    IF NEW.original_response IS NULL THEN
      NEW.original_response := OLD.response_text;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;
