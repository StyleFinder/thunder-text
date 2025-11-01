-- Delete questions 10 and 16 from interview prompts
-- Question 10: "What do you NOT want to sound like?"
-- Question 16: "What's your mission or purpose beyond just selling products?"

-- Delete the two questions
DELETE FROM interview_prompts
WHERE question_number IN (10, 16);

-- Renumber questions 11-15 to be 10-14 (shift down by 1)
UPDATE interview_prompts
SET question_number = question_number - 1,
    display_order = display_order - 1,
    updated_at = NOW()
WHERE question_number BETWEEN 11 AND 15;

-- Renumber questions 17-21 to be 15-19 (shift down by 2)
UPDATE interview_prompts
SET question_number = question_number - 2,
    display_order = display_order - 2,
    updated_at = NOW()
WHERE question_number BETWEEN 17 AND 21;

-- Verify total count is now 19
DO $$
DECLARE
    total_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO total_count FROM interview_prompts;
    IF total_count != 19 THEN
        RAISE EXCEPTION 'Expected 19 questions after deletion, but found %', total_count;
    END IF;
    RAISE NOTICE 'Successfully deleted 2 questions. New total: %', total_count;
END $$;
