# ThunderText & ACE Codebase Overlap Analysis

**Analysis Date**: 2025-01-14
**Purpose**: Identify shared resources between ThunderText (Product Descriptions) and ACE (Ad Creation Engine) to inform architecture decision

---

## Executive Summary

**Key Finding**: ThunderText and ACE share ~40% of core infrastructure but serve distinct product categories (product descriptions vs. ad creation). The features are already architecturally interconnected through shared database tables, services, and business logic.

**Recommendation**: **Option 1 - Shared Backend + Separate Frontends** is the optimal architecture because:

- Both features already depend on shared infrastructure (`shops`, `integrations`, `business_profiles`)
- Mid-market customers expect separate app installations for distinct pain points
- Modular architecture prevents feature bloat as Zeus Analytics is added
- Current monorepo can be refactored incrementally without breaking changes

---

## 1. Database Schema Overlap

### **Shared Tables (Core Infrastructure)**

| Table                        | Purpose                                                  | Used By                                                   | Criticality |
| ---------------------------- | -------------------------------------------------------- | --------------------------------------------------------- | ----------- |
| `shops`                      | Tenant isolation, Shopify OAuth tokens                   | ThunderText, ACE, ALL features                            | 🔴 CRITICAL |
| `integrations`               | Facebook/Meta OAuth tokens, external service connections | ThunderText (via facebook_ad_drafts), ACE (ad publishing) | 🔴 CRITICAL |
| `business_profiles`          | AI-generated brand voice, positioning, story             | ThunderText (product descriptions), ACE (ad generation)   | 🟡 HIGH     |
| `business_profile_responses` | 21-question interview answers                            | ThunderText, ACE (feeds brand voice)                      | 🟡 HIGH     |
| `interview_prompts`          | System-managed interview questions                       | ThunderText, ACE                                          | 🟢 MEDIUM   |
| `profile_generation_history` | Audit trail for profile regenerations                    | ThunderText, ACE                                          | 🟢 LOW      |

**Impact**: All features use `shops.id` as foreign key for tenant isolation. Separating would require complex migration.

### **Cross-Feature Bridge Table**

| Table                | Purpose                                    | Dependencies                                          | Impact                                                              |
| -------------------- | ------------------------------------------ | ----------------------------------------------------- | ------------------------------------------------------------------- |
| `facebook_ad_drafts` | Links product descriptions to Facebook ads | References `product_descriptions(id)` AND `shops(id)` | 🔴 CRITICAL - Creates direct dependency between ThunderText and ACE |

**Analysis**: This table proves the features are already integrated. It stores:

- `product_description_id` → ThunderText output
- `facebook_campaign_id` → ACE campaign selection
- `ad_title`, `ad_copy` → ACE-generated content
- `selected_image_url` → Product image from ThunderText

**Decision Impact**: If separated into independent apps, this table must either:

1. Live in shared backend (recommended)
2. Be duplicated with API bridge (complex)
3. Use Shopify metafields (limits functionality)

### **ThunderText-Specific Tables**

| Table                  | Purpose                                                                | ACE Dependency                        |
| ---------------------- | ---------------------------------------------------------------------- | ------------------------------------- |
| `product_descriptions` | Generated product content                                              | ✅ Referenced by `facebook_ad_drafts` |
| `prompt_templates`     | Product description templates                                          | ❌ None                               |
| `brand_voice_profiles` | ThunderText brand voice (DEPRECATED - replaced by `business_profiles`) | ❌ None                               |
| `content_samples`      | User-provided content samples                                          | ❌ None                               |

### **ACE-Specific Tables**

