-- Migration: Add linked_shopify_domain column to shops table
-- Purpose: Allow standalone users to link to a Shopify store they have access to
-- Date: 2025-12-06

-- Add linked_shopify_domain column for standalone users to reference their connected Shopify store
ALTER TABLE shops
ADD COLUMN IF NOT EXISTS linked_shopify_domain TEXT;

-- Add index for efficient lookups
CREATE INDEX IF NOT EXISTS idx_shops_linked_shopify_domain
ON shops(linked_shopify_domain)
WHERE linked_shopify_domain IS NOT NULL;

-- Add comment explaining the column
COMMENT ON COLUMN shops.linked_shopify_domain IS
'For standalone users: the Shopify store domain they are linked to (e.g., mystore.myshopify.com). NULL for Shopify-type shops.';
