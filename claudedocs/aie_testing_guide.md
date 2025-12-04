# AIE Testing Guide

Quick guide to test the Ad Intelligence Engine end-to-end.

## Prerequisites

- Thunder Text dev server running: `npm run dev`
- OpenAI API key in `.env.local`
- Supabase project configured
- Database migrations applied

## Test 1: Embedding Auto-Generation

### Check Initial Status

```bash
curl http://localhost:3050/api/aie/embeddings
```

**Expected**: `"without_embeddings": 28` (if first time)

### Make First AIE Request

This will automatically generate embeddings.

```bash
curl -X POST http://localhost:3050/api/aie/generate \
  -H "Content-Type: application/json" \
  -d '{
    "shopId": "test-shop-123",
    "platform": "meta",
    "goal": "conversion",
    "description": "Premium wireless earbuds with 24-hour battery life and active noise cancellation. Perfect for commuters, travelers, and remote workers. Features: crystal-clear audio, comfortable fit, premium case, USB-C fast charging."
  }'
```

**Expected Behavior:**

1. Console shows: "🔍 First AIE request - checking embeddings..."
2. Console shows: "⚡ No embeddings found - generating now..."
3. Console shows: "✅ Generated embedding for: [each best practice title]"
4. After ~3-5 seconds: Returns 3 ad variants

**Expected Response Structure:**

```json
{
  "success": true,
  "data": {
    "adRequestId": "uuid",
    "variants": [
      {
        "id": "variant-id",
        "variantNumber": 1,
        "variantType": "benefit",
        "headline": "Never Run Out of Battery Again",
        "primaryText": "24 hours of nonstop audio...",
        "description": "...",
        "cta": "Shop Now",
        "predictedScore": 0.85,
        "scoreBreakdown": {
          "hook_strength": 0.8,
          "cta_clarity": 0.9,
          "platform_compliance": 0.95,
          "brand_fit": 0.8,
          "context_relevance": 0.82
        }
      }
      // ... 2 more variants
    ],
    "metadata": {
      "generationTimeMs": 4500,
      "aiCost": 0.045
    }
  }
}
```

### Verify Embeddings Generated

```bash
curl http://localhost:3050/api/aie/embeddings
```

**Expected**: `"with_embeddings": 28`, `"percentage_complete": 100`

## Test 2: Subsequent Requests (Fast)

### Make Second Request

```bash
curl -X POST http://localhost:3050/api/aie/generate \
  -H "Content-Type: application/json" \
  -d '{
    "shopId": "test-shop-123",
    "platform": "instagram",
    "goal": "engagement",
    "description": "Artisan coffee beans sourced from sustainable farms in Colombia. Rich, smooth flavor with notes of chocolate and caramel. Perfect for pour-over, espresso, or French press."
  }'
```

**Expected Behavior:**

1. Console shows: "✅ Embeddings already available"
2. Returns 3 variants in ~2 seconds (much faster)
3. Different variant types based on "engagement" goal

## Test 3: With Image Analysis

### Request with Image URL

```bash
curl -X POST http://localhost:3050/api/aie/generate \
  -H "Content-Type: application/json" \
  -d '{
    "shopId": "test-shop-123",
    "platform": "meta",
    "goal": "conversion",
    "description": "Minimalist leather backpack for professionals. Handcrafted from full-grain leather with laptop compartment and organizational pockets.",
    "imageUrl": "https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=800"
  }'
```

**Expected Behavior:**

1. Image analyzed via OpenAI Vision
2. Category detected: "fashion" or "accessories"
3. Colors, mood, tags extracted
4. RAG retrieval uses image context
5. Ad copy incorporates visual insights

**Expected Response Additions:**

```json
{
  "data": {
    "imageAnalysis": {
      "category": "fashion",
      "subcategory": "backpack",
      "colors": {
        "dominant": ["brown", "tan"],
        "palette": ["#8B4513", "#D2691E"]
      },
      "mood": ["professional", "elegant"],
      "quality_score": 0.9
    }
  }
}
```

## Test 4: Different Platforms

### Google Ads (Different Character Limits)

