# Ad Intelligence Engine - Database Schema Design

## Overview

Comprehensive database schema for Thunder Text's Ad Intelligence Engine (AIE), built on Supabase with pgvector for RAG-based ad generation.

---

## Schema Design Principles

1. **Separation of Concerns**: Knowledge base (best practices + examples) separate from operational data (requests, variants, performance)
2. **Scalability**: Partitioning strategy for high-volume ad performance metrics
3. **Vector Search**: pgvector embeddings for semantic retrieval
4. **Multi-Platform**: Extensible enum types for future platform support
5. **Performance Tracking**: Comprehensive metrics with historical analysis
6. **Audit Trail**: Created/updated timestamps on all tables

---

## Core Tables

### 1. `aie_best_practices`

**Purpose**: Store ad creation best practices, frameworks, and guidelines for RAG retrieval

```sql
CREATE TABLE aie_best_practices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  platform TEXT NOT NULL CHECK (platform IN ('meta', 'instagram', 'google', 'tiktok', 'pinterest', 'all')),
  category TEXT NOT NULL, -- e.g., 'apparel', 'beauty', 'electronics', 'home'
  goal TEXT NOT NULL CHECK (goal IN ('awareness', 'engagement', 'conversion', 'traffic', 'all')),
  format TEXT CHECK (format IN ('static', 'carousel', 'video', 'story', 'reel', 'all')),
  description TEXT NOT NULL,
  example_text TEXT,
  framework_type TEXT, -- e.g., 'hook', 'structure', 'cta', 'headline', 'body'
  source_type TEXT NOT NULL CHECK (source_type IN ('public', 'expert', 'internal', 'ai_generated')),
  source_url TEXT,
  source_author TEXT,
  verification_status TEXT DEFAULT 'pending' CHECK (verification_status IN ('pending', 'verified', 'outdated', 'deprecated')),
  verified_by UUID REFERENCES auth.users(id),
  verified_at TIMESTAMP WITH TIME ZONE,
  expiry_reminder_date DATE, -- 6-month review cycle
  tags TEXT[], -- Additional indexing tags
  embedding vector(1536), -- OpenAI ada-002 embeddings
  metadata JSONB DEFAULT '{}', -- Flexible additional data
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_best_practices_platform ON aie_best_practices(platform);
CREATE INDEX idx_best_practices_category ON aie_best_practices(category);
CREATE INDEX idx_best_practices_goal ON aie_best_practices(goal);
CREATE INDEX idx_best_practices_status ON aie_best_practices(verification_status);
CREATE INDEX idx_best_practices_tags ON aie_best_practices USING GIN(tags);
CREATE INDEX idx_best_practices_embedding ON aie_best_practices USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

-- Full-text search
CREATE INDEX idx_best_practices_text_search ON aie_best_practices USING gin(to_tsvector('english', title || ' ' || description || ' ' || COALESCE(example_text, '')));
```

### 2. `aie_ad_examples`

**Purpose**: Store high-performing ad examples for reference and retrieval