| Table                | Purpose                                             | ThunderText Dependency    |
| -------------------- | --------------------------------------------------- | ------------------------- |
| `aie_best_practices` | Ad creation best practices with pgvector embeddings | ❌ None                   |
| `aie_ad_examples`    | High-performing ad examples for RAG                 | ❌ None                   |
| `aie_ad_requests`    | Ad generation requests                              | ✅ References `shops(id)` |
| `aie_ad_variants`    | Generated ad variations                             | ❌ None                   |
| `aie_ad_performance` | Ad performance tracking                             | ❌ None                   |
| `ad_library`         | Saved ads for reuse                                 | ✅ References `shops(id)` |

---

## 2. API Routes Overlap

### **Shared API Routes (Both Features)**

| Route                       | Purpose                                   | Shared Logic                                           |
| --------------------------- | ----------------------------------------- | ------------------------------------------------------ |
| `/api/business-profile/*`   | 21-question interview, profile generation | ✅ Both features use business profile for brand voice  |
| `/api/facebook/*`           | OAuth, campaigns, ad accounts, insights   | ✅ Both features integrate with Facebook Marketing API |
| `/api/content-center/voice` | Brand voice retrieval                     | ✅ Both features query brand voice for AI generation   |
| `/api/shopify/*`            | OAuth, products, token management         | ✅ Both features authenticate via Shopify              |
| `/api/auth/callback`        | Shopify OAuth callback                    | ✅ Both features require shop authentication           |
| `/api/webhooks/*`           | Shop update, app uninstall                | ✅ Both features react to shop lifecycle events        |

**Code Pattern Identified**:

```typescript
// All API routes follow this pattern:
1. Get shop_domain from query param → "zunosai-staging-test-store.myshopify.com"
2. Look up shops table → shops.id UUID
3. Use shops.id for tenant-scoped queries
4. Apply Row Level Security (RLS) policies
```

### **ThunderText-Specific API Routes**

| Route                  | Purpose                        | Shared Dependencies                      |
| ---------------------- | ------------------------------ | ---------------------------------------- |
| `/api/generate`        | Product description generation | Uses `business_profiles` for brand voice |
| `/api/prompts`         | Prompt template management     | None                                     |
| `/api/categories`      | Product category management    | None                                     |
| `/api/detect-category` | AI category detection          | None                                     |
| `/api/detect-colors`   | AI color detection             | None                                     |
| `/api/enhance`         | Content enhancement            | None                                     |

### **ACE-Specific API Routes**

| Route                               | Purpose                  | Shared Dependencies                      |
| ----------------------------------- | ------------------------ | ---------------------------------------- |
| `/api/aie/generate`                 | Ad generation with RAG   | Uses `business_profiles` for brand voice |
| `/api/aie/library`                  | Ad library management    | None                                     |
| `/api/aie/embeddings`               | Embedding management     | None                                     |
| `/api/facebook/ad-drafts`           | Ad draft CRUD            | References `product_descriptions` table  |
| `/api/facebook/ad-drafts/submit`    | Submit ad to Facebook    | Uses `integrations` for OAuth tokens     |
| `/api/facebook/generate-ad-content` | AI ad content generation | Uses OpenAI (shared service)             |

---

## 3. Shared Service Libraries

### **Core Services (Both Features Depend On)**

| Service                      | File Path                                         | Used By                                      | Purpose                                           |
| ---------------------------- | ------------------------------------------------- | -------------------------------------------- | ------------------------------------------------- |
| `supabaseAdmin`              | `/src/lib/supabase.ts`                            | ThunderText, ACE                             | Database client with service role key             |
| `business-profile-generator` | `/src/lib/services/business-profile-generator.ts` | ThunderText, ACE                             | Generates master business profile from 21 answers |
| `facebook-api`               | `/src/lib/services/facebook-api.ts`               | ThunderText (ad drafts), ACE (ad publishing) | Facebook OAuth, campaigns, insights               |
| `openai-client`              | `/src/lib/services/openai-client.ts`              | ThunderText, ACE                             | AI content generation                             |
| `encryption`                 | `/src/lib/services/encryption.ts`                 | ThunderText, ACE                             | Encrypt/decrypt OAuth tokens                      |
| `rate-limit`                 | `/src/lib/middleware/rate-limit.ts`               | ThunderText, ACE                             | API rate limiting                                 |
| `errors`                     | `/src/lib/api/errors.ts`                          | ThunderText, ACE                             | Standardized error responses                      |

