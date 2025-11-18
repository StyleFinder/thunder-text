-- ============================================================================
-- Ad Intelligence Engine (AIE) - Supporting Tables Migration
-- ============================================================================
-- Description: Creates supporting AIE tables for image caching, insights,
--              expert contributions, and system logs
-- Version: 1.0.0
-- Date: 2025-11-06
-- Depends on: 20251106_aie_core_schema.sql
-- ============================================================================

-- ============================================================================
-- TABLE: aie_image_analysis
-- Purpose: Cache image analysis results to avoid redundant API calls
-- ============================================================================
CREATE TABLE aie_image_analysis (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  image_url TEXT NOT NULL UNIQUE,
  analysis_provider TEXT NOT NULL CHECK (analysis_provider IN ('openai_vision', 'clip', 'google_vision')),
  category TEXT NOT NULL,
  subcategory TEXT,
  tags TEXT[] NOT NULL DEFAULT '{}',
  colors JSONB DEFAULT '{}',
  mood TEXT[] DEFAULT '{}',
  scene_context TEXT[] DEFAULT '{}',
  text_detected TEXT,
  object_count INTEGER,
  quality_score NUMERIC(3,2) CHECK (quality_score >= 0 AND quality_score <= 1),
  embedding vector(1536),
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for aie_image_analysis
CREATE INDEX idx_aie_image_analysis_url ON aie_image_analysis(image_url);
CREATE INDEX idx_aie_image_analysis_category ON aie_image_analysis(category);
CREATE INDEX idx_aie_image_analysis_embedding ON aie_image_analysis
  USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);
CREATE INDEX idx_aie_image_analysis_created ON aie_image_analysis(created_at DESC);

-- ============================================================================
-- TABLE: aie_learning_loop_insights
-- Purpose: Store aggregated insights from performance data
-- ============================================================================
CREATE TABLE aie_learning_loop_insights (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  insight_type TEXT NOT NULL CHECK (insight_type IN ('best_performer', 'trend', 'pattern', 'recommendation')),
  platform TEXT NOT NULL CHECK (platform IN ('meta', 'instagram', 'google', 'tiktok', 'pinterest', 'all')),
  category TEXT,
  goal TEXT CHECK (goal IN ('awareness', 'engagement', 'conversion', 'traffic', 'all')),
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  data_points_analyzed INTEGER NOT NULL,
  confidence_score NUMERIC(3,2) CHECK (confidence_score >= 0 AND confidence_score <= 1),
  time_period_start DATE,
  time_period_end DATE,
  metrics JSONB NOT NULL DEFAULT '{}',
  examples JSONB DEFAULT '[]',
  actionable_recommendation TEXT,
  is_active BOOLEAN DEFAULT true,
  viewed_count INTEGER DEFAULT 0,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for aie_learning_loop_insights
CREATE INDEX idx_aie_insights_type ON aie_learning_loop_insights(insight_type);
CREATE INDEX idx_aie_insights_platform_category ON aie_learning_loop_insights(platform, category);
CREATE INDEX idx_aie_insights_active ON aie_learning_loop_insights(is_active) WHERE is_active = true;
CREATE INDEX idx_aie_insights_confidence ON aie_learning_loop_insights(confidence_score DESC);
CREATE INDEX idx_aie_insights_created ON aie_learning_loop_insights(created_at DESC);

-- ============================================================================
-- TABLE: aie_expert_contributions
-- Purpose: Track expert uploads and governance
-- ============================================================================
CREATE TABLE aie_expert_contributions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  expert_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  contribution_type TEXT NOT NULL CHECK (contribution_type IN ('best_practice', 'ad_example', 'insight')),
  referenced_id UUID NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'needs_revision')),
  reviewer_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  review_notes TEXT,
  reviewed_at TIMESTAMP WITH TIME ZONE,
  impact_score NUMERIC(3,2) CHECK (impact_score >= 0 AND impact_score <= 1),
  usage_count INTEGER DEFAULT 0,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for aie_expert_contributions
