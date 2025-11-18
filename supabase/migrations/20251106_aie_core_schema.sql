-- ============================================================================
-- Ad Intelligence Engine (AIE) - Core Schema Migration
-- ============================================================================
-- Description: Creates core AIE tables with pgvector support for RAG-based
--              ad generation system
-- Version: 1.0.0
-- Date: 2025-11-06
-- ============================================================================

-- Enable pgvector extension for semantic search
CREATE EXTENSION IF NOT EXISTS vector;

-- ============================================================================
-- TABLE: aie_best_practices
-- Purpose: Store ad creation best practices, frameworks, and guidelines
-- ============================================================================
CREATE TABLE aie_best_practices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  platform TEXT NOT NULL CHECK (platform IN ('meta', 'instagram', 'google', 'tiktok', 'pinterest', 'all')),
  category TEXT NOT NULL,
  goal TEXT NOT NULL CHECK (goal IN ('awareness', 'engagement', 'conversion', 'traffic', 'all')),
  format TEXT CHECK (format IN ('static', 'carousel', 'video', 'story', 'reel', 'all')),
  description TEXT NOT NULL,
  example_text TEXT,
  framework_type TEXT,
  source_type TEXT NOT NULL CHECK (source_type IN ('public', 'expert', 'internal', 'ai_generated')),
  source_url TEXT,
  source_author TEXT,
  verification_status TEXT DEFAULT 'pending' CHECK (verification_status IN ('pending', 'verified', 'outdated', 'deprecated')),
  verified_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  verified_at TIMESTAMP WITH TIME ZONE,
  expiry_reminder_date DATE,
  tags TEXT[] DEFAULT '{}',
  embedding vector(1536),
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for aie_best_practices
CREATE INDEX idx_aie_best_practices_platform ON aie_best_practices(platform);
CREATE INDEX idx_aie_best_practices_category ON aie_best_practices(category);
CREATE INDEX idx_aie_best_practices_goal ON aie_best_practices(goal);
CREATE INDEX idx_aie_best_practices_status ON aie_best_practices(verification_status);
CREATE INDEX idx_aie_best_practices_tags ON aie_best_practices USING GIN(tags);
CREATE INDEX idx_aie_best_practices_embedding ON aie_best_practices
  USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);
CREATE INDEX idx_aie_best_practices_text_search ON aie_best_practices
  USING gin(to_tsvector('english', title || ' ' || description || ' ' || COALESCE(example_text, '')));

-- ============================================================================
-- TABLE: aie_ad_examples
-- Purpose: Store high-performing ad examples for RAG retrieval
-- ============================================================================
CREATE TABLE aie_ad_examples (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  platform TEXT NOT NULL CHECK (platform IN ('meta', 'instagram', 'google', 'tiktok', 'pinterest')),
  format TEXT NOT NULL CHECK (format IN ('static', 'carousel', 'video', 'story', 'reel', 'collection')),
  category TEXT NOT NULL,
  subcategory TEXT,
  primary_text TEXT NOT NULL,
  headline TEXT,
  description TEXT,
  cta TEXT,
  cta_type TEXT,
  hook_type TEXT CHECK (hook_type IN ('pain_point', 'stat', 'question', 'benefit', 'urgency', 'testimonial', 'social_proof')),
  tone TEXT CHECK (tone IN ('casual', 'professional', 'playful', 'urgent', 'empathetic', 'authoritative')),
  image_url TEXT,
  video_url TEXT,
  performance_metrics JSONB DEFAULT '{}',
  performance_tag TEXT DEFAULT 'avg' CHECK (performance_tag IN ('high', 'avg', 'low', 'untracked')),
  performance_percentile INTEGER CHECK (performance_percentile >= 0 AND performance_percentile <= 100),
  source TEXT NOT NULL CHECK (source IN ('public', 'anonymized_internal', 'expert_upload', 'swipe_file')),
  source_store_id UUID REFERENCES shops(id) ON DELETE SET NULL,
  source_url TEXT,
  contributed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  seasonal_tag TEXT[] DEFAULT '{}',
  target_audience TEXT,
  embedding vector(1536),
  metadata JSONB DEFAULT '{}',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for aie_ad_examples
CREATE INDEX idx_aie_ad_examples_platform ON aie_ad_examples(platform);
CREATE INDEX idx_aie_ad_examples_category ON aie_ad_examples(category);
CREATE INDEX idx_aie_ad_examples_performance ON aie_ad_examples(performance_tag);
CREATE INDEX idx_aie_ad_examples_format ON aie_ad_examples(format);
CREATE INDEX idx_aie_ad_examples_seasonal ON aie_ad_examples USING GIN(seasonal_tag);
CREATE INDEX idx_aie_ad_examples_active ON aie_ad_examples(is_active) WHERE is_active = true;
CREATE INDEX idx_aie_ad_examples_embedding ON aie_ad_examples
  USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);
