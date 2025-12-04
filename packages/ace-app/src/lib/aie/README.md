# Ad Intelligence Engine (AIE) Module

> **Version**: 1.0.0 (Phase I - Meta/Instagram)
> **Status**: Active Development
> **Owner**: Thunder Text Team

---

## 📋 Overview

The Ad Intelligence Engine (AIE) is an AI-powered social media ad generation system that creates high-performing Meta/Instagram ad variants using Retrieval-Augmented Generation (RAG).

**Core Capabilities**:

- 🖼️ Image analysis (product categorization, mood detection)
- 🧠 RAG-based context retrieval (best practices + high-performing examples)
- ✍️ AI ad copy generation (3 variants: emotional, benefit-focused, UGC)
- 📊 Variant scoring (brand fit, performance prediction)
- 🚀 One-click publishing to Meta Ads
- 📈 Performance tracking & learning loop

---

## 🏗️ Module Boundaries

### ✅ What AIE OWNS (Isolated)

```
src/lib/aie/
├── image-analyzer.ts       # Image analysis with OpenAI Vision
├── rag-retriever.ts        # pgvector semantic search
├── ad-generator.ts         # GPT-4 ad copy generation
├── variant-scorer.ts       # Variant quality scoring
├── meta-publisher.ts       # Meta Ads API publishing
├── performance-tracker.ts  # Metrics sync & learning loop
├── db.ts                   # AIE-specific database queries
├── types.ts                # AIE type definitions
└── README.md               # This file
```

### 🔗 What AIE SHARES (Reuses)

```typescript
// SHARED INFRASTRUCTURE (DO NOT DUPLICATE)
import { createClient } from '@/lib/supabase'        // ✅ Supabase client
import { openai } from '@/lib/openai'                // ✅ OpenAI client
import { getShopContext } from '@/lib/middleware'    // ✅ Auth context
import { FacebookAPIService } from '@/lib/services/facebook-api' // ✅ Meta API wrapper

// SHARED DATA MODELS
- shops table (brand voice, settings)
- integrations table (Facebook tokens)
- Shopify product catalog (via existing APIs)
```

### 🚫 What AIE MUST NOT DO

❌ **Never import from**:

- Other feature modules (e.g., `/lib/trends/*`, `/lib/services/content-generator.ts`)
- App routes directly (e.g., `/app/enhance/*`)

❌ **Never modify**:

- Core Shopify integration (`/lib/shopify.ts`)
- Existing OpenAI prompt system (`/lib/prompts.ts`)
- Shared database tables without migration

✅ **Always**:

- Use shared clients (Supabase, OpenAI, Facebook API)
- Prefix all database tables with `aie_*`
- Namespace all API routes under `/api/aie/*`
- Handle errors within module boundaries

---

## 🗂️ Directory Structure

### Source Code Organization

```
src/
├── app/
│   └── aie/                        # AIE App Routes (UI)
│       ├── generate/
│       │   └── page.tsx            # Ad generation workflow
│       ├── dashboard/
│       │   └── page.tsx            # Performance dashboard
│       ├── expert/
│       │   └── page.tsx            # Expert contribution portal
│       └── layout.tsx              # AIE error boundary & provider
│
├── app/api/
│   └── aie/                        # AIE API Routes
│       ├── generate/
│       │   └── route.ts            # POST /api/aie/generate
│       ├── publish/
│       │   └── route.ts            # POST /api/aie/publish
│       ├── metrics/
│       │   └── route.ts            # POST /api/aie/metrics/sync
│       └── insights/
│           └── route.ts            # GET /api/aie/insights
│
├── lib/aie/                        # AIE Business Logic (Core)
│   ├── image-analyzer.ts           # Image analysis module
│   ├── rag-retriever.ts            # RAG retrieval system
│   ├── ad-generator.ts             # Ad generation pipeline
│   ├── variant-scorer.ts           # Scoring engine
│   ├── meta-publisher.ts           # Meta API publishing
│   ├── performance-tracker.ts      # Metrics & learning loop
│   ├── db.ts                       # Database queries
│   ├── types.ts                    # TypeScript types
│   ├── utils.ts                    # AIE utilities
│   └── README.md                   # This file
│
├── components/aie/                 # AIE UI Components
│   ├── VariantReviewModal.tsx     # 3-variant selection UI
│   ├── AdGenerationForm.tsx       # Input form
│   ├── PerformanceDashboard.tsx   # Metrics dashboard
│   └── ExpertUploadForm.tsx       # Expert contribution UI
│
└── types/
    └── aie.ts                      # Shared AIE type definitions
```

