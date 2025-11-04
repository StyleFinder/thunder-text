-- Fix permission denied errors for business profile interview system
-- This migration adds SECURITY DEFINER to all functions that need elevated permissions
-- and drops the problematic trigger since the app calculates word counts

-- 1. Recreate count_words function with SECURITY DEFINER
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

GRANT EXECUTE ON FUNCTION count_words(TEXT) TO anon;
GRANT EXECUTE ON FUNCTION count_words(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION count_words(TEXT) TO service_role;

-- 2. Add SECURITY DEFINER to get_or_create_business_profile
CREATE OR REPLACE FUNCTION get_or_create_business_profile(p_store_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_profile_id UUID;
BEGIN
  SELECT id INTO v_profile_id
  FROM business_profiles
  WHERE store_id = p_store_id AND is_current = true
  LIMIT 1;

  IF v_profile_id IS NULL THEN
    INSERT INTO business_profiles (store_id, interview_status)
    VALUES (p_store_id, 'not_started')
    RETURNING id INTO v_profile_id;
  END IF;

  RETURN v_profile_id;
END;
$$;

GRANT EXECUTE ON FUNCTION get_or_create_business_profile(uuid) TO anon;
GRANT EXECUTE ON FUNCTION get_or_create_business_profile(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION get_or_create_business_profile(uuid) TO service_role;

-- 3. Add SECURITY DEFINER to update_interview_progress
CREATE OR REPLACE FUNCTION update_interview_progress(p_profile_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_questions_completed INTEGER;
BEGIN
  -- Count current responses
  SELECT COUNT(*) INTO v_questions_completed
  FROM business_profile_responses
  WHERE business_profile_id = p_profile_id AND is_current = true;

  -- Update profile
  UPDATE business_profiles
  SET
    questions_completed = v_questions_completed,
    current_question_number = v_questions_completed,
    updated_at = NOW()
  WHERE id = p_profile_id;
END;
$$;

GRANT EXECUTE ON FUNCTION update_interview_progress(uuid) TO anon;
GRANT EXECUTE ON FUNCTION update_interview_progress(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION update_interview_progress(uuid) TO service_role;

-- 4. Drop the problematic auto_response_metadata trigger
-- (The API already calculates word_count and character_count)
DROP TRIGGER IF EXISTS trigger_auto_response_metadata ON business_profile_responses;
