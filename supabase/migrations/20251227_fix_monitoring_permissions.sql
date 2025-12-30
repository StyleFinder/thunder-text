-- Fix monitoring table permissions
-- The service role key should bypass RLS by default, but we need proper GRANT statements

-- Grant INSERT/SELECT/UPDATE/DELETE on monitoring tables to authenticated and service_role
GRANT ALL ON api_request_logs TO authenticated;
GRANT ALL ON api_request_logs TO service_role;

GRANT ALL ON daily_usage_rollups TO authenticated;
GRANT ALL ON daily_usage_rollups TO service_role;

GRANT ALL ON system_metrics TO authenticated;
GRANT ALL ON system_metrics TO service_role;

GRANT ALL ON alert_history TO authenticated;
GRANT ALL ON alert_history TO service_role;

GRANT ALL ON error_logs TO authenticated;
GRANT ALL ON error_logs TO service_role;

-- Drop existing restrictive policies and create permissive ones
-- for service role (which bypasses RLS anyway when using service key)

-- For api_request_logs - drop and recreate policies
DROP POLICY IF EXISTS "Service role full access to api_request_logs" ON api_request_logs;
CREATE POLICY "allow_all_api_request_logs" ON api_request_logs FOR ALL USING (true) WITH CHECK (true);

-- For daily_usage_rollups
DROP POLICY IF EXISTS "Service role full access to daily_usage_rollups" ON daily_usage_rollups;
CREATE POLICY "allow_all_daily_usage_rollups" ON daily_usage_rollups FOR ALL USING (true) WITH CHECK (true);

-- For system_metrics
DROP POLICY IF EXISTS "Service role full access to system_metrics" ON system_metrics;
CREATE POLICY "allow_all_system_metrics" ON system_metrics FOR ALL USING (true) WITH CHECK (true);

-- For alert_history
DROP POLICY IF EXISTS "Service role full access to alert_history" ON alert_history;
CREATE POLICY "allow_all_alert_history" ON alert_history FOR ALL USING (true) WITH CHECK (true);

-- For error_logs
DROP POLICY IF EXISTS "Service role full access to error_logs" ON error_logs;
CREATE POLICY "allow_all_error_logs" ON error_logs FOR ALL USING (true) WITH CHECK (true);
