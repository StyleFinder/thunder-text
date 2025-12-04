# Ad Intelligence Engine - RAG Retrieval System Design

## Overview

Comprehensive design for the Retrieval-Augmented Generation (RAG) system using Supabase pgvector for semantic search across best practices and high-performing ad examples.

---

## System Architecture

```
┌──────────────────────────────────────────────────────────────┐
│                    EMBEDDING GENERATION                       │
├──────────────────────────────────────────────────────────────┤
│  Input Text → OpenAI API → vector(1536) → Cache              │
│  • Query text composition                                     │
│  • Batch embedding optimization                               │
│  • Embedding versioning (model updates)                       │
└────────────────────┬─────────────────────────────────────────┘
                     │
                     ▼
┌──────────────────────────────────────────────────────────────┐
│                  VECTOR SEARCH (pgvector)                     │
├──────────────────────────────────────────────────────────────┤
│  Parallel Search:                                             │
│  ├─ aie_best_practices (IVFFlat index)                       │
│  └─ aie_ad_examples (IVFFlat index)                          │
│                                                               │
│  Filters Applied:                                             │
│  • Platform matching (meta, instagram, google, etc.)         │
│  • Category relevance (exact + fuzzy)                        │
│  • Goal alignment (awareness, conversion, etc.)              │
│  • Performance tags (high, avg, low)                         │
│  • Seasonal context (optional)                               │
│  • Verification status (verified only)                       │
└────────────────────┬─────────────────────────────────────────┘
                     │
                     ▼
┌──────────────────────────────────────────────────────────────┐
│                   RE-RANKING & BOOSTING                       │
├──────────────────────────────────────────────────────────────┤
│  Scoring Factors:                                             │
│  • Base: Cosine similarity (0-1)                             │
│  • Recency boost: < 30 days = +10%                           │
│  • Performance boost: high = +20%, avg = 0%, low = -20%      │
│  • Verification boost: verified = +5%                        │
│  • Seasonal match: +15% if tags match                        │
│  • Category exact match: +10%                                │
│                                                               │
│  Final Score = similarity × boost_multiplier                  │
└────────────────────┬─────────────────────────────────────────┘
                     │
                     ▼
┌──────────────────────────────────────────────────────────────┐
│                     CONTEXT ASSEMBLY                          │
├──────────────────────────────────────────────────────────────┤
│  Top 20 Results:                                              │
│  • 10 Best Practices (frameworks, guidelines)                │
│  • 10 Ad Examples (high-performers)                          │
│                                                               │
│  Diversity Check:                                             │
│  • Max 3 results from same source                            │
│  • Mix of hook types (question, stat, benefit, etc.)         │
│  • Mix of tones (professional, casual, playful)              │
└──────────────────────────────────────────────────────────────┘
```

---

## Embedding Strategy

### Text Composition for Query Embeddings

```typescript
function buildQueryText(request: {
  platform: string;
  goal: string;
  category: string;
  userDescription: string;
  imageAnalysis: ImageAnalysisResult;
  brandVoice?: BrandVoice;
}): string {
  // Primary components (high weight)
  const primary = [
    request.platform,
    request.goal,
    request.category,
    request.userDescription,
  ].filter(Boolean);

  // Secondary components (context enrichment)
  const secondary = [
    ...request.imageAnalysis.tags.slice(0, 5),
    ...request.imageAnalysis.mood,
    ...request.imageAnalysis.scene_context,
  ];

  // Tertiary components (optional brand context)
  const tertiary = request.brandVoice
    ? [request.brandVoice.tone, ...request.brandVoice.values.slice(0, 3)]
    : [];

  // Weighted composition (primary terms repeated for emphasis)
  return [
    ...primary,
    ...primary, // Repeat primary for 2x weight
    ...secondary,
    ...tertiary,
  ].join(" ");
}

// Example output:
// "meta conversion apparel meta conversion apparel stylish women casual outdoor lifestyle professional quality craftsmanship"
```

