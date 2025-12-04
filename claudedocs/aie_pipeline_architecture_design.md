# Ad Intelligence Engine - AI Pipeline Architecture Design

## Overview

Comprehensive architecture for the AIE generation pipeline, transforming product images and descriptions into high-performing ad variants using RAG-enhanced AI.

---

## Pipeline Flow Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│                         INPUT LAYER                                  │
├─────────────────────────────────────────────────────────────────────┤
│  • Product Image URL                                                 │
│  • Ad Goal Description (user text)                                   │
│  • Brand Voice Profile (from shops table)                            │
│  • Target Platform + Goal + Format                                   │
│  • Optional: Campaign/Ad Set ID                                      │
└────────────────────────┬────────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    STAGE 1: IMAGE ANALYSIS                           │
├─────────────────────────────────────────────────────────────────────┤
│  Provider: OpenAI Vision API (GPT-4 Vision)                          │
│  Output: {category, tags, colors, mood, scene_context, keywords}    │
│  Cache: aie_image_analysis table (avoid redundant API calls)         │
│  Fallback: CLIP embeddings if Vision API unavailable                 │
└────────────────────────┬────────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────────┐
│                  STAGE 2: EMBEDDING GENERATION                       │
├─────────────────────────────────────────────────────────────────────┤
│  Input: Combined text → "{platform} {goal} {category} {keywords}    │
│          {user_description} {brand_tone}"                            │
│  Provider: OpenAI text-embedding-ada-002                             │
│  Output: vector(1536) query embedding                                │
└────────────────────────┬────────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────────┐
│              STAGE 3: RAG RETRIEVAL (pgvector)                       │
├─────────────────────────────────────────────────────────────────────┤
│  Parallel Search:                                                    │
│  ├─ aie_best_practices (top 10, similarity > 0.7)                   │
│  └─ aie_ad_examples (top 10, performance_tag = 'high')              │
│                                                                      │
│  Filters:                                                            │
│  • platform = {meta|instagram|google|...}                           │
│  • category matches or is related                                   │
│  • goal alignment                                                   │
│  • seasonal tags (if applicable)                                    │
│                                                                      │
│  Re-ranking:                                                         │
│  • Cosine similarity score (0-1)                                    │
│  • Performance multiplier for ad_examples (high = 1.2x)             │
│  • Recency boost (< 30 days = 1.1x)                                │
│                                                                      │
│  Output: Top 20 context chunks (10 best practices + 10 examples)    │
└────────────────────────┬────────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────────┐
│                   STAGE 4: CONCEPT PLANNING                          │
├─────────────────────────────────────────────────────────────────────┤
│  Lightweight LLM Call (GPT-4o-mini)                                  │
│  Input: Retrieved context + product info                             │
│  Task: Generate 3 distinct concept angles                            │
│  Output: [                                                           │
│    {type: 'emotional', hook: 'pain_point', tone: 'empathetic'},    │
│    {type: 'benefit', hook: 'stat', tone: 'professional'},           │
│    {type: 'ugc', hook: 'testimonial', tone: 'casual'}               │
│  ]                                                                   │
└────────────────────────┬────────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────────┐
│                 STAGE 5: AD COPY GENERATION                          │
├─────────────────────────────────────────────────────────────────────┤
│  Provider: OpenAI GPT-4.1 (or GPT-5 when available)                 │
│  Parallel Generation: 3 variants simultaneously                      │
│                                                                      │
│  For each variant:                                                   │
│  ├─ Input: Concept + RAG context + brand voice + platform specs     │
│  ├─ Output:                                                          │
│  │   • Headline (40 chars max)                                      │
│  │   • 2 alternative headlines                                      │
│  │   • Primary text (125 chars avg for Meta, 30 words for Google)  │
│  │   • CTA suggestion + rationale                                   │
│  │   • Reasoning for creative choices                               │
│  └─ Platform-specific formatting enforced                            │
│                                                                      │
│  Token Optimization:                                                 │
│  • Use JSON mode for structured output                              │
│  • Temperature: 0.7 (creative but consistent)                       │
│  • Max tokens: 500 per variant                                      │
└────────────────────────┬────────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────────┐
│                   STAGE 6: VARIANT SCORING                           │
├─────────────────────────────────────────────────────────────────────┤
│  Scoring Model (Phase I: Rule-Based, Phase II: ML)                  │
│                                                                      │
│  Phase I Scoring Criteria:                                           │
│  ├─ Brand Fit (0-1): Embedding similarity to brand voice            │
│  ├─ Context Relevance (0-1): Similarity to top RAG results          │
│  ├─ Platform Compliance (0-1): Char limits, formatting rules        │
│  ├─ Hook Strength (0-1): Presence of proven hook patterns           │
│  └─ CTA Clarity (0-1): Clear action verb + benefit                  │
│                                                                      │
│  Weighted Score = 0.3*brand + 0.25*relevance + 0.15*compliance      │
│                   + 0.2*hook + 0.1*cta                               │
│                                                                      │
│  Phase II (Future): Fine-tuned regression model on historical ROAS   │
│                                                                      │
│  Output: predicted_score (0-1) + score_breakdown JSON                │
└────────────────────────┬────────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    STAGE 7: FORMATTING                               │
├─────────────────────────────────────────────────────────────────────┤
│  Platform-Specific Constraints:                                      │
│                                                                      │
│  Meta/Instagram:                                                     │
│  • Primary text: 125 chars recommended (2200 max)                   │
│  • Headline: 40 chars (27 mobile display)                           │
│  • Link description: 30 chars                                       │
│  • CTA button: predefined options                                   │
│                                                                      │
│  Google Ads (Responsive Search):                                     │
│  • Headlines: 15 options (30 chars each)                            │
│  • Descriptions: 4 options (90 chars each)                          │
│                                                                      │
│  TikTok (Phase II):                                                  │
│  • Ad text: 100 chars (12-80 optimal)                               │
│  • Video script: 15-60 seconds                                      │
│                                                                      │
│  Validation:                                                         │
│  • Character count enforcement                                       │
│  • Special character stripping (emojis policy-compliant)            │
│  • Link formatting (UTM parameters)                                  │
└────────────────────────┬────────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────────┐
│                 STAGE 8: USER APPROVAL UI                            │
├─────────────────────────────────────────────────────────────────────┤
│  Display: 3 variants side-by-side                                    │
│  • Variant type badge (Emotional/Benefit/UGC)                       │
│  • Predicted score (star rating visualization)                      │
│  • Inline editing (headline, primary text, CTA)                     │
│  • Version comparison toggle                                        │
│  • Brand voice alignment indicator                                  │
│                                                                      │
│  User Actions:                                                       │
│  ├─ Edit any field → mark as user_edited = true                    │
│  ├─ Select variant → is_selected = true                            │
│  ├─ Regenerate all → restart pipeline                              │
│  └─ Publish → proceed to Meta Ads API                              │
└────────────────────────┬────────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────────┐
│                 STAGE 9: PUBLISHING                                  │
├─────────────────────────────────────────────────────────────────────┤
│  Meta Marketing API Integration:                                     │
│  POST /act_{ad_account_id}/adcreatives                               │
│  POST /act_{ad_account_id}/ads                                       │
│                                                                      │
│  Payload:                                                            │
│  {                                                                   │
│    name: "AIE Generated Ad - {timestamp}",                          │
│    object_story_spec: {                                             │
│      page_id: {from facebook_integrations},                         │
│      link_data: {                                                   │
│        message: {primary_text},                                     │
│        link: {product_url},                                         │
│        name: {headline},                                            │
│        call_to_action: {type: {cta}}                                │
│      }                                                               │
│    },                                                                │
│    adset_id: {from ad_request},                                     │
│    status: 'PAUSED' // User activates manually                      │
│  }                                                                   │
│                                                                      │
│  Response Handling:                                                  │
│  • Store ad.id → published_ad_id                                    │
│  • Update status → 'published'                                      │
│  • Timestamp → published_at                                         │
└────────────────────────┬────────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────────┐
│              STAGE 10: PERFORMANCE TRACKING                          │
├─────────────────────────────────────────────────────────────────────┤
│  Scheduled Job: Nightly metrics sync (2 AM UTC)                      │
│                                                                      │
│  Meta Insights API:                                                  │
│  GET /{ad_id}/insights?fields=impressions,clicks,spend,conversions  │
│                                                                      │
│  Metrics Stored:                                                     │
│  • Daily snapshots in aie_ad_performance                            │
│  • Calculated fields: CTR, CPC, CPA, ROAS                           │
│  • 90-day retention (archive older data)                            │
│                                                                      │
│  Learning Loop Trigger:                                              │
│  IF impressions > 1000 AND ROAS > category_avg:                     │
│    → Tag as performance_tag = 'high'                                │
│    → Generate embedding → add to aie_ad_examples                    │
│    → Update retrieval index                                         │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Module Specifications