CREATE INDEX idx_aie_ad_examples_composite ON aie_ad_examples(platform, category, performance_tag);

-- ============================================================================
-- TABLE: aie_ad_requests
-- Purpose: Track ad generation requests from users
-- ============================================================================
CREATE TABLE aie_ad_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id UUID NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  product_id UUID,
  platform TEXT NOT NULL CHECK (platform IN ('meta', 'instagram', 'google', 'tiktok', 'pinterest')),
  goal TEXT NOT NULL CHECK (goal IN ('awareness', 'engagement', 'conversion', 'traffic', 'app_installs')),
  format TEXT CHECK (format IN ('static', 'carousel', 'video', 'story', 'reel')),
  description TEXT NOT NULL,
  image_url TEXT,
  image_analysis JSONB DEFAULT '{}',
  brand_voice_override JSONB,
  target_audience TEXT,
  budget_range TEXT,
  campaign_id TEXT,
  ad_set_id TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'analyzing', 'generating', 'generated', 'approved', 'published', 'failed')),
  error_message TEXT,
  retry_count INTEGER DEFAULT 0,
  generation_time_ms INTEGER,
  ai_cost DECIMAL(10,4) DEFAULT 0,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for aie_ad_requests
CREATE INDEX idx_aie_ad_requests_shop ON aie_ad_requests(shop_id);
CREATE INDEX idx_aie_ad_requests_status ON aie_ad_requests(status);
CREATE INDEX idx_aie_ad_requests_platform ON aie_ad_requests(platform);
CREATE INDEX idx_aie_ad_requests_created ON aie_ad_requests(created_at DESC);
CREATE INDEX idx_aie_ad_requests_composite ON aie_ad_requests(shop_id, status, created_at DESC);

-- ============================================================================
-- TABLE: aie_ad_variants
-- Purpose: Store generated ad variations (3 per request)
-- ============================================================================
CREATE TABLE aie_ad_variants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ad_request_id UUID NOT NULL REFERENCES aie_ad_requests(id) ON DELETE CASCADE,
  variant_number INTEGER NOT NULL CHECK (variant_number BETWEEN 1 AND 3),
  variant_type TEXT NOT NULL CHECK (variant_type IN ('emotional', 'benefit', 'ugc', 'storytelling', 'urgency', 'social_proof')),
  headline TEXT NOT NULL,
  headline_alternatives TEXT[] DEFAULT '{}',
  primary_text TEXT NOT NULL,
  description TEXT,
  cta TEXT,
  cta_rationale TEXT,
  hook_technique TEXT CHECK (hook_technique IN ('pain_point', 'stat', 'question', 'benefit', 'urgency', 'testimonial', 'social_proof')),
  tone TEXT CHECK (tone IN ('casual', 'professional', 'playful', 'urgent', 'empathetic', 'authoritative')),
  predicted_score NUMERIC(5,4) CHECK (predicted_score >= 0 AND predicted_score <= 1),
  score_breakdown JSONB DEFAULT '{}',
  generation_reasoning TEXT,
  rag_context_used JSONB DEFAULT '{}',
  is_selected BOOLEAN DEFAULT false,
  user_edited BOOLEAN DEFAULT false,
  edit_history JSONB DEFAULT '[]',
  published_at TIMESTAMP WITH TIME ZONE,
  published_ad_id TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(ad_request_id, variant_number)
);

-- Indexes for aie_ad_variants
CREATE INDEX idx_aie_ad_variants_request ON aie_ad_variants(ad_request_id);
CREATE INDEX idx_aie_ad_variants_selected ON aie_ad_variants(is_selected) WHERE is_selected = true;
CREATE INDEX idx_aie_ad_variants_published ON aie_ad_variants(published_at) WHERE published_at IS NOT NULL;
CREATE INDEX idx_aie_ad_variants_score ON aie_ad_variants(predicted_score DESC NULLS LAST);