### Embedding Generation & Caching

```typescript
interface EmbeddingCache {
  text_hash: string; // MD5 of input text
  embedding: number[];
  model_version: string; // "text-embedding-ada-002-v2"
  created_at: Date;
}

async function getOrGenerateEmbedding(text: string): Promise<number[]> {
  const textHash = md5(text.toLowerCase().trim());

  // 1. Check cache
  const { data: cached } = await supabase
    .from("embedding_cache")
    .select("embedding, model_version")
    .eq("text_hash", textHash)
    .eq("model_version", CURRENT_EMBEDDING_MODEL)
    .single();

  if (cached) {
    return cached.embedding;
  }

  // 2. Generate new embedding
  const response = await openai.embeddings.create({
    model: "text-embedding-ada-002",
    input: text,
  });

  const embedding = response.data[0].embedding;

  // 3. Cache for future use
  await supabase.from("embedding_cache").insert({
    text_hash: textHash,
    embedding,
    model_version: CURRENT_EMBEDDING_MODEL,
  });

  return embedding;
}
```

### Batch Embedding Optimization

```typescript
async function generateBatchEmbeddings(texts: string[]): Promise<number[][]> {
  // OpenAI allows up to 2048 texts per request
  const BATCH_SIZE = 2048;
  const batches = chunk(texts, BATCH_SIZE);

  const allEmbeddings: number[][] = [];

  for (const batch of batches) {
    const response = await openai.embeddings.create({
      model: "text-embedding-ada-002",
      input: batch,
    });

    allEmbeddings.push(...response.data.map((d) => d.embedding));
  }

  return allEmbeddings;
}

// Use case: Bulk indexing new ad examples
async function indexNewAdExamples(ads: AdExample[]) {
  const texts = ads.map((ad) => `${ad.headline} ${ad.primary_text}`);
  const embeddings = await generateBatchEmbeddings(texts);

  await supabase.from("aie_ad_examples").upsert(
    ads.map((ad, i) => ({
      ...ad,
      embedding: embeddings[i],
    })),
  );
}
```

---

## Vector Search Implementation

### pgvector Index Configuration

```sql
-- Best Practices Index
CREATE INDEX idx_best_practices_embedding
ON aie_best_practices
USING ivfflat (embedding vector_cosine_ops)
WITH (lists = 100);

-- Ad Examples Index
CREATE INDEX idx_ad_examples_embedding
ON aie_ad_examples
USING ivfflat (embedding vector_cosine_ops)
WITH (lists = 100);

-- Tuning notes:
-- lists = sqrt(row_count) for optimal performance
-- 100 lists → suitable for 10,000 rows
-- 300 lists → suitable for 90,000 rows
-- 1000 lists → suitable for 1,000,000 rows
```

### Search Functions

```sql
-- Search Best Practices with Filters
CREATE OR REPLACE FUNCTION search_best_practices(
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
    -- Platform filter (exact or 'all')
    (bp.platform = match_platform OR bp.platform = 'all')
    -- Goal filter (exact or 'all')
    AND (bp.goal = match_goal OR bp.goal = 'all')
    -- Category filter (exact match prioritized)
    AND (
      bp.category = match_category
      OR bp.category IN (
        SELECT related_category
        FROM category_relationships
        WHERE main_category = match_category
      )
    )
    -- Only verified best practices
    AND bp.verification_status = 'verified'
    -- Similarity threshold
    AND (1 - (bp.embedding <=> query_embedding)) >= similarity_threshold
  ORDER BY bp.embedding <=> query_embedding
  LIMIT top_k;
END;
$$;

-- Search Ad Examples with Performance Filters
CREATE OR REPLACE FUNCTION search_ad_examples(
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
    -- Platform filter
    ae.platform = match_platform
    -- Category filter
    AND ae.category = match_category
    -- Format filter (optional)
    AND (match_format IS NULL OR ae.format = match_format)
    -- Performance filter (only high performers)
    AND ae.performance_tag = ANY(performance_tags)
    -- Seasonal filter (optional)
    AND (
      cardinality(seasonal_tags) = 0
      OR ae.seasonal_tag && seasonal_tags
    )
    -- Active examples only
    AND ae.is_active = true
    -- Similarity threshold
    AND (1 - (ae.embedding <=> query_embedding)) >= similarity_threshold
  ORDER BY ae.embedding <=> query_embedding
  LIMIT top_k * 2; -- Retrieve 2x for re-ranking
END;
$$;
```