### 1. Image Analysis Module

**Location**: `/src/lib/aie/image-analyzer.ts`

```typescript
interface ImageAnalysisResult {
  category: string;
  subcategory?: string;
  tags: string[];
  colors: {
    dominant: string[];
    palette: string[];
  };
  mood: string[];
  scene_context: string[];
  text_detected?: string;
  quality_score: number; // 0-1
  keywords: string[];
}

async function analyzeImage(imageUrl: string): Promise<ImageAnalysisResult> {
  // 1. Check cache (aie_image_analysis table)
  const cached = await getCachedAnalysis(imageUrl);
  if (cached) return cached;

  // 2. Call OpenAI Vision API
  const response = await openai.chat.completions.create({
    model: "gpt-4-vision-preview",
    messages: [
      {
        role: "user",
        content: [
          {
            type: "text",
            text: `Analyze this product image. Provide:
              1. Category (e.g., apparel, beauty, electronics)
              2. Subcategory if applicable
              3. Visual tags (5-10 descriptive keywords)
              4. Dominant colors (hex codes)
              5. Mood/emotion conveyed (energetic, calm, professional, etc.)
              6. Scene context (product shot, lifestyle, outdoor, etc.)
              7. Any text visible in the image
              8. Quality score (0-1) based on clarity, composition

              Return as JSON.`,
          },
          {
            type: "image_url",
            image_url: { url: imageUrl },
          },
        ],
      },
    ],
    response_format: { type: "json_object" },
    max_tokens: 500,
  });

  const analysis = JSON.parse(response.choices[0].message.content);

  // 3. Generate visual embedding (optional for v2)
  // const embedding = await generateVisualEmbedding(imageUrl);

  // 4. Cache result
  await cacheAnalysis(imageUrl, analysis);

  return analysis;
}
```

