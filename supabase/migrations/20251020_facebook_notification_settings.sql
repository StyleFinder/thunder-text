-- Facebook Notification Settings Migration
-- Stores email alert preferences and custom benchmarks for Facebook ad monitoring

-- Create facebook_notification_settings table
CREATE TABLE IF NOT EXISTS facebook_notification_settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  shop_id UUID REFERENCES shops(id) ON DELETE CASCADE UNIQUE NOT NULL,
  primary_email TEXT NOT NULL,
  additional_emails TEXT[] DEFAULT ARRAY[]::TEXT[], -- Array of additional email addresses
  custom_conversion_benchmark DECIMAL(5,2) DEFAULT 3.0 CHECK (custom_conversion_benchmark >= 0),
  custom_roas_benchmark DECIMAL(5,2) DEFAULT 3.0 CHECK (custom_roas_benchmark >= 0),
  alert_threshold_percentage INTEGER DEFAULT 10 CHECK (alert_threshold_percentage >= 0 AND alert_threshold_percentage <= 100),
  notify_on_conversion BOOLEAN DEFAULT TRUE,
  notify_on_roas BOOLEAN DEFAULT TRUE,
  is_enabled BOOLEAN DEFAULT TRUE,
  last_alert_sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index for faster shop_id lookups
CREATE INDEX idx_facebook_notification_settings_shop_id ON facebook_notification_settings(shop_id);

-- Create index for finding shops that need daily alerts
CREATE INDEX idx_facebook_notification_settings_enabled ON facebook_notification_settings(is_enabled, last_alert_sent_at);

-- Create facebook_alert_history table to track sent alerts
CREATE TABLE IF NOT EXISTS facebook_alert_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  shop_id UUID REFERENCES shops(id) ON DELETE CASCADE NOT NULL,
  campaign_id TEXT NOT NULL,
  campaign_name TEXT NOT NULL,
  alert_type TEXT NOT NULL CHECK (alert_type IN ('conversion_rate', 'roas', 'both')),
  conversion_rate DECIMAL(5,2),
  conversion_benchmark DECIMAL(5,2),
  roas DECIMAL(5,2),
  roas_benchmark DECIMAL(5,2),
  spend DECIMAL(10,2),
  emails_sent TEXT[] NOT NULL, -- List of emails that received this alert
  sent_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for alert history queries
CREATE INDEX idx_facebook_alert_history_shop_id ON facebook_alert_history(shop_id);
CREATE INDEX idx_facebook_alert_history_sent_at ON facebook_alert_history(sent_at);
CREATE INDEX idx_facebook_alert_history_campaign ON facebook_alert_history(shop_id, campaign_id, sent_at);

-- Add updated_at trigger for facebook_notification_settings
CREATE OR REPLACE FUNCTION update_facebook_notification_settings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_facebook_notification_settings_updated_at
  BEFORE UPDATE ON facebook_notification_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_facebook_notification_settings_updated_at();

-- Grant permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON facebook_notification_settings TO authenticated;
GRANT SELECT, INSERT ON facebook_alert_history TO authenticated;

-- Enable RLS (Row Level Security)
ALTER TABLE facebook_notification_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE facebook_alert_history ENABLE ROW LEVEL SECURITY;

-- RLS Policies for facebook_notification_settings
CREATE POLICY "Users can view their own notification settings"
  ON facebook_notification_settings
  FOR SELECT
  USING (shop_id IN (
    SELECT id FROM shops WHERE shop_domain = current_setting('request.jwt.claims', true)::json->>'shop'
  ));

CREATE POLICY "Users can insert their own notification settings"
  ON facebook_notification_settings
  FOR INSERT
  WITH CHECK (shop_id IN (
    SELECT id FROM shops WHERE shop_domain = current_setting('request.jwt.claims', true)::json->>'shop'
  ));

CREATE POLICY "Users can update their own notification settings"
  ON facebook_notification_settings
  FOR UPDATE
  USING (shop_id IN (
    SELECT id FROM shops WHERE shop_domain = current_setting('request.jwt.claims', true)::json->>'shop'
  ));

-- RLS Policies for facebook_alert_history
CREATE POLICY "Users can view their own alert history"
  ON facebook_alert_history
  FOR SELECT
  USING (shop_id IN (
    SELECT id FROM shops WHERE shop_domain = current_setting('request.jwt.claims', true)::json->>'shop'
  ));

-- Service role can do everything (for Edge Functions)
CREATE POLICY "Service role has full access to notification settings"
  ON facebook_notification_settings
  FOR ALL
  USING (auth.jwt()->>'role' = 'service_role');

CREATE POLICY "Service role has full access to alert history"
  ON facebook_alert_history
  FOR ALL
  USING (auth.jwt()->>'role' = 'service_role');

-- Add comments for documentation
COMMENT ON TABLE facebook_notification_settings IS 'Stores email notification preferences and custom benchmarks for Facebook ad campaign monitoring';
COMMENT ON TABLE facebook_alert_history IS 'Tracks all Facebook campaign alert emails sent to users';
COMMENT ON COLUMN facebook_notification_settings.alert_threshold_percentage IS 'Alert triggered when metric is this percentage below benchmark (e.g., 10 means alert at 10% below)';
COMMENT ON COLUMN facebook_notification_settings.last_alert_sent_at IS 'Timestamp of most recent alert sent - used to prevent duplicate daily alerts';
