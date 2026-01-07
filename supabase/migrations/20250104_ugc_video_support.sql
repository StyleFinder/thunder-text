-- UGC Video Support Migration
-- Adds fields needed for OpenAI Sora 2 UGC video generation

-- ============================================================================
-- ADD UGC FIELDS TO VIDEO_GENERATIONS TABLE
-- ============================================================================

-- Add Sora video ID column (used instead of kie_task_id for UGC videos)
ALTER TABLE video_generations
ADD COLUMN IF NOT EXISTS sora_video_id TEXT;

-- Update generation_type to support 'ugc' and '360'
-- Existing values: 'REFERENCE_2_VIDEO' (360° videos from Kie.ai)
-- New values: '360' and 'ugc'
ALTER TABLE video_generations
ALTER COLUMN generation_type SET DEFAULT '360';

-- Add UGC-specific metadata fields
ALTER TABLE video_generations
ADD COLUMN IF NOT EXISTS ugc_persona JSONB,
ADD COLUMN IF NOT EXISTS ugc_script JSONB,
ADD COLUMN IF NOT EXISTS ugc_product_name TEXT;

-- Create index for Sora video ID lookups
CREATE INDEX IF NOT EXISTS idx_video_generations_sora_video_id
ON video_generations(sora_video_id)
WHERE sora_video_id IS NOT NULL;

-- Create index for generation type filtering
CREATE INDEX IF NOT EXISTS idx_video_generations_generation_type
ON video_generations(generation_type);

-- ============================================================================
-- UPDATE COMMENTS
-- ============================================================================

COMMENT ON COLUMN video_generations.sora_video_id IS 'OpenAI Sora video generation ID for UGC videos';
COMMENT ON COLUMN video_generations.generation_type IS 'Type of video generation: 360 (product rotation via Kie.ai) or ugc (influencer style via Sora)';
COMMENT ON COLUMN video_generations.ugc_persona IS 'JSON containing the AI-generated creator persona for UGC videos';
COMMENT ON COLUMN video_generations.ugc_script IS 'JSON containing the selected UGC script with dialogue and shot breakdown';
COMMENT ON COLUMN video_generations.ugc_product_name IS 'Product name used for UGC video generation';

-- ============================================================================
-- MIGRATE EXISTING DATA
-- ============================================================================

-- Update existing records to use '360' instead of 'REFERENCE_2_VIDEO'
UPDATE video_generations
SET generation_type = '360'
WHERE generation_type = 'REFERENCE_2_VIDEO' OR generation_type IS NULL;
