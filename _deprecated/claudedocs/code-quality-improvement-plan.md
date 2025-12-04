# Code Quality Improvement Plan

**Date:** December 2, 2025
**Status:** 🔄 In Progress

---

## Executive Summary

Systematic plan to address critical code quality issues identified in the comprehensive analysis:
- **261 console statements** → Replace with structured logging
- **19 debug routes** → Protect from production exposure
- **128 TODO/FIXME** → Audit and resolve or document
- **Large components** → Refactor monolithic files
- **85+ `any` types** → Improve type safety

---

## Phase 1: Security & Production Readiness (PRIORITY) 🔴

### 1.1 Debug Route Protection ✅ COMPLETED

**Files Created:**
- [src/lib/env-config.ts](../src/lib/env-config.ts) - Centralized environment config
- [src/app/api/debug/_middleware-guard.ts](../src/app/api/debug/_middleware-guard.ts) - Route guard utility

**Implementation:**
```typescript
// Guard function prevents production access
export function guardDebugRoute(routeName: string) {
  if (!isDebugEnabled) {
    return NextResponse.json(
      { error: 'Debug routes not available in production' },
      { status: 403 }
    );
  }
  return null;
}
```

**Status:**
- ✅ Guard utility created
- 🔄 Applied to 1/19 debug routes
- ⏳ Need to apply to remaining 18 routes

**Debug Routes to Protect:**
```
src/app/api/debug/
├── app-bridge-test/
├── auth-status/
├── check-token/
├── clear-token/
├── db-check/
├── decode-session-token/
├── env/              ✅ PROTECTED
├── env-check/
├── manual-token-exchange/
├── product-detail/
├── products/
├── supabase-check/
├── test-raw-token-exchange/
├── test-session-token/
├── test-token-exchange/
├── token-exchange-test/
├── token-status/
├── update-token/
└── verify-credentials/
```

**Action Required:**
```bash
# Apply guard to all remaining debug routes
for route in app-bridge-test auth-status check-token clear-token db-check \
             decode-session-token env-check manual-token-exchange \
             product-detail products supabase-check test-raw-token-exchange \
             test-session-token test-token-exchange token-exchange-test \
             token-status update-token verify-credentials; do
  # Add import and guard check to each route.ts
  echo "TODO: Update src/app/api/debug/${route}/route.ts"
done
```

### 1.2 Console Statement Migration 🔄 IN PROGRESS

**Analysis Results:**
```
Total console statements: 261
├── console.log:   225 (86%)
├── console.warn:   30 (11%)
├── console.error:   8 (3%)
└── console.debug:   0 (0%)

By directory:
├── src/lib:        131 (50%)  ← CRITICAL PATH
├── src/app:        117 (45%)
├── src/app/api:     65 (25%)
└── src/components:   7 (3%)
```

**Top Offenders:**
1. [src/lib/aie/best-practices/orchestrator.ts](../src/lib/aie/best-practices/orchestrator.ts) - 24 statements
2. [src/lib/shopify.ts](../src/lib/shopify.ts) - 16 statements
3. [src/lib/postgres.ts](../src/lib/postgres.ts) - 9 statements
4. [src/lib/services/business-profile-generator.ts](../src/lib/services/business-profile-generator.ts) - 9 statements

**Migration Strategy:**

#### Tier 1: Critical Library Code (PRIORITY)
Replace in production library code with `logger`:
```typescript
// ❌ BEFORE
console.error('Failed to fetch data', error);

// ✅ AFTER
import { logger } from '@/lib/logger';
logger.error('Failed to fetch data', error, { component: 'shopify-client' });
```

**Files to migrate first:**
- [x] src/lib/env-config.ts (has console.warn)
- [ ] src/lib/middleware/cors.ts
- [ ] src/lib/middleware/rate-limit.ts
- [ ] src/lib/shopify-auth.ts
- [ ] src/lib/shopify/token-manager.ts
- [ ] src/lib/shopify/api-client.ts
- [ ] src/lib/postgres.ts

#### Tier 2: API Routes
Keep `console.log` in debug routes (development-only), replace in production routes:
- [ ] src/app/api/ (non-debug routes)
- [ ] OAuth callback handlers

