# Database Access Patterns

This document defines the correct patterns for accessing the Thunder Text database to ensure tenant isolation and security.

## Overview

Thunder Text uses a **multi-tenant architecture** where each Shopify store (`shop`) is a separate tenant with isolated data. We use two database access methods:

1. **Supabase Client** (PostgREST) - For most operations
2. **Direct PostgreSQL** - For operations requiring PostgREST bypass

## Critical Security Principle

**ALL tenant-scoped data must include explicit tenant filtering**, regardless of which access method is used.

---

## Access Method 1: Supabase Client (Preferred)

### When to Use

- Standard CRUD operations
- Operations that benefit from PostgREST's automatic schema detection
- When Row Level Security (RLS) policies are sufficient

### Example: Supabase with RLS

```typescript
import { supabaseAdmin } from "@/lib/supabase";
import { getUserId } from "@/lib/auth/content-center-auth";

export async function POST(request: NextRequest) {
  const userId = await getUserId(request); // Returns store_id

  // RLS policies automatically filter by store_id
  const { data, error } = await supabaseAdmin
    .from("business_profiles")
    .select("*")
    .eq("store_id", userId) // ✅ Explicit tenant filter
    .single();
}
```

### RLS Policies

RLS policies are enabled on all tenant-scoped tables:

- `business_profiles`
- `business_profile_responses`
- `brand_voice_profiles`
- `content_samples`
- `generated_content`
- `facebook_ad_drafts`
- `product_descriptions`

---

## Access Method 2: Direct PostgreSQL (When PostgREST Fails)

### When to Use

- PostgREST schema cache issues
- Complex transactions requiring explicit control
- Bulk operations requiring performance optimization

### ⚠️ SECURITY WARNING

Direct PostgreSQL connections **bypass RLS policies entirely**. You MUST use tenant-aware wrappers.

### Correct Pattern: Tenant-Aware Query

```typescript
import { queryWithTenant } from "@/lib/postgres";
import { getUserId } from "@/lib/auth/content-center-auth";

export async function POST(request: NextRequest) {
  const userId = await getUserId(request); // Returns store_id

  // ✅ CORRECT: Uses tenant-aware wrapper
  const result = await queryWithTenant(
    userId, // Tenant ID for audit logging
    `INSERT INTO business_profile_responses (business_profile_id, response_text)
     VALUES ($1, $2)
     RETURNING *`,
    [profileId, responseText],
  );
}
```

### ❌ INCORRECT Pattern: Direct Pool Access

```typescript
import { pool } from "@/lib/postgres";

// ❌ WRONG: Bypasses tenant isolation!
const result = await pool.query("INSERT INTO business_profile_responses ...", [
  profileId,
  responseText,
]);
```

---

## Tenant-Aware Database Functions

### `queryWithTenant<T>(tenantId, query, values)`

Execute a parameterized query with tenant audit logging.

**Parameters:**

- `tenantId: string` - The authenticated user's store_id
- `query: string` - Parameterized SQL query
- `values: any[]` - Query parameters

**Returns:** `Promise<QueryResult<T>>`

**Security Features:**

- Validates tenantId is present
- Logs all tenant-scoped operations
- Auto-releases database connection

**Example:**

```typescript
const response = await queryWithTenant<BusinessProfileResponse>(
  userId,
  `INSERT INTO business_profile_responses (
    business_profile_id, prompt_key, response_text
  ) VALUES ($1, $2, $3)
  RETURNING *`,
  [profileId, promptKey, responseText],
);
```

### `getTenantClient(tenantId)`

Get a connection with tenant audit logging for multiple operations.

**Use Case:** When you need to execute multiple queries in sequence.

**Example:**

```typescript
const client = await getTenantClient(userId);
try {
  await client.query("BEGIN");
  await client.query("INSERT ...");
  await client.query("UPDATE ...");
  await client.query("COMMIT");
} catch (error) {
  await client.query("ROLLBACK");
  throw error;
} finally {
  client.release();
}
```

---

## Security Validation Checklist

Before merging any code that accesses tenant data, verify:

### ✅ Required Security Checks

1. **Authentication Present**

   ```typescript
   const userId = await getUserId(request);
   if (!userId) {
     return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
   }
   ```

2. **Tenant Filter Applied**

   ```typescript
   // Supabase
   .eq('store_id', userId)

   // Direct SQL
   await queryWithTenant(userId, query, values)
   ```