**Error Handling**:

- Fallback to CLIP if Vision API fails
- Return generic category if all fail
- Log failures to monitoring system

---

### 2. RAG Retrieval Module

**Location**: `/src/lib/aie/rag-retriever.ts`

```typescript
interface RetrievalContext {
  best_practices: BestPractice[];
  ad_examples: AdExample[];
  total_similarity_score: number;
}

async function retrieveContext(
  platform: string,
  goal: string,
  category: string,
  keywords: string[],
  userDescription: string,
  topK: number = 10,
): Promise<RetrievalContext> {
  // 1. Generate query embedding
  const queryText = `${platform} ${goal} ${category} ${keywords.join(" ")} ${userDescription}`;
  const queryEmbedding = await generateEmbedding(queryText);

  // 2. Parallel retrieval from both tables
  const [bestPractices, adExamples] = await Promise.all([
    retrieveBestPractices(queryEmbedding, platform, goal, category, topK),
    retrieveAdExamples(queryEmbedding, platform, category, topK),
  ]);

  // 3. Re-rank and boost
  const rankedPractices = reRankWithBoosts(bestPractices);
  const rankedExamples = reRankWithPerformanceBoost(adExamples);

  // 4. Log retrieval for debugging
  await logRetrieval({
    query_text: queryText,
    query_embedding: queryEmbedding,
    retrieved_best_practices: rankedPractices.map((bp) => ({
      id: bp.id,
      score: bp.similarity,
    })),
    retrieved_examples: rankedExamples.map((ex) => ({
      id: ex.id,
      score: ex.similarity,
    })),
  });

  return {
    best_practices: rankedPractices.slice(0, topK),
    ad_examples: rankedExamples.slice(0, topK),
    total_similarity_score: calculateAverageScore(
      rankedPractices,
      rankedExamples,
    ),
  };
}

async function retrieveBestPractices(
  embedding: number[],
  platform: string,
  goal: string,
  category: string,
  topK: number,
): Promise<BestPractice[]> {
  const { data } = await supabase.rpc("search_best_practices", {
    query_embedding: embedding,
    match_platform: platform,
    match_goal: goal,
    match_category: category,
    top_k: topK,
    similarity_threshold: 0.7,
  });

  return data;
}

function reRankWithBoosts(items: any[]): any[] {
  return items
    .map((item) => {
      let boost = 1.0;

      // Recency boost (last 30 days)
      const daysSinceCreated =
        (Date.now() - new Date(item.created_at).getTime()) /
        (1000 * 60 * 60 * 24);
      if (daysSinceCreated < 30) boost *= 1.1;

      // Verification boost
      if (item.verification_status === "verified") boost *= 1.05;

      return {
        ...item,
        boosted_score: item.similarity * boost,
      };
    })
    .sort((a, b) => b.boosted_score - a.boosted_score);
}

function reRankWithPerformanceBoost(examples: AdExample[]): AdExample[] {
  return examples
    .map((ex) => {
      let boost = 1.0;

      // Performance tag boost
      if (ex.performance_tag === "high") boost *= 1.2;
      else if (ex.performance_tag === "avg") boost *= 1.0;
      else boost *= 0.8;

      // Percentile boost (top 10%)
      if (ex.performance_percentile >= 90) boost *= 1.15;

      return {
        ...ex,
        boosted_score: ex.similarity * boost,
      };
    })
    .sort((a, b) => b.boosted_score - a.boosted_score);
}
```

