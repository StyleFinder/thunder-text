-- Migration: Fix RLS policies for business profile tables (Simplified)
-- Created: 2025-10-29
-- Purpose: Allow service role to bypass RLS for API operations
-- Note: Since API uses service_role key, we just need to allow service_role access

-- Grant service role full access to all business profile tables
GRANT ALL ON business_profiles TO service_role;
GRANT ALL ON business_profile_responses TO service_role;
GRANT ALL ON interview_prompts TO service_role;
GRANT ALL ON profile_generation_history TO service_role;

-- Ensure RLS is enabled
ALTER TABLE business_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE business_profile_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE interview_prompts ENABLE ROW LEVEL SECURITY;
ALTER TABLE profile_generation_history ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Service role access" ON business_profiles;
DROP POLICY IF EXISTS "Service role access" ON business_profile_responses;
DROP POLICY IF EXISTS "Service role access" ON interview_prompts;
DROP POLICY IF EXISTS "Service role access" ON profile_generation_history;

-- Simple policies: Allow all operations for service_role
CREATE POLICY "Service role access"
ON business_profiles
USING (auth.role() = 'service_role')
WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "Service role access"
ON business_profile_responses
USING (auth.role() = 'service_role')
WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "Service role access"
ON interview_prompts
USING (auth.role() = 'service_role')
WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "Service role access"
ON profile_generation_history
USING (auth.role() = 'service_role')
WITH CHECK (auth.role() = 'service_role');

-- Add comments
COMMENT ON POLICY "Service role access" ON business_profiles
IS 'API operations use service_role which bypasses RLS. User-level security is handled by application logic.';
