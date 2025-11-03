-- ============================================================================
-- Migration: Seasonal Trend Demand Engine
-- Date: 2025-11-03
-- Description: Google Trends-based seasonal intelligence for merchandising
-- ============================================================================

-- 1) THEMES: Global catalog of retail/seasonal concepts
CREATE TABLE IF NOT EXISTS themes (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug          TEXT UNIQUE NOT NULL,              -- e.g., "game-day"
  name          TEXT NOT NULL,                     -- e.g., "Game Day"
  description   TEXT,
  category      TEXT,                              -- e.g., "Sports", "Holiday", "Seasonal"

  -- Seasonal bounds (month-day format, UTC)
  active_start  TEXT,                              -- e.g., "08-01" (Aug 1)
  active_end    TEXT,                              -- e.g., "12-31" (Dec 31)

  -- Refresh cadence
  refresh_frequency TEXT NOT NULL DEFAULT 'weekly', -- 'daily' | 'weekly' | 'inactive'

  is_active     BOOLEAN NOT NULL DEFAULT true,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),

  CHECK (active_start IS NULL OR active_start ~ '^\d{2}-\d{2}$'),
  CHECK (active_end IS NULL OR active_end ~ '^\d{2}-\d{2}$')
);

CREATE INDEX idx_themes_slug ON themes(slug);
CREATE INDEX idx_themes_active ON themes(is_active) WHERE is_active = true;

COMMENT ON TABLE themes IS 'Global catalog of seasonal/merchandising themes with seasonal bounds';
COMMENT ON COLUMN themes.active_start IS 'Month-day when theme becomes active (MM-DD format, e.g., "08-01")';
COMMENT ON COLUMN themes.active_end IS 'Month-day when theme season ends (MM-DD format, e.g., "12-31")';

-- 2) THEME_KEYWORDS: Per-theme keyword mappings for trend providers
CREATE TABLE IF NOT EXISTS theme_keywords (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  theme_id      UUID NOT NULL REFERENCES themes(id) ON DELETE CASCADE,
  keyword       TEXT NOT NULL,                     -- e.g., "game day outfits"
  market        TEXT NOT NULL DEFAULT 'US',        -- ISO country code
  weight        NUMERIC NOT NULL DEFAULT 1.0,      -- relative importance (0.1–1.0)
  is_active     BOOLEAN NOT NULL DEFAULT true,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),

  UNIQUE(theme_id, keyword, market)
);

CREATE INDEX idx_theme_keywords_theme ON theme_keywords(theme_id);
CREATE INDEX idx_theme_keywords_active ON theme_keywords(theme_id, is_active);

-- 3) SHOP_THEMES: Which themes each shop tracks (with priority)
CREATE TABLE IF NOT EXISTS shop_themes (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id       UUID NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
  theme_id      UUID NOT NULL REFERENCES themes(id) ON DELETE CASCADE,
  market        TEXT NOT NULL DEFAULT 'US',
  region        TEXT,                              -- optional: state/DMA
  priority      INT NOT NULL DEFAULT 5,            -- 1 (high urgency) .. 9 (low)
  is_enabled    BOOLEAN NOT NULL DEFAULT true,

  -- Backfill metadata
  backfill_completed BOOLEAN NOT NULL DEFAULT false,
  backfill_start_date DATE,

  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),

  UNIQUE(shop_id, theme_id, market, COALESCE(region,'_'))
);

CREATE INDEX idx_shop_themes_shop ON shop_themes(shop_id);
CREATE INDEX idx_shop_themes_enabled ON shop_themes(shop_id, is_enabled) WHERE is_enabled = true;
CREATE INDEX idx_shop_themes_theme ON shop_themes(theme_id);

