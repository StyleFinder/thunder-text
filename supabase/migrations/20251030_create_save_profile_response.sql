-- Create save_profile_response function for business profile interview
-- This bypasses PostgREST table-level restrictions using SECURITY DEFINER

CREATE OR REPLACE FUNCTION save_profile_response(
  p_business_profile_id uuid,
  p_character_count integer,
  p_is_current boolean,
  p_original_response text,
  p_prompt_key text,
  p_question_number integer,
  p_response_order integer,
  p_response_text text,
  p_word_count integer
)
RETURNS TABLE (
  id uuid,
  business_profile_id uuid,
  prompt_key text,
  question_number integer,
  response_text text,
  word_count integer,
  character_count integer,
  response_order integer,
  response_version integer,
  is_current boolean,
  original_response text,
  edited_count integer,
  first_answered_at timestamptz,
  last_edited_at timestamptz,
  created_at timestamptz,
  updated_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  INSERT INTO business_profile_responses (
    business_profile_id,
    prompt_key,
    question_number,
    response_text,
    word_count,
    character_count,
    response_order,
    is_current,
    original_response
  ) VALUES (
    p_business_profile_id,
    p_prompt_key,
    p_question_number,
    p_response_text,
    p_word_count,
    p_character_count,
    p_response_order,
    p_is_current,
    p_original_response
  )
  RETURNING *;
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION save_profile_response TO service_role;
GRANT EXECUTE ON FUNCTION save_profile_response TO authenticated;