### Database Tables (Supabase)

```
supabase/migrations/
└── 20251106_aie_core_schema.sql   # All AIE tables (aie_* prefix)
    ├── aie_best_practices          # RAG knowledge: best practices
    ├── aie_ad_examples             # RAG knowledge: high performers
    ├── aie_ad_requests             # Generation requests
    ├── aie_ad_variants             # Generated variants (3 per request)
    ├── aie_ad_performance          # Daily metrics from Meta
    ├── aie_image_analysis          # Image analysis cache
    ├── aie_learning_loop_insights  # Aggregated insights
    ├── aie_expert_contributions    # Expert uploads
    ├── aie_rag_retrieval_logs      # RAG debugging logs
    └── aie_scheduled_jobs_log      # Job execution tracking
```

---

## 🔌 Integration Points

### 1. Authentication & Context

```typescript
// AIE uses existing shop context from middleware
import { getShopContext } from "@/lib/middleware";

export async function generateAd(request: Request) {
  const shopContext = await getShopContext(request);
  const shopId = shopContext.shop.id;

  // AIE operates within shop context
  const brandVoice = await getBrandVoice(shopId);
  // ...
}
```

### 2. OpenAI Client

```typescript
// Reuse existing OpenAI client
import { openai } from "@/lib/openai";

export async function analyzeImage(imageUrl: string) {
  const response = await openai.chat.completions.create({
    model: "gpt-4-vision-preview",
    messages: [
      /* ... */
    ],
  });
  return response;
}
```

### 3. Supabase Client

```typescript
// Reuse existing Supabase client
import { createClient } from "@/lib/supabase";

export async function saveBestPractice(data: BestPractice) {
  const supabase = createClient();
  const { data: result, error } = await supabase
    .from("aie_best_practices")
    .insert(data);
  return result;
}
```

### 4. Meta Ads API

```typescript
// Extend existing Facebook API service
import { FacebookAPIService } from "@/lib/services/facebook-api";

export async function publishAd(shopId: string, adData: AdCreative) {
  const fbService = new FacebookAPIService(shopId);
  const result = await fbService.createAd(adData);
  return result;
}
```

---

## 📊 Data Flow

```
User Input (Product + Description)
        ↓
┌──────────────────────────┐
│  AIE Pipeline Entry      │
│  /api/aie/generate       │
└──────────┬───────────────┘
           ↓
┌──────────────────────────┐
│  1. Image Analysis       │
│  lib/aie/image-analyzer  │
│  • OpenAI Vision API     │
│  • Category detection    │
│  • Mood/color analysis   │
└──────────┬───────────────┘
           ↓
┌──────────────────────────┐
│  2. RAG Retrieval        │
│  lib/aie/rag-retriever   │
│  • pgvector search       │
│  • Best practices        │
│  • High-performing ads   │
└──────────┬───────────────┘
           ↓
┌──────────────────────────┐
│  3. Ad Generation        │
│  lib/aie/ad-generator    │
│  • Concept planning      │
│  • 3 variant generation  │
│  • Platform formatting   │
└──────────┬───────────────┘
           ↓
┌──────────────────────────┐
│  4. Variant Scoring      │
│  lib/aie/variant-scorer  │
│  • Brand fit score       │
│  • Context relevance     │
│  • Predicted performance │
└──────────┬───────────────┘
           ↓
┌──────────────────────────┐
│  5. User Approval        │
│  components/aie/Modal    │
│  • Review 3 variants     │
│  • Inline editing        │
│  • Select + Publish      │
└──────────┬───────────────┘
           ↓
┌──────────────────────────┐
│  6. Publishing           │
│  lib/aie/meta-publisher  │
│  • Meta Ads API          │
│  • Ad creative creation  │
│  • Status tracking       │
└──────────┬───────────────┘
           ↓
┌──────────────────────────┐
│  7. Performance Loop     │
│  lib/aie/tracker         │
│  • Nightly metrics sync  │
│  • Learning loop         │
│  • Insights generation   │
└──────────────────────────┘
```