```sql
CREATE TABLE aie_ad_examples (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  platform TEXT NOT NULL CHECK (platform IN ('meta', 'instagram', 'google', 'tiktok', 'pinterest')),
  format TEXT NOT NULL CHECK (format IN ('static', 'carousel', 'video', 'story', 'reel', 'collection')),
  category TEXT NOT NULL,
  subcategory TEXT,
  primary_text TEXT NOT NULL,
  headline TEXT,
  description TEXT, -- For Google Ads
  cta TEXT,
  cta_type TEXT, -- e.g., 'shop_now', 'learn_more', 'sign_up'
  hook_type TEXT, -- e.g., 'question', 'stat', 'benefit', 'pain_point', 'urgency'
  tone TEXT, -- e.g., 'casual', 'professional', 'playful', 'urgent'
  image_url TEXT,
  video_url TEXT,
  performance_metrics JSONB DEFAULT '{}', -- {ctr, roas, conversions, spend, impressions, engagement_rate}
  performance_tag TEXT DEFAULT 'avg' CHECK (performance_tag IN ('high', 'avg', 'low', 'untracked')),
  performance_percentile INTEGER, -- Percentile rank within category (0-100)
  source TEXT NOT NULL CHECK (source IN ('public', 'anonymized_internal', 'expert_upload', 'swipe_file')),
  source_store_id UUID REFERENCES shops(id) ON DELETE SET NULL, -- If from internal store
  source_url TEXT,
  contributed_by UUID REFERENCES auth.users(id),
  seasonal_tag TEXT[], -- e.g., ['black_friday', 'holiday', 'summer']
  target_audience TEXT, -- e.g., 'women_25_34', 'parents', 'fitness_enthusiasts'
  embedding vector(1536),
  metadata JSONB DEFAULT '{}',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_ad_examples_platform ON aie_ad_examples(platform);
CREATE INDEX idx_ad_examples_category ON aie_ad_examples(category);
CREATE INDEX idx_ad_examples_performance ON aie_ad_examples(performance_tag);
CREATE INDEX idx_ad_examples_format ON aie_ad_examples(format);
CREATE INDEX idx_ad_examples_seasonal ON aie_ad_examples USING GIN(seasonal_tag);
CREATE INDEX idx_ad_examples_active ON aie_ad_examples(is_active) WHERE is_active = true;
CREATE INDEX idx_ad_examples_embedding ON aie_ad_examples USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

-- Composite index for common queries
CREATE INDEX idx_ad_examples_platform_category_performance ON aie_ad_examples(platform, category, performance_tag);
```

### 3. `aie_ad_requests`

**Purpose**: Track ad generation requests from users

```sql
CREATE TABLE aie_ad_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id UUID NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id),
  product_id UUID, -- Optional: link to Shopify product if applicable
  platform TEXT NOT NULL CHECK (platform IN ('meta', 'instagram', 'google', 'tiktok', 'pinterest')),
  goal TEXT NOT NULL CHECK (goal IN ('awareness', 'engagement', 'conversion', 'traffic', 'app_installs')),
  format TEXT CHECK (format IN ('static', 'carousel', 'video', 'story', 'reel')),
  description TEXT NOT NULL, -- User's ad objective/brief
  image_url TEXT,
  image_analysis JSONB DEFAULT '{}', -- {category, tags, mood, colors, keywords}
  brand_voice_override JSONB, -- Optional: override shop's default brand voice
  target_audience TEXT,
  budget_range TEXT, -- e.g., 'low', 'medium', 'high'
  campaign_id TEXT, -- External ad platform campaign ID
  ad_set_id TEXT, -- Meta/Google ad set ID for publishing
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'analyzing', 'generating', 'generated', 'approved', 'published', 'failed')),
  error_message TEXT,
  retry_count INTEGER DEFAULT 0,
  generation_time_ms INTEGER, -- Performance tracking
  ai_cost DECIMAL(10,4) DEFAULT 0,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_ad_requests_shop ON aie_ad_requests(shop_id);
CREATE INDEX idx_ad_requests_status ON aie_ad_requests(status);
CREATE INDEX idx_ad_requests_platform ON aie_ad_requests(platform);
CREATE INDEX idx_ad_requests_created ON aie_ad_requests(created_at DESC);

-- Composite index for dashboard queries
CREATE INDEX idx_ad_requests_shop_status_created ON aie_ad_requests(shop_id, status, created_at DESC);
```

### 4. `aie_ad_variants`

**Purpose**: Store generated ad variations (3 per request)