### TypeScript Integration

```typescript
interface SearchBestPracticesParams {
  query_embedding: number[];
  match_platform: string;
  match_goal: string;
  match_category: string;
  top_k?: number;
  similarity_threshold?: number;
}

async function searchBestPractices(
  params: SearchBestPracticesParams,
): Promise<BestPractice[]> {
  const { data, error } = await supabase.rpc("search_best_practices", {
    query_embedding: params.query_embedding,
    match_platform: params.match_platform,
    match_goal: params.match_goal,
    match_category: params.match_category,
    top_k: params.top_k || 10,
    similarity_threshold: params.similarity_threshold || 0.7,
  });

  if (error) {
    console.error("Best practices search failed:", error);
    throw new Error(`RAG retrieval error: ${error.message}`);
  }

  return data || [];
}

interface SearchAdExamplesParams {
  query_embedding: number[];
  match_platform: string;
  match_category: string;
  match_format?: string;
  performance_tags?: string[];
  seasonal_tags?: string[];
  top_k?: number;
  similarity_threshold?: number;
}

async function searchAdExamples(
  params: SearchAdExamplesParams,
): Promise<AdExample[]> {
  const { data, error } = await supabase.rpc("search_ad_examples", {
    query_embedding: params.query_embedding,
    match_platform: params.match_platform,
    match_category: params.match_category,
    match_format: params.match_format,
    performance_tags: params.performance_tags || ["high"],
    seasonal_tags: params.seasonal_tags || [],
    top_k: params.top_k || 10,
    similarity_threshold: params.similarity_threshold || 0.65,
  });

  if (error) {
    console.error("Ad examples search failed:", error);
    throw new Error(`RAG retrieval error: ${error.message}`);
  }

  return data || [];
}
```

---

## Re-Ranking System

### Boost Calculation

```typescript
interface BoostFactors {
  recency: number; // 1.0 - 1.1
  performance: number; // 0.8 - 1.2
  verification: number; // 1.0 - 1.05
  seasonal: number; // 1.0 - 1.15
  category: number; // 1.0 - 1.1
}

function calculateBoostMultiplier(
  item: BestPractice | AdExample,
  context: RetrievalContext,
): number {
  let multiplier = 1.0;

  // 1. Recency boost (< 30 days = +10%)
  const daysSinceCreated =
    (Date.now() - new Date(item.created_at).getTime()) / (1000 * 60 * 60 * 24);

  if (daysSinceCreated < 30) {
    multiplier *= 1.1;
  } else if (daysSinceCreated < 90) {
    multiplier *= 1.05;
  }

  // 2. Performance boost (ad examples only)
  if ("performance_tag" in item) {
    if (item.performance_tag === "high") {
      multiplier *= 1.2;
    } else if (item.performance_tag === "low") {
      multiplier *= 0.8;
    }

    // Additional boost for top percentile
    if (item.performance_percentile >= 90) {
      multiplier *= 1.15;
    } else if (item.performance_percentile >= 75) {
      multiplier *= 1.08;
    }
  }

  // 3. Verification boost (best practices only)
  if ("verification_status" in item) {
    if (item.verification_status === "verified") {
      multiplier *= 1.05;
    }
  }

  // 4. Seasonal match boost
  if ("seasonal_tag" in item && context.seasonal_tags.length > 0) {
    const hasSeasonalMatch = item.seasonal_tag.some((tag) =>
      context.seasonal_tags.includes(tag),
    );
    if (hasSeasonalMatch) {
      multiplier *= 1.15;
    }
  }

  // 5. Category exact match boost
  if (item.category === context.target_category) {
    multiplier *= 1.1;
  }

  return multiplier;
}

function reRankResults<T extends BestPractice | AdExample>(
  results: T[],
  context: RetrievalContext,
): T[] {
  return results
    .map((item) => ({
      ...item,
      boost_multiplier: calculateBoostMultiplier(item, context),
      final_score: item.similarity * calculateBoostMultiplier(item, context),
    }))
    .sort((a, b) => b.final_score - a.final_score);
}
```