-- ============================================================================
-- TABLE: aie_ad_performance
-- Purpose: Track real-time ad performance metrics from platforms
-- ============================================================================
CREATE TABLE aie_ad_performance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ad_variant_id UUID NOT NULL REFERENCES aie_ad_variants(id) ON DELETE CASCADE,
  platform_ad_id TEXT NOT NULL,
  date DATE NOT NULL,
  impressions INTEGER DEFAULT 0,
  clicks INTEGER DEFAULT 0,
  conversions INTEGER DEFAULT 0,
  spend NUMERIC(10,2) DEFAULT 0,
  revenue NUMERIC(10,2) DEFAULT 0,
  roas NUMERIC(10,4),
  ctr NUMERIC(6,4),
  cpc NUMERIC(10,4),
  cpa NUMERIC(10,4),
  engagement_rate NUMERIC(6,4),
  video_views INTEGER,
  video_completion_rate NUMERIC(6,4),
  link_clicks INTEGER,
  post_engagement INTEGER,
  metadata JSONB DEFAULT '{}',
  synced_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(ad_variant_id, date)
);

-- Indexes for aie_ad_performance
CREATE INDEX idx_aie_ad_performance_variant ON aie_ad_performance(ad_variant_id);
CREATE INDEX idx_aie_ad_performance_date ON aie_ad_performance(date DESC);
CREATE INDEX idx_aie_ad_performance_roas ON aie_ad_performance(roas DESC NULLS LAST);
CREATE INDEX idx_aie_ad_performance_platform_ad ON aie_ad_performance(platform_ad_id);

-- ============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================================

-- Enable RLS on all AIE tables
ALTER TABLE aie_best_practices ENABLE ROW LEVEL SECURITY;
ALTER TABLE aie_ad_examples ENABLE ROW LEVEL SECURITY;
ALTER TABLE aie_ad_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE aie_ad_variants ENABLE ROW LEVEL SECURITY;
ALTER TABLE aie_ad_performance ENABLE ROW LEVEL SECURITY;

-- Best Practices & Examples: Public read for verified content
CREATE POLICY "Public read verified best practices"
  ON aie_best_practices
  FOR SELECT
  USING (verification_status = 'verified');

CREATE POLICY "Experts can insert best practices"
  ON aie_best_practices
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE id = auth.uid()
      AND raw_user_meta_data->>'role' = 'expert'
    )
  );

CREATE POLICY "Public read active ad examples"
  ON aie_ad_examples
  FOR SELECT
  USING (is_active = true);

CREATE POLICY "Experts can insert ad examples"
  ON aie_ad_examples
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE id = auth.uid()
      AND raw_user_meta_data->>'role' = 'expert'
    )
  );

-- Ad Requests: Shop-scoped access
CREATE POLICY "Users access own shop ad requests"
  ON aie_ad_requests
  FOR ALL
  USING (
    shop_id IN (
      SELECT id FROM shops
      WHERE shop_domain = current_setting('app.shop_domain', true)
    )
  );

-- Ad Variants: Cascades from ad_requests
CREATE POLICY "Users access own shop ad variants"
  ON aie_ad_variants
  FOR ALL
  USING (
    ad_request_id IN (
      SELECT id FROM aie_ad_requests
      WHERE shop_id IN (
        SELECT id FROM shops
        WHERE shop_domain = current_setting('app.shop_domain', true)
      )
    )
  );

-- Ad Performance: Cascades from ad_variants
CREATE POLICY "Users access own shop ad performance"
  ON aie_ad_performance
  FOR ALL
  USING (
    ad_variant_id IN (
      SELECT av.id FROM aie_ad_variants av
      JOIN aie_ad_requests ar ON av.ad_request_id = ar.id
      WHERE ar.shop_id IN (
        SELECT id FROM shops
        WHERE shop_domain = current_setting('app.shop_domain', true)
      )
    )
  );

-- ============================================================================
-- DATABASE FUNCTIONS
-- ============================================================================

