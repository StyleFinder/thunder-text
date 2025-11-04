-- Remove unused help_text and context_text columns from interview_prompts table
-- These fields are no longer needed as we're simplifying to only use question_text

ALTER TABLE interview_prompts
  DROP COLUMN IF EXISTS help_text,
  DROP COLUMN IF EXISTS context_text;

-- Add comment to document the simplification
COMMENT ON TABLE interview_prompts IS 'Store Profile Interview questions - simplified to use only question_text';