-- 4) TREND_SERIES: Raw time series data per shop+theme
CREATE TABLE IF NOT EXISTS trend_series (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id       UUID NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
  theme_id      UUID NOT NULL REFERENCES themes(id) ON DELETE CASCADE,
  market        TEXT NOT NULL DEFAULT 'US',
  region        TEXT,

  source        TEXT NOT NULL DEFAULT 'google_trends', -- 'google_trends' | 'serpapi' | 'manual'
  granularity   TEXT NOT NULL DEFAULT 'weekly',        -- 'daily' | 'weekly'

  start_date    DATE NOT NULL,
  end_date      DATE NOT NULL,

  -- JSONB array: [{ "date":"2025-08-31","value":72 }, ...]
  points        JSONB NOT NULL,

  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),

  UNIQUE(shop_id, theme_id, market, COALESCE(region,'_'), source, granularity, start_date, end_date)
);

CREATE INDEX idx_trend_series_shop ON trend_series(shop_id);
CREATE INDEX idx_trend_series_theme ON trend_series(theme_id);
CREATE INDEX idx_trend_series_dates ON trend_series(start_date, end_date);

-- 5) TREND_SIGNALS: Computed summary metrics (latest window)
CREATE TABLE IF NOT EXISTS trend_signals (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id       UUID NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
  theme_id      UUID NOT NULL REFERENCES themes(id) ON DELETE CASCADE,
  market        TEXT NOT NULL DEFAULT 'US',
  region        TEXT,
  source        TEXT NOT NULL DEFAULT 'google_trends',

  window_days   INT NOT NULL DEFAULT 84,           -- analysis window (e.g., 12 weeks)

  -- Core metrics
  momentum_pct  NUMERIC NOT NULL,                  -- recent vs baseline (e.g., -35.2%)
  status        TEXT NOT NULL CHECK (status IN ('Rising','Stable','Waning')),

  latest_value  NUMERIC NOT NULL,                  -- most recent index value (0–100)

  -- Peak analysis
  last_peak_date DATE,
  peak_recency_days INT,                           -- days since peak

  -- Metadata
  notes         TEXT,
  computed_at   TIMESTAMPTZ NOT NULL DEFAULT now(),

  UNIQUE(shop_id, theme_id, market, COALESCE(region,'_'), source)
);

CREATE INDEX idx_trend_signals_shop ON trend_signals(shop_id);
CREATE INDEX idx_trend_signals_status ON trend_signals(shop_id, status);
CREATE INDEX idx_trend_signals_theme ON trend_signals(theme_id);

-- 6) SEASONAL_PROFILES: Normalized "typical year" curves per theme
CREATE TABLE IF NOT EXISTS seasonal_profiles (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  theme_id      UUID NOT NULL REFERENCES themes(id) ON DELETE CASCADE,
  market        TEXT NOT NULL DEFAULT 'US',
  region        TEXT,

  method        TEXT NOT NULL DEFAULT 'percentile-avg', -- aggregation method

  -- 52-week normalized array (values 0–100)
  week_1_to_52  NUMERIC[] NOT NULL,

  years_included INT NOT NULL DEFAULT 0,           -- how many years aggregated

  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),

  UNIQUE(theme_id, market, COALESCE(region,'_')),

  CHECK (array_length(week_1_to_52, 1) = 52)
);

CREATE INDEX idx_seasonal_profiles_theme ON seasonal_profiles(theme_id);

-- 7) TREND_REFRESH_LOG: Audit trail for refresh jobs
CREATE TABLE IF NOT EXISTS trend_refresh_log (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id       UUID REFERENCES shops(id) ON DELETE CASCADE,
  theme_id      UUID REFERENCES themes(id) ON DELETE CASCADE,

  job_type      TEXT NOT NULL,                     -- 'weekly' | 'daily' | 'backfill' | 'manual'
  status        TEXT NOT NULL CHECK (status IN ('success','error','skipped')),

  records_processed INT DEFAULT 0,
  error_message TEXT,

  started_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at  TIMESTAMPTZ
);

CREATE INDEX idx_refresh_log_shop ON trend_refresh_log(shop_id, started_at DESC);
CREATE INDEX idx_refresh_log_status ON trend_refresh_log(status, started_at DESC);

-- ============================================================================
-- RLS POLICIES
-- ============================================================================