### Diversity Enforcement

```typescript
function enforceDiversity<
  T extends { source?: string; hook_type?: string; tone?: string },
>(results: T[], topK: number): T[] {
  const selected: T[] = [];
  const sourceCounts = new Map<string, number>();
  const hookCounts = new Map<string, number>();
  const toneCounts = new Map<string, number>();

  const MAX_PER_SOURCE = 3;
  const MAX_PER_HOOK = 4;
  const MAX_PER_TONE = 5;

  for (const result of results) {
    if (selected.length >= topK) break;

    const sourceCount = sourceCounts.get(result.source || "unknown") || 0;
    const hookCount = hookCounts.get(result.hook_type || "unknown") || 0;
    const toneCount = toneCounts.get(result.tone || "unknown") || 0;

    // Enforce diversity constraints
    if (
      sourceCount < MAX_PER_SOURCE &&
      hookCount < MAX_PER_HOOK &&
      toneCount < MAX_PER_TONE
    ) {
      selected.push(result);

      // Update counts
      sourceCounts.set(result.source || "unknown", sourceCount + 1);
      hookCounts.set(result.hook_type || "unknown", hookCount + 1);
      toneCounts.set(result.tone || "unknown", toneCount + 1);
    }
  }

  return selected;
}
```

---

## Context Assembly

### Final Retrieval Pipeline

```typescript
interface RetrievalContext {
  query_text: string;
  query_embedding: number[];
  best_practices: BestPractice[];
  ad_examples: AdExample[];
  total_similarity_score: number;
  retrieval_metadata: {
    best_practices_count: number;
    ad_examples_count: number;
    avg_similarity: number;
    retrieval_time_ms: number;
  };
}

async function retrieveContext(params: {
  platform: string;
  goal: string;
  category: string;
  userDescription: string;
  imageAnalysis: ImageAnalysisResult;
  brandVoice?: BrandVoice;
  seasonalTags?: string[];
  format?: string;
}): Promise<RetrievalContext> {
  const startTime = Date.now();

  // 1. Build query text & generate embedding
  const queryText = buildQueryText(params);
  const queryEmbedding = await getOrGenerateEmbedding(queryText);

  // 2. Parallel retrieval
  const [rawBestPractices, rawAdExamples] = await Promise.all([
    searchBestPractices({
      query_embedding: queryEmbedding,
      match_platform: params.platform,
      match_goal: params.goal,
      match_category: params.category,
      top_k: 20, // Retrieve extra for re-ranking
      similarity_threshold: 0.7,
    }),
    searchAdExamples({
      query_embedding: queryEmbedding,
      match_platform: params.platform,
      match_category: params.category,
      match_format: params.format,
      performance_tags: ["high"],
      seasonal_tags: params.seasonalTags || [],
      top_k: 20,
      similarity_threshold: 0.65,
    }),
  ]);

  // 3. Re-rank with boosts
  const rankedBestPractices = reRankResults(rawBestPractices, {
    target_category: params.category,
    seasonal_tags: params.seasonalTags || [],
  });

  const rankedAdExamples = reRankResults(rawAdExamples, {
    target_category: params.category,
    seasonal_tags: params.seasonalTags || [],
  });

  // 4. Enforce diversity
  const finalBestPractices = enforceDiversity(rankedBestPractices, 10);
  const finalAdExamples = enforceDiversity(rankedAdExamples, 10);

  // 5. Calculate metadata
  const allSimilarities = [
    ...finalBestPractices.map((bp) => bp.similarity),
    ...finalAdExamples.map((ae) => ae.similarity),
  ];
  const avgSimilarity =
    allSimilarities.reduce((a, b) => a + b, 0) / allSimilarities.length;

  const context: RetrievalContext = {
    query_text: queryText,
    query_embedding: queryEmbedding,
    best_practices: finalBestPractices,
    ad_examples: finalAdExamples,
    total_similarity_score: avgSimilarity,
    retrieval_metadata: {
      best_practices_count: finalBestPractices.length,
      ad_examples_count: finalAdExamples.length,
      avg_similarity: avgSimilarity,
      retrieval_time_ms: Date.now() - startTime,
    },
  };

  // 6. Log retrieval for debugging/optimization
  await logRetrievalContext(context, params);

  return context;
}

async function logRetrievalContext(
  context: RetrievalContext,
  params: any,
): Promise<void> {
  await supabase.from("aie_rag_retrieval_logs").insert({
    query_text: context.query_text,
    query_embedding: context.query_embedding,
    retrieved_best_practices: context.best_practices.map((bp) => ({
      id: bp.id,
      similarity: bp.similarity,
      boost_multiplier: bp.boost_multiplier,
      final_score: bp.final_score,
    })),
    retrieved_examples: context.ad_examples.map((ae) => ({
      id: ae.id,
      similarity: ae.similarity,
      boost_multiplier: ae.boost_multiplier,
      final_score: ae.final_score,
    })),
    retrieval_time_ms: context.retrieval_metadata.retrieval_time_ms,
    similarity_threshold: 0.7,
    top_k: 10,
    metadata: {
      platform: params.platform,
      goal: params.goal,
      category: params.category,
      avg_similarity: context.total_similarity_score,
    },
  });
}
```