CREATE INDEX idx_aie_contributions_expert ON aie_expert_contributions(expert_user_id);
CREATE INDEX idx_aie_contributions_status ON aie_expert_contributions(status);
CREATE INDEX idx_aie_contributions_type ON aie_expert_contributions(contribution_type);
CREATE INDEX idx_aie_contributions_referenced ON aie_expert_contributions(referenced_id);
CREATE INDEX idx_aie_contributions_created ON aie_expert_contributions(created_at DESC);

-- ============================================================================
-- TABLE: aie_rag_retrieval_logs
-- Purpose: Debug and optimize RAG retrieval quality
-- ============================================================================
CREATE TABLE aie_rag_retrieval_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ad_request_id UUID NOT NULL REFERENCES aie_ad_requests(id) ON DELETE CASCADE,
  query_embedding vector(1536),
  query_text TEXT NOT NULL,
  retrieved_best_practices JSONB NOT NULL DEFAULT '[]',
  retrieved_examples JSONB NOT NULL DEFAULT '[]',
  retrieval_time_ms INTEGER,
  similarity_threshold NUMERIC(3,2),
  top_k INTEGER,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for aie_rag_retrieval_logs
CREATE INDEX idx_aie_rag_logs_request ON aie_rag_retrieval_logs(ad_request_id);
CREATE INDEX idx_aie_rag_logs_created ON aie_rag_retrieval_logs(created_at DESC);

-- Partition by date for scalability (implement when > 1M logs)
-- CREATE INDEX idx_aie_rag_logs_created_date ON aie_rag_retrieval_logs(DATE(created_at));

-- ============================================================================
-- TABLE: aie_scheduled_jobs_log
-- Purpose: Track scheduled job executions
-- ============================================================================
CREATE TABLE aie_scheduled_jobs_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_name TEXT NOT NULL CHECK (job_name IN ('sync_ad_metrics', 'embed_best_practices', 'refresh_rag_index', 'expire_old_entries', 'generate_insights')),
  status TEXT NOT NULL CHECK (status IN ('started', 'completed', 'failed')),
  records_processed INTEGER,
  error_message TEXT,
  execution_time_ms INTEGER,
  metadata JSONB DEFAULT '{}',
  started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE
);

-- Indexes for aie_scheduled_jobs_log
CREATE INDEX idx_aie_jobs_log_name ON aie_scheduled_jobs_log(job_name);
CREATE INDEX idx_aie_jobs_log_status ON aie_scheduled_jobs_log(status);
CREATE INDEX idx_aie_jobs_log_started ON aie_scheduled_jobs_log(started_at DESC);

-- ============================================================================
-- TABLE: aie_embedding_cache
-- Purpose: Cache text embeddings to reduce OpenAI API calls
-- ============================================================================
CREATE TABLE aie_embedding_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  text_hash TEXT NOT NULL UNIQUE,
  text_content TEXT NOT NULL,
  embedding vector(1536) NOT NULL,
  model_version TEXT NOT NULL DEFAULT 'text-embedding-ada-002',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for aie_embedding_cache
CREATE INDEX idx_aie_embedding_cache_hash ON aie_embedding_cache(text_hash);
CREATE INDEX idx_aie_embedding_cache_model ON aie_embedding_cache(model_version);
CREATE INDEX idx_aie_embedding_cache_created ON aie_embedding_cache(created_at DESC);

-- ============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================================

-- Enable RLS on all supporting tables
ALTER TABLE aie_image_analysis ENABLE ROW LEVEL SECURITY;
ALTER TABLE aie_learning_loop_insights ENABLE ROW LEVEL SECURITY;
ALTER TABLE aie_expert_contributions ENABLE ROW LEVEL SECURITY;
ALTER TABLE aie_rag_retrieval_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE aie_scheduled_jobs_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE aie_embedding_cache ENABLE ROW LEVEL SECURITY;

-- Image Analysis: Public read (cached data)
CREATE POLICY "Public read image analysis"
  ON aie_image_analysis
  FOR SELECT
  USING (true);

CREATE POLICY "Service role insert image analysis"
  ON aie_image_analysis
  FOR INSERT
  WITH CHECK (true);

-- Learning Loop Insights: Public read for active insights
CREATE POLICY "Public read active insights"
  ON aie_learning_loop_insights
  FOR SELECT
  USING (is_active = true);

-- Expert Contributions: Experts can view own contributions
CREATE POLICY "Experts view own contributions"
  ON aie_expert_contributions
  FOR SELECT
  USING (expert_user_id = auth.uid());