**PostgreSQL RPC Function**:

```sql
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
  similarity NUMERIC
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
    (1 - (bp.embedding <=> query_embedding))::NUMERIC as similarity
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
```

---

### 3. Generation Module

**Location**: `/src/lib/aie/ad-generator.ts`

```typescript
interface GenerationRequest {
  platform: string;
  goal: string;
  productInfo: {
    description: string;
    category: string;
    imageAnalysis: ImageAnalysisResult;
  };
  brandVoice: {
    tone: string;
    values: string[];
    avoidList: string[];
  };
  ragContext: RetrievalContext;
}

interface AdVariant {
  variant_number: number;
  variant_type: "emotional" | "benefit" | "ugc";
  headline: string;
  headline_alternatives: string[];
  primary_text: string;
  cta: string;
  cta_rationale: string;
  hook_technique: string;
  tone: string;
  generation_reasoning: string;
}

async function generateAdVariants(
  request: GenerationRequest,
): Promise<AdVariant[]> {
  // 1. Plan concepts
  const concepts = await planConcepts(request);

  // 2. Generate variants in parallel
  const variants = await Promise.all(
    concepts.map((concept, idx) =>
      generateSingleVariant(request, concept, idx + 1),
    ),
  );

  return variants;
}

async function planConcepts(request: GenerationRequest): Promise<Concept[]> {
  const prompt = buildConceptPlanningPrompt(request);

  const response = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      {
        role: "system",
        content: "You are an expert ad strategist planning creative angles.",
      },
      { role: "user", content: prompt },
    ],
    response_format: { type: "json_object" },
    temperature: 0.7,
    max_tokens: 300,
  });

  const { concepts } = JSON.parse(response.choices[0].message.content);
  return concepts;
}

function buildConceptPlanningPrompt(request: GenerationRequest): string {
  return `
