-- Migration: Add product_description to generated_content content_type check constraint
-- Date: 2025-12-22
-- Description: Adds 'product_description' as a valid content_type for tracking product description generations

-- Drop the existing check constraint
ALTER TABLE generated_content DROP CONSTRAINT IF EXISTS generated_content_content_type_check;

-- Add the new check constraint with product_description included
ALTER TABLE generated_content ADD CONSTRAINT generated_content_content_type_check CHECK (
  content_type IN ('blog', 'ad', 'store_copy', 'social_facebook', 'social_instagram', 'social_tiktok', 'product_description', 'facebook_ad')
);

COMMENT ON COLUMN generated_content.content_type IS 'Type of content: blog, ad, store_copy, social_*, product_description, or facebook_ad';