```sql
CREATE TABLE aie_ad_variants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ad_request_id UUID NOT NULL REFERENCES aie_ad_requests(id) ON DELETE CASCADE,
  variant_number INTEGER NOT NULL CHECK (variant_number BETWEEN 1 AND 3),
  variant_type TEXT NOT NULL CHECK (variant_type IN ('emotional', 'benefit', 'ugc', 'storytelling', 'urgency', 'social_proof')),
  headline TEXT NOT NULL,
  headline_alternatives TEXT[], -- Array of 2 additional headline options
  primary_text TEXT NOT NULL,
  description TEXT, -- For Google Ads
  cta TEXT,
  cta_rationale TEXT, -- Why this CTA was chosen
  hook_technique TEXT, -- e.g., 'question', 'stat', 'benefit'
  tone TEXT, -- e.g., 'casual', 'professional', 'playful'
  predicted_score NUMERIC(5,4), -- 0-1 score from scoring model
  score_breakdown JSONB DEFAULT '{}', -- {relevance: 0.8, engagement: 0.9, brand_fit: 0.85}
  generation_reasoning TEXT, -- AI's explanation for this variant
  rag_context_used JSONB DEFAULT '{}', -- {best_practice_ids: [], example_ids: []}
  is_selected BOOLEAN DEFAULT false,
  user_edited BOOLEAN DEFAULT false,
  edit_history JSONB DEFAULT '[]', -- Track user modifications
  published_at TIMESTAMP WITH TIME ZONE,
  published_ad_id TEXT, -- External platform ad ID
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(ad_request_id, variant_number)
);

-- Indexes
CREATE INDEX idx_ad_variants_request ON aie_ad_variants(ad_request_id);
CREATE INDEX idx_ad_variants_selected ON aie_ad_variants(is_selected) WHERE is_selected = true;
CREATE INDEX idx_ad_variants_published ON aie_ad_variants(published_at) WHERE published_at IS NOT NULL;
CREATE INDEX idx_ad_variants_score ON aie_ad_variants(predicted_score DESC NULLS LAST);
```

### 5. `aie_ad_performance`

**Purpose**: Track real-time ad performance metrics from platforms

```sql
CREATE TABLE aie_ad_performance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ad_variant_id UUID NOT NULL REFERENCES aie_ad_variants(id) ON DELETE CASCADE,
  platform_ad_id TEXT NOT NULL, -- External ad ID
  date DATE NOT NULL, -- Daily metrics
  impressions INTEGER DEFAULT 0,
  clicks INTEGER DEFAULT 0,
  conversions INTEGER DEFAULT 0,
  spend NUMERIC(10,2) DEFAULT 0,
  revenue NUMERIC(10,2) DEFAULT 0,
  roas NUMERIC(10,4), -- Return on Ad Spend
  ctr NUMERIC(6,4), -- Click-Through Rate
  cpc NUMERIC(10,4), -- Cost Per Click
  cpa NUMERIC(10,4), -- Cost Per Acquisition
  engagement_rate NUMERIC(6,4),
  video_views INTEGER,
  video_completion_rate NUMERIC(6,4),
  link_clicks INTEGER,
  post_engagement INTEGER,
  metadata JSONB DEFAULT '{}', -- Platform-specific metrics
  synced_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(ad_variant_id, date)
);

-- Indexes
CREATE INDEX idx_ad_performance_variant ON aie_ad_performance(ad_variant_id);
CREATE INDEX idx_ad_performance_date ON aie_ad_performance(date DESC);
CREATE INDEX idx_ad_performance_roas ON aie_ad_performance(roas DESC NULLS LAST);

-- Partition by date for scalability (monthly partitions)
-- To be implemented as data grows
```

### 6. `aie_image_analysis`

**Purpose**: Cache image analysis results to avoid redundant API calls

```sql
CREATE TABLE aie_image_analysis (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  image_url TEXT NOT NULL UNIQUE,
  analysis_provider TEXT NOT NULL CHECK (analysis_provider IN ('openai_vision', 'clip', 'google_vision')),
  category TEXT NOT NULL,
  subcategory TEXT,
  tags TEXT[] NOT NULL,
  colors JSONB DEFAULT '{}', -- {dominant: ['#FF5733'], palette: ['#FF5733', '#C70039']}
  mood TEXT[], -- e.g., ['energetic', 'professional', 'warm']
  scene_context TEXT[], -- e.g., ['outdoor', 'product_shot', 'lifestyle']
  text_detected TEXT,
  object_count INTEGER,
  quality_score NUMERIC(3,2), -- 0-1 image quality assessment
  embedding vector(1536), -- Visual embedding
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_image_analysis_url ON aie_image_analysis(image_url);
CREATE INDEX idx_image_analysis_category ON aie_image_analysis(category);
CREATE INDEX idx_image_analysis_embedding ON aie_image_analysis USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);
```