---

## Fallback & Error Handling

### Empty Results Handling

```typescript
async function retrieveContextWithFallback(
  params: RetrievalParams,
): Promise<RetrievalContext> {
  let context = await retrieveContext(params);

  // Fallback 1: Broaden category if no results
  if (context.best_practices.length === 0) {
    console.warn("No best practices found, trying parent category...");
    const parentCategory = await getParentCategory(params.category);

    if (parentCategory) {
      context = await retrieveContext({ ...params, category: parentCategory });
    }
  }

  // Fallback 2: Use default templates if still empty
  if (context.best_practices.length === 0) {
    console.warn("No best practices found, using default templates...");
    context.best_practices = await getDefaultBestPractices(
      params.platform,
      params.goal,
    );
  }

  // Fallback 3: Lower similarity threshold for ad examples
  if (context.ad_examples.length < 3) {
    console.warn("Few ad examples found, lowering similarity threshold...");
    const additionalExamples = await searchAdExamples({
      ...params,
      similarity_threshold: 0.5, // Lower threshold
      top_k: 10 - context.ad_examples.length,
    });
    context.ad_examples.push(...additionalExamples);
  }

  return context;
}
```

### Performance Monitoring

```typescript
interface RetrievalMetrics {
  avg_retrieval_time_ms: number;
  avg_similarity_score: number;
  empty_result_rate: number;
  fallback_usage_rate: number;
}

async function monitorRetrievalPerformance(): Promise<RetrievalMetrics> {
  const { data } = await supabase
    .from("aie_rag_retrieval_logs")
    .select("*")
    .gte("created_at", new Date(Date.now() - 24 * 60 * 60 * 1000)); // Last 24h

  const metrics: RetrievalMetrics = {
    avg_retrieval_time_ms:
      data.reduce((sum, log) => sum + log.retrieval_time_ms, 0) / data.length,
    avg_similarity_score:
      data.reduce((sum, log) => sum + (log.metadata?.avg_similarity || 0), 0) /
      data.length,
    empty_result_rate:
      data.filter((log) => log.retrieved_best_practices.length === 0).length /
      data.length,
    fallback_usage_rate:
      data.filter((log) => log.metadata?.used_fallback).length / data.length,
  };

  // Alert if performance degrades
  if (metrics.avg_similarity_score < 0.65) {
    await sendAlert("RAG retrieval quality degraded", metrics);
  }

  return metrics;
}
```