---

## 🧪 Testing Strategy

### Unit Tests

```typescript
// src/lib/aie/__tests__/image-analyzer.test.ts
describe("Image Analyzer", () => {
  it("should categorize product images", async () => {
    const result = await analyzeImage("https://example.com/image.jpg");
    expect(result.category).toBeDefined();
    expect(result.tags.length).toBeGreaterThan(0);
  });
});
```

### Integration Tests

```typescript
// src/lib/aie/__tests__/ad-generation.integration.test.ts
describe("End-to-End Ad Generation", () => {
  it("should generate 3 ad variants", async () => {
    const variants = await generateAdVariants(mockRequest);
    expect(variants).toHaveLength(3);
    expect(variants[0].variant_type).toMatch(/emotional|benefit|ugc/);
  });
});
```

### Performance Benchmarks

- Image analysis: < 3s
- RAG retrieval: < 2s
- Ad generation: < 10s
- Total pipeline: < 15s

---

## 🚦 Feature Flags

```typescript
// lib/feature-flags.ts
export const AIE_FEATURES = {
  ENABLED: process.env.NEXT_PUBLIC_AIE_ENABLED === 'true',
  EXPERT_PORTAL: process.env.NEXT_PUBLIC_AIE_EXPERT_PORTAL === 'true',
  BETA_SHOPS: process.env.AIE_BETA_SHOP_IDS?.split(',') || [],
};

// Usage in components
import { AIE_FEATURES } from '@/lib/feature-flags';

if (!AIE_FEATURES.ENABLED) {
  return <FeatureDisabledMessage />;
}
```

---

## 🔍 Monitoring & Logging

### Error Tracking

```typescript
import * as Sentry from "@sentry/nextjs";

// Tag all AIE errors
Sentry.setTag("feature", "aie");
Sentry.setContext("aie", {
  module: "image-analyzer",
  operation: "analyzeImage",
});
```

### Performance Metrics

```typescript
// Track pipeline performance
const startTime = Date.now();
const result = await generateAdVariants(request);
const duration = Date.now() - startTime;

await logMetric({
  feature: "aie",
  operation: "generate_variants",
  duration_ms: duration,
  success: true,
});
```

### Debug Logging

```typescript
// Development logging
if (process.env.NODE_ENV === "development") {
  console.log("[AIE] RAG Retrieval:", {
    query: queryText,
    results: retrievedCount,
    avgSimilarity: avgScore,
  });
}
```

---

## 📝 Development Guidelines

### 1. Naming Conventions

```typescript
// ✅ Good
export async function generateAdVariants() {}
export interface AIEAdRequest {}
export type AIEVariantType = "emotional" | "benefit" | "ugc";

// ❌ Bad
export async function generate() {} // Too generic
export interface AdRequest {} // Missing AIE prefix
```

### 2. Error Handling

```typescript
// ✅ Good - Specific error types
export class AIEImageAnalysisError extends Error {
  constructor(
    message: string,
    public cause?: Error,
  ) {
    super(message);
    this.name = "AIEImageAnalysisError";
  }
}

throw new AIEImageAnalysisError("Vision API failed", originalError);

// ❌ Bad - Generic errors
throw new Error("Failed");
```

