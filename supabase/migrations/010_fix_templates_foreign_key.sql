-- Fix templates table foreign key to reference shops instead of stores
-- The app uses the shops table, but templates was incorrectly referencing stores

-- Drop the existing foreign key constraint
ALTER TABLE templates
DROP CONSTRAINT IF EXISTS templates_store_id_fkey;

-- Add correct foreign key constraint pointing to shops table
ALTER TABLE templates
ADD CONSTRAINT templates_store_id_fkey
FOREIGN KEY (store_id) REFERENCES shops(id) ON DELETE CASCADE;

-- Add comment
COMMENT ON CONSTRAINT templates_store_id_fkey ON templates IS 'References shops table which contains the actual store data for ThunderText';
