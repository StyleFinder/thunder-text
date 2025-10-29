-- Migration: Fix RLS policies for business profile tables
-- Created: 2025-10-29
-- Purpose: Grant proper access to business profile tables for service role

-- Grant service role access to all business profile tables
GRANT ALL ON business_profiles TO service_role;
GRANT ALL ON business_profile_responses TO service_role;
GRANT ALL ON interview_prompts TO service_role;
GRANT ALL ON profile_generation_history TO service_role;

-- Grant authenticated users access (they'll be filtered by RLS policies)
GRANT SELECT, INSERT, UPDATE ON business_profiles TO authenticated;
GRANT SELECT, INSERT, UPDATE ON business_profile_responses TO authenticated;
GRANT SELECT ON interview_prompts TO authenticated;
GRANT SELECT ON profile_generation_history TO authenticated;

-- Ensure RLS is enabled on all tables
ALTER TABLE business_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE business_profile_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE interview_prompts ENABLE ROW LEVEL SECURITY;
ALTER TABLE profile_generation_history ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (to avoid conflicts)
DROP POLICY IF EXISTS "Users can view their own business profiles" ON business_profiles;
DROP POLICY IF EXISTS "Users can create their own business profiles" ON business_profiles;
DROP POLICY IF EXISTS "Users can update their own business profiles" ON business_profiles;

DROP POLICY IF EXISTS "Users can view their own profile responses" ON business_profile_responses;
DROP POLICY IF EXISTS "Users can create their own profile responses" ON business_profile_responses;
DROP POLICY IF EXISTS "Users can update their own profile responses" ON business_profile_responses;

DROP POLICY IF EXISTS "Users can view all interview prompts" ON interview_prompts;

DROP POLICY IF EXISTS "Users can view their own generation history" ON profile_generation_history;

-- Business Profiles RLS Policies
CREATE POLICY "Users can view their own business profiles"
ON business_profiles FOR SELECT
USING (store_id = auth.uid()::text OR auth.role() = 'service_role');

CREATE POLICY "Users can create their own business profiles"
ON business_profiles FOR INSERT
WITH CHECK (store_id = auth.uid()::text OR auth.role() = 'service_role');

CREATE POLICY "Users can update their own business profiles"
ON business_profiles FOR UPDATE
USING (store_id = auth.uid()::text OR auth.role() = 'service_role')
WITH CHECK (store_id = auth.uid()::text OR auth.role() = 'service_role');

-- Business Profile Responses RLS Policies
CREATE POLICY "Users can view their own profile responses"
ON business_profile_responses FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM business_profiles
    WHERE business_profiles.id = business_profile_responses.business_profile_id
    AND business_profiles.store_id = auth.uid()::text
  )
  OR auth.role() = 'service_role'
);

CREATE POLICY "Users can create their own profile responses"
ON business_profile_responses FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM business_profiles
    WHERE business_profiles.id = business_profile_responses.business_profile_id
    AND business_profiles.store_id = auth.uid()::text
  )
  OR auth.role() = 'service_role'
);

CREATE POLICY "Users can update their own profile responses"
ON business_profile_responses FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM business_profiles
    WHERE business_profiles.id = business_profile_responses.business_profile_id
    AND business_profiles.store_id = auth.uid()::text
  )
  OR auth.role() = 'service_role'
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM business_profiles
    WHERE business_profiles.id = business_profile_responses.business_profile_id
    AND business_profiles.store_id = auth.uid()::text
  )
  OR auth.role() = 'service_role'
);

-- Interview Prompts RLS Policy (read-only for all authenticated users)
CREATE POLICY "Users can view all interview prompts"
ON interview_prompts FOR SELECT
USING (true);

-- Profile Generation History RLS Policy
CREATE POLICY "Users can view their own generation history"
ON profile_generation_history FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM business_profiles
    WHERE business_profiles.id = profile_generation_history.business_profile_id
    AND business_profiles.store_id = auth.uid()::text
  )
  OR auth.role() = 'service_role'
);

-- Add comments
COMMENT ON POLICY "Users can view their own business profiles" ON business_profiles IS 'Service role bypass for API operations';
COMMENT ON POLICY "Users can view all interview prompts" ON interview_prompts IS 'Interview prompts are public to all authenticated users';