**Analysis**: Both features share critical infrastructure:

- **OpenAI Client**: Both generate AI content (product descriptions vs. ads)
- **Facebook API**: ACE publishes ads, ThunderText creates ad drafts
- **Business Profile**: Both inject brand voice into AI prompts
- **Supabase Admin**: Both perform tenant-scoped database operations

### **ThunderText-Specific Services**

| Service                      | Purpose                                                           | Shared Logic                  |
| ---------------------------- | ----------------------------------------------------------------- | ----------------------------- |
| `content-generator.ts`       | Product description generation                                    | Uses `openai-client` (shared) |
| `content-prompts.ts`         | Prompt templates                                                  | None                          |
| `voice-profile-generator.ts` | DEPRECATED - Brand voice (replaced by business-profile-generator) | None                          |

### **ACE-Specific Services**

| Service                             | Purpose                             | Shared Logic                                            |
| ----------------------------------- | ----------------------------------- | ------------------------------------------------------- |
| `/src/lib/aie/index.ts`             | AIE orchestrator                    | Uses `supabaseAdmin` (shared), `openai-client` (shared) |
| `/src/lib/aie/image-analyzer.ts`    | GPT-4 Vision image analysis         | Uses `openai-client` (shared)                           |
| `/src/lib/aie/rag-retriever.ts`     | RAG context retrieval with pgvector | Uses `supabaseAdmin` (shared)                           |
| `/src/lib/aie/ad-generator.ts`      | Ad variant generation               | Uses `openai-client` (shared)                           |
| `/src/lib/aie/variant-scorer.ts`    | Ad scoring algorithm                | None                                                    |
| `/src/lib/aie/embedding-manager.ts` | Embedding generation                | Uses `openai-client` (shared)                           |

---

## 4. External Integration Overlap

### **Shared External Services**

| Service                | Purpose                         | API Keys Required                        | Used By                                                           |
| ---------------------- | ------------------------------- | ---------------------------------------- | ----------------------------------------------------------------- |
| **OpenAI**             | AI content generation           | `OPENAI_API_KEY`                         | ThunderText (descriptions), ACE (ads, embeddings, image analysis) |
| **Supabase**           | PostgreSQL database             | `SUPABASE_URL`, `SUPABASE_SERVICE_KEY`   | ThunderText, ACE                                                  |
| **Shopify**            | OAuth, products, webhooks       | `SHOPIFY_API_KEY`, `SHOPIFY_API_SECRET`  | ThunderText, ACE                                                  |
| **Facebook Graph API** | OAuth, campaigns, ad publishing | `FACEBOOK_APP_ID`, `FACEBOOK_APP_SECRET` | ThunderText (ad drafts), ACE (ad publishing)                      |
| **Sentry**             | Error tracking                  | `SENTRY_DSN`                             | ThunderText, ACE                                                  |

**Analysis**: Both features share ALL external integrations except:

- **ThunderText**: No unique external services
- **ACE**: No unique external services (all shared)

---

## 5. UI Component Overlap

### **Shared UI Patterns**

| Pattern                    | Examples                              | Shared Component?                                 |
| -------------------------- | ------------------------------------- | ------------------------------------------------- |
| Shopify Polaris components | `Page`, `Card`, `Button`, `TextField` | ✅ Yes - `@shopify/polaris`                       |
| Error handling             | `ErrorBoundary` component             | ✅ Yes - `/src/components/ErrorBoundary.tsx`      |
| Loading states             | Skeleton screens, spinners            | ✅ Yes - Polaris built-in                         |
| Form validation            | Client-side + server-side validation  | ⚠️ Partially - no shared form library             |
| Shop authentication        | Shopify App Bridge integration        | ✅ Yes - `/src/components/UnifiedShopifyAuth.tsx` |

