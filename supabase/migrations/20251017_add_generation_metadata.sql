-- Add generation_metadata column to generated_content table
-- This column stores metadata about the content generation process

ALTER TABLE generated_content
ADD COLUMN IF NOT EXISTS generation_metadata jsonb DEFAULT '{}'::jsonb;

COMMENT ON COLUMN generated_content.generation_metadata IS 'Metadata about content generation (tokens used, generation time, model version, etc.)';
