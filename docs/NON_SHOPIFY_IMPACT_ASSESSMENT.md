# Impact Assessment: Non-Shopify User Support in Thunder Text

**Date**: January 1, 2026
**Status**: Assessment Only (No Implementation)

---

## Executive Summary

Thunder Text is **moderately coupled to Shopify (60%)**, with core AI generation engines being platform-agnostic but UI/auth flows assuming Shopify. Non-Shopify users (Lightspeed, WooCommerce, manual copy/paste) would face significant friction without modifications.

**Key Finding**: The AI engines themselves don't care where product data comes from—they accept raw text and images. The barriers are in the UI flows and authentication, not the core technology.

---

## Current Architecture Overview

### Platform-Agnostic Components (Would Work)

| Component           | Location                                   | Notes                                                 |
| ------------------- | ------------------------------------------ | ----------------------------------------------------- |
| Generation API      | `/api/generate/create`                     | Accepts raw product data (title, images, text fields) |
| Thunder Text engine | `/src/lib/services/content-generator.ts`   | Works with any topic/product data                     |
| ACE Engine          | `/src/lib/aie/ad-generator.ts`             | Accepts images + text, no Shopify IDs required        |
| Form components     | `ProductDetailsForm`, `AdditionalInfoForm` | Pure React, accept free text                          |
| Email/password auth | `/src/lib/auth/auth-options.ts`            | Independent of Shopify OAuth                          |
| AI Coach            | Content Center                             | Not product-specific                                  |

### Shopify-Dependent Components (Would Break)

| Component        | Location                    | Impact                                    |
| ---------------- | --------------------------- | ----------------------------------------- |
| Product fetching | `/api/shopify/products`     | Can't list products without Shopify token |
| Product list UI  | `/stores/[shopId]/products` | Assumes Shopify as data source            |
| Write-back       | Shopify GraphQL mutations   | Can't auto-save descriptions to store     |
| Onboarding       | `/welcome`, `/install`      | Routes to Shopify OAuth                   |
| Shop context     | All dashboard pages         | Require `shop` domain parameter           |
| Webhooks         | `/api/webhooks/*`           | Shopify HMAC validation                   |

---

## User Journey Comparison

### Current Shopify User Flow

```
/welcome → Shopify OAuth → /pricing → /dashboard
    ↓
Select product from list → Generate → Auto-save to Shopify
```

### Non-Shopify User Flow (If Supported)

```
/welcome → "I don't use Shopify" → Email signup → /pricing → /dashboard
    ↓
Manual input (title, images, details) → Generate → Copy/paste to their platform
```

---

## Feature-by-Feature Impact Analysis

### 1. Thunder Text (Product Descriptions)

| Aspect            | Status         | Notes                                        |
| ----------------- | -------------- | -------------------------------------------- |
| Generation        | ✅ Works       | API accepts raw text + images                |
| Product Selection | ❌ Broken      | No product list without Shopify              |
| Output            | ⚠️ Manual only | No API to push to Lightspeed/other platforms |
| **Effort to fix** | Medium         | Need manual input form + copy button         |

### 2. ACE Engine (Ad Copy)

| Aspect            | Status          | Notes                                       |
| ----------------- | --------------- | ------------------------------------------- |
| Generation        | ✅ Works        | Same as Thunder Text                        |
| Image Source      | ⚠️ Needs upload | Currently pulls from Shopify                |
| Output            | ✅ Works        | Already designed for copy/paste to Facebook |
| **Effort to fix** | Low             | Add image upload component                  |

### 3. AI Coach

| Aspect             | Status     | Notes                                |
| ------------------ | ---------- | ------------------------------------ |
| Core Functionality | ✅ Works   | Not tied to Shopify products         |
| Store Context      | ⚠️ Reduced | Can't analyze store data without API |
| **Effort to fix**  | None       | Works for basic use                  |

### 4. Dashboard & Analytics

| Aspect            | Status    | Notes                             |
| ----------------- | --------- | --------------------------------- |
| Stats display     | ❌ Broken | Assumes Shopify shop context      |
| Usage tracking    | ⚠️ Works  | Tied to user account, not Shopify |
| **Effort to fix** | Medium    | Need alternative shop identifier  |

### 5. Prompt Templates

| Aspect            | Status    | Notes                        |
| ----------------- | --------- | ---------------------------- |
| Access            | ❌ Broken | Requires shop_id in database |
| Customization     | ❌ Broken | Same reason                  |
| **Effort to fix** | Medium    | Need user-level templates    |

---

## Database Schema Impact

### Tables Requiring Changes

| Table                  | Current Constraint                      | Required Change                           |
| ---------------------- | --------------------------------------- | ----------------------------------------- |
| `shops`                | `shopify_access_token` assumed required | Make nullable, add `platform_type` column |
| `product_descriptions` | `shop_id` FK required                   | Add `user_id` as alternative              |
| `category_templates`   | `store_id` FK required                  | Add `user_id` as alternative              |
| `usage_stats`          | `shop_id` FK required                   | Works if shop record exists               |