### 7. `aie_learning_loop_insights`

**Purpose**: Store aggregated insights from performance data

```sql
CREATE TABLE aie_learning_loop_insights (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  insight_type TEXT NOT NULL CHECK (insight_type IN ('best_performer', 'trend', 'pattern', 'recommendation')),
  platform TEXT NOT NULL,
  category TEXT,
  goal TEXT,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  data_points_analyzed INTEGER NOT NULL,
  confidence_score NUMERIC(3,2), -- 0-1
  time_period_start DATE,
  time_period_end DATE,
  metrics JSONB NOT NULL, -- {avg_ctr: 0.025, top_performer_roas: 4.5}
  examples JSONB DEFAULT '[]', -- Array of ad_variant_ids
  actionable_recommendation TEXT,
  is_active BOOLEAN DEFAULT true,
  viewed_count INTEGER DEFAULT 0,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_insights_type ON aie_learning_loop_insights(insight_type);
CREATE INDEX idx_insights_platform_category ON aie_learning_loop_insights(platform, category);
CREATE INDEX idx_insights_active ON aie_learning_loop_insights(is_active) WHERE is_active = true;
CREATE INDEX idx_insights_confidence ON aie_learning_loop_insights(confidence_score DESC);
```

### 8. `aie_expert_contributions`

**Purpose**: Track expert uploads and governance

```sql
CREATE TABLE aie_expert_contributions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  expert_user_id UUID NOT NULL REFERENCES auth.users(id),
  contribution_type TEXT NOT NULL CHECK (contribution_type IN ('best_practice', 'ad_example', 'insight')),
  referenced_id UUID NOT NULL, -- ID of best_practice or ad_example
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'needs_revision')),
  reviewer_id UUID REFERENCES auth.users(id),
  review_notes TEXT,
  reviewed_at TIMESTAMP WITH TIME ZONE,
  impact_score NUMERIC(3,2), -- How much this contribution improved AI outputs
  usage_count INTEGER DEFAULT 0, -- Times retrieved in RAG
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_contributions_expert ON aie_expert_contributions(expert_user_id);
CREATE INDEX idx_contributions_status ON aie_expert_contributions(status);
CREATE INDEX idx_contributions_type ON aie_expert_contributions(contribution_type);
```

---

## Supporting Tables

### 9. `aie_rag_retrieval_logs`

**Purpose**: Debug and optimize RAG retrieval quality

```sql
CREATE TABLE aie_rag_retrieval_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ad_request_id UUID NOT NULL REFERENCES aie_ad_requests(id) ON DELETE CASCADE,
  query_embedding vector(1536),
  query_text TEXT NOT NULL,
  retrieved_best_practices JSONB NOT NULL, -- [{id, score, rank}]
  retrieved_examples JSONB NOT NULL, -- [{id, score, rank}]
  retrieval_time_ms INTEGER,
  similarity_threshold NUMERIC(3,2),
  top_k INTEGER,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_rag_logs_request ON aie_rag_retrieval_logs(ad_request_id);
CREATE INDEX idx_rag_logs_created ON aie_rag_retrieval_logs(created_at DESC);
```

### 10. `aie_scheduled_jobs_log`

**Purpose**: Track scheduled job executions

```sql
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

-- Indexes
CREATE INDEX idx_jobs_log_name ON aie_scheduled_jobs_log(job_name);
CREATE INDEX idx_jobs_log_status ON aie_scheduled_jobs_log(status);
CREATE INDEX idx_jobs_log_started ON aie_scheduled_jobs_log(started_at DESC);
```

---

## pgvector Configuration

### Enable Extension

```sql
CREATE EXTENSION IF NOT EXISTS vector;
```

### Embedding Functions