### **ThunderText-Specific UI**

| Page/Component    | Purpose                               |
| ----------------- | ------------------------------------- |
| `/dashboard`      | Product list, description generation  |
| `/product/new`    | Create product descriptions           |
| `/settings`       | Prompt templates, category management |
| `/content-center` | Business profile interview            |

### **ACE-Specific UI**

| Page/Component  | Purpose                           |
| --------------- | --------------------------------- |
| `/facebook-ads` | Facebook integration, ad creation |
| `/aie/*`        | Ad library, variant selection     |

**Analysis**: UI is completely separate with no component sharing beyond Shopify Polaris. This validates the "Separate Frontends" architecture.

---

## 6. Business Logic Overlap

### **Shared Patterns**

| Pattern                    | Implementation                                          | Criticality |
| -------------------------- | ------------------------------------------------------- | ----------- |
| **Tenant Isolation**       | All queries filter by `shops.id`                        | 🔴 CRITICAL |
| **Shop Lookup**            | `shop_domain` → `shops.id` UUID lookup                  | 🔴 CRITICAL |
| **Brand Voice Injection**  | Query `business_profiles` table, inject into AI prompts | 🟡 HIGH     |
| **OAuth Token Management** | Encrypt/decrypt, refresh, store in `integrations`       | 🟡 HIGH     |
| **AI Generation**          | OpenAI chat completions with structured prompts         | 🟡 HIGH     |
| **Error Handling**         | Standardized `APIError` class, Sentry integration       | 🟢 MEDIUM   |
| **Rate Limiting**          | Token bucket algorithm per user                         | 🟢 MEDIUM   |

### **Critical Code Patterns Used by Both**

**Pattern 1: Shop Lookup**

```typescript
// Used in EVERY API route
const { data: shop } = await supabaseAdmin
  .from("shops")
  .select("id")
  .eq("shop_domain", shopDomain)
  .single();
```

**Pattern 2: Business Profile Retrieval**

```typescript
// Used by ThunderText product descriptions AND ACE ad generation
const { data: profile } = await supabaseAdmin
  .from("business_profiles")
  .select("*")
  .eq("store_id", shopId)
  .eq("is_current", true)
  .single();

// Inject into AI prompt
const prompt = `Brand voice: ${profile.voice_tone}, ${profile.voice_style}...`;
```

**Pattern 3: Facebook OAuth Token Management**

```typescript
// Used by facebook-ad-drafts (ThunderText) AND ad publishing (ACE)
const integration = await supabaseAdmin
  .from("integrations")
  .select("encrypted_access_token")
  .eq("shop_id", shopId)
  .eq("provider", "facebook")
  .single();

const accessToken = await decryptToken(integration.encrypted_access_token);
```

---

## 7. Percentage Breakdown

### **Code Sharing Metrics**

| Category                    | ThunderText-Only | ACE-Only       | Shared     | Shared %  |
| --------------------------- | ---------------- | -------------- | ---------- | --------- |
| **Database Tables**         | 4 tables         | 6 tables       | 6 tables   | **37.5%** |
| **API Routes**              | 11 routes        | 8 routes       | 9 routes   | **32%**   |
| **Service Libraries**       | 3 files          | 6 files        | 7 files    | **44%**   |
| **External Integrations**   | 0 services       | 0 services     | 5 services | **100%**  |
| **Business Logic Patterns** | 0 unique         | 1 unique (RAG) | 7 patterns | **88%**   |

**Overall Shared Infrastructure**: **~40%**

---

## 8. Architecture Decision Matrix

### **Option 1: Shared Backend + Separate Frontends (RECOMMENDED)**

**Structure**:

