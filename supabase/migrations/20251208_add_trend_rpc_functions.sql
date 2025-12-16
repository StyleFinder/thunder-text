-- ============================================================================
-- Migration: Trend RPC Functions
-- Date: 2025-12-08
-- Description: RPC functions for trend_signals and trend_series with SECURITY DEFINER
--              to bypass PostgREST permission layer
-- ============================================================================

-- Function to get active themes (those currently in season)
CREATE OR REPLACE FUNCTION get_active_themes()
RETURNS TABLE (
  id UUID,
  slug TEXT,
  name TEXT,
  description TEXT,
  category TEXT,
  active_start TEXT,
  active_end TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    t.id,
    t.slug,
    t.name,
    t.description,
    t.category,
    t.active_start,
    t.active_end
  FROM themes t
  WHERE t.is_active = true
    AND is_theme_in_season(t.active_start, t.active_end);
END;
$$;

-- Function to upsert trend signal
CREATE OR REPLACE FUNCTION upsert_trend_signal(
  p_shop_id UUID,
  p_theme_id UUID,
  p_status TEXT,
  p_momentum_pct NUMERIC,
  p_latest_value NUMERIC,
  p_last_peak_date TEXT,
  p_peak_recency_days INTEGER
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_signal_id UUID;
BEGIN
  INSERT INTO trend_signals (
    shop_id,
    theme_id,
    status,
    momentum_pct,
    latest_value,
    last_peak_date,
    peak_recency_days,
    computed_at
  )
  VALUES (
    p_shop_id,
    p_theme_id,
    p_status,
    p_momentum_pct,
    p_latest_value,
    p_last_peak_date::DATE,
    p_peak_recency_days,
    NOW()
  )
  ON CONFLICT (shop_id, theme_id, market, COALESCE(region, '_'), source)
  DO UPDATE SET
    status = EXCLUDED.status,
    momentum_pct = EXCLUDED.momentum_pct,
    latest_value = EXCLUDED.latest_value,
    last_peak_date = EXCLUDED.last_peak_date,
    peak_recency_days = EXCLUDED.peak_recency_days,
    computed_at = NOW()
  RETURNING id INTO v_signal_id;

  RETURN v_signal_id;
END;
$$;

-- Function to upsert trend series
CREATE OR REPLACE FUNCTION upsert_trend_series(
  p_shop_id UUID,
  p_theme_id UUID,
  p_granularity TEXT,
  p_points JSONB,
  p_start_date TEXT,
  p_end_date TEXT
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_series_id UUID;
BEGIN
  INSERT INTO trend_series (
    shop_id,
    theme_id,
    granularity,
    points,
    start_date,
    end_date,
    updated_at
  )
  VALUES (
    p_shop_id,
    p_theme_id,
    p_granularity,
    p_points,
    p_start_date::DATE,
    p_end_date::DATE,
    NOW()
  )
  ON CONFLICT (shop_id, theme_id, market, COALESCE(region, '_'), source, granularity, start_date, end_date)
  DO UPDATE SET
    points = EXCLUDED.points,
    updated_at = NOW()
  RETURNING id INTO v_series_id;

  RETURN v_series_id;
END;
$$;

-- Function to get trend signals for a shop and theme
CREATE OR REPLACE FUNCTION get_trend_signal(
  p_shop_id UUID,
  p_theme_id UUID
)
RETURNS TABLE (
  id UUID,
  status TEXT,
  momentum_pct NUMERIC,
  latest_value NUMERIC,
  last_peak_date DATE,
  peak_recency_days INTEGER,
  computed_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    ts.id,
    ts.status,
    ts.momentum_pct,
    ts.latest_value,
    ts.last_peak_date,
    ts.peak_recency_days,
    ts.computed_at
  FROM trend_signals ts
  WHERE ts.shop_id = p_shop_id
    AND ts.theme_id = p_theme_id;
END;
$$;

-- Function to get trend series for a shop and theme
CREATE OR REPLACE FUNCTION get_trend_series(
  p_shop_id UUID,
  p_theme_id UUID,
  p_granularity TEXT DEFAULT 'weekly'
)
RETURNS TABLE (
  id UUID,
  points JSONB,
  granularity TEXT,
  start_date DATE,
  end_date DATE,
  updated_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    ts.id,
    ts.points,
    ts.granularity,
    ts.start_date,
    ts.end_date,
    ts.updated_at
  FROM trend_series ts
  WHERE ts.shop_id = p_shop_id
    AND ts.theme_id = p_theme_id
    AND ts.granularity = p_granularity
  ORDER BY ts.updated_at DESC
  LIMIT 1;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION get_active_themes() TO authenticated;
GRANT EXECUTE ON FUNCTION get_active_themes() TO anon;
GRANT EXECUTE ON FUNCTION get_active_themes() TO service_role;

GRANT EXECUTE ON FUNCTION upsert_trend_signal(UUID, UUID, TEXT, NUMERIC, NUMERIC, TEXT, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION upsert_trend_signal(UUID, UUID, TEXT, NUMERIC, NUMERIC, TEXT, INTEGER) TO anon;
GRANT EXECUTE ON FUNCTION upsert_trend_signal(UUID, UUID, TEXT, NUMERIC, NUMERIC, TEXT, INTEGER) TO service_role;

GRANT EXECUTE ON FUNCTION upsert_trend_series(UUID, UUID, TEXT, JSONB, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION upsert_trend_series(UUID, UUID, TEXT, JSONB, TEXT, TEXT) TO anon;
GRANT EXECUTE ON FUNCTION upsert_trend_series(UUID, UUID, TEXT, JSONB, TEXT, TEXT) TO service_role;

GRANT EXECUTE ON FUNCTION get_trend_signal(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_trend_signal(UUID, UUID) TO anon;
GRANT EXECUTE ON FUNCTION get_trend_signal(UUID, UUID) TO service_role;

GRANT EXECUTE ON FUNCTION get_trend_series(UUID, UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION get_trend_series(UUID, UUID, TEXT) TO anon;
GRANT EXECUTE ON FUNCTION get_trend_series(UUID, UUID, TEXT) TO service_role;