```bash
curl -X POST http://localhost:3050/api/aie/generate \
  -H "Content-Type: application/json" \
  -d '{
    "shopId": "test-shop-123",
    "platform": "google",
    "goal": "traffic",
    "description": "Online yoga classes for beginners. Live and on-demand sessions with certified instructors. Flexible scheduling, home-friendly workouts."
  }'
```

**Expected**: Shorter headlines (30 chars max), descriptions included

### TikTok (Different Tone)

```bash
curl -X POST http://localhost:3050/api/aie/generate \
  -H "Content-Type: application/json" \
  -d '{
    "shopId": "test-shop-123",
    "platform": "tiktok",
    "goal": "awareness",
    "description": "Quirky plant pots with personality. Hand-painted ceramic planters shaped like animals, characters, and objects. Perfect for small succulents."
  }'
```

**Expected**: More playful tone, trend-aware copy, UGC style

## Test 5: UI Testing

### Navigate to AIE Page

```
http://localhost:3050/aie
```

### Fill Form and Generate

1. **Platform**: Meta (Facebook)
2. **Goal**: Conversions
3. **Description**:
   ```
   Revolutionary smart water bottle that tracks your hydration goals
   and reminds you to drink. Features: LED reminders, temperature
   display, BPA-free, 24oz capacity, USB rechargeable. Perfect for
   fitness enthusiasts, busy professionals, and health-conscious
   individuals.
   ```
4. **Image URL** (optional):
   ```
   https://images.unsplash.com/photo-1523362628745-0c100150b504?w=800
   ```
5. **Target Audience** (optional):
   ```
   Health-conscious millennials aged 25-40, gym-goers, office workers
   ```
6. Click **"Generate Ad Variants"**

### Expected UI Behavior

1. Button shows "Generating..." with loading spinner
2. After 3-5 seconds (first time) or 2 seconds (subsequent):
3. Success banner appears:
   ```
   ✅ Ads Generated Successfully!
   Generated 3 variants in 2.45s • AI Cost: $0.0423
   ```
4. Three variant cards appear below

### Expected Variant Cards

Each card should show:

- **Header**: "Variant 1 - benefit" with quality badge (e.g., "85% - Excellent")
- **Headline**: Large, bold text
- **Primary Text**: Body copy
- **CTA**: Badge with action (e.g., "Shop Now")
- **Quality Scores**: 5 badges showing:
  - Hook: 80%
  - CTA: 90%
  - Platform: 95%
  - Brand Fit: 80%
  - Relevance: 82%
- **Alternative Headlines** (if available): Bulleted list
- **AI Reasoning**: Subdued text explaining strategy

### Score Badge Colors

- **Green** (success): ≥80%
- **Blue** (info): 60-79%
- **Yellow** (warning): <60%

## Test 6: Error Handling

### Missing Required Field

```bash
curl -X POST http://localhost:3050/api/aie/generate \
  -H "Content-Type: application/json" \
  -d '{
    "shopId": "test-shop-123",
    "platform": "meta"
  }'
```

**Expected**: 400 error with message "description is required"

### Invalid Platform

```bash
curl -X POST http://localhost:3050/api/aie/generate \
  -H "Content-Type: application/json" \
  -d '{
    "shopId": "test-shop-123",
    "platform": "invalid",
    "goal": "conversion",
    "description": "Test product"
  }'
```

**Expected**: 400 error with message "Invalid platform"

### Description Too Long

```bash
curl -X POST http://localhost:3050/api/aie/generate \
  -H "Content-Type: application/json" \
  -d '{
    "shopId": "test-shop-123",
    "platform": "meta",
    "goal": "conversion",
    "description": "'$(printf 'a%.0s' {1..1001})'"
  }'
```

**Expected**: 400 error with message "description must be under 1000 characters"

## Test 7: Retrieve Ad Request

### Get Request ID from Previous Response

```bash
# Save response from previous test
AD_REQUEST_ID="uuid-from-previous-response"

curl "http://localhost:3050/api/aie/generate?requestId=$AD_REQUEST_ID"
```

**Expected Response:**

```json
{
  "success": true,
  "data": {
    "request": {
      "id": "uuid",
      "shopId": "test-shop-123",
      "platform": "meta",
      "goal": "conversion",
      "status": "generated",
      "createdAt": "2025-11-06T...",
      "generationTimeMs": 2450,
      "aiCost": 0.0423
    },
    "variants": [
      /* 3 variants */
    ]
  }
}
```

