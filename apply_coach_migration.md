# Apply Coach Assignment Migration

The Supabase MCP and CLI don't have the necessary permissions to apply this migration automatically.

## Option 1: Supabase Dashboard (Recommended)

1. Go to https://supabase.com/dashboard/project/nrtarnyqxnnfgrfxtvhv/editor
2. Click on "SQL Editor" in the left sidebar
3. Click "New Query"
4. Copy and paste the migration SQL from `supabase/migrations/add_coach_assignments.sql`
5. Click "Run" to execute

## Option 2: Direct SQL Execution

If you have direct database access, run:

```sql
-- Add coach column to shops table
ALTER TABLE shops
ADD COLUMN IF NOT EXISTS assigned_coach text;

-- Create index for coach filtering
CREATE INDEX IF NOT EXISTS idx_shops_assigned_coach ON shops(assigned_coach);

-- Randomly assign coaches to the 14 test stores
UPDATE shops
SET assigned_coach = CASE
  WHEN shop_domain = 'sallys-chic-collection.myshopify.com' THEN 'jeff_fenn'
  WHEN shop_domain = 'janes-forever-young.myshopify.com' THEN 'zoe_spencer'
  WHEN shop_domain = 'emilys-trendy-threads.myshopify.com' THEN 'erin_nussbaum'
  WHEN shop_domain = 'sophias-style-studio.myshopify.com' THEN 'megan_tamayo'
  WHEN shop_domain = 'olivias-wardrobe-wonders.myshopify.com' THEN 'dylan_welling'
  WHEN shop_domain = 'isabels-elegant-edge.myshopify.com' THEN 'katie_bradley'
  WHEN shop_domain = 'charlottes-closet-classics.myshopify.com' THEN 'casey_rowe'
  WHEN shop_domain = 'amelia-s-fashion-finds.myshopify.com' THEN 'jeff_fenn'
  WHEN shop_domain = 'mias-modern-mode.myshopify.com' THEN 'zoe_spencer'
  WHEN shop_domain = 'harper-s-haute-haven.myshopify.com' THEN 'erin_nussbaum'
  WHEN shop_domain = 'evelyn-s-exquisite-ensemble.myshopify.com' THEN 'megan_tamayo'
  WHEN shop_domain = 'abigail-s-accessory-atelier.myshopify.com' THEN 'dylan_welling'
  WHEN shop_domain = 'ella-s-essential-emporium.myshopify.com' THEN 'katie_bradley'
  WHEN shop_domain = 'elizabeth-s-elegant-boutique.myshopify.com' THEN 'casey_rowe'
END
WHERE is_active = true;
```

## Coach Assignments

Each coach has been assigned 2 stores:

- **Jeff Fenn**: Sally's Chic Collection, Amelia's Fashion Finds
- **Zoë Spencer**: Jane's Forever Young, Mia's Modern Mode
- **Erin Nussbaum**: Emily's Trendy Threads, Harper's Haute Haven
- **Megan Tamayo**: Sophia's Style Studio, Evelyn's Exquisite Ensemble
- **Dylan Welling**: Olivia's Wardrobe Wonders, Abigail's Accessory Atelier
- **Katie Bradley**: Isabel's Elegant Edge, Ella's Essential Emporium
- **Casey Rowe**: Charlotte's Closet Classics, Elizabeth's Elegant Boutique

## After Migration

Once applied, refresh the BHB Dashboard to see:

- Coach badges next to each store name
- Ability to filter stores by coach in the dropdown
- Star/favorite system working per coach
