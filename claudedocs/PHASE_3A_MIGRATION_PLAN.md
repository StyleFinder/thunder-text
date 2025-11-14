# Phase 3A: ThunderText Route Migration Plan

**Status**: 🟡 **IN PROGRESS**
**Date Started**: November 14, 2025

---

## 🎯 Migration Strategy

### Approach: Incremental Copy & Update

Instead of moving files (which breaks the current app), we'll **copy** routes to the new structure and update imports progressively. This allows both apps to coexist during migration.

---

## 📋 Migration Checklist

### Phase 3A.1: Foundation (Priority 1) 🔴
- [ ] Copy root layout with Polaris/Shopify providers
- [ ] Copy component dependencies (PolarisProvider, AppLayout, etc.)
- [ ] Copy global styles
- [ ] Copy lib utilities to shared packages
- [ ] Test basic app renders

### Phase 3A.2: Core Pages (Priority 1) 🔴
- [ ] `/` - Homepage/Dashboard
- [ ] `/dashboard` - Main dashboard
- [ ] `/products` - Product listing
- [ ] `/create` - Create description
- [ ] `/enhance` - Enhance description

### Phase 3A.3: Content Features (Priority 2) 🟡
- [ ] `/content-center` - Content management
- [ ] `/trends` - Content trends
- [ ] `/help` - Help page

### Phase 3A.4: Onboarding & Settings (Priority 2) 🟡
- [ ] `/checklist` - Onboarding checklist
- [ ] `/onboarding` - Onboarding flow
- [ ] `/settings` - User settings

### Phase 3A.5: Auth & Utilities (Priority 2) 🟡
- [ ] `/embedded` - Shopify embedded frame
- [ ] `/install` - App installation
- [ ] `/get-token`, `/store-token`, `/token-display` - Token utilities

### Phase 3A.6: API Routes (Priority 1) 🔴
- [ ] `/api/products/*` - Product CRUD
- [ ] `/api/business-profile/*` - Business profile
- [ ] `/api/content-center/*` - Content management
- [ ] `/api/shopify/*` - Shopify integration
- [ ] `/api/auth/*` - Authentication
- [ ] Add `requireApp('thundertext')` middleware to all routes

### Phase 3A.7: Components (Priority 1) 🔴
- [ ] App-specific components in `src/app/components/`
- [ ] Shared components → `packages/shared-ui/`
- [ ] Update all component imports

### Phase 3A.8: Testing (Priority 1) 🔴
- [ ] Dev server starts successfully
- [ ] All pages render without errors
- [ ] API routes protected with app middleware
- [ ] Database queries filtered by app_name
- [ ] Authentication works correctly

---

## 🗂️ File Inventory

### Pages to Migrate (ThunderText)

**Core Pages** (5):
```
src/app/page.tsx                    → packages/thundertext-app/src/app/page.tsx
src/app/dashboard/page.tsx          → packages/thundertext-app/src/app/dashboard/page.tsx
src/app/products/page.tsx           → packages/thundertext-app/src/app/products/page.tsx
src/app/create/page.tsx             → packages/thundertext-app/src/app/create/page.tsx
src/app/enhance/page.tsx            → packages/thundertext-app/src/app/enhance/page.tsx
```

**Content Features** (3):
```
src/app/content-center/layout.tsx   → packages/thundertext-app/src/app/content-center/layout.tsx
src/app/content-center/page.tsx     → packages/thundertext-app/src/app/content-center/page.tsx
src/app/trends/page.tsx             → packages/thundertext-app/src/app/trends/page.tsx
src/app/help/page.tsx               → packages/thundertext-app/src/app/help/page.tsx
```

**Onboarding** (3):
```
src/app/checklist/page.tsx          → packages/thundertext-app/src/app/checklist/page.tsx
src/app/onboarding/page.tsx         → packages/thundertext-app/src/app/onboarding/page.tsx
src/app/settings/page.tsx           → packages/thundertext-app/src/app/settings/page.tsx
```

**Auth & Utilities** (6):
```
src/app/embedded/page.tsx           → packages/thundertext-app/src/app/embedded/page.tsx
src/app/install/page.tsx            → packages/thundertext-app/src/app/install/page.tsx
src/app/get-token/page.tsx          → packages/thundertext-app/src/app/get-token/page.tsx
src/app/store-token/page.tsx        → packages/thundertext-app/src/app/store-token/page.tsx
src/app/token-display/page.tsx      → packages/thundertext-app/src/app/token-display/page.tsx
src/app/embed/page.tsx              → packages/thundertext-app/src/app/embed/page.tsx
```

**Legal** (1):
```
src/app/privacy/page.tsx            → packages/thundertext-app/src/app/privacy/page.tsx
```

**Total Pages**: 18

### API Routes to Migrate (ThunderText)

**Product APIs** (~10 routes):
```
src/app/api/products/*              → packages/thundertext-app/src/app/api/products/*
src/app/api/detect-colors/*         → packages/thundertext-app/src/app/api/detect-colors/*
```

**Business Profile APIs** (~7 routes):
```
src/app/api/business-profile/*      → packages/thundertext-app/src/app/api/business-profile/*
```