---

## Index Maintenance

### Embedding Updates

```typescript
// When OpenAI releases new embedding model
async function migrateToNewEmbeddingModel(oldModel: string, newModel: string) {
  console.log(`Migrating from ${oldModel} to ${newModel}...`);

  // 1. Add new column for temporary storage
  await supabase.rpc("add_column_if_not_exists", {
    table_name: "aie_best_practices",
    column_name: "embedding_v2",
    column_type: "vector(1536)",
  });

  // 2. Batch re-embed all content
  const { data: bestPractices } = await supabase
    .from("aie_best_practices")
    .select("id, title, description, example_text");

  const batchSize = 100;
  for (let i = 0; i < bestPractices.length; i += batchSize) {
    const batch = bestPractices.slice(i, i + batchSize);
    const texts = batch.map(
      (bp) => `${bp.title} ${bp.description} ${bp.example_text || ""}`,
    );

    const newEmbeddings = await generateBatchEmbeddings(texts);

    await supabase.from("aie_best_practices").upsert(
      batch.map((bp, idx) => ({
        id: bp.id,
        embedding_v2: newEmbeddings[idx],
      })),
    );

    console.log(
      `Migrated ${i + batch.length}/${bestPractices.length} best practices`,
    );
  }

  // 3. Swap columns
  await supabase.rpc("swap_embedding_columns", {
    table_name: "aie_best_practices",
  });

  // 4. Rebuild index
  await supabase.rpc("rebuild_vector_index", {
    table_name: "aie_best_practices",
    index_name: "idx_best_practices_embedding",
  });

  console.log("Migration complete!");
}
```

### Index Optimization

```sql
-- Periodic index maintenance (monthly)
CREATE OR REPLACE FUNCTION optimize_vector_indexes()
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  -- Reindex best practices
  REINDEX INDEX idx_best_practices_embedding;

  -- Reindex ad examples
  REINDEX INDEX idx_ad_examples_embedding;

  -- Update statistics
  ANALYZE aie_best_practices;
  ANALYZE aie_ad_examples;

  RAISE NOTICE 'Vector indexes optimized successfully';
END;
$$;

-- Schedule monthly
-- SELECT cron.schedule('optimize-vector-indexes', '0 3 1 * *', 'SELECT optimize_vector_indexes()');
```

---

## Testing & Validation

### Unit Tests

```typescript
describe("RAG Retrieval System", () => {
  it("should retrieve relevant best practices", async () => {
    const context = await retrieveContext({
      platform: "meta",
      goal: "conversion",
      category: "apparel",
      userDescription: "summer dress sale",
      imageAnalysis: mockImageAnalysis,
    });

    expect(context.best_practices.length).toBeGreaterThan(0);
    expect(context.best_practices[0].similarity).toBeGreaterThan(0.7);
  });

  it("should enforce diversity in results", async () => {
    const context = await retrieveContext({ ...mockParams });

    const hookTypes = context.ad_examples.map((ae) => ae.hook_type);
    const uniqueHooks = new Set(hookTypes);

    expect(uniqueHooks.size).toBeGreaterThan(2); // At least 3 different hook types
  });

  it("should use fallback for empty results", async () => {
    const context = await retrieveContextWithFallback({
      category: "nonexistent_category",
      ...mockParams,
    });

    expect(context.best_practices.length).toBeGreaterThan(0); // Should use defaults
  });
});
```

---

## Next Steps

1. Implement embedding cache table
2. Create category relationship mapping
3. Build default best practices library
4. Set up retrieval monitoring dashboard
5. Run A/B test: RAG vs. no-RAG generation quality
