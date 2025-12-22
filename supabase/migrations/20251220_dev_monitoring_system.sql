-- Developer Monitoring System Migration
-- Creates tables for API request logging, usage rollups, system metrics, and alerts

-- ============================================
-- 1. API Request Logs (per-request, recent data)
-- ============================================
CREATE TABLE IF NOT EXISTS api_request_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id UUID REFERENCES shops(id) ON DELETE SET NULL,

  -- Request details
  operation_type TEXT NOT NULL, -- 'product_description', 'ad_generation', 'business_profile', 'voice_profile', 'image_analysis'
  endpoint TEXT, -- API endpoint path

  -- Model & token tracking
  model TEXT NOT NULL, -- 'gpt-4o-mini', 'gpt-4o'
  input_tokens INT DEFAULT 0,
  output_tokens INT DEFAULT 0,
  cost_usd DECIMAL(12,8) DEFAULT 0,

  -- Performance
  latency_ms INT,

  -- Status
  status TEXT NOT NULL DEFAULT 'success', -- 'success', 'error', 'timeout', 'rate_limited'
  error_code TEXT,
  error_message TEXT,

  -- Metadata
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_api_request_logs_shop_id ON api_request_logs(shop_id);
CREATE INDEX IF NOT EXISTS idx_api_request_logs_operation_type ON api_request_logs(operation_type);
CREATE INDEX IF NOT EXISTS idx_api_request_logs_status ON api_request_logs(status);
CREATE INDEX IF NOT EXISTS idx_api_request_logs_created_at ON api_request_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_api_request_logs_model ON api_request_logs(model);

-- Composite index for dashboard queries
CREATE INDEX IF NOT EXISTS idx_api_request_logs_dashboard
  ON api_request_logs(created_at DESC, operation_type, status);

-- ============================================
-- 2. Daily Usage Rollups (historical aggregation)
-- ============================================
CREATE TABLE IF NOT EXISTS daily_usage_rollups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id UUID REFERENCES shops(id) ON DELETE CASCADE,

  -- Time period
  date DATE NOT NULL,

  -- Aggregation dimensions
  operation_type TEXT NOT NULL,
  model TEXT NOT NULL,

  -- Counts
  request_count INT DEFAULT 0,
  success_count INT DEFAULT 0,
  error_count INT DEFAULT 0,
  timeout_count INT DEFAULT 0,

  -- Token usage
  total_input_tokens BIGINT DEFAULT 0,
  total_output_tokens BIGINT DEFAULT 0,
  total_cost_usd DECIMAL(12,6) DEFAULT 0,

  -- Performance
  avg_latency_ms INT,
  min_latency_ms INT,
  max_latency_ms INT,
  p95_latency_ms INT,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(shop_id, date, operation_type, model)
);

CREATE INDEX IF NOT EXISTS idx_daily_usage_rollups_shop_id ON daily_usage_rollups(shop_id);
CREATE INDEX IF NOT EXISTS idx_daily_usage_rollups_date ON daily_usage_rollups(date DESC);

-- ============================================
-- 3. System-wide Metrics (for real-time dashboard)
-- ============================================
CREATE TABLE IF NOT EXISTS system_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  metric_name TEXT NOT NULL,
  metric_value DECIMAL(16,6) NOT NULL,
  metric_unit TEXT, -- 'count', 'ms', 'usd', 'percent', 'tokens'

  -- Optional dimensions
  dimension_type TEXT, -- 'operation_type', 'model', 'status'
  dimension_value TEXT,

  recorded_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_system_metrics_name ON system_metrics(metric_name);
CREATE INDEX IF NOT EXISTS idx_system_metrics_recorded_at ON system_metrics(recorded_at DESC);
CREATE INDEX IF NOT EXISTS idx_system_metrics_name_time ON system_metrics(metric_name, recorded_at DESC);