Based on this product and context, plan 3 distinct ad concept angles:

PRODUCT:
- Category: ${request.productInfo.category}
- Description: ${request.productInfo.description}
- Visual mood: ${request.productInfo.imageAnalysis.mood.join(", ")}

BRAND VOICE:
- Tone: ${request.brandVoice.tone}
- Values: ${request.brandVoice.values.join(", ")}

BEST PRACTICES RETRIEVED:
${request.ragContext.best_practices.map((bp) => `- ${bp.title}: ${bp.description}`).join("\n")}

HIGH-PERFORMING EXAMPLES:
${request.ragContext.ad_examples
  .slice(0, 3)
  .map(
    (ex) =>
      `- Hook: "${ex.primary_text.substring(0, 50)}..." (CTR: ${ex.performance_metrics.ctr})`,
  )
  .join("\n")}

Generate 3 concept angles with different approaches:
1. Emotional appeal (fear, desire, belonging)
2. Benefit-driven (rational, problem-solution)
3. UGC/Social proof (testimonial, community)

Return JSON:
{
  "concepts": [
    {
      "type": "emotional|benefit|ugc",
      "hook": "pain_point|stat|question|urgency|testimonial",
      "tone": "empathetic|professional|casual|playful",
      "key_message": "brief description"
    }
  ]
}
`;
}

async function generateSingleVariant(
  request: GenerationRequest,
  concept: Concept,
  variantNumber: number,
): Promise<AdVariant> {
  const prompt = buildGenerationPrompt(request, concept);

  const response = await openai.chat.completions.create({
    model: "gpt-4-turbo-preview", // or gpt-5 when available
    messages: [
      {
        role: "system",
        content: `You are Thunder Text's Ad Intelligence Engine. Generate high-converting ${request.platform} ads using proven frameworks and brand voice alignment.`,
      },
      { role: "user", content: prompt },
    ],
    response_format: { type: "json_object" },
    temperature: 0.7,
    max_tokens: 500,
  });

  const generated = JSON.parse(response.choices[0].message.content);

  return {
    variant_number: variantNumber,
    variant_type: concept.type,
    ...generated,
  };
}

function buildGenerationPrompt(
  request: GenerationRequest,
  concept: Concept,
): string {
  const platformSpecs = getPlatformSpecs(request.platform);

  return `
Generate a ${request.platform} ad following this concept:

CONCEPT: ${concept.type.toUpperCase()}
- Hook type: ${concept.hook}
- Tone: ${concept.tone}
- Key message: ${concept.key_message}

PRODUCT:
${request.productInfo.description}

BRAND VOICE:
- Tone: ${request.brandVoice.tone}
- Values: ${request.brandVoice.values.join(", ")}
- Avoid: ${request.brandVoice.avoidList.join(", ")}

VISUAL CONTEXT:
- Category: ${request.productInfo.category}
- Mood: ${request.productInfo.imageAnalysis.mood.join(", ")}
- Colors: ${request.productInfo.imageAnalysis.colors.dominant.join(", ")}

PLATFORM SPECS:
- Headline: Max ${platformSpecs.headlineMax} characters
- Primary text: ${platformSpecs.primaryTextRecommended} characters recommended
- CTA options: ${platformSpecs.ctaOptions.join(", ")}

BEST PRACTICES TO APPLY:
${request.ragContext.best_practices
  .slice(0, 5)
  .map((bp) => `- ${bp.title}`)
  .join("\n")}

PROVEN PATTERNS (use as inspiration, don't copy):
${request.ragContext.ad_examples
  .slice(0, 3)
  .map((ex) => `- "${ex.headline}" + "${ex.primary_text.substring(0, 60)}..."`)
  .join("\n")}

Generate ad copy with:
1. Primary headline (under ${platformSpecs.headlineMax} chars)
2. Two alternative headlines (different angles)
3. Primary text (${platformSpecs.primaryTextRecommended} chars)
4. CTA button text + rationale
5. Brief reasoning for creative choices

Return JSON:
{
  "headline": "...",
  "headline_alternatives": ["...", "..."],
  "primary_text": "...",
  "cta": "...",
  "cta_rationale": "...",
  "hook_technique": "pain_point|stat|question|...",
  "tone": "empathetic|professional|casual",
  "generation_reasoning": "Why this approach works for this product/audience"
}
`;
}

