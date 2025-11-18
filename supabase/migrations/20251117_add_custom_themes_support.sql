-- ============================================================================
-- Migration: Add Custom Themes Support
-- Date: 2025-11-17
-- Description: Allow shops to create their own custom seasonal themes
-- ============================================================================

-- Add created_by_shop_id column to themes table to track custom themes
ALTER TABLE themes
ADD COLUMN created_by_shop_id UUID REFERENCES shops(id) ON DELETE CASCADE;

-- Create index for filtering custom themes by shop
CREATE INDEX idx_themes_created_by_shop ON themes(created_by_shop_id)
WHERE created_by_shop_id IS NOT NULL;

-- Add comment for documentation
COMMENT ON COLUMN themes.created_by_shop_id IS 'Shop that created this custom theme. NULL for global themes.';