-- ============================================
-- 4. Alert History
-- ============================================
CREATE TABLE IF NOT EXISTS alert_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Alert classification
  severity TEXT NOT NULL, -- 'critical', 'high', 'medium', 'low'
  alert_type TEXT NOT NULL, -- 'api_failure', 'high_error_rate', 'latency_spike', 'rate_limit', etc.

  -- Alert content
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  details JSONB DEFAULT '{}'::jsonb,

  -- Affected resources
  shop_id UUID REFERENCES shops(id) ON DELETE SET NULL,
  affected_component TEXT, -- 'openai', 'supabase', 'shopify', 'generation'

  -- Notification status
  notified_slack BOOLEAN DEFAULT FALSE,
  notified_slack_at TIMESTAMPTZ,
  notified_email BOOLEAN DEFAULT FALSE,
  notified_email_at TIMESTAMPTZ,

  -- Resolution
  is_resolved BOOLEAN DEFAULT FALSE,
  resolved_at TIMESTAMPTZ,
  resolved_by TEXT,
  resolution_notes TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_alert_history_severity ON alert_history(severity);
CREATE INDEX IF NOT EXISTS idx_alert_history_alert_type ON alert_history(alert_type);
CREATE INDEX IF NOT EXISTS idx_alert_history_created_at ON alert_history(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_alert_history_unresolved ON alert_history(is_resolved, created_at DESC) WHERE NOT is_resolved;

-- ============================================
-- 5. Error Log (detailed error tracking)
-- ============================================
CREATE TABLE IF NOT EXISTS error_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Error classification
  error_type TEXT NOT NULL, -- 'api_error', 'validation_error', 'auth_error', 'timeout', 'unknown'
  error_code TEXT,
  error_message TEXT NOT NULL,

  -- Context
  shop_id UUID REFERENCES shops(id) ON DELETE SET NULL,
  endpoint TEXT,
  operation_type TEXT,

  -- Stack trace and metadata
  stack_trace TEXT,
  request_data JSONB DEFAULT '{}'::jsonb,
  response_data JSONB DEFAULT '{}'::jsonb,

  -- Grouping for deduplication
  error_hash TEXT, -- Hash of error_type + error_message for grouping
  occurrence_count INT DEFAULT 1,
  first_seen_at TIMESTAMPTZ DEFAULT NOW(),
  last_seen_at TIMESTAMPTZ DEFAULT NOW(),

  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_error_logs_error_type ON error_logs(error_type);
CREATE INDEX IF NOT EXISTS idx_error_logs_created_at ON error_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_error_logs_error_hash ON error_logs(error_hash);
CREATE INDEX IF NOT EXISTS idx_error_logs_shop_id ON error_logs(shop_id);

-- ============================================
-- 6. Enable RLS (service role only access)
-- ============================================
ALTER TABLE api_request_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_usage_rollups ENABLE ROW LEVEL SECURITY;
ALTER TABLE system_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE alert_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE error_logs ENABLE ROW LEVEL SECURITY;

-- Service role policies (dev dashboard uses service role)
CREATE POLICY "Service role full access to api_request_logs" ON api_request_logs
  FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "Service role full access to daily_usage_rollups" ON daily_usage_rollups
  FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "Service role full access to system_metrics" ON system_metrics
  FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "Service role full access to alert_history" ON alert_history
  FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "Service role full access to error_logs" ON error_logs
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- ============================================
-- 7. Helper Functions
-- ============================================

-- Function to calculate error rate for a time window
CREATE OR REPLACE FUNCTION get_error_rate(
  p_minutes INT DEFAULT 5,
  p_operation_type TEXT DEFAULT NULL
)
RETURNS TABLE(total_requests BIGINT, error_count BIGINT, error_rate DECIMAL) AS $$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(*)::BIGINT as total_requests,
    COUNT(*) FILTER (WHERE status = 'error')::BIGINT as error_count,
    CASE
      WHEN COUNT(*) = 0 THEN 0
      ELSE ROUND((COUNT(*) FILTER (WHERE status = 'error')::DECIMAL / COUNT(*)) * 100, 2)
    END as error_rate
  FROM api_request_logs
  WHERE created_at > NOW() - (p_minutes || ' minutes')::INTERVAL
    AND (p_operation_type IS NULL OR operation_type = p_operation_type);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get top stores by usage
CREATE OR REPLACE FUNCTION get_top_stores_by_usage(
  p_days INT DEFAULT 30,
  p_limit INT DEFAULT 10
)
RETURNS TABLE(
  shop_id UUID,
  shop_name TEXT,
  plan_tier TEXT,
  total_generations BIGINT,
  plan_limit INT,
  usage_percent DECIMAL
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    s.id as shop_id,
    s.name as shop_name,
    s.plan_tier,
    COALESCE(SUM(r.request_count), 0)::BIGINT as total_generations,
    CASE s.plan_tier
      WHEN 'free' THEN 30
      WHEN 'starter' THEN 2000
      WHEN 'pro' THEN 5000
      ELSE 30
    END as plan_limit,
    CASE
      WHEN CASE s.plan_tier
        WHEN 'free' THEN 30
        WHEN 'starter' THEN 2000
        WHEN 'pro' THEN 5000
        ELSE 30
      END = 0 THEN 0
      ELSE ROUND((COALESCE(SUM(r.request_count), 0)::DECIMAL /
        CASE s.plan_tier
          WHEN 'free' THEN 30
          WHEN 'starter' THEN 2000
          WHEN 'pro' THEN 5000
          ELSE 30
        END) * 100, 1)
    END as usage_percent
  FROM shops s
  LEFT JOIN daily_usage_rollups r ON s.id = r.shop_id
    AND r.date > CURRENT_DATE - p_days
    AND r.operation_type IN ('product_description', 'ad_generation')
  GROUP BY s.id, s.name, s.plan_tier
  ORDER BY usage_percent DESC NULLS LAST
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get dashboard summary stats
CREATE OR REPLACE FUNCTION get_dashboard_summary(p_days INT DEFAULT 7)
RETURNS TABLE(
  total_generations BIGINT,
  total_cost_usd DECIMAL,
  avg_latency_ms DECIMAL,
  error_rate DECIMAL,
  active_stores BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    COALESCE(SUM(request_count), 0)::BIGINT as total_generations,
    COALESCE(SUM(total_cost_usd), 0)::DECIMAL as total_cost_usd,
    COALESCE(AVG(avg_latency_ms), 0)::DECIMAL as avg_latency_ms,
    CASE
      WHEN COALESCE(SUM(request_count), 0) = 0 THEN 0
      ELSE ROUND((COALESCE(SUM(error_count), 0)::DECIMAL / SUM(request_count)) * 100, 2)
    END as error_rate,
    COUNT(DISTINCT shop_id)::BIGINT as active_stores
  FROM daily_usage_rollups
  WHERE date > CURRENT_DATE - p_days;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 8. Data Retention Job (cleanup old per-request logs)
-- ============================================
-- Note: Run this as a scheduled job (cron) to cleanup old data
-- Keep per-request logs for 7 days, then rely on rollups

CREATE OR REPLACE FUNCTION cleanup_old_request_logs()
RETURNS INT AS $$
DECLARE
  deleted_count INT;
BEGIN
  DELETE FROM api_request_logs
  WHERE created_at < NOW() - INTERVAL '7 days';

  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 9. Comments for documentation
-- ============================================
COMMENT ON TABLE api_request_logs IS 'Per-request logging for recent API calls (7 days retention)';
COMMENT ON TABLE daily_usage_rollups IS 'Daily aggregated usage statistics per shop and operation type';
COMMENT ON TABLE system_metrics IS 'System-wide metrics for real-time dashboard';
COMMENT ON TABLE alert_history IS 'History of all alerts with notification and resolution status';
COMMENT ON TABLE error_logs IS 'Detailed error tracking with stack traces and context';

COMMENT ON FUNCTION get_error_rate IS 'Calculate error rate percentage for a given time window';
COMMENT ON FUNCTION get_top_stores_by_usage IS 'Get top N stores by usage percentage of their plan limit';
COMMENT ON FUNCTION get_dashboard_summary IS 'Get summary statistics for the dev dashboard';
COMMENT ON FUNCTION cleanup_old_request_logs IS 'Cleanup request logs older than 7 days';