function getPlatformSpecs(platform: string) {
  const specs = {
    meta: {
      headlineMax: 40,
      primaryTextRecommended: 125,
      ctaOptions: [
        "SHOP_NOW",
        "LEARN_MORE",
        "SIGN_UP",
        "GET_OFFER",
        "CONTACT_US",
      ],
    },
    instagram: {
      headlineMax: 40,
      primaryTextRecommended: 125,
      ctaOptions: ["SHOP_NOW", "LEARN_MORE", "SIGN_UP", "GET_OFFER"],
    },
    google: {
      headlineMax: 30,
      primaryTextRecommended: 90,
      ctaOptions: [], // Auto-generated by Google
    },
  };

  return specs[platform] || specs.meta;
}
```

---

### 4. Scoring Module

**Location**: `/src/lib/aie/variant-scorer.ts`

```typescript
interface ScoringResult {
  predicted_score: number; // 0-1
  score_breakdown: {
    brand_fit: number;
    context_relevance: number;
    platform_compliance: number;
    hook_strength: number;
    cta_clarity: number;
  };
}

async function scoreVariant(
  variant: AdVariant,
  brandVoice: BrandVoice,
  ragContext: RetrievalContext,
  platform: string,
): Promise<ScoringResult> {
  // Phase I: Rule-based scoring
  const breakdown = {
    brand_fit: await scoreBrandFit(variant, brandVoice),
    context_relevance: scoreContextRelevance(variant, ragContext),
    platform_compliance: scorePlatformCompliance(variant, platform),
    hook_strength: scoreHookStrength(variant),
    cta_clarity: scoreCTAClarity(variant),
  };

  // Weighted average
  const predicted_score =
    0.3 * breakdown.brand_fit +
    0.25 * breakdown.context_relevance +
    0.15 * breakdown.platform_compliance +
    0.2 * breakdown.hook_strength +
    0.1 * breakdown.cta_clarity;

  return {
    predicted_score: Math.round(predicted_score * 10000) / 10000,
    score_breakdown: breakdown,
  };
}

async function scoreBrandFit(
  variant: AdVariant,
  brandVoice: BrandVoice,
): Promise<number> {
  // Generate embedding for variant text
  const variantText = `${variant.headline} ${variant.primary_text}`;
  const variantEmbedding = await generateEmbedding(variantText);

  // Generate embedding for brand voice profile
  const brandText = `${brandVoice.tone} ${brandVoice.values.join(" ")}`;
  const brandEmbedding = await generateEmbedding(brandText);

  // Calculate cosine similarity
  const similarity = cosineSimilarity(variantEmbedding, brandEmbedding);

  // Penalize if contains avoid words
  const containsAvoid = brandVoice.avoidList.some((word) =>
    variantText.toLowerCase().includes(word.toLowerCase()),
  );

  return containsAvoid ? similarity * 0.5 : similarity;
}

function scoreContextRelevance(
  variant: AdVariant,
  ragContext: RetrievalContext,
): number {
  // Average similarity of top 5 retrieved best practices
  const avgSimilarity =
    ragContext.best_practices
      .slice(0, 5)
      .reduce((sum, bp) => sum + bp.similarity, 0) / 5;

  return avgSimilarity;
}

