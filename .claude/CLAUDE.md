# Thunder Text - SuperClaude Development Framework

## 🎨 Design System Compliance (CRITICAL - READ FIRST)

**MANDATORY**: When creating or modifying UI components, pages, or any visual elements, you MUST follow the [Master Design System](../ace-app/docs/MASTER_DESIGN_SYSTEM.md).

### Design System Rules

1. **ALWAYS Reference First**: Before writing any UI code, review the relevant sections of `../ace-app/docs/MASTER_DESIGN_SYSTEM.md`

2. **Component Standards**:
   - Use **Shadcn UI components** (not custom implementations or Shopify Polaris for standalone pages)
   - Use **Lucide icons** (not custom SVGs or other icon libraries)
   - Follow the exact color palette defined in the design system
   - Use Tailwind utility classes (not inline styles)

3. **Color Usage** (ACE Brand Colors):
   - Page backgrounds: `bg-gray-50` (never stark white)
   - Cards: `bg-white` with proper shadows
   - Primary actions: `bg-smart-500` (#0066cc - Smart Blue)
   - Headings: `text-gray-900` or `text-oxford-800`
   - Body text: `text-gray-900`
   - Secondary text: `text-gray-500`
   - Borders: `border-gray-200`

4. **Spacing** (4px Grid System):
   - Follow the 4px base unit system
   - Card padding: `p-6` or `p-8` (24px or 32px)
   - Section spacing: `mb-8` to `mb-12` (32-48px)
   - Element gaps: `gap-4` or `gap-6` (16px or 24px)
   - **Main container**: `max-w-7xl mx-auto px-8 py-12`
   - **Constrained cards**: `max-w-3xl mx-auto`

5. **Typography**:
   - Font family: Inter (already configured)
   - Headings: Use proper hierarchy (h1, h2, h3)
   - Font weights: 400 (normal), 500 (medium), 600 (semibold), 700 (bold)
   - Page titles: `text-4xl font-bold text-gray-900`
   - Section headers: `text-2xl font-semibold text-gray-900`
   - Body text: `text-base text-gray-900`

### Layout Rules (Critical for Thunder Text)

**From THUNDER_TEXT_LAYOUT_FIXES.md**:

1. **NEVER Let Cards Be Full Width**: Always constrain with `max-w-3xl mx-auto`
2. **Main Container Must Have Max Width**: Use `max-w-7xl mx-auto px-8 py-12`
3. **Consistent Card Spacing**: Use `flex flex-col gap-6` on main container

### Component Checklist

Before submitting any UI code, verify:

- [ ] Uses Shadcn UI components
- [ ] Uses Lucide icons
- [ ] Follows brand color palette (Oxford Navy, Smart Blue, etc.)
- [ ] Uses Tailwind classes (no inline styles)
- [ ] Proper spacing (4px grid)
- [ ] Cards are constrained (not full-width)
- [ ] Main container is constrained (max-w-7xl)
- [ ] Responsive design (mobile-first)
- [ ] Accessible (ARIA labels, focus states)
- [ ] Consistent with existing pages

### Design System Quick Reference

**Paths**:

- Master Design System: `../ace-app/docs/MASTER_DESIGN_SYSTEM.md`
- Layout Fixes: `../ace-app/docs/THUNDER_TEXT_LAYOUT_FIXES.md`
- Modernization Guide: `../ace-app/docs/THUNDER_TEXT_MODERNIZATION.md`
- Color System: `../ace-app/docs/COLOR_SYSTEM.md`

**Common Patterns**:

```tsx
// Page Structure
<div className="min-h-screen bg-gray-50">
  <nav>{/* Navigation */}</nav>
  <main className="max-w-7xl mx-auto px-8 py-12">
    <div className="mb-8">
      <h1 className="text-4xl font-bold text-gray-900">Page Title</h1>
      <p className="mt-2 text-base text-gray-500">Subtitle</p>
    </div>
    <div className="flex flex-col gap-6">
      <Card className="max-w-3xl mx-auto w-full">{/* Content */}</Card>
    </div>
  </main>
</div>

// Upload Area
<div className="border-2 border-dashed border-gray-200 rounded-lg p-12 text-center bg-gray-50">
  <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center mx-auto mb-4">
    <Upload className="h-6 w-6 text-blue-600" />
  </div>
  <Button>Select Files</Button>
</div>
```

---

## Project Overview

Thunder Text is an AI-powered Shopify application that generates SEO-optimized product descriptions from images using GPT-4 Vision API. This configuration optimizes SuperClaude for efficient development across all project phases.

### Core Value Proposition

**Problem Solved**: Boutique store owners spend hours writing product descriptions manually
**Solution Provided**: AI-generated descriptions in seconds from just product photos
**Target Users**: Shopify store owners, especially boutiques with many similar products

---

## 🔴 CRITICAL: Shop/Store ID Architecture (READ THIS FIRST)

**THE RECURRING ISSUE**: Confusion between shop domain, shop ID, and store_id causes authentication failures.

### Database Schema - The Single Source of Truth

```typescript
// shops table (Supabase)
type Shop = {
  id: UUID                    // ← This is the PRIMARY KEY
  shop_domain: string         // e.g., "zunosai-staging-test-store.myshopify.com"
  access_token: string
  scope: string
  is_active: boolean
  created_at: timestamp
  updated_at: timestamp
}

// ALL other tables reference shops via:
store_id: UUID REFERENCES shops(id)  // ← ALWAYS uses shops.id, NOT shop_domain
```

### The Authentication Flow (MEMORIZE THIS)

```typescript
// 1. Frontend sends shop domain in Authorization header
Authorization: Bearer zunosai-staging-test-store.myshopify.com

// 2. getUserId() extracts shop domain and looks up shop
const { data: shopData } = await supabaseAdmin
  .from('shops')
  .select('id, shop_domain')
  .eq('shop_domain', shop)      // Match by domain
  .single()

// 3. Returns shops.id as userId (THIS IS THE UUID)
return shopData.id  // e.g., "38b6c917-c23d-4fa6-9fa3-165f7ca959d2"

// 4. Use userId as store_id in ALL database queries
.eq('store_id', userId)  // ← userId IS the shops.id UUID
```

### NEVER Do This (Common Mistakes)

```typescript
// ❌ WRONG: Using shop_domain as store_id
.eq('store_id', 'zunosai-staging-test-store.myshopify.com')

// ❌ WRONG: Confusing business_profiles.id with store_id
const profileId = '9693764b-...'  // This is business_profiles.id
.eq('store_id', profileId)  // Wrong! Should be shops.id

// ✅ CORRECT: Always use shops.id as store_id
const userId = await getUserId(request)  // Returns shops.id UUID
.eq('store_id', userId)
```

---

## 🚨 CRITICAL: Production Quality Standards

**MANDATORY READING**: Before proposing ANY solution, Claude MUST:

1. Read `/PRODUCTION_READY_GUIDELINES.md` in full
2. Answer the 5 Critical Questions (Root Cause, Solution Type, Technical Debt, Future Problems, Observability)
3. Complete the Production-Ready Checklist
4. State production readiness level: 🟢 Production Ready | 🟡 Ship With Warning | 🔴 Don't Ship Yet
5. Explicitly state: **"This is PRODUCTION READY"** or **"This is TEMPORARY FIX"** with complete explanation

### The Consequences Rule

Before implementing any solution, Claude MUST answer:

1. **What happens if this breaks in production?**
2. **How will we know if it breaks?** (User feedback + Developer visibility)
3. **What's the impact on users?**
4. **What's the impact on developers?**
5. **What technical debt does this create?**
6. **When/how will we pay off that debt?**

**If Claude cannot answer these questions confidently, the solution is NOT ready.**

### Zero Tolerance For:

- ❌ Silent failures (errors hidden from users and developers)
- ❌ Assumption-based code (no validation of preconditions)
- ❌ Magic fallbacks (unexplained default values)
- ❌ Catch-all error handlers (all errors treated the same)
- ❌ "Quick fixes" without explaining proper solution
- ❌ Technical debt without explicit approval and payoff plan

### Required For Every Solution:

- ✅ Users see clear feedback (loading, success, error states)
- ✅ Developers can debug (console logs with context, error messages)
- ✅ Errors fail gracefully (never crash, always degrade)
- ✅ Edge cases handled (invalid input, network failure, API errors)
- ✅ Code is maintainable (readable, documented, follows patterns)

---

## Variable and Concept Consistency Protocol

### The Duplication Problem

**Core Issue**: Claude may create new variables, types, or table names without understanding that equivalent concepts already exist in the codebase, leading to confusion like the `shops` vs `stores` incident.

### Mandatory Pre-Creation Checklist

**BEFORE creating ANY new variable, type, table, function, or concept, Claude MUST:**

#### 1. Search for Existing Patterns

```bash
# Search for similar variable names
grep -r "shop" --include="*.ts" --include="*.tsx" --include="*.sql"
grep -r "store" --include="*.ts" --include="*.tsx" --include="*.sql"

# Search for similar type definitions
grep -r "type.*Shop" --include="*.ts"
grep -r "interface.*Shop" --include="*.ts"

# Search database schema for similar tables
grep -r "CREATE TABLE" supabase/migrations/
```

#### 2. Ask Clarifying Questions

**When in doubt, ALWAYS ask:**

- "I see you have `shops` table. Should I use that, or do you need a separate `stores` concept?"
- "I found `ShopData` type. Should I use that or create `StoreData`?"
- "There's a `getShopById` function. Should I create `getStoreById` or use the existing one?"

#### 3. Maintain Active Glossary

**Create and UPDATE `/docs/GLOSSARY.md` for every new concept**

---

## SuperClaude Framework Integration

### Core Framework Components

@FLAGS.md - Behavioral flags for execution modes and tool selection
@PRINCIPLES.md - Software engineering principles and decision framework
@RULES.md - Actionable development rules and quality standards
@MODE_Task_Management.md - Hierarchical task organization with persistent memory
@MODE_Token_Efficiency.md - Symbol-enhanced communication for complex operations

### Default Flags for Thunder Text Development

**--shopify** - Enable Shopify-specific development patterns

- Trigger: OAuth flows, webhook handling, metafield operations, Polaris UI components
- Behavior: Use Shopify MCP server, follow Partner Program guidelines, Shopify API best practices

**--c7** - Enable Context7 for documentation lookup

- Trigger: Supabase, Next.js, React, OpenAI API integration
- Behavior: Access official docs, pattern guidance, best practices

**--task-manage** - Enable hierarchical task management

- Trigger: Multi-phase development, complex integrations, bulk processing features
- Behavior: Use memory system, TodoWrite coordination, progress tracking

---

## Technical Architecture

### Frontend Architecture

- **Framework**: Next.js 15 with App Router
- **UI Library**: Shadcn UI (modern pages), Shopify Polaris (embedded app pages)
- **Icons**: Lucide React
- **Styling**: Tailwind CSS following ACE Design System
- **State Management**: React hooks (useState, useRef, useEffect)
- **Development**: TypeScript for type safety

### Backend Architecture

- **API Routes**: Next.js API routes for serverless functions
- **AI Integration**: OpenAI GPT-4 Vision for content generation and image analysis
- **Database**: Supabase for user data, categories, templates
- **Shopify Integration**: Shopify Admin API for product creation
- **Authentication**: Shopify OAuth flow with Token Exchange

### Key Integrations

1. **OpenAI Vision API**: Analyzes product images for content generation
2. **OpenAI GPT API**: Generates product descriptions, titles, meta descriptions
3. **Shopify Admin API**: Creates products with variants and images
4. **Supabase**: Stores user preferences, templates, categories
5. **Shadcn UI**: Provides modern, accessible UI components

---

## Development Environment

- **Production URL**: https://thunder-text.onrender.com
- **Dev Shop**: zunosai-staging-test-store
- **Settings URL**: https://thunder-text.onrender.com/settings?shop=zunosai-staging-test-store&authenticated=true
- **Deployment**: Render (production hosting), not localhost
- **Authentication**: PRODUCTION-READY - NO AUTH BYPASS
  - ⚠️ NEVER use SHOPIFY_AUTH_BYPASS in production
  - ✅ Always use proper Token Exchange with JWT verification

---

## Development Patterns

### Shopify Integration Patterns

- **OAuth Flow**: Secure token management, proper scope handling
- **Webhook Processing**: Signature verification, idempotent operations
- **API Rate Limiting**: Intelligent queuing, exponential backoff
- **Metafield Management**: Google Shopping compliance, structured data

### AI Integration Patterns

- **Master Key Management**: Centralized OpenAI API key, usage tracking
- **Image Processing**: Temporary storage, automatic cleanup
- **Content Generation**: Template systems, brand voice consistency
- **Quality Control**: Validation pipelines, approval workflows
- **Cost Optimization**: Batching, caching, intelligent retry logic

### UI Development Patterns

- **Page Structure**: Follow Master Design System templates
- **Component Reuse**: Use Shadcn UI components
- **Responsive Design**: Mobile-first with Tailwind breakpoints
- **Accessibility**: WCAG 2.1 AA compliance, semantic HTML
- **Loading States**: Clear feedback, skeleton screens
- **Error Handling**: User-friendly messages, recovery options

---

## Deployment Debugging Priority

When encountering database access errors (permission denied, column does not exist, etc.):

### Investigation Order (Stop at first success)

1. **Check build cache FIRST** (15 min max)
   - Render may be deploying cached Next.js builds with old code
   - **Quick fix**: Add `rm -rf .next` to build command temporarily
   - **Permanent fix**: Update `build:render` script in package.json:
     ```json
     "build:render": "npm install --legacy-peer-deps && rm -rf .next && next build"
     ```

2. **Verify what's actually deployed** (10 min)
   - Check Render deployment logs for actual code being run
   - Compare deployed commit hash with local repo
   - Verify branch: Which branch is Render deploying from?
   - Test API endpoint directly: `curl https://app.com/api/endpoint`

3. **Confirm environment** (5 min)
   - **Supabase project**: Check `NEXT_PUBLIC_SUPABASE_URL` in .env.local vs Render env vars
   - **Repository**: Verify you're working in the correct repo (thunder-text vs zeus2)
   - **Branch**: Confirm Render is deploying the branch you're pushing to

---

## Quality Gates

### Code Quality Standards

- **Test Coverage**: 90%+ for business logic, 100% for API endpoints
- **Performance**: <30s AI processing, <2s page loads, 99.9% uptime
- **Security**: OWASP compliance, Shopify security guidelines
- **Accessibility**: WCAG 2.1 AA compliance, screen reader support
- **Design System**: 100% compliance with Master Design System

### Review Checklists

- [ ] Shopify Partner Program compliance
- [ ] GDPR and privacy compliance
- [ ] Performance benchmarks met
- [ ] Security scan passed (no high/critical issues)
- [ ] Accessibility testing completed
- [ ] Design system compliance verified
- [ ] Error handling and edge cases covered
- [ ] Monitoring and alerting configured

---

## Development URLs (zunosai-staging-test-store)

```bash
# Main pages with authentication parameters (Render-hosted)
https://thunder-text.onrender.com/?shop=zunosai-staging-test-store&authenticated=true
https://thunder-text.onrender.com/dashboard?shop=zunosai-staging-test-store&authenticated=true
https://thunder-text.onrender.com/settings?shop=zunosai-staging-test-store&authenticated=true
https://thunder-text.onrender.com/create?shop=zunosai-staging-test-store&authenticated=true
https://thunder-text.onrender.com/products?shop=zunosai-staging-test-store&authenticated=true
```

---

**Remember**: The design system is not optional—it's the foundation of UI consistency across Thunder Text and the entire ACE Suite application. Always reference the Master Design System before creating or modifying any UI components.
