-- Fix custom_sizing foreign key to point to shops instead of stores
-- and initialize default sizing options for all shops

-- Drop the incorrect foreign key constraint
ALTER TABLE custom_sizing
DROP CONSTRAINT IF EXISTS custom_sizing_store_id_fkey;

-- Add the correct foreign key constraint pointing to shops
ALTER TABLE custom_sizing
ADD CONSTRAINT custom_sizing_store_id_fkey
FOREIGN KEY (store_id) REFERENCES shops(id) ON DELETE CASCADE;

-- Function to initialize default sizing options for a shop
CREATE OR REPLACE FUNCTION initialize_shop_sizing(shop_id UUID)
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  -- Insert default sizing options if they don't exist
  INSERT INTO custom_sizing (store_id, name, sizes, is_default, created_at, updated_at)
  VALUES
    (shop_id, 'One Size', ARRAY['One Size'], true, NOW(), NOW()),
    (shop_id, 'XS - XL', ARRAY['XS', 'S', 'M', 'L', 'XL'], true, NOW(), NOW()),
    (shop_id, 'XS - XXL', ARRAY['XS', 'S', 'M', 'L', 'XL', 'XXL'], true, NOW(), NOW()),
    (shop_id, 'XS - XXXL', ARRAY['XS', 'S', 'M', 'L', 'XL', 'XXL', 'XXXL'], true, NOW(), NOW()),
    (shop_id, 'Numeric (6-16)', ARRAY['6', '8', '10', '12', '14', '16'], true, NOW(), NOW()),
    (shop_id, 'Numeric (28-44)', ARRAY['28', '30', '32', '34', '36', '38', '40', '42', '44'], true, NOW(), NOW()),
    (shop_id, 'Children (2T-14)', ARRAY['2T', '3T', '4T', '5T', '6', '7', '8', '10', '12', '14'], true, NOW(), NOW())
  ON CONFLICT DO NOTHING;
END;
$$;

-- Initialize sizing options for all existing shops that don't have them
DO $$
DECLARE
  shop_record RECORD;
BEGIN
  FOR shop_record IN
    SELECT s.id
    FROM shops s
    LEFT JOIN custom_sizing cs ON cs.store_id = s.id
    WHERE cs.id IS NULL
  LOOP
    PERFORM initialize_shop_sizing(shop_record.id);
  END LOOP;
END;
$$;

-- Create trigger to auto-initialize sizing options when a new shop is created
CREATE OR REPLACE FUNCTION trigger_initialize_shop_sizing()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  PERFORM initialize_shop_sizing(NEW.id);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS initialize_sizing_on_shop_insert ON shops;
CREATE TRIGGER initialize_sizing_on_shop_insert
  AFTER INSERT ON shops
  FOR EACH ROW
  EXECUTE FUNCTION trigger_initialize_shop_sizing();