3. **Response Validation**

   ```typescript
   // After fetching profile
   if (profile.store_id !== userId) {
     console.error("🚨 SECURITY VIOLATION: Tenant mismatch");
     return NextResponse.json({ error: "Forbidden" }, { status: 403 });
   }
   ```

4. **Audit Logging**
   ```typescript
   console.log("🔒 Tenant-scoped operation:", {
     tenant: userId,
     operation: "INSERT",
     table: "business_profile_responses",
   });
   ```

---

## Tenant-Scoped Tables

Tables requiring tenant isolation:

### Core Business Data

- `business_profiles` - Filter by `store_id`
- `business_profile_responses` - Join to `business_profiles.store_id`
- `profile_generation_history` - Join to `business_profiles.store_id`

### Content Center

- `brand_voice_profiles` - Filter by `store_id`
- `content_samples` - Filter by `store_id`
- `generated_content` - Filter by `store_id`

### Marketing

- `facebook_ad_drafts` - Filter by `store_id`
- `product_descriptions` - Filter by `store_id`

### System Tables (No Tenant Filtering)

- `interview_prompts` - System-wide data
- `category_templates` - Shared templates
- `system_prompts` - Global prompts

---

## Testing Tenant Isolation

All tenant-scoped operations must have security tests:

```typescript
describe("POST /api/business-profile/answer", () => {
  it("should reject unauthenticated requests", async () => {
    const response = await POST(requestWithoutAuth);
    expect(response.status).toBe(401);
  });

  it("should prevent cross-tenant data access", async () => {
    // Create data for Tenant A
    const profileA = await createProfile(TENANT_A_ID);

    // Attempt to access as Tenant B
    const response = await POST(
      requestWithAuth(TENANT_B_ID, {
        profile_id: profileA.id,
      }),
    );

    expect(response.status).toBe(403);
  });
});
```

---

## Migration Best Practices

When creating migrations for tenant-scoped tables:

```sql
-- Enable RLS
ALTER TABLE new_tenant_table ENABLE ROW LEVEL SECURITY;

-- Create policies for all operations
CREATE POLICY "Store owners view own data"
  ON new_tenant_table FOR SELECT
  USING (store_id = current_setting('request.jwt.claims', true)::json->>'sub');

CREATE POLICY "Store owners insert own data"
  ON new_tenant_table FOR INSERT
  WITH CHECK (store_id = current_setting('request.jwt.claims', true)::json->>'sub');

-- Add indexes for tenant filtering
CREATE INDEX idx_new_tenant_table_store ON new_tenant_table(store_id);
```

---

## Common Pitfalls

### ❌ Forgetting Tenant Filter

```typescript
// Wrong: No tenant filter
const { data } = await supabaseAdmin
  .from("business_profiles")
  .select("*")
  .eq("id", profileId); // Missing .eq('store_id', userId)
```

### ❌ Using Raw Pool

```typescript
// Wrong: Bypasses tenant isolation
import { pool } from "@/lib/postgres";
const result = await pool.query("INSERT ...");
```

### ❌ Trusting Client Input

```typescript
// Wrong: profileId could belong to another tenant
const { profile_id } = await request.json();
const { data } = await supabaseAdmin
  .from("business_profiles")
  .select("*")
  .eq("id", profile_id); // No store_id validation!
```

### ✅ Correct: Validate Ownership

```typescript
const { profile_id } = await request.json();
const { data: profile } = await supabaseAdmin
  .from("business_profiles")
  .select("*")
  .eq("id", profile_id)
  .eq("store_id", userId) // ✅ Explicit tenant filter
  .single();

if (!profile) {
  return NextResponse.json({ error: "Not found" }, { status: 404 });
}
```

---

## Audit Trail

All tenant-scoped operations are automatically logged:

```
🔒 Tenant-scoped query: {
  tenantId: "6ef553bf-1dd2-4c85-8bec-23a902cb14bb",
  operation: "INSERT",
  table: "business_profile_responses"
}
```

For production, these logs should be:

1. Sent to centralized logging (DataDog, CloudWatch, etc.)
2. Analyzed for suspicious patterns
3. Retained for compliance (SOC 2, GDPR)

---

## Additional Resources

- [Supabase RLS Documentation](https://supabase.com/docs/guides/auth/row-level-security)
- [PostgreSQL Row Security Policies](https://www.postgresql.org/docs/current/ddl-rowsecurity.html)
- Thunder Text Security Tests: `src/__tests__/security/tenant-isolation.test.ts`