#### Tier 3: Components & Pages
Replace with `logger.info()` or `logger.debug()` (dev-only):
- [ ] src/components/
- [ ] src/app/ (pages)

#### Tier 4: Allow List (Keep console.*)
These can retain console statements:
- ✅ src/app/api/debug/* (development-only routes)
- ✅ Test files (*.test.ts)
- ✅ Scripts (scripts/*)

---

## Phase 2: Code Quality & Maintainability 🟡

### 2.1 TODO/FIXME Audit

**Total Count:** 128 TODO/FIXME comments

**Critical TODOs (Incomplete Features):**
```typescript
// src/lib/services/file-parser.ts:112
// TODO: Implement server-side parsing

// src/lib/shopify/product-enhancement.ts:136
// TODO: Integrate with analytics to get real performance data

// src/lib/shopify/product-updater.ts:249
// TODO: Implement proper OAuth token retrieval from database

// src/app/api/generate/create/route.ts:389
// TODO: Track usage in database

// src/lib/auth/content-center-auth.ts:147
// TODO: Implement API key validation
```

**Action Plan:**
1. **Categorize:** Feature gap vs Tech debt vs Documentation
2. **Prioritize:** P0 (blocking) → P1 (important) → P2 (nice-to-have)
3. **Execute:** Create tickets for P0/P1, document P2 in backlog
4. **Remove:** Delete obsolete TODOs

**Script to analyze:**
```bash
# Find all TODOs with context
grep -r "TODO\|FIXME" src/ -n -B 2 -A 2 > claudedocs/todo-audit.txt
```

### 2.2 Monolithic Component Refactoring

**Large Components (>600 LOC):**
```
1,926 LOC: src/app/create-pd/page.tsx
1,659 LOC: src/app/aie/page.tsx
1,592 LOC: src/app/settings/prompts/page.tsx
  972 LOC: src/app/brand-voice/settings/page.tsx
  869 LOC: src/app/best-practices/page.tsx
  793 LOC: src/app/enhance/UnifiedEnhancePage.tsx
  784 LOC: src/lib/services/business-profile-generator.ts
```

**Refactoring Strategy:**

#### Example: create-pd/page.tsx (1,926 LOC → ~300 LOC)
```
src/app/create-pd/
├── page.tsx (300 LOC - orchestration only)
├── components/
│   ├── ProductTypeSelector.tsx
│   ├── ProductDetailsForm.tsx
│   ├── AdditionalInfoForm.tsx
│   ├── EnhancementOptions.tsx
│   ├── ImageUploadSection.tsx
│   ├── PreviewPanel.tsx
│   └── GenerationControls.tsx
├── hooks/
│   ├── useProductForm.ts
│   └── useGenerationState.ts
└── types.ts
```

**Principles:**
- Single Responsibility: Each component does ONE thing
- Max 300 LOC per file
- Extract custom hooks for state management
- Separate UI from business logic

### 2.3 Type Safety Improvements

**Current State:** 85+ files with `any` type violations

**ESLint Configuration:**
```javascript
// eslint.config.mjs currently allows 'any' in:
"src/app/api/debug/**/*.ts",      // ✅ OK (debug routes)
"src/lib/aie/**/*.ts",            // ❌ Should fix
"src/lib/services/**/*.ts",       // ❌ Should fix
"src/app/api/aie/**/*.ts",        // ❌ Should fix
```

**Action Plan:**
1. **AIE Module:** Add proper types for AI engine
2. **Services:** Type Facebook/Google API responses
3. **Remove Exemptions:** Gradually remove `@typescript-eslint/no-explicit-any: off`

**Example Fix:**
```typescript
// ❌ BEFORE
function processData(data: any) {
  return data.map((item: any) => item.value);
}

// ✅ AFTER
interface DataItem {
  value: string;
  id: number;
}
function processData(data: DataItem[]): string[] {
  return data.map((item) => item.value);
}
```

---

## Phase 3: Architecture & Performance 🟢

### 3.1 Configuration Centralization

**Problem:** 30+ files with direct `process.env` access

**Solution:** Create validated config module
```typescript
// src/lib/config.ts
import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']),
  SHOPIFY_API_KEY: z.string().min(1),
  SHOPIFY_API_SECRET: z.string().min(1),
  SUPABASE_URL: z.string().url(),
  // ... all env vars
});

