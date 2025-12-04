# TODO/FIXME Audit Report

**Date:** December 2, 2025
**Total TODOs Found:** 26 (down from initial estimate of 128)
**Status:** ✅ Audit Complete

---

## Summary by Priority

### 🔴 P0: Blocking/Critical (Implement Immediately)
**Count:** 4

1. **src/lib/services/file-parser.ts:112**
   ```typescript
   // TODO: Implement server-side parsing using libraries like:
   ```
   - **Impact:** File upload feature incomplete
   - **Action:** Implement PDF/DOCX parsing with mammoth/pdf-parse
   - **Estimate:** 2-3 days

2. **src/lib/auth/content-center-auth.ts:147**
   ```typescript
   // TODO: Implement API key validation
   ```
   - **Impact:** API security gap
   - **Action:** Add API key validation middleware
   - **Estimate:** 1 day

3. **src/lib/shopify/product-updater.ts:255**
   ```typescript
   // TODO: Implement proper OAuth token retrieval from database
   ```
   - **Impact:** Token management incomplete
   - **Action:** Replace with proper database lookup
   - **Estimate:** 1 day

4. **src/app/api/generate/create/route.ts:389**
   ```typescript
   // TODO: Track usage in database
   ```
   - **Impact:** No usage analytics
   - **Action:** Implement usage tracking for billing/analytics
   - **Estimate:** 2 days

---

### 🟡 P1: Important (Next Sprint)
**Count:** 9

5. **src/lib/middleware/rate-limit.ts:31**
   ```typescript
   // TODO: Replace with Redis for production/distributed deployments
   ```
   - **Impact:** Rate limiting won't scale across instances
   - **Action:** Implement Redis-based rate limiting
   - **Estimate:** 3 days

6. **src/lib/shopify/product-enhancement.ts:136**
   ```typescript
   // TODO: Integrate with analytics to get real performance data
   ```
   - **Impact:** Missing analytics integration
   - **Action:** Connect to analytics service
   - **Estimate:** 2 days

7. **src/lib/shopify/product-enhancement.ts:474**
   ```typescript
   // TODO: Get proper access token from OAuth session
   ```
   - **Impact:** Token retrieval incomplete
   - **Action:** Implement proper OAuth flow
   - **Estimate:** 1 day

8. **src/lib/security/api-keys.ts:152**
   ```typescript
   // TODO: Implement proper monitoring
   ```
   - **Impact:** No API key usage monitoring
   - **Action:** Add monitoring for API key operations
   - **Estimate:** 1 day

9. **src/app/api/trends/signals/route.ts:96**
   ```typescript
   .eq("market", "US") // TODO: make dynamic per shop
   ```
   - **Impact:** Hardcoded market value
   - **Action:** Make market dynamic based on shop location
   - **Estimate:** 0.5 days

10. **src/app/api/admin/invite-coach/route.ts:62**
    ```typescript
    // TODO: Send email with invitation link
    ```
    - **Impact:** Email invitation not implemented
    - **Action:** Integrate email service (SendGrid/Resend)
    - **Estimate:** 2 days

11. **src/app/api/shopify/token/route.ts:64**
    ```typescript
    // TODO: Store the access token in your database
    ```
    - **Impact:** Token not persisted
    - **Action:** Add database storage for tokens
    - **Estimate:** 1 day

12. **src/app/api/shopify/products/create/route.ts:172**
    ```typescript
    // TODO: Handle image uploads to Shopify
    ```
    - **Impact:** Image upload feature incomplete
    - **Action:** Implement Shopify media API integration
    - **Estimate:** 2 days

13. **src/app/api/bhb/insights/route.ts:74**
    ```typescript
    // TODO: Add authentication check here
    ```
    - **Impact:** Security gap in insights endpoint
    - **Action:** Add auth middleware
    - **Estimate:** 0.5 days

---

### 🟢 P2: Nice-to-have (Backlog)
**Count:** 8

14. **src/app/content-center/samples/page.tsx:57**
    ```typescript
    // TODO: Handle file upload
    ```
    - **Impact:** Feature placeholder
    - **Action:** Implement file upload UI
    - **Estimate:** 1 day

15. **src/app/content-center/samples/page.tsx:62**
    ```typescript
    // TODO: Handle file upload
    ```
    - **Impact:** Duplicate of #14
    - **Action:** Same as #14
    - **Estimate:** Included in #14

16. **src/app/content-center/samples/page.tsx:90**
    ```typescript
    // TODO: Implement URL fetching
    ```
    - **Impact:** URL import feature missing
    - **Action:** Add URL fetching for content samples
    - **Estimate:** 1 day

17. **src/app/bhb/store/[shop_id]/page.tsx:76**
    ```typescript
    // TODO: Save to database via API
    ```
    - **Impact:** Data not persisted
    - **Action:** Create API endpoint for saving
    - **Estimate:** 1 day

18. **src/app/dashboard/page.tsx:20**
    ```typescript
    const trialStartDate = new Date('2025-11-30') // TODO: Get from user account
    ```
    - **Impact:** Hardcoded trial date
    - **Action:** Fetch from user profile
    - **Estimate:** 0.5 days

19. **src/app/api/content-center/templates/from-voice/route.ts:59**
    ```typescript
    // TODO: Phase 3 - Implement AI template generation
    ```
    - **Impact:** Feature roadmap item
    - **Action:** Future phase implementation
    - **Estimate:** 5 days (Phase 3)

20. **src/app/api/generate/enhance/templates/route.ts:12**
    ```typescript
    // TODO: This will integrate with existing template system
    ```
    - **Impact:** Integration pending
    - **Action:** Connect to template system
    - **Estimate:** 2 days

