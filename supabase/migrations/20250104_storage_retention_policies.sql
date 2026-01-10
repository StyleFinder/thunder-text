-- Storage Retention Policies Migration
-- Adds expiration tracking for videos (14 days) and updates image cleanup functions

-- ============================================
-- 1. Add expires_at column to video_generations
-- ============================================

ALTER TABLE video_generations
ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ;

-- Set default expiration for new videos (14 days from creation)
ALTER TABLE video_generations
ALTER COLUMN expires_at SET DEFAULT NOW() + INTERVAL '14 days';

-- Update existing videos to expire 14 days from creation
UPDATE video_generations
SET expires_at = created_at + INTERVAL '14 days'
WHERE expires_at IS NULL;

-- Make expires_at NOT NULL after backfilling
ALTER TABLE video_generations
ALTER COLUMN expires_at SET NOT NULL;

-- Index for efficient cleanup queries
CREATE INDEX IF NOT EXISTS idx_video_generations_expires_at
ON video_generations(expires_at);

-- ============================================
-- 2. Update video source images expiration
-- Add expiration tracking for video source images (30 days)
-- ============================================

-- The video-source-images bucket stores source images before generation
-- These should also expire after 30 days

-- ============================================
-- 3. Cleanup Functions for Videos
-- ============================================

-- Function to cleanup expired videos from database
CREATE OR REPLACE FUNCTION cleanup_expired_videos()
RETURNS TABLE(
  deleted_count INT,
  storage_paths TEXT[]
) AS $$
DECLARE
  v_deleted_count INT;
  v_storage_paths TEXT[];
BEGIN
  -- Get storage paths of videos to delete (for Supabase storage cleanup)
  SELECT ARRAY_AGG(video_storage_path)
  INTO v_storage_paths
  FROM video_generations
  WHERE expires_at < NOW()
    AND video_storage_path IS NOT NULL;

  -- Delete expired video records
  DELETE FROM video_generations
  WHERE expires_at < NOW();

  GET DIAGNOSTICS v_deleted_count = ROW_COUNT;

  RETURN QUERY SELECT v_deleted_count, COALESCE(v_storage_paths, ARRAY[]::TEXT[]);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 4. Get Video Library with Expiration Info
-- ============================================

CREATE OR REPLACE FUNCTION get_video_library(
  p_shop_id UUID,
  p_limit INT DEFAULT 20,
  p_offset INT DEFAULT 0
)
RETURNS TABLE(
  id UUID,
  video_url TEXT,
  thumbnail_url TEXT,
  source_image_url TEXT,
  prompt TEXT,
  model TEXT,
  aspect_ratio TEXT,
  duration_seconds NUMERIC,
  status TEXT,
  created_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  days_until_expiration INT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    vg.id,
    vg.video_url,
    vg.thumbnail_url,
    vg.source_image_url,
    vg.prompt,
    vg.model,
    vg.aspect_ratio,
    vg.duration_seconds,
    vg.status,
    vg.created_at,
    vg.completed_at,
    vg.expires_at,
    GREATEST(0, EXTRACT(DAY FROM vg.expires_at - NOW())::INT) as days_until_expiration
  FROM video_generations vg
  WHERE vg.shop_id = p_shop_id
    AND vg.status IN ('completed', 'processing', 'pending')
    AND vg.expires_at > NOW()
  ORDER BY vg.created_at DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 5. Combined Cleanup Function
-- Cleans up both expired images and videos
-- ============================================

CREATE OR REPLACE FUNCTION cleanup_expired_media()
RETURNS TABLE(
  images_deleted INT,
  videos_deleted INT,
  video_storage_paths TEXT[],
  image_storage_paths TEXT[]
) AS $$
DECLARE
  v_images_deleted INT;
  v_videos_deleted INT;
  v_video_paths TEXT[];
  v_image_paths TEXT[];
BEGIN
  -- Get video storage paths
  SELECT ARRAY_AGG(video_storage_path)
  INTO v_video_paths
  FROM video_generations
  WHERE expires_at < NOW()
    AND video_storage_path IS NOT NULL;

  -- Delete expired videos
  DELETE FROM video_generations
  WHERE expires_at < NOW();
  GET DIAGNOSTICS v_videos_deleted = ROW_COUNT;

  -- Get image storage paths
  SELECT ARRAY_AGG(storage_path)
  INTO v_image_paths
  FROM generated_images
  WHERE expires_at < NOW()
    AND storage_path IS NOT NULL;

  -- Delete expired images
  DELETE FROM generated_images
  WHERE expires_at < NOW();
  GET DIAGNOSTICS v_images_deleted = ROW_COUNT;

  RETURN QUERY SELECT
    v_images_deleted,
    v_videos_deleted,
    COALESCE(v_video_paths, ARRAY[]::TEXT[]),
    COALESCE(v_image_paths, ARRAY[]::TEXT[]);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION cleanup_expired_videos TO service_role;
GRANT EXECUTE ON FUNCTION get_video_library TO service_role;
GRANT EXECUTE ON FUNCTION cleanup_expired_media TO service_role;

-- ============================================
-- 6. Comments for documentation
-- ============================================

COMMENT ON COLUMN video_generations.expires_at IS 'Auto-deletion date (14 days from creation)';
COMMENT ON FUNCTION cleanup_expired_videos IS 'Delete expired videos and return storage paths for cleanup';
COMMENT ON FUNCTION get_video_library IS 'Get shop video library with expiration countdown';
COMMENT ON FUNCTION cleanup_expired_media IS 'Combined cleanup for expired images (30 days) and videos (14 days)';