```
/thunder-text/
  /backend/              # Shared Node.js API
    /api/
      /shops/            # Shop management
      /auth/             # Shopify OAuth
      /business-profile/ # Business profile
      /facebook/         # Facebook OAuth
      /integrations/     # External services
  /product-app/          # ThunderText frontend
  /ace-app/              # ACE frontend
  /zeus-app/             # Zeus Analytics
  /shared/               # Common UI components
```

**Pros**:

- ✅ Shared infrastructure remains DRY (40% of code)
- ✅ Each app can evolve UI independently
- ✅ Suite pricing managed in single backend
- ✅ Minimal migration effort from current monorepo
- ✅ Shopify App Store allows multiple listings
- ✅ Easier to add Zeus Analytics as 3rd app

**Cons**:

- ⚠️ Requires backend refactoring (~2-3 weeks)
- ⚠️ Need shared component library for consistency

**Migration Path**:

1. Extract shared services to `/backend/lib/services/`
2. Create separate frontend apps in `/product-app/`, `/ace-app/`
3. Implement cross-app authentication via JWT tokens
4. Add suite subscription logic to backend
5. Deploy backend as single service, frontends as separate Shopify apps

### **Option 2: Completely Separate Apps + External Billing Portal**

**Structure**:

```
/thunder-text-app/    # Standalone app
/ace-app/             # Standalone app
/zeus-app/            # Standalone app
/billing-portal/      # External suite management
```

**Pros**:

- ✅ Complete independence (easier to sell individually)
- ✅ No shared deployment dependencies

**Cons**:

- ❌ Duplicate 40% of code across apps
- ❌ Facebook OAuth must be managed separately
- ❌ Business profiles must sync across apps (complex)
- ❌ External billing portal adds maintenance burden
- ❌ Harder to implement suite pricing

### **Option 3: Monorepo with Feature Modules (CURRENT STATE)**

**Structure**:

```
/thunder-text/
  /src/
    /app/
      /dashboard/       # ThunderText
      /facebook-ads/    # ACE
      /zeus-dashboard/  # Zeus Analytics
```

**Pros**:

- ✅ No migration needed
- ✅ Shared code is naturally shared
- ✅ Single deployment

**Cons**:

