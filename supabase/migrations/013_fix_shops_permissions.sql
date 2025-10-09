-- Fix permissions on shops table after stores table consolidation
-- The shops table needs to be readable by the service role for getStoreId() function

-- Disable RLS on shops table since it's not multi-tenant at the shop level
-- (multi-tenancy is handled at the data level via foreign keys)
ALTER TABLE shops DISABLE ROW LEVEL SECURITY;

-- Grant necessary permissions to all roles
GRANT SELECT, INSERT, UPDATE ON shops TO service_role;
GRANT SELECT, INSERT, UPDATE ON shops TO anon;
GRANT SELECT, INSERT, UPDATE ON shops TO authenticated;

-- Ensure system_prompts and category_templates have proper permissions
GRANT SELECT, INSERT, UPDATE ON system_prompts TO service_role;
GRANT SELECT, INSERT, UPDATE ON system_prompts TO anon;
GRANT SELECT, INSERT, UPDATE ON system_prompts TO authenticated;

GRANT SELECT, INSERT, UPDATE ON category_templates TO service_role;
GRANT SELECT, INSERT, UPDATE ON category_templates TO anon;
GRANT SELECT, INSERT, UPDATE ON category_templates TO authenticated;

-- Add comment explaining the permission model
COMMENT ON TABLE shops IS 'Shop OAuth credentials and settings. RLS disabled because getStoreId() needs universal read access. Multi-tenancy enforced through foreign keys on dependent tables.';
