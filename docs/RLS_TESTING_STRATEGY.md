# RLS Implementation - Testing Strategy

**Branch:** `feature/rls-security-policies`
**Date:** October 24, 2025
**Critical Change:** Row Level Security (RLS) Policies

---

## Pre-Implementation Baseline

### Current State

- **RLS Status:** Disabled (see `015_disable_rls_temporarily.sql`)
- **Access Control:** Client-side only (NOT SECURE)
- **Risk:** Any authenticated user can access any store's data
- **Branch:** `main-typescript`

### Baseline Tests (Before RLS)

**Run these BEFORE implementing RLS to establish working state:**

```bash
# 1. App starts without errors
npm run dev
# Expected: Server starts on port 3050

# 2. Type checking passes
npm run type-check
# Expected: No TypeScript errors

# 3. Existing tests pass
npm run test
# Expected: All tests green

# 4. Can access content
curl http://localhost:3050/api/content-center/samples
# Expected: 200 OK with data

# 5. Multiple stores can be accessed (THIS WILL BREAK WITH RLS - EXPECTED!)
# Login as store1, try to access store2 data
# Currently: WORKS (security issue!)
# After RLS: FAILS (correct behavior)
```

**Baseline Results (DOCUMENT BEFORE PROCEEDING):**

- [ ] Dev server starts: ✅ / ❌
- [ ] Type check passes: ✅ / ❌
- [ ] Tests pass: ✅ / ❌
- [ ] API returns 200: ✅ / ❌
- [ ] Cross-store access works: ✅ (This should be ❌ after RLS!)

---

## Testing Strategy

### Phase 1: Database Migration Testing (Local)

**Environment:** Local Supabase

**Steps:**

1. **Before Migration:**

   ```bash
   # Save current data
   supabase db dump -f backup-before-rls.sql

   # Document table structure
   supabase db diff > schema-before-rls.sql
   ```

2. **Apply RLS Migration:**

   ```bash
   # Create migration file
   supabase migration new enable_rls_policies

   # Apply locally
   supabase db push
   ```

3. **Verify Migration:**

   ```bash
   # Check RLS is enabled
   supabase db inspect

   # Should show RLS enabled on all tables
   # users, stores, content, samples, voice_profiles, etc.
   ```

**Success Criteria:**

- [ ] Migration applies without errors
- [ ] All tables have RLS enabled
- [ ] Policies created successfully
- [ ] Can rollback if needed

---

### Phase 2: Functional Testing (Does It Work?)

**Test Case 1: Application Still Starts**

```bash
npm run dev
```

**Expected:** Server starts, no errors in console
**If Fails:** RLS policy syntax error or missing policy

---

**Test Case 2: Authenticated User Can Access Own Data**

```bash
# Login as store1 user
# Navigate to: http://store1.localhost:3050/content-center

# Expected: Can see own content, samples, voice profiles
# If Fails: RLS policy too restrictive or JWT missing store_id
```

**API Test:**

```typescript
// src/__tests__/rls/basic-access.test.ts
test("User can access own store data", async () => {
  const store1Client = await loginAs("store1@test.com");

  const { data, error } = await store1Client.from("content").select("*");

  expect(error).toBeNull();
  expect(data.length).toBeGreaterThan(0);
  expect(data.every((row) => row.store_id === "store1-id")).toBe(true);
});
```

---

**Test Case 3: User CANNOT Access Other Store Data**

```bash
# Login as store1 user
# Try to access store2 data via API

curl -H "Authorization: Bearer <store1-token>" \
  http://localhost:3050/api/content-center/samples?store_id=store2-id

# Expected: 0 results OR 403 Forbidden
# If Fails: RLS not working - CRITICAL SECURITY ISSUE
```

**Automated Test:**

```typescript
test("User cannot access other store data", async () => {
  const store1Client = await loginAs("store1@test.com");
  const store2Client = await loginAs("store2@test.com");

  // Create content as store2
  const { data: store2Content } = await store2Client
    .from("content")
    .insert({ title: "Store 2 Secret" })
    .select()
    .single();

  // Try to access as store1
  const { data, error } = await store1Client
    .from("content")
    .select("*")
    .eq("id", store2Content.id);

  expect(data).toHaveLength(0); // RLS filtered it out
});
```

---

**Test Case 4: CRUD Operations Work**

```typescript
test("User can create, read, update, delete own data", async () => {
  const client = await loginAs("store1@test.com");

  // Create
  const { data: created } = await client
    .from("samples")
    .insert({ name: "Test Sample", word_count: 100 })
    .select()
    .single();
  expect(created).toBeTruthy();

  // Read
  const { data: read } = await client
    .from("samples")
    .select("*")
    .eq("id", created.id)
    .single();
  expect(read.id).toBe(created.id);

  // Update
  const { data: updated } = await client
    .from("samples")
    .update({ name: "Updated Sample" })
    .eq("id", created.id)
    .select()
    .single();
  expect(updated.name).toBe("Updated Sample");

  // Delete
  const { error: deleteError } = await client
    .from("samples")
    .delete()
    .eq("id", created.id);
  expect(deleteError).toBeNull();
});
```

---

**Test Case 5: Global Templates Visible to All**

```typescript
test("Global templates visible to all stores", async () => {
  const store1Client = await loginAs("store1@test.com");
  const store2Client = await loginAs("store2@test.com");

  // Both should see global templates
  const { data: store1Templates } = await store1Client
    .from("category_templates")
    .select("*")
    .is("store_id", null); // Global templates

  const { data: store2Templates } = await store2Client
    .from("category_templates")
    .select("*")
    .is("store_id", null);

  expect(store1Templates.length).toBeGreaterThan(0);
  expect(store1Templates).toEqual(store2Templates);
});
```