**Content Center APIs** (~10 routes):
```
src/app/api/content-center/*        → packages/thundertext-app/src/app/api/content-center/*
```

**Shopify APIs** (~5 routes):
```
src/app/api/shopify/*               → packages/thundertext-app/src/app/api/shopify/*
src/app/api/shop-sizes/*            → packages/thundertext-app/src/app/api/shop-sizes/*
```

**Auth APIs** (if any):
```
src/app/api/auth/*                  → packages/thundertext-app/src/app/api/auth/*
```

**Total API Routes**: ~32

### Components to Migrate

**App Components** (src/app/components/):
- PolarisProvider.tsx
- AppLayout.tsx
- UnifiedShopifyAuth.tsx
- ServiceWorkerCleanup.tsx
- Navigation components
- Product-specific components

**Decision**:
- Shopify/Polaris providers → May be shared → `packages/shared-ui/`
- Product-specific components → `packages/thundertext-app/src/components/`

---

## 🔧 Import Updates Required

### Before (Current):
```typescript
import { supabase } from '@/lib/supabase'
import { generateDescription } from '@/lib/openai'
import { Button } from '@/components/ui/button'
```

### After (Migrated):
```typescript
import { supabase, generateDescription } from '@thunder-text/shared-backend'
import { Button } from '@thunder-text/shared-ui/components/button'
import { ProductCard } from '@/components/product-card'  // App-specific
```

---

## 🛡️ Middleware Integration

All ThunderText API routes must add middleware:

### Before:
```typescript
export async function GET(request: NextRequest) {
  // No auth check
  const products = await getProducts()
  return NextResponse.json(products)
}
```

### After:
```typescript
import { requireApp } from '@thunder-text/shared-backend'

export async function GET(request: NextRequest) {
  const result = await requireApp('thundertext')(request)

  if (result instanceof NextResponse) {
    return result  // 401 or 403 error
  }

  const claims = result  // JWTClaims
  const products = await getProducts(claims.shopId)
  return NextResponse.json(products)
}
```

---

## 📦 Shared Package Extraction Strategy

### Move to `@thunder-text/shared-backend`:
- [x] Supabase client (Phase 1)
- [x] PostgreSQL client (Phase 1)
- [x] OpenAI client (Phase 1)
- [x] JWT auth (Phase 2)
- [x] API middleware (Phase 2)

### Move to `@thunder-text/shared-ui`:
- [ ] PolarisProvider (if used by both apps)
- [ ] Shopify App Bridge wrapper
- [ ] Common UI components (Button, Card, etc.)
- [ ] Common hooks (useDebounce, etc.)
- [ ] Utility functions (cn, formatters, etc.)

### Keep in `@thunder-text/thundertext-app`:
- [ ] Product description specific components
- [ ] Writing coach components
- [ ] Content trends components
- [ ] ThunderText-specific pages

---

## 🧪 Testing Strategy

### Local Development:
```bash
# Test ThunderText app
cd packages/thundertext-app
npm run dev  # Should start on port 3050

# Visit pages
open http://localhost:3050
open http://localhost:3050/dashboard
open http://localhost:3050/products
open http://localhost:3050/create
```

### API Testing:
```bash
# Test with JWT token
curl -H "Authorization: Bearer <token>" http://localhost:3050/api/products

# Should return 403 for ACE token
curl -H "Authorization: Bearer <ace-token>" http://localhost:3050/api/products
```

### Database Testing:
```sql
-- Verify RLS filtering
SELECT * FROM product_descriptions WHERE app_name = 'thundertext';

-- Should only return thundertext rows when JWT app = 'thundertext'
```

---

## ⚠️ Risk Mitigation

### Risks:
1. **Breaking Current App**: Copying instead of moving prevents this
2. **Import Path Errors**: Use TypeScript strict mode to catch
3. **Missing Dependencies**: Package.json in each app lists all deps
4. **Middleware Bypass**: Comprehensive testing of all API routes
5. **Database Leakage**: RLS policies already in place (Phase 2)

### Mitigation:
- Keep original app intact during migration
- Test each section before proceeding
- Use TypeScript to catch import errors
- Comprehensive middleware testing
- Verify RLS policies work correctly

---

## 📊 Progress Tracking

**Current Status**: Foundation setup complete

**Next Action**: Copy root layout and core components

**Estimated Time**:
- Phase 3A.1: 2-3 hours
- Phase 3A.2-3A.5: 3-4 hours
- Phase 3A.6: 2-3 hours
- Phase 3A.7-3A.8: 2-3 hours
**Total**: 9-13 hours

---

## 🎯 Definition of Done

Phase 3A is complete when:
- [✅] All ThunderText pages copied and functional
- [✅] All ThunderText API routes copied with middleware
- [✅] ThunderText app builds without errors
- [✅] ThunderText dev server runs independently
- [✅] All imports updated to use shared packages
- [✅] Authentication works with JWT middleware
- [✅] Database queries filtered by app_name = 'thundertext'
- [✅] No ACE features accessible in ThunderText app

---

## 📝 Notes

- Original `src/app` remains untouched for now
- Can be removed in Phase 5 (cleanup)
- Both apps will temporarily coexist
- Gradual migration allows testing at each step