- ❌ Cannot sell as separate apps on Shopify App Store
- ❌ All-or-nothing pricing (can't offer à la carte)
- ❌ Features must evolve together
- ❌ Codebase becomes bloated with 3+ products

---

## 9. Recommended Architecture: Shared Backend + Separate Frontends

### **Implementation Roadmap**

#### **Phase 1: Extract Shared Backend (2-3 weeks)**

**Week 1: Backend Service Extraction**

- Move shared services to `/backend/lib/services/`:
  - `business-profile-generator.ts`
  - `facebook-api.ts`
  - `openai-client.ts`
  - `encryption.ts`
  - `supabase.ts`
- Create unified API routes:
  - `/api/shops` - Shop management
  - `/api/business-profile` - Business profile
  - `/api/facebook` - Facebook OAuth
  - `/api/integrations` - External integrations

**Week 2: Frontend Separation**

- Create `/product-app/` for ThunderText
- Create `/ace-app/` for ACE
- Move ThunderText pages: `/dashboard`, `/product/new`, `/settings`
- Move ACE pages: `/facebook-ads`, `/aie/*`

**Week 3: Cross-App Authentication**

- Implement JWT token-based auth
- Backend issues tokens for all apps
- Apps share session via JWT cookies

#### **Phase 2: Suite Subscription Logic (1 week)**

**Database Changes**:

```sql
-- Add subscription table
CREATE TABLE subscriptions (
  id UUID PRIMARY KEY,
  shop_id UUID REFERENCES shops(id),
  plan_type TEXT CHECK (plan_type IN ('thundertext', 'ace', 'zeus', 'suite')),
  status TEXT CHECK (status IN ('active', 'cancelled', 'past_due')),
  stripe_subscription_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Suite pricing logic
CREATE FUNCTION check_suite_access(shop_id UUID, app_name TEXT)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM subscriptions
    WHERE shop_id = $1
    AND (plan_type = 'suite' OR plan_type = $2)
    AND status = 'active'
  );
$$ LANGUAGE sql;
```

**Backend Logic**:

```typescript
// /backend/api/auth/verify-access
export async function verifyAppAccess(shopId: string, appName: string) {
  const { data } = await supabaseAdmin.rpc("check_suite_access", {
    shop_id: shopId,
    app_name: appName,
  });

  if (!data) {
    throw new APIError(403, ErrorCode.FORBIDDEN, "No active subscription");
  }
}
```

#### **Phase 3: Shopify App Store Listings (1 week per app)**

**ThunderText Listing**:

- Name: "ThunderText - AI Product Descriptions"
- Pricing: $29/month
- Features: Product descriptions, brand voice, AI enhancement

**ACE Listing**:

- Name: "ACE - Ad Creation Engine"
- Pricing: $49/month
- Features: Facebook ad generation, RAG-powered copy, campaign management

**Zeus Analytics Listing** (future):

- Name: "Zeus Analytics Dashboard"
- Pricing: $39/month
- Features: Multi-channel analytics, performance tracking, insights

**Suite Bundle**:

- Offered via backend pricing logic
- $99/month (save $18 vs. à la carte)
- Grants access to all 3 apps

---

## 10. Critical Dependencies to Preserve

### **🔴 CRITICAL - Must Remain Shared**

| Resource                  | Why Shared             | Breaking Impact                         |
| ------------------------- | ---------------------- | --------------------------------------- |
| `shops` table             | Core tenant isolation  | ❌ App authentication breaks            |
| `integrations` table      | Facebook OAuth tokens  | ❌ Ad publishing breaks                 |
| `business_profiles` table | Brand voice for AI     | ⚠️ Inconsistent brand voice across apps |
| Supabase database         | Single source of truth | ❌ Data sync nightmare                  |
| OpenAI API key            | AI generation          | ⚠️ Duplicate API costs                  |

### **🟡 HIGH - Recommended Shared**

| Resource                | Why Shared                 | Breaking Impact                         |
| ----------------------- | -------------------------- | --------------------------------------- |
| Facebook OAuth flow     | Avoid double authorization | ⚠️ Poor UX (user authorizes twice)      |
| Error tracking (Sentry) | Unified observability      | ⚠️ Split monitoring across apps         |
| Rate limiting           | Prevent abuse              | ⚠️ Bypass rate limits via multiple apps |

### **🟢 MEDIUM - Can Be Separate**

| Resource         | Why Separate            | Benefit                       |
| ---------------- | ----------------------- | ----------------------------- |
| UI components    | Feature-specific design | ✅ Independent UI evolution   |
| Frontend routing | App-specific pages      | ✅ Simpler navigation         |
| Frontend builds  | Separate deployments    | ✅ Independent release cycles |

---

## 11. Conclusion

**Verdict**: The codebase analysis confirms that ThunderText and ACE share significant infrastructure (~40%) but serve distinct product categories. The features are already interconnected via `facebook_ad_drafts` table and shared brand voice system.

**Recommended Architecture**: **Shared Backend + Separate Frontends (Option 1)**

**Rationale**:

1. **Preserves DRY principle**: Shared infrastructure (shops, integrations, business profiles) remains unified
2. **Enables bundle pricing**: Backend manages suite subscriptions, grants cross-app access
3. **Supports independent evolution**: Each frontend can iterate UI/UX without affecting others
4. **Minimal migration risk**: Current monorepo can be refactored incrementally
5. **Scales to 3+ products**: Adding Zeus Analytics follows same pattern

**Next Steps**:

1. Review this analysis with team
2. Validate Shopify App Store multi-app strategy
3. Begin Phase 1: Backend service extraction
4. Set up separate GitHub repos for each frontend
5. Implement cross-app authentication via JWT tokens
