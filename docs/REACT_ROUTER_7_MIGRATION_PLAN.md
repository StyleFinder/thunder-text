# Thunder Text Migration to React Router 7

**Date:** October 1, 2025
**Status:** In Progress
**Reason:** Migrate to Shopify's recommended framework before production launch

---

## Executive Summary

Migrating Thunder Text from Next.js to React Router 7 using `@shopify/shopify-app-react-router` package. This is the optimal time as the app is not yet deployed to customers.

---

## Why React Router 7?

### Shopify's Official Recommendation (2025)
- ✅ Latest Shopify-supported framework
- ✅ Official package: `@shopify/shopify-app-react-router`
- ✅ Remix merged into React Router 7 (same team, same patterns)
- ✅ Authentication built-in (no custom auth code needed)
- ✅ Automatic Polaris Web Components (matches Shopify admin design)
- ✅ Future-proof (Shopify's long-term direction)

### Why Not Stay with Next.js?
- ⚠️ No official Shopify package for Next.js
- ⚠️ Custom authentication code (maintenance burden)
- ⚠️ Manual updates required as Shopify changes
- ❌ Had authentication issues (1.5 days debugging)

### Why Not Remix?
- ⚠️ Being phased out in favor of React Router 7
- ⚠️ `@shopify/shopify-app-remix` is legacy path
- ✅ React Router 7 is the current recommendation

---

## Migration Strategy

### Parallel Development Approach

**Current Next.js App:**
```
Location: /Users/bigdaddy/prod_desc/thunder-text
Status: Keep intact, no changes
Purpose: Backup and reference
```

**New React Router 7 App:**
```
Location: /Users/bigdaddy/prod_desc/thunder-text-v2
Status: Fresh build from Shopify CLI
Purpose: Production app
```

**Advantages:**
- ✅ No risk to current codebase
- ✅ Side-by-side comparison possible
- ✅ Easy rollback if needed
- ✅ Can reference Next.js code during migration
- ✅ Test thoroughly before switching

---

## Timeline

### Phase 1: Proof of Concept (1-2 days)
**Goal:** Verify migration viability

**Tasks:**
1. Create new React Router 7 app with Shopify CLI
2. Configure dev app credentials
3. Verify authentication works with `@shopify/shopify-app-react-router`
4. Migrate product listing feature
5. Test with Playwright MCP
6. Decision point: Continue or abort?

**Success Criteria:**
- ✅ Authentication works without infinite loops
- ✅ Products load from Shopify
- ✅ Supabase integration works
- ✅ No major blockers identified

---

### Phase 2: Core Features (Week 1)

**Day 1-2: Foundation**
- [x] Create React Router 7 app
- [ ] Set up Supabase client
- [ ] Configure environment variables
- [ ] Set up database connections
- [ ] Test basic authentication flow

**Day 3-4: Shopify Integration**
- [ ] Configure Shopify GraphQL client
- [ ] Create product listing loader
- [ ] Create product detail loader
- [ ] Test product fetching
- [ ] Verify data accuracy

**Day 5: AI Integration**
- [ ] Set up OpenAI client
- [ ] Create description generation action
- [ ] Test AI workflows
- [ ] Verify output quality

---

### Phase 3: Feature Completion (Week 2)

**Day 6-8: Full Product Workflow**
- [ ] Product enhancement form
- [ ] Product update actions
- [ ] Settings pages and actions
- [ ] Error handling
- [ ] Loading states

**Day 9-10: Testing**
- [ ] E2E tests with Playwright
- [ ] Authentication edge cases
- [ ] Error scenarios
- [ ] Performance testing
- [ ] Browser compatibility

**Day 11: Documentation**
- [ ] Code documentation
- [ ] Deployment guide
- [ ] Environment setup guide
- [ ] Troubleshooting guide

---

### Phase 4: Deployment (Week 2-3)

**Day 12-13: Staging**
- [ ] Set up hosting (Fly.io or Shopify hosting)
- [ ] Configure production environment variables
- [ ] Deploy to staging
- [ ] Test staging thoroughly
- [ ] Fix any deployment issues

**Day 14-15: Production**
- [ ] Deploy to production
- [ ] Update Shopify Partners app URLs
- [ ] Monitor for errors
- [ ] Verify all features work
- [ ] Document any issues

---

## Technical Architecture

### Current Stack (Next.js)
```
Frontend: Next.js 14 (App Router)
Backend: Next.js API Routes
Database: Supabase (PostgreSQL)
Auth: Custom (ShopifyAuthProvider.tsx)
Deployment: Vercel
```

### New Stack (React Router 7)
```
Framework: React Router 7
Auth: @shopify/shopify-app-react-router (official)
Database: Supabase (PostgreSQL) - same
Shopify: @shopify/shopify-api (same)
OpenAI: openai package (same)
Deployment: Fly.io or Shopify hosting
```

---

## Key Differences: Next.js → React Router 7

### 1. Routing
**Next.js (File-based):**
```
src/app/products/page.tsx
src/app/api/products/route.ts
```

**React Router 7 (File-based + loaders/actions):**
```
app/routes/products.tsx
  - export loader (server-side data fetching)
  - export action (form submissions)
  - export default Component (UI)
```

### 2. Data Fetching
**Next.js:**
```typescript
// Client-side fetch
const [products, setProducts] = useState([])

useEffect(() => {
  fetch('/api/products')
    .then(res => res.json())
    .then(data => setProducts(data))
}, [])
```

**React Router 7:**
```typescript
// Server-side loader
export async function loader({ request }) {
  const products = await getProducts(request)
  return json({ products })
}

// Component receives data
export default function Products() {
  const { products } = useLoaderData()
  return <ProductList products={products} />
}
```

### 3. Authentication
**Next.js:**
```typescript
// Custom ShopifyAuthProvider.tsx (272 lines)
// Custom token management
// Manual App Bridge setup
// Manual token exchange
```

**React Router 7:**
```typescript
// app/shopify.server.ts
import { shopifyApp } from "@shopify/shopify-app-react-router"

export const shopify = shopifyApp({
  apiKey: process.env.SHOPIFY_API_KEY,
  apiSecretKey: process.env.SHOPIFY_API_SECRET,
  // ... other config
})

// Authentication handled automatically ✅
```

### 4. API Endpoints
**Next.js:**
```typescript
// src/app/api/products/route.ts
export async function GET(request: NextRequest) {
  const products = await getProducts()
  return NextResponse.json({ products })
}

export async function POST(request: NextRequest) {
  const body = await request.json()
  await createProduct(body)
  return NextResponse.json({ success: true })
}
```

**React Router 7:**
```typescript
// app/routes/products.tsx
export async function loader({ request }) {
  // GET requests
  const products = await getProducts()
  return json({ products })
}

export async function action({ request }) {
  // POST/PUT/DELETE requests
  const formData = await request.formData()
  await createProduct(formData)
  return redirect('/products')
}
```

---

## Migration Checklist

### Routes to Migrate
- [ ] `/` - Home/Dashboard
- [ ] `/products` - Product listing
- [ ] `/products/:id` - Product detail
- [ ] `/enhance` - Product enhancement
- [ ] `/settings` - Settings page
- [ ] `/settings/prompts` - Prompt settings
- [ ] `/install` - Installation flow
- [ ] `/dashboard` - Dashboard (if different from home)

### API Endpoints to Convert
- [ ] `/api/shopify/products` → loader
- [ ] `/api/shopify/products/:id` → loader
- [ ] `/api/shopify/products/:id/enhance` → action
- [ ] `/api/shopify/token-exchange` → handled by @shopify/shopify-app-react-router
- [ ] `/api/auth/callback` → handled by @shopify/shopify-app-react-router
- [ ] `/api/detect-colors` → action
- [ ] `/api/products/update` → action

### Components to Migrate
- [ ] ProductSelector
- [ ] ProductDetailsForm
- [ ] EnhancedContentComparison
- [ ] ProductImageUpload
- [ ] CategoryTemplateSelector
- [ ] AdditionalInfoForm
- [ ] Navigation components
- [ ] Layout components

### Database/Utilities
- [ ] Supabase client setup
- [ ] Database queries (should work as-is)
- [ ] OpenAI client setup
- [ ] Shopify API utilities
- [ ] Token manager (replaced by Shopify package)

---

## Environment Variables

### Required for React Router 7 App

```bash
# Shopify App Credentials (same as current)
SHOPIFY_API_KEY=8c297db9f019c9e666e17918abe69dee
SHOPIFY_API_SECRET=7a17fcf6b99cc3280027d01bda264d03

# App URLs (will be different)
SHOPIFY_APP_URL=https://thunder-text-v2.fly.dev (TBD)

# Supabase (same as current)
NEXT_PUBLIC_SUPABASE_URL=[copy from current]
NEXT_PUBLIC_SUPABASE_ANON_KEY=[copy from current]
SUPABASE_SERVICE_KEY=[copy from current]

# OpenAI (same as current)
OPENAI_API_KEY=[copy from current]

# Shopify Scopes (same as current)
SCOPES=read_products,write_products,read_content,write_content
```

---

## Testing Strategy

### Automated Testing (with MCP)
- [ ] TypeScript compilation
- [ ] Build process
- [ ] Authentication flow (Playwright)
- [ ] Product listing (Playwright)
- [ ] Product enhancement (Playwright)
- [ ] Form submissions (Playwright)
- [ ] Error scenarios

### Manual Testing
- [ ] Install app in Shopify admin
- [ ] Navigate all routes
- [ ] Test product enhancement end-to-end
- [ ] Test settings changes
- [ ] Test error handling
- [ ] Test loading states

---

## Deployment Options

### Option 1: Fly.io (Recommended)
- ✅ Works well with React Router 7
- ✅ Free tier available
- ✅ Easy deployment
- ✅ Similar to Vercel experience

### Option 2: Shopify Hosting
- ✅ Official Shopify hosting
- ✅ Optimized for Shopify apps
- ⚠️ May have cost considerations

### Option 3: Other (Railway, Render, etc.)
- ✅ Many options available
- ⚠️ Need to verify React Router 7 compatibility

---

## Rollback Plan

If migration encounters critical issues:

1. **Keep Next.js app intact** - no changes to current codebase
2. **Continue using current deployment** - thunder-text.vercel.app
3. **React Router 7 app is separate** - can be abandoned if needed
4. **No data migration yet** - both apps use same Supabase database
5. **Easy to revert** - just don't switch Shopify Partners URLs

---

## Success Metrics

### Migration Successful If:
- ✅ Authentication works without custom code
- ✅ All features work identically to Next.js version
- ✅ No infinite loops or auth issues
- ✅ Performance is equal or better
- ✅ Deployment is successful
- ✅ App works in Shopify admin

### Migration Failed If:
- ❌ Authentication doesn't work after 2 days
- ❌ Major features can't be migrated
- ❌ Performance is significantly worse
- ❌ Too many bugs to fix in reasonable time
- ❌ Deployment is too complex

---

## Decision Points

### After POC (Day 2):
**Go/No-Go Decision:**
- If authentication works → Continue
- If authentication broken → Abort, stick with Next.js

### After Week 1:
**Progress Check:**
- If 80% features working → Continue to completion
- If <50% features working → Reassess approach

### After Week 2:
**Deployment Decision:**
- If staging works well → Deploy to production
- If staging has issues → Fix before production

---

## Communication Plan

### Status Updates:
- Daily progress updates
- Blockers reported immediately
- Decision points clearly marked
- Success criteria tracked

### Documentation:
- Migration progress logged
- Issues documented
- Solutions documented
- Learnings captured

---

## Post-Migration Tasks

### After Successful Migration:
1. Update Shopify Partners app URLs
2. Archive Next.js codebase (keep as reference)
3. Update documentation
4. Monitor production for 1 week
5. Document any issues and fixes
6. Create troubleshooting guide

### Knowledge Transfer:
- Document new React Router 7 patterns
- Update development workflow
- Create deployment runbook
- Document environment setup

---

## Resources

### Official Documentation:
- React Router 7: https://reactrouter.com/
- Shopify App Remix/React Router: https://shopify.dev/docs/api/shopify-app-remix
- Migration Guide: https://github.com/Shopify/shopify-app-template-react-router/wiki/Upgrading-from-Remix
- Shopify CLI: https://shopify.dev/docs/apps/tools/cli

### Template Repository:
- https://github.com/Shopify/shopify-app-template-react-router

---

## Notes

### What We Learned from Next.js Authentication Issues:
1. Custom authentication is complex and error-prone
2. Infinite loops happen when useEffect dependencies change
3. Token management requires careful state handling
4. Using official packages prevents these issues

### Why This Migration Makes Sense:
1. App not in production yet (perfect timing)
2. Official Shopify support for React Router 7
3. Authentication handled automatically
4. Future-proof technology choice
5. Cleaner, more maintainable codebase

---

**Last Updated:** October 1, 2025
**Next Review:** After POC completion (Day 2)