---

### Phase 3: API Route Testing

**Test All API Routes:**

```bash
# List all API routes
find src/app/api -name "route.ts" | sort

# Test each route
npm run test -- api
```

**Critical Routes to Test:**

- [ ] `/api/content-center/content` - Content CRUD
- [ ] `/api/content-center/samples` - Samples list
- [ ] `/api/content-center/voice/history` - Voice profiles
- [ ] `/api/generate/create` - Content generation
- [ ] `/api/enhance` - Content enhancement
- [ ] `/api/shopify/products/[id]` - Product access
- [ ] `/api/sizing` - Shop sizing data

**For Each Route:**

1. Access with valid store token → Should work ✅
2. Access with different store token → Should fail ❌
3. Access without token → Should fail ❌

---

### Phase 4: Integration Testing

**Full User Flow Test:**

```typescript
describe("Complete user flow with RLS", () => {
  test("Store owner completes full workflow", async () => {
    // 1. Login
    const auth = await loginAs("store1@test.com");
    expect(auth.token).toBeTruthy();

    // 2. View dashboard
    const dashboard = await fetch("http://store1.localhost:3050/dashboard", {
      headers: { Authorization: `Bearer ${auth.token}` },
    });
    expect(dashboard.status).toBe(200);

    // 3. Create sample
    const sample = await createSample(auth.token, {
      name: "Integration Test Sample",
      word_count: 150,
    });
    expect(sample.id).toBeTruthy();

    // 4. Generate content
    const content = await generateContent(auth.token, {
      productId: "test-product",
      sampleId: sample.id,
    });
    expect(content.title).toBeTruthy();

    // 5. View content history
    const history = await fetch(
      "http://localhost:3050/api/content-center/content",
      {
        headers: { Authorization: `Bearer ${auth.token}` },
      },
    );
    const { data } = await history.json();
    expect(data).toContainEqual(expect.objectContaining({ id: content.id }));

    // 6. Cleanup
    await deleteSample(auth.token, sample.id);
  });
});
```

---

### Phase 5: Performance Testing

**Verify RLS Doesn't Slow Down Queries:**

```typescript
test("Query performance with RLS", async () => {
  const client = await loginAs("store1@test.com");

  // Measure query time
  const start = Date.now();
  const { data } = await client.from("content").select("*").limit(100);
  const duration = Date.now() - start;

  expect(duration).toBeLessThan(1000); // Should complete in <1 second
  expect(data.length).toBeLessThanOrEqual(100);
});
```

---

## Rollback Plan

### If Tests Fail

**Option 1: Fix Policy (Preferred)**

```bash
# Create new migration to fix policy
supabase migration new fix_rls_policy

# Update problematic policy
# Re-test
```

**Option 2: Rollback Migration**

```bash
# Restore from backup
supabase db reset

# Or manually disable RLS on problematic table
ALTER TABLE table_name DISABLE ROW LEVEL SECURITY;
```

**Option 3: Revert Branch**

```bash
# If everything breaks
git checkout main-typescript
git branch -D feature/rls-security-policies

# Restore database
psql < backup-before-rls.sql
```

---

## Sign-off Checklist

Before merging to main, verify:

### Database

- [ ] RLS enabled on all tables
- [ ] All policies created successfully
- [ ] Policies tested with SQL directly
- [ ] Database backup created

### Application

- [ ] App starts without errors
- [ ] All existing features work
- [ ] Users can access own data
- [ ] Users CANNOT access other stores' data
- [ ] Global templates work
- [ ] API routes return correct data

### Testing

- [ ] All unit tests pass
- [ ] All integration tests pass
- [ ] Manual testing completed
- [ ] Performance acceptable (<1s queries)
- [ ] No TypeScript errors
- [ ] No ESLint errors

### Documentation

- [ ] Migration documented
- [ ] Test results documented
- [ ] Rollback plan tested
- [ ] Team notified of changes

### Security

- [ ] Cross-store access blocked
- [ ] JWT validation working
- [ ] SQL injection tests pass
- [ ] Security scan clean

---

## Test Execution Log

**Date:** [Fill in when running tests]

| Test                  | Status | Notes |
| --------------------- | ------ | ----- |
| Baseline - Dev server | ⬜     |       |
| Baseline - Type check | ⬜     |       |
| Baseline - Tests pass | ⬜     |       |
| Migration applies     | ⬜     |       |
| App starts            | ⬜     |       |
| Own data access       | ⬜     |       |
| Cross-store blocked   | ⬜     |       |
| CRUD operations       | ⬜     |       |
| Global templates      | ⬜     |       |
| API routes            | ⬜     |       |
| Integration flow      | ⬜     |       |
| Performance           | ⬜     |       |

**Overall Result:** ⬜ PASS / ⬜ FAIL

**Decision:** ⬜ Merge to main / ⬜ Fix issues / ⬜ Rollback

---

## Next Steps After Testing

### If All Tests Pass ✅

1. Update `SECURITY_ACTION_PLAN.md` - Mark Task 1 complete
2. Update `SECURITY_PROGRESS.md` - Update progress bar
3. Create PR from `feature/rls-security-policies` to `main-typescript`
4. Request code review
5. Merge after approval
6. Deploy to staging
7. Test in staging environment
8. Deploy to production

### If Tests Fail ❌

1. Document failures in this file
2. Create fix migration
3. Re-test
4. If unfixable: Rollback
5. Update action plan with blocker status