21. **src/lib/services/integration-service.ts:62**
    ```typescript
    // TODO: Implement refresh logic here or return null to trigger re-auth flow
    ```
    - **Impact:** Token refresh incomplete
    - **Action:** Implement token refresh flow
    - **Estimate:** 2 days

---

### 🗑️ P3: Consider Removing (Low Value)
**Count:** 5

22-26. **Test files with it.todo()**
    - These are in test files and marked as future test cases
    - Can be left as-is or removed if tests not planned

---

## Detailed Breakdown

### By Category

| Category | Count | Examples |
|----------|-------|----------|
| **Authentication/Security** | 5 | API key validation, auth checks, token management |
| **File Processing** | 4 | File upload, PDF parsing, URL fetching |
| **Infrastructure** | 2 | Redis rate limiting, monitoring |
| **Integrations** | 4 | Analytics, email, Shopify media |
| **Data Persistence** | 3 | Database storage, usage tracking |
| **Future Features** | 3 | Phase 3 features, template integration |
| **Configuration** | 2 | Dynamic market, trial dates |
| **Tests** | 5 | it.todo() placeholders |

### By File Type

| Type | Count | Notes |
|------|-------|-------|
| API Routes | 11 | Most in /api/ directory |
| Library Code | 8 | Core functionality gaps |
| Pages/Components | 4 | UI feature placeholders |
| Test Files | 3 | Future test cases |

---

## Recommended Actions

### Week 1: P0 Items (Critical)
```bash
# Day 1-2: Authentication & Security
- Implement API key validation (content-center-auth.ts)
- Add proper OAuth token retrieval (product-updater.ts)

# Day 3-4: File Processing & Analytics
- Implement server-side file parsing (file-parser.ts)
- Add usage tracking (generate/create/route.ts)

# Day 5: Testing & Verification
- Test all P0 implementations
- Deploy to staging
```

### Week 2: P1 Items (Important)
```bash
# Priority order:
1. Redis rate limiting (scaling issue)
2. Email invitations (admin feature)
3. Shopify image uploads (core feature)
4. Auth checks in insights endpoint (security)
5. Dynamic market configuration
6. Remaining token/analytics integrations
```

### Week 3+: P2 Items (Backlog)
- Schedule based on feature priority
- Group related items (file upload UI + backend)
- Consider removing low-value items

---

## Removal Recommendations

### Safe to Remove (5 items)

1. **Test TODOs (5 files)**
   - src/__tests__/security/tenant-isolation.test.ts
   - All `it.todo()` placeholders
   - **Action:** Either implement tests or remove placeholders
   - **Rationale:** Sitting for months without implementation

---

## Implementation Plan

### Phase 1: Security & Critical Features (1-2 weeks)
- [ ] API key validation
- [ ] OAuth token retrieval
- [ ] File parsing implementation
- [ ] Usage tracking

**Estimated effort:** 6-7 days
**Team:** Backend + Infrastructure

### Phase 2: Infrastructure & Integrations (2-3 weeks)
- [ ] Redis rate limiting
- [ ] Email service integration
- [ ] Shopify media API
- [ ] Analytics integration
- [ ] Auth middleware

**Estimated effort:** 10-12 days
**Team:** Full stack

### Phase 3: Feature Completion (3-4 weeks)
- [ ] File upload UI
- [ ] URL fetching
- [ ] Template integration
- [ ] Token refresh flows
- [ ] Dynamic configuration

**Estimated effort:** 12-15 days
**Team:** Full stack + Product

---

## Success Metrics

### Before
- Total TODOs: 26
- P0 (blocking): 4
- P1 (important): 9
- P2 (backlog): 8

### Target (End of Month)
- Total TODOs: <10
- P0 (blocking): 0
- P1 (important): 0
- P2 (backlog): <10

### Progress Tracking
```bash
# Check TODO count
grep -r "TODO\|FIXME" src/ --include="*.ts" --include="*.tsx" | wc -l

# Generate updated report
./scripts/audit-todos.sh > claudedocs/todo-audit-$(date +%Y%m%d).md
```

---

## Notes

1. **Test file TODOs**: Decision needed on whether to implement or remove
2. **Phase 3 features**: Low priority, can be deferred to Q1 2026
3. **Documentation TODOs**: Not included in this audit (focus on code)
4. **Configuration TODOs**: Should be environment variables or database-driven

---

## Appendix: Full TODO List

```typescript
// P0: Critical
src/lib/services/file-parser.ts:112
src/lib/auth/content-center-auth.ts:147
src/lib/shopify/product-updater.ts:255
src/app/api/generate/create/route.ts:389

// P1: Important
src/lib/middleware/rate-limit.ts:31
src/lib/shopify/product-enhancement.ts:136
src/lib/shopify/product-enhancement.ts:474
src/lib/security/api-keys.ts:152
src/app/api/trends/signals/route.ts:96
src/app/api/admin/invite-coach/route.ts:62
src/app/api/shopify/token/route.ts:64
src/app/api/shopify/products/create/route.ts:172
src/app/api/bhb/insights/route.ts:74

// P2: Backlog
src/app/content-center/samples/page.tsx:57
src/app/content-center/samples/page.tsx:62
src/app/content-center/samples/page.tsx:90
src/app/bhb/store/[shop_id]/page.tsx:76
src/app/dashboard/page.tsx:20
src/app/api/content-center/templates/from-voice/route.ts:59
src/app/api/generate/enhance/templates/route.ts:12
src/lib/services/integration-service.ts:62

// P3: Consider Removing
src/__tests__/security/tenant-isolation.test.ts (multiple it.todo)
```
