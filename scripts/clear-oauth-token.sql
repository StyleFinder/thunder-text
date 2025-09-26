-- Clear OAuth Token for Shop
-- Run this in Supabase SQL Editor

-- Option 1: Delete the entire shop record (clean slate)
DELETE FROM shops
WHERE shop_domain = 'zunosai-staging-test-store.myshopify.com';

-- Option 2: Just clear the token (keeps shop record)
-- UPDATE shops
-- SET access_token = '',
--     is_active = false,
--     updated_at = NOW()
-- WHERE shop_domain = 'zunosai-staging-test-store.myshopify.com';

-- Verify the token is cleared
SELECT shop_domain,
       CASE
         WHEN access_token IS NULL OR access_token = '' THEN 'No token'
         ELSE CONCAT(LEFT(access_token, 20), '...')
       END as token_status,
       is_active,
       updated_at
FROM shops
WHERE shop_domain = 'zunosai-staging-test-store.myshopify.com';