CREATE POLICY "Experts insert contributions"
  ON aie_expert_contributions
  FOR INSERT
  WITH CHECK (
    expert_user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM auth.users
      WHERE id = auth.uid()
      AND raw_user_meta_data->>'role' = 'expert'
    )
  );

-- RAG Retrieval Logs: Shop-scoped access (debugging)
CREATE POLICY "Users view own shop rag logs"
  ON aie_rag_retrieval_logs
  FOR SELECT
  USING (
    ad_request_id IN (
      SELECT id FROM aie_ad_requests
      WHERE shop_id IN (
        SELECT id FROM shops
        WHERE shop_domain = current_setting('app.shop_domain', true)
      )
    )
  );

-- Scheduled Jobs Log: Admin-only access
CREATE POLICY "Admins view job logs"
  ON aie_scheduled_jobs_log
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE id = auth.uid()
      AND raw_user_meta_data->>'role' = 'admin'
    )
  );

-- Embedding Cache: Public read (shared cache)
CREATE POLICY "Public read embedding cache"
  ON aie_embedding_cache
  FOR SELECT
  USING (true);

CREATE POLICY "Service role insert embedding cache"
  ON aie_embedding_cache
  FOR INSERT
  WITH CHECK (true);

-- ============================================================================
-- DATABASE FUNCTIONS
-- ============================================================================