```sql
-- Function to generate embeddings (calls OpenAI API)
CREATE OR REPLACE FUNCTION generate_embedding(text_content TEXT)
RETURNS vector(1536)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  embedding_result vector(1536);
BEGIN
  -- Implementation calls OpenAI embeddings API via Edge Function
  -- This is a placeholder - actual implementation via application layer
  RAISE EXCEPTION 'Use application layer to generate embeddings';
END;
$$;

-- Similarity search function
CREATE OR REPLACE FUNCTION search_similar_content(
  query_embedding vector(1536),
  table_name TEXT,
  top_k INTEGER DEFAULT 10,
  similarity_threshold NUMERIC DEFAULT 0.7
)
RETURNS TABLE (
  id UUID,
  similarity NUMERIC
)
LANGUAGE plpgsql
AS $$
BEGIN
  -- Dynamic similarity search across best_practices or ad_examples
  RETURN QUERY EXECUTE format('
    SELECT id, 1 - (embedding <=> $1) as similarity
    FROM %I
    WHERE (1 - (embedding <=> $1)) >= $2
    ORDER BY embedding <=> $1
    LIMIT $3
  ', table_name)
  USING query_embedding, similarity_threshold, top_k;
END;
$$;
```

---

## Row Level Security (RLS)

### Best Practices & Examples (Public Read)

```sql
ALTER TABLE aie_best_practices ENABLE ROW LEVEL SECURITY;
ALTER TABLE aie_ad_examples ENABLE ROW LEVEL SECURITY;

-- Anyone can read verified best practices
CREATE POLICY "Public read verified best practices"
  ON aie_best_practices
  FOR SELECT
  USING (verification_status = 'verified');

-- Experts can insert
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

-- Similar for ad_examples
CREATE POLICY "Public read active examples"
  ON aie_ad_examples
  FOR SELECT
  USING (is_active = true);
```

### User Data (Shop-Scoped)

```sql
ALTER TABLE aie_ad_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE aie_ad_variants ENABLE ROW LEVEL SECURITY;
ALTER TABLE aie_ad_performance ENABLE ROW LEVEL SECURITY;

-- Users can only access their shop's data
CREATE POLICY "Users access own shop ad requests"
  ON aie_ad_requests
  FOR ALL
  USING (
    shop_id IN (
      SELECT id FROM shops
      WHERE shop_domain = current_setting('app.shop_domain', true)
    )
  );

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
```

---

## Performance Optimization

### Materialized Views for Analytics

```sql
-- Top performing ads by category
CREATE MATERIALIZED VIEW aie_top_performers_by_category AS
SELECT
  ae.category,
  ae.platform,
  COUNT(DISTINCT ae.id) as total_ads,
  AVG(ap.roas) as avg_roas,
  AVG(ap.ctr) as avg_ctr,
  PERCENTILE_CONT(0.9) WITHIN GROUP (ORDER BY ap.roas) as top_10_roas
FROM aie_ad_examples ae
JOIN aie_ad_variants av ON ae.id = av.id
JOIN aie_ad_performance ap ON av.id = ap.ad_variant_id
WHERE ae.is_active = true
  AND ap.date >= CURRENT_DATE - INTERVAL '90 days'
GROUP BY ae.category, ae.platform;

-- Refresh daily
CREATE INDEX ON aie_top_performers_by_category(category, platform);
```

### Partitioning Strategy (Future)

```sql
-- Partition ad_performance by month for scalability
-- Implement when table exceeds 10M rows
```

---

## Migration Strategy

1. **Phase 1**: Core tables (`best_practices`, `ad_examples`, `ad_requests`, `ad_variants`)
2. **Phase 2**: Performance tracking (`ad_performance`, `image_analysis`)
3. **Phase 3**: Learning loop (`insights`, `expert_contributions`, `rag_logs`)
4. **Phase 4**: Optimization (materialized views, partitioning)

---

## Next Steps

1. Create migration file: `20251106_aie_core_schema.sql`
2. Seed initial best practices data
3. Set up pgvector indexes with optimal `lists` parameter
4. Configure RLS policies for production
5. Create database functions for common queries