-- Function: Search best practices with pgvector
CREATE OR REPLACE FUNCTION search_aie_best_practices(
  query_embedding vector(1536),
  match_platform TEXT,
  match_goal TEXT,
  match_category TEXT,
  top_k INT DEFAULT 10,
  similarity_threshold NUMERIC DEFAULT 0.7
)
RETURNS TABLE (
  id UUID,
  title TEXT,
  description TEXT,
  example_text TEXT,
  framework_type TEXT,
  platform TEXT,
  goal TEXT,
  category TEXT,
  similarity NUMERIC,
  created_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    bp.id,
    bp.title,
    bp.description,
    bp.example_text,
    bp.framework_type,
    bp.platform,
    bp.goal,
    bp.category,
    (1 - (bp.embedding <=> query_embedding))::NUMERIC as similarity,
    bp.created_at
  FROM aie_best_practices bp
  WHERE
    (bp.platform = match_platform OR bp.platform = 'all')
    AND (bp.goal = match_goal OR bp.goal = 'all')
    AND bp.category = match_category
    AND bp.verification_status = 'verified'
    AND (1 - (bp.embedding <=> query_embedding)) >= similarity_threshold
  ORDER BY bp.embedding <=> query_embedding
  LIMIT top_k;
END;
$$;

-- Function: Search ad examples with pgvector
CREATE OR REPLACE FUNCTION search_aie_ad_examples(
  query_embedding vector(1536),
  match_platform TEXT,
  match_category TEXT,
  match_format TEXT DEFAULT NULL,
  performance_tags TEXT[] DEFAULT ARRAY['high'],
  seasonal_tags TEXT[] DEFAULT ARRAY[]::TEXT[],
  top_k INT DEFAULT 10,
  similarity_threshold NUMERIC DEFAULT 0.65
)
RETURNS TABLE (
  id UUID,
  platform TEXT,
  format TEXT,
  category TEXT,
  primary_text TEXT,
  headline TEXT,
  cta TEXT,
  hook_type TEXT,
  tone TEXT,
  performance_tag TEXT,
  performance_percentile INT,
  performance_metrics JSONB,
  similarity NUMERIC,
  created_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    ae.id,
    ae.platform,
    ae.format,
    ae.category,
    ae.primary_text,
    ae.headline,
    ae.cta,
    ae.hook_type,
    ae.tone,
    ae.performance_tag,
    ae.performance_percentile,
    ae.performance_metrics,
    (1 - (ae.embedding <=> query_embedding))::NUMERIC as similarity,
    ae.created_at
  FROM aie_ad_examples ae
  WHERE
    ae.platform = match_platform
    AND ae.category = match_category
    AND (match_format IS NULL OR ae.format = match_format)
    AND ae.performance_tag = ANY(performance_tags)
    AND (
      cardinality(seasonal_tags) = 0
      OR ae.seasonal_tag && seasonal_tags
    )
    AND ae.is_active = true
    AND (1 - (ae.embedding <=> query_embedding)) >= similarity_threshold
  ORDER BY ae.embedding <=> query_embedding
  LIMIT top_k * 2;
END;
$$;

-- Function: Update timestamps on row update
CREATE OR REPLACE FUNCTION update_aie_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- Triggers for updated_at
CREATE TRIGGER update_aie_best_practices_updated_at
  BEFORE UPDATE ON aie_best_practices
  FOR EACH ROW
  EXECUTE FUNCTION update_aie_updated_at();

CREATE TRIGGER update_aie_ad_examples_updated_at
  BEFORE UPDATE ON aie_ad_examples
  FOR EACH ROW
  EXECUTE FUNCTION update_aie_updated_at();

CREATE TRIGGER update_aie_ad_requests_updated_at
  BEFORE UPDATE ON aie_ad_requests
  FOR EACH ROW
  EXECUTE FUNCTION update_aie_updated_at();

CREATE TRIGGER update_aie_ad_variants_updated_at
  BEFORE UPDATE ON aie_ad_variants
  FOR EACH ROW
  EXECUTE FUNCTION update_aie_updated_at();

-- ============================================================================
-- COMMENTS & DOCUMENTATION
-- ============================================================================

COMMENT ON TABLE aie_best_practices IS 'AIE: Best practices library for ad creation';
COMMENT ON TABLE aie_ad_examples IS 'AIE: High-performing ad examples for RAG retrieval';
COMMENT ON TABLE aie_ad_requests IS 'AIE: User ad generation requests';
COMMENT ON TABLE aie_ad_variants IS 'AIE: Generated ad variants (3 per request)';
COMMENT ON TABLE aie_ad_performance IS 'AIE: Daily ad performance metrics from platforms';

COMMENT ON FUNCTION search_aie_best_practices IS 'Search best practices using pgvector similarity';
COMMENT ON FUNCTION search_aie_ad_examples IS 'Search high-performing ad examples using pgvector';
