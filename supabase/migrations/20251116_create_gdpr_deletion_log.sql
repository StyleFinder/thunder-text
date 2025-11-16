-- GDPR Deletion Audit Log
-- Tracks all GDPR-related data deletion requests for compliance

CREATE TABLE IF NOT EXISTS gdpr_deletion_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Webhook details
  webhook_type TEXT NOT NULL CHECK (webhook_type IN ('shop/redact', 'customers/redact', 'customers/data_request')),
  shop_domain TEXT NOT NULL,
  shop_id BIGINT, -- Shopify's internal shop ID
  customer_id BIGINT, -- NULL for shop deletions, populated for customer requests

  -- Deletion tracking
  deleted_at TIMESTAMPTZ DEFAULT NOW(),
  deletion_status TEXT DEFAULT 'completed' CHECK (deletion_status IN ('pending', 'completed', 'failed', 'no_data')),
  records_deleted INTEGER DEFAULT 0, -- Count of records deleted
  error_message TEXT, -- If deletion failed, why?

  -- Audit trail
  webhook_payload JSONB, -- Full webhook payload for reference
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for audit queries
CREATE INDEX IF NOT EXISTS idx_gdpr_log_shop_domain ON gdpr_deletion_log(shop_domain);
CREATE INDEX IF NOT EXISTS idx_gdpr_log_webhook_type ON gdpr_deletion_log(webhook_type);
CREATE INDEX IF NOT EXISTS idx_gdpr_log_deleted_at ON gdpr_deletion_log(deleted_at);
CREATE INDEX IF NOT EXISTS idx_gdpr_log_status ON gdpr_deletion_log(deletion_status);

-- RLS policies
ALTER TABLE gdpr_deletion_log ENABLE ROW LEVEL SECURITY;

-- Only service role can read GDPR logs (sensitive audit data)
CREATE POLICY "Service role can read GDPR logs" ON gdpr_deletion_log
  FOR SELECT
  TO service_role
  USING (true);

-- Only service role can insert GDPR logs (webhook handlers)
CREATE POLICY "Service role can insert GDPR logs" ON gdpr_deletion_log
  FOR INSERT
  TO service_role
  WITH CHECK (true);

-- Grant permissions
GRANT SELECT, INSERT ON gdpr_deletion_log TO service_role;
GRANT USAGE, SELECT ON SEQUENCE gdpr_deletion_log_id_seq TO service_role;

-- Comment for documentation
COMMENT ON TABLE gdpr_deletion_log IS 'Audit log for all GDPR data deletion requests. Retained for 2 years for compliance purposes.';
COMMENT ON COLUMN gdpr_deletion_log.webhook_type IS 'Type of GDPR webhook: shop/redact, customers/redact, or customers/data_request';
COMMENT ON COLUMN gdpr_deletion_log.deletion_status IS 'Status of deletion: pending, completed, failed, or no_data (for customer requests when we store no customer data)';
COMMENT ON COLUMN gdpr_deletion_log.records_deleted IS 'Number of database records deleted during this operation';
COMMENT ON COLUMN gdpr_deletion_log.webhook_payload IS 'Full Shopify webhook payload for audit trail';