### Proposed Schema Additions

```sql
-- Add platform type to distinguish Shopify vs manual vs other
ALTER TABLE shops ADD COLUMN platform_type TEXT DEFAULT 'shopify';
-- Values: 'shopify', 'lightspeed', 'woocommerce', 'manual', 'other'

-- Make Shopify token optional for non-Shopify users
ALTER TABLE shops ALTER COLUMN shopify_access_token DROP NOT NULL;
```

---

## Effort Estimates

### Option A: Minimal Viable Support (Copy/Paste Workflow)

| Task                       | Effort       | Description                            |
| -------------------------- | ------------ | -------------------------------------- |
| Manual product input form  | 2-3 days     | Reuse existing form components         |
| Image upload component     | 1 day        | Allow users to upload product images   |
| Skip Shopify in onboarding | 1 day        | "I don't use Shopify" button           |
| Copy-to-clipboard output   | 0.5 day      | Easy copy of generated text            |
| Database schema changes    | 0.5 day      | Add platform_type, make token nullable |
| **Total MVP**              | **5-6 days** |                                        |

### Option B: Full Platform Integrations

| Task                           | Effort         | Description                       |
| ------------------------------ | -------------- | --------------------------------- |
| Lightspeed OAuth + API         | 3-5 days       | Full product sync                 |
| WooCommerce integration        | 3-5 days       | REST API integration              |
| BigCommerce integration        | 3-5 days       | GraphQL API integration           |
| Platform-agnostic product sync | 2-3 days       | Abstract sync layer               |
| Multi-platform write-back      | 3-4 days       | Save descriptions to any platform |
| **Total Full**                 | **14-22 days** | Per platform                      |

---

## Risk Analysis

### If We Do Nothing (Remain Shopify-Only)

| Risk                    | Likelihood | Impact                           |
| ----------------------- | ---------- | -------------------------------- |
| Lost market opportunity | Medium     | Miss non-Shopify merchants       |
| Competitor advantage    | Low        | Others may not have this either  |
| Customer complaints     | Low        | Clear positioning as Shopify app |

### If We Add Manual Entry Support

| Risk                    | Likelihood | Impact                                    |
| ----------------------- | ---------- | ----------------------------------------- |
| Lower value proposition | Medium     | Copy/paste less compelling than auto-sync |
| Support burden          | Low        | Manual users may need more help           |
| Feature parity issues   | Medium     | Non-Shopify users get fewer features      |

### If We Add Full Platform Integrations

| Risk               | Likelihood | Impact                              |
| ------------------ | ---------- | ----------------------------------- |
| Development time   | High       | Significant investment              |
| Maintenance burden | High       | Multiple APIs to maintain           |
| Testing complexity | High       | Need test accounts on each platform |

---

## Recommendations

### Short-Term (If Pursuing Non-Shopify Support)

1. **Add "I don't use Shopify" option** to `/welcome` page
2. **Create manual product entry form** reusing existing components
3. **Make `shopify_access_token` nullable** in database
4. **Add `platform_type` column** to `shops` table
5. **Add prominent copy button** on generation results

### Long-Term (If Market Demands It)

1. Abstract product sync layer into plugin architecture
2. Add CSV import for bulk product entry
3. Consider Lightspeed as first non-Shopify integration (popular with boutiques)
4. Evaluate WooCommerce (largest market share globally)

---

## Conclusion

**Bottom Line**: Thunder Text's core AI engines are platform-agnostic and could support non-Shopify users with approximately **5-6 days of development work** for a basic copy/paste workflow. Full platform integrations (Lightspeed, WooCommerce) would require **2-3 weeks each**.

**Trade-offs to Consider**:

| Approach            | Pros                     | Cons                                 |
| ------------------- | ------------------------ | ------------------------------------ |
| Copy/paste workflow | Simple, fast to build    | Lower value prop, more user friction |
| Full integrations   | High value, seamless UX  | Complex, ongoing maintenance         |
| Stay Shopify-only   | Focused, less complexity | Smaller addressable market           |

**No changes are required** if the decision is to remain Shopify-focused. The current architecture works well for Shopify merchants.

---

## Appendix: Key Files Reference

### Authentication

- `/src/lib/auth/auth-options.ts` - NextAuth configuration
- `/src/lib/shopify-auth.ts` - Shopify OAuth flow

### Generation

- `/src/app/api/generate/create/route.ts` - Main generation endpoint
- `/src/lib/services/content-generator.ts` - Thunder Text engine
- `/src/lib/aie/ad-generator.ts` - ACE Engine

### Product Management

- `/src/app/api/shopify/products/route.ts` - Shopify product fetching
- `/src/components/ProductDetailsForm.tsx` - Product input form
- `/src/components/AdditionalInfoForm.tsx` - Additional details form

### Database

- `/supabase/migrations/003_create_shops_table.sql` - Shops schema
- `/supabase/migrations/018_facebook_ads_integration.sql` - Ads schema
