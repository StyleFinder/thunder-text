-- Drop the auto_response_metadata trigger that was causing permission errors
-- The API already calculates word_count and character_count in application code,
-- so this trigger is redundant and was causing "permission denied for function count_words" errors

DROP TRIGGER IF EXISTS trigger_auto_response_metadata ON business_profile_responses;

-- Note: The auto_calculate_response_metadata() function and count_words() function
-- are left in place for potential future use, but are no longer called by any trigger