## Verification Checklist

### Automatic Embedding Generation

- [ ] First request generates embeddings automatically
- [ ] Console shows embedding generation progress
- [ ] Subsequent requests skip embedding generation
- [ ] `/api/aie/embeddings` shows 100% completion

### Ad Generation

- [ ] 3 variants generated per request
- [ ] Different variant types (benefit, emotional, ugc, etc.)
- [ ] Headlines within character limits
- [ ] CTAs aligned with campaign goals
- [ ] Quality scores calculated (5 metrics)

### Image Analysis

- [ ] Image analyzed when URL provided
- [ ] Category/subcategory detected
- [ ] Colors and mood extracted
- [ ] Analysis cached for repeated URLs

### RAG Retrieval

- [ ] Best practices retrieved based on platform/goal
- [ ] Semantic search working (similar concepts match)
- [ ] Retrieved context included in prompts
- [ ] Retrieval logged to database

### Platform Compliance

- [ ] Meta: 40 char headlines, 125 char primary text
- [ ] Google: 30 char headlines, 90 char descriptions
- [ ] TikTok: 100 char headlines
- [ ] Platform-specific bonuses applied (emojis on Meta)

### Error Handling

- [ ] Missing required fields return 400
- [ ] Invalid platforms/goals return 400
- [ ] OpenAI API errors handled gracefully
- [ ] Database errors handled gracefully

### UI Functionality

- [ ] Form inputs work correctly
- [ ] Validation prevents empty descriptions
- [ ] Loading states shown during generation
- [ ] Success banner displays metadata
- [ ] Variant cards render all information
- [ ] Score badges use correct colors
- [ ] Error banners shown on failure

## Database Verification

### Check Records Created

```sql
-- Check ad requests
SELECT id, shop_id, platform, goal, status, generation_time_ms, ai_cost
FROM aie_ad_requests
ORDER BY created_at DESC
LIMIT 5;

-- Check variants
SELECT
  ar.platform,
  av.variant_number,
  av.variant_type,
  av.headline,
  av.predicted_score
FROM aie_ad_variants av
JOIN aie_ad_requests ar ON av.ad_request_id = ar.id
ORDER BY av.created_at DESC
LIMIT 10;

-- Check embeddings
SELECT
  COUNT(*) as total,
  COUNT(embedding) as with_embeddings
FROM aie_best_practices;

-- Check image analysis cache
SELECT image_url, category, subcategory, quality_score
FROM aie_image_analysis
ORDER BY created_at DESC
LIMIT 5;

-- Check RAG retrieval logs
SELECT
  ar.platform,
  ar.goal,
  rr.retrieved_best_practices_count,
  rr.retrieved_examples_count,
  rr.retrieval_time_ms
FROM aie_rag_retrieval_logs rr
JOIN aie_ad_requests ar ON rr.ad_request_id = ar.id
ORDER BY rr.created_at DESC
LIMIT 5;
```

## Performance Benchmarks

### Expected Timings

- **First request** (with embedding generation): 3-5 seconds
- **Subsequent requests**: 1.5-2.5 seconds
- **With image analysis**: +1 second
- **Embedding generation** (28 practices): ~3 seconds

### Expected Costs

- **Per request**: $0.04-0.06
- **With image**: +$0.01
- **Embeddings** (one-time): ~$0.003 total

### Cache Hit Rates

- **Image analysis**: ~90% (after initial analysis)
- **Text embeddings**: ~95% (for repeated queries)

## Troubleshooting

### Issue: Embeddings Not Generating

**Solution**: Check OpenAI API key in `.env.local`

### Issue: RLS Permission Denied

**Solution**: Ensure `SUPABASE_SERVICE_KEY` is set (not anon key)

### Issue: Variants All Similar

**Solution**: Check `determineVariantTypes()` logic, ensure 3 different strategies

### Issue: Quality Scores All Low

**Solution**: Review scoring weights in `variant-scorer.ts`, check best practices quality

### Issue: Image Analysis Failing

**Solution**: Ensure image URL is publicly accessible, check OpenAI Vision API limits

---

**Test Status**: Ready for end-to-end testing
**Estimated Test Time**: 15-20 minutes
**Next**: Run through all tests to verify system works as expected