### 3. Type Safety

```typescript
// ✅ Good - Strict types
export interface AIEGenerationRequest {
  shopId: string;
  platform: "meta" | "instagram";
  goal: "awareness" | "conversion";
  imageUrl: string;
  description: string;
}

// ❌ Bad - Any types
export interface GenerationRequest {
  data: any;
}
```

### 4. Async/Await Pattern

```typescript
// ✅ Good - Parallel operations
const [imageAnalysis, ragContext] = await Promise.all([
  analyzeImage(imageUrl),
  retrieveContext(params),
]);

// ❌ Bad - Sequential when parallelizable
const imageAnalysis = await analyzeImage(imageUrl);
const ragContext = await retrieveContext(params);
```

---

## 🔐 Security Considerations

### 1. Input Validation

```typescript
import { z } from "zod";

const AIEGenerateRequestSchema = z.object({
  imageUrl: z.string().url(),
  description: z.string().min(10).max(500),
  platform: z.enum(["meta", "instagram"]),
  goal: z.enum(["awareness", "conversion"]),
});

export async function validateRequest(data: unknown) {
  return AIEGenerateRequestSchema.parse(data);
}
```

### 2. Rate Limiting

```typescript
// Apply rate limits to AIE endpoints
export const AIE_RATE_LIMITS = {
  generate: { requests: 10, window: "1h" },
  publish: { requests: 50, window: "1d" },
};
```

### 3. Access Control

```typescript
// Only shop owners can generate ads for their shop
export async function verifyShopAccess(userId: string, shopId: string) {
  const { data } = await supabase
    .from("shops")
    .select("id")
    .eq("id", shopId)
    .eq("user_id", userId)
    .single();

  if (!data) throw new AIEAuthorizationError("Access denied");
}
```

---

## 🚀 Deployment Checklist

Before deploying AIE to production:

- [ ] Database migrations applied (`aie_*` tables created)
- [ ] pgvector extension enabled in Supabase
- [ ] Environment variables configured:
  - [ ] `OPENAI_API_KEY`
  - [ ] `NEXT_PUBLIC_AIE_ENABLED=true`
  - [ ] Facebook App credentials
- [ ] Seed best practices data loaded (min 50 entries)
- [ ] Feature flag configuration set
- [ ] Error tracking configured (Sentry tags)
- [ ] Rate limits configured
- [ ] Monitoring dashboards created
- [ ] Beta testing with 3-5 shops completed
- [ ] Documentation updated

---

## 📚 Related Documentation

- [AIE System Architecture](../../claudedocs/aie_pipeline_architecture_design.md)
- [Database Schema Design](../../claudedocs/aie_database_schema_design.md)
- [RAG Retrieval System](../../claudedocs/aie_rag_retrieval_design.md)
- [Monorepo Integration Analysis](../../claudedocs/aie_monorepo_vs_separate_analysis.md)
- [Main AIE Documentation](../../docs/ThunderText_Ad_Intelligence_Engine.md)

---

## 🤝 Contributing

### Adding New AIE Features

1. Create feature branch: `feature/aie-{feature-name}`
2. Add types to `types.ts`
3. Implement business logic in new module file
4. Add unit tests in `__tests__/`
5. Update this README
6. Submit PR with AIE-specific test coverage

### Code Review Checklist

- [ ] Module boundaries respected (no cross-feature imports)
- [ ] Types exported from `types.ts`
- [ ] Error handling implemented
- [ ] Unit tests added (>80% coverage)
- [ ] Performance impact assessed (<15s total pipeline)
- [ ] Security review completed
- [ ] Documentation updated

---

**Last Updated**: 2025-11-06
**Version**: 1.0.0-alpha
**Status**: Active Development