export const config = envSchema.parse(process.env);
```

### 3.2 Image Optimization

**Issue:** 15+ `<img>` tags flagged by ESLint

**Fix:** Replace with `next/image`:
```typescript
// ❌ BEFORE
<img src={product.image} alt={product.title} />

// ✅ AFTER
import Image from 'next/image';
<Image src={product.image} alt={product.title} width={400} height={300} />
```

### 3.3 Rate Limiting Upgrade

**Current:** In-memory rate limiting (won't scale)
```typescript
// src/lib/middleware/rate-limit.ts:30
// TODO: Replace with Redis for production
```

**Solution:** Implement Redis-based rate limiting
```bash
npm install ioredis @upstash/redis
```

---

## Implementation Timeline

### Week 1: Security (CRITICAL) 🔴
- [x] Day 1: Create debug route guards
- [ ] Day 2-3: Apply guards to all 19 debug routes
- [ ] Day 4-5: Replace console in src/lib/ (131 statements)

### Week 2: Code Quality 🟡
- [ ] Day 1-2: TODO/FIXME audit and categorization
- [ ] Day 3-4: Resolve P0 TODOs (blocking features)
- [ ] Day 5: Start component refactoring (create-pd/page.tsx)

### Week 3: Type Safety 🟡
- [ ] Day 1-3: Add types to AIE module
- [ ] Day 4-5: Add types to services layer
- [ ] Remove `any` type exemptions

### Week 4: Architecture 🟢
- [ ] Day 1-2: Centralize configuration
- [ ] Day 3: Image optimization (replace 15 `<img>` tags)
- [ ] Day 4-5: Redis rate limiting implementation

---

## Measurement & Success Criteria

### Metrics to Track
```
Before  → After   Metric
------    -----   ------
261     → 0       console.log in src/lib
19      → 19      debug routes protected
128     → 50      unresolved TODOs
42      → 0       TypeScript errors
85+     → 20      files with 'any' types
1,926   → 300     largest component (LOC)
```

### Quality Gates
- ✅ Zero TypeScript compilation errors
- ✅ Zero ESLint errors (warnings OK)
- ✅ All debug routes protected in production
- ✅ No console.error/console.warn in src/lib
- ✅ Max component size: 600 LOC

---

## Tools & Automation

### Scripts Created
- [x] [scripts/analyze-console-usage.sh](../scripts/analyze-console-usage.sh) - Console usage analysis

### Scripts Needed
- [ ] `scripts/apply-debug-guards.sh` - Bulk apply guards to debug routes
- [ ] `scripts/migrate-console-to-logger.sh` - Automated console → logger migration
- [ ] `scripts/audit-todos.sh` - Categorize and report TODOs
- [ ] `scripts/find-large-files.sh` - Identify refactoring candidates

### CI/CD Checks
```yaml
# .github/workflows/quality-check.yml
- name: Check for console.log in lib/
  run: |
    if grep -r "console\." src/lib --include="*.ts"; then
      echo "❌ Found console statements in src/lib"
      exit 1
    fi

- name: Verify debug routes protected
  run: |
    npm run test:debug-routes

- name: TypeScript strict check
  run: npx tsc --noEmit
```

---

## Risk Mitigation

### Rollback Strategy
1. All changes in feature branches
2. Git tags before major refactors
3. Feature flags for new implementations
4. Gradual rollout (10% → 50% → 100%)

### Testing Requirements
- Unit tests for refactored components
- Integration tests for auth/debug routes
- Manual QA for large component refactors
- Performance testing for rate limiting

---

## Next Steps

**Immediate (This Week):**
1. Apply debug guards to remaining 18 routes
2. Create console migration script for src/lib
3. Run TODO audit and create P0 ticket backlog

**Short-term (Next Sprint):**
4. Refactor top 3 largest components
5. Add types to AIE module
6. Implement centralized config

**Long-term (Next Quarter):**
7. Complete console migration (all 261 statements)
8. Resolve all P0/P1 TODOs
9. Achieve <20 files with `any` types
10. Redis rate limiting in production