-- Function: Get or create embedding cache entry
CREATE OR REPLACE FUNCTION get_or_create_aie_embedding(
  input_text TEXT,
  embedding_vector vector(1536) DEFAULT NULL
)
RETURNS TABLE (
  embedding vector(1536),
  is_cached BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  text_hash_value TEXT;
  cached_embedding vector(1536);
BEGIN
  -- Generate hash of input text
  text_hash_value := md5(lower(trim(input_text)));

  -- Try to get from cache
  SELECT ec.embedding INTO cached_embedding
  FROM aie_embedding_cache ec
  WHERE ec.text_hash = text_hash_value
  AND ec.model_version = 'text-embedding-ada-002';

  IF cached_embedding IS NOT NULL THEN
    RETURN QUERY SELECT cached_embedding, true;
  ELSIF embedding_vector IS NOT NULL THEN
    -- Insert new cache entry
    INSERT INTO aie_embedding_cache (text_hash, text_content, embedding, model_version)
    VALUES (text_hash_value, input_text, embedding_vector, 'text-embedding-ada-002')
    ON CONFLICT (text_hash) DO NOTHING;

    RETURN QUERY SELECT embedding_vector, false;
  ELSE
    -- No cached embedding and no new embedding provided
    RETURN QUERY SELECT NULL::vector(1536), false;
  END IF;
END;
$$;

-- Function: Clean up old logs (retention: 90 days)
CREATE OR REPLACE FUNCTION cleanup_aie_old_logs()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  -- Delete RAG retrieval logs older than 90 days
  DELETE FROM aie_rag_retrieval_logs
  WHERE created_at < NOW() - INTERVAL '90 days';

  GET DIAGNOSTICS deleted_count = ROW_COUNT;

  -- Delete job logs older than 90 days
  DELETE FROM aie_scheduled_jobs_log
  WHERE started_at < NOW() - INTERVAL '90 days';

  RETURN deleted_count;
END;
$$;

-- Function: Calculate ad performance aggregates
CREATE OR REPLACE FUNCTION calculate_aie_performance_aggregates(
  variant_id UUID,
  start_date DATE DEFAULT NULL,
  end_date DATE DEFAULT NULL
)
RETURNS TABLE (
  total_impressions BIGINT,
  total_clicks BIGINT,
  total_conversions BIGINT,
  total_spend NUMERIC,
  total_revenue NUMERIC,
  avg_roas NUMERIC,
  avg_ctr NUMERIC,
  avg_cpc NUMERIC,
  avg_cpa NUMERIC,
  days_active INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    SUM(impressions)::BIGINT as total_impressions,
    SUM(clicks)::BIGINT as total_clicks,
    SUM(conversions)::BIGINT as total_conversions,
    SUM(spend) as total_spend,
    SUM(revenue) as total_revenue,
    CASE
      WHEN SUM(spend) > 0 THEN ROUND((SUM(revenue) / SUM(spend))::NUMERIC, 4)
      ELSE 0
    END as avg_roas,
    CASE
      WHEN SUM(impressions) > 0 THEN ROUND((SUM(clicks)::NUMERIC / SUM(impressions))::NUMERIC, 4)
      ELSE 0
    END as avg_ctr,
    CASE
      WHEN SUM(clicks) > 0 THEN ROUND((SUM(spend) / SUM(clicks))::NUMERIC, 4)
      ELSE 0
    END as avg_cpc,
    CASE
      WHEN SUM(conversions) > 0 THEN ROUND((SUM(spend) / SUM(conversions))::NUMERIC, 4)
      ELSE 0
    END as avg_cpa,
    COUNT(DISTINCT date)::INTEGER as days_active
  FROM aie_ad_performance
  WHERE ad_variant_id = variant_id
    AND (start_date IS NULL OR date >= start_date)
    AND (end_date IS NULL OR date <= end_date);
END;
$$;

-- Function: Update insights updated_at timestamp
CREATE OR REPLACE FUNCTION update_aie_insights_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- Function: Update contributions updated_at timestamp
CREATE OR REPLACE FUNCTION update_aie_contributions_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- Triggers for updated_at
CREATE TRIGGER update_aie_insights_updated_at
  BEFORE UPDATE ON aie_learning_loop_insights
  FOR EACH ROW
  EXECUTE FUNCTION update_aie_insights_updated_at();

CREATE TRIGGER update_aie_contributions_updated_at
  BEFORE UPDATE ON aie_expert_contributions
  FOR EACH ROW
  EXECUTE FUNCTION update_aie_contributions_updated_at();

-- ============================================================================
-- MATERIALIZED VIEWS (for performance optimization)
-- ============================================================================

-- View: Top performing ads by category (last 90 days)
-- Note: Will populate as real ads are published and tracked
CREATE MATERIALIZED VIEW aie_top_performers_by_category AS
SELECT
  ar.platform,
  COALESCE(ia.category, 'general') as category,
  COUNT(DISTINCT av.id) as total_ads,
  AVG(ap.roas) as avg_roas,
  AVG(ap.ctr) as avg_ctr,
  PERCENTILE_CONT(0.9) WITHIN GROUP (ORDER BY ap.roas) as top_10_roas
FROM aie_ad_requests ar
JOIN aie_ad_variants av ON ar.id = av.ad_request_id
JOIN aie_ad_performance ap ON av.id = ap.ad_variant_id
LEFT JOIN aie_image_analysis ia ON ar.image_url = ia.image_url
WHERE ap.date >= CURRENT_DATE - INTERVAL '90 days'
  AND av.published_at IS NOT NULL
GROUP BY ar.platform, ia.category
HAVING COUNT(DISTINCT av.id) > 0;

-- Index on materialized view
CREATE INDEX idx_aie_top_performers_category ON aie_top_performers_by_category(category, platform);

-- ============================================================================
-- COMMENTS & DOCUMENTATION
-- ============================================================================

COMMENT ON TABLE aie_image_analysis IS 'AIE: Cache for image analysis results';
COMMENT ON TABLE aie_learning_loop_insights IS 'AIE: Aggregated performance insights';
COMMENT ON TABLE aie_expert_contributions IS 'AIE: Expert upload tracking and governance';
COMMENT ON TABLE aie_rag_retrieval_logs IS 'AIE: RAG retrieval debugging logs';
COMMENT ON TABLE aie_scheduled_jobs_log IS 'AIE: Scheduled job execution tracking';
COMMENT ON TABLE aie_embedding_cache IS 'AIE: OpenAI embedding cache to reduce API calls';

COMMENT ON FUNCTION get_or_create_aie_embedding IS 'Get embedding from cache or create new entry';
COMMENT ON FUNCTION cleanup_aie_old_logs IS 'Delete logs older than 90 days';
COMMENT ON FUNCTION calculate_aie_performance_aggregates IS 'Calculate performance metrics for an ad variant';

COMMENT ON MATERIALIZED VIEW aie_top_performers_by_category IS 'AIE: Top performing ads by category (refreshed daily)';