function scorePlatformCompliance(variant: AdVariant, platform: string): number {
  const specs = getPlatformSpecs(platform);
  let score = 1.0;

  // Headline length
  if (variant.headline.length > specs.headlineMax) {
    score *= 0.5; // Major penalty
  } else if (variant.headline.length > specs.headlineMax * 0.9) {
    score *= 0.9; // Minor penalty for being close to limit
  }

  // Primary text length (optimal range)
  const textLength = variant.primary_text.length;
  if (textLength < specs.primaryTextRecommended * 0.5) {
    score *= 0.7; // Too short
  } else if (textLength > specs.primaryTextRecommended * 2) {
    score *= 0.8; // Too long
  }

  // CTA validation
  if (specs.ctaOptions.length > 0 && !specs.ctaOptions.includes(variant.cta)) {
    score *= 0.9;
  }

  return score;
}

function scoreHookStrength(variant: AdVariant): number {
  const strongHooks = ["pain_point", "stat", "urgency", "social_proof"];
  const mediumHooks = ["question", "benefit"];

  if (strongHooks.includes(variant.hook_technique)) {
    return 0.9;
  } else if (mediumHooks.includes(variant.hook_technique)) {
    return 0.75;
  } else {
    return 0.6;
  }
}

function scoreCTAClarity(variant: AdVariant): number {
  const actionVerbs = [
    "buy",
    "shop",
    "get",
    "learn",
    "discover",
    "try",
    "start",
    "join",
  ];
  const ctaLower = variant.cta.toLowerCase();

  const hasActionVerb = actionVerbs.some((verb) => ctaLower.includes(verb));
  const hasBenefit = variant.cta_rationale.length > 20; // Has thoughtful rationale

  if (hasActionVerb && hasBenefit) return 1.0;
  if (hasActionVerb || hasBenefit) return 0.75;
  return 0.5;
}

function cosineSimilarity(a: number[], b: number[]): number {
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }

  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}
```

---

## Performance Optimizations

### 1. Caching Strategy

- Image analysis results cached in database
- RAG embeddings pre-computed and indexed
- Brand voice embeddings cached per shop
- Common query patterns memoized (5-minute TTL)

### 2. Parallel Processing

```typescript
// Generate all 3 variants simultaneously
const variants = await Promise.all([
  generateSingleVariant(request, concepts[0], 1),
  generateSingleVariant(request, concepts[1], 2),
  generateSingleVariant(request, concepts[2], 3),
]);

// Score all variants in parallel
const scoredVariants = await Promise.all(
  variants.map((v) => scoreVariant(v, brandVoice, ragContext, platform)),
);
```

### 3. Batch Embeddings

```typescript
// Generate multiple embeddings in single API call
const texts = [queryText, brandText, variant1Text, variant2Text, variant3Text];
const embeddings = await openai.embeddings.create({
  model: "text-embedding-ada-002",
  input: texts,
});
```

### 4. Timeout & Retry Logic

```typescript
const MAX_RETRIES = 3;
const TIMEOUT_MS = 30000;

async function generateWithRetry(
  request: GenerationRequest,
): Promise<AdVariant[]> {
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const result = await Promise.race([
        generateAdVariants(request),
        timeoutAfter(TIMEOUT_MS),
      ]);
      return result;
    } catch (error) {
      if (attempt === MAX_RETRIES) throw error;
      await sleep(1000 * attempt); // Exponential backoff
    }
  }
}
```

---

## Error Handling

### Graceful Degradation

1. **Image Analysis Fails** → Use generic category from user description
2. **RAG Retrieval Empty** → Use default best practices template
3. **Generation Timeout** → Return 1 variant instead of 3
4. **Scoring Fails** → Default to 0.7 score
5. **Publishing Fails** → Save draft, allow manual retry

### Monitoring Points

- Track latency for each pipeline stage
- Alert if success rate < 95%
- Log all errors to Sentry/monitoring system
- Weekly review of failure patterns

---

## Next Steps

1. Implement core modules in `/src/lib/aie/` directory
2. Create API routes for each pipeline stage
3. Build comprehensive test suite with mock data
4. Set up monitoring and alerting
5. Performance benchmarking (target: <15s total pipeline)