-- Enable RLS
ALTER TABLE shop_themes ENABLE ROW LEVEL SECURITY;
ALTER TABLE trend_series ENABLE ROW LEVEL SECURITY;
ALTER TABLE trend_signals ENABLE ROW LEVEL SECURITY;
ALTER TABLE trend_refresh_log ENABLE ROW LEVEL SECURITY;

-- SHOP_THEMES: shops can only see/manage their own subscriptions
CREATE POLICY "Shops access own theme subscriptions"
  ON shop_themes FOR ALL
  TO authenticated
  USING (shop_id = auth.uid())
  WITH CHECK (shop_id = auth.uid());

CREATE POLICY "Service role full access to shop_themes"
  ON shop_themes FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- TREND_SERIES: shops can only see their own series
CREATE POLICY "Shops access own trend series"
  ON trend_series FOR SELECT
  TO authenticated
  USING (shop_id = auth.uid());

CREATE POLICY "Service role full access to trend_series"
  ON trend_series FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- TREND_SIGNALS: shops can only see their own signals
CREATE POLICY "Shops access own trend signals"
  ON trend_signals FOR SELECT
  TO authenticated
  USING (shop_id = auth.uid());

CREATE POLICY "Service role full access to trend_signals"
  ON trend_signals FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- TREND_REFRESH_LOG: shops can see their own logs
CREATE POLICY "Shops access own refresh logs"
  ON trend_refresh_log FOR SELECT
  TO authenticated
  USING (shop_id = auth.uid());

CREATE POLICY "Service role full access to refresh_log"
  ON trend_refresh_log FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- THEMES + KEYWORDS: global read-only (service role writes only)
ALTER TABLE themes ENABLE ROW LEVEL SECURITY;
ALTER TABLE theme_keywords ENABLE ROW LEVEL SECURITY;
ALTER TABLE seasonal_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Themes read-only for authenticated"
  ON themes FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Theme keywords read-only for authenticated"
  ON theme_keywords FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Seasonal profiles read-only for authenticated"
  ON seasonal_profiles FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Service role full access to themes"
  ON themes FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Service role full access to theme_keywords"
  ON theme_keywords FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Service role full access to seasonal_profiles"
  ON seasonal_profiles FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ============================================================================
-- TRIGGERS
-- ============================================================================

-- Auto-update updated_at timestamps
CREATE TRIGGER update_themes_updated_at
  BEFORE UPDATE ON themes
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_shop_themes_updated_at
  BEFORE UPDATE ON shop_themes
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_trend_series_updated_at
  BEFORE UPDATE ON trend_series
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- HELPER FUNCTIONS
-- ============================================================================

-- Check if theme is currently in season
CREATE OR REPLACE FUNCTION is_theme_in_season(
  p_active_start TEXT,
  p_active_end TEXT,
  p_check_date DATE DEFAULT CURRENT_DATE
)
RETURNS BOOLEAN
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  v_start_md TEXT;
  v_end_md TEXT;
  v_check_md TEXT;
BEGIN
  -- If no bounds set, theme is always active
  IF p_active_start IS NULL OR p_active_end IS NULL THEN
    RETURN true;
  END IF;

  -- Extract MM-DD from dates
  v_start_md := p_active_start;
  v_end_md := p_active_end;
  v_check_md := TO_CHAR(p_check_date, 'MM-DD');

  -- Handle wrapping seasons (e.g., Nov 15 to Jan 31)
  IF v_start_md <= v_end_md THEN
    -- Normal season (e.g., Aug 1 to Dec 31)
    RETURN v_check_md >= v_start_md AND v_check_md <= v_end_md;
  ELSE
    -- Wrapping season (e.g., Nov 15 to Jan 31)
    RETURN v_check_md >= v_start_md OR v_check_md <= v_end_md;
  END IF;
END;
$$;

COMMENT ON FUNCTION is_theme_in_season IS 'Checks if a given date falls within a theme''s active season (handles wrapping years)';
