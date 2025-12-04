# Authentication Migration Strategy

## JWT (ACE) → NextAuth (ThunderTex)

**Date**: November 27, 2025
**Purpose**: Guide for migrating ACE's JWT authentication to ThunderTex's NextAuth system

---

## Overview

### Current State

**ACE (JWT-Based)**:

- Custom JWT tokens with app-scoped claims
- Middleware: `requireApp('ace')`
- Token contains: `{ userId, shop, app: 'ace' }`
- Stored in: HTTP-only cookies or Authorization header

**ThunderTex (NextAuth)**:

- NextAuth v5 with multi-role support
- Roles: `admin`, `coach`, `user`
- Session contains: `{ user: { id, email, role }, shop }`
- Shopify OAuth + credential-based auth

---

## Migration Strategy

### Phase 1: Understanding Current Auth Patterns

#### ACE JWT Middleware

```typescript
// ace-app/src/lib/shared-backend/auth/middleware.ts
export function requireApp(appName: string) {
  return function (handler: RouteHandler) {
    return async (req: Request) => {
      const token = await verifyJWT(req);

      if (!token || token.app !== appName) {
        return new Response("Unauthorized", { status: 401 });
      }

      // Attach user context
      req.user = {
        userId: token.userId,
        shop: token.shop,
      };

      return handler(req);
    };
  };
}
```

#### ThunderTex NextAuth Pattern

```typescript
// thunder-text/src/middleware.ts
export async function middleware(request: NextRequest) {
  const token = await getToken({
    req: request,
    secret: process.env.NEXTAUTH_SECRET,
  });

  if (!token || token.role !== "user") {
    return NextResponse.redirect("/auth/login");
  }

  return NextResponse.next();
}
```

---

## Migration Approach

### Option 1: Direct Replacement (Recommended)

Replace all ACE JWT middleware with NextAuth session checks:

```typescript
// Before (ACE)
import { requireApp } from "@/lib/shared-backend/auth/middleware";

export const GET = requireApp("ace")(async (req) => {
  const { userId, shop } = req.user;
  // ... route logic
});

// After (ThunderTex)
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);

  if (!session || session.user.role !== "user") {
    return new Response("Unauthorized", { status: 401 });
  }

  const { id: userId } = session.user;
  const shop = request.cookies.get("shopify_shop")?.value;

  // ... route logic
}
```

### Option 2: Temporary Compatibility Layer

For gradual migration, create a wrapper:

```typescript
// thunder-text/src/lib/auth/ace-compat.ts
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { NextRequest } from "next/server";

/**
 * Compatibility wrapper for ACE routes
 * Provides same interface as ACE's requireApp() but uses NextAuth
 */
export function requireAuth(requiredRole: "user" | "coach" | "admin" = "user") {
  return function (
    handler: (req: NextRequest & { user: any }) => Promise<Response>,
  ) {
    return async (req: NextRequest) => {
      const session = await getServerSession(authOptions);

      if (!session || session.user.role !== requiredRole) {
        return new Response("Unauthorized", { status: 401 });
      }

      // Attach user context (same shape as ACE)
      const shop = req.cookies.get("shopify_shop")?.value;
      (req as any).user = {
        userId: session.user.id,
        shop: shop,
        role: session.user.role,
      };

      return handler(req as any);
    };
  };
}
```

Usage:

```typescript
// Minimal changes to ACE routes
import { requireAuth } from "@/lib/auth/ace-compat";

export const GET = requireAuth("user")(async (req) => {
  const { userId, shop } = req.user;
  // Original ACE logic works as-is
});
```

---

## Migration Checklist

### Pre-Migration Preparation

- [x] ✅ Verify both apps use same Supabase
- [x] ✅ Identify all ACE API routes requiring auth
- [ ] Map ACE routes to user roles (all → 'user')
- [ ] Create auth compatibility wrapper
- [ ] Test NextAuth session format

### API Route Migration Pattern

For each ACE API route:

1. **Locate route**: `ace-app/src/app/api/**/*.ts`
2. **Identify auth usage**: Look for `requireApp('ace')`
3. **Replace middleware**:
   - Remove: `import { requireApp }`
   - Add: `import { requireAuth }` or direct NextAuth
4. **Update user context access**:
   - `req.user.userId` → `session.user.id`
   - `req.user.shop` → `req.cookies.get('shopify_shop')`
5. **Test**: Verify route works with NextAuth session

### Routes Requiring Migration

**ACE API Routes** (from /ace-app/src/app/api/):

```
/api/aie/*
  - /generate          (requireApp)
  - /embeddings        (requireApp)
  - /library           (requireApp)

/api/facebook/*
  - /oauth/authorize   (requireApp)
  - /oauth/callback    (requireApp)
  - /oauth/disconnect  (requireApp)
  - /insights          (requireApp)
  - /settings          (requireApp)
  - /ad-accounts       (requireApp)
  - /campaigns         (requireApp)
  - /ad-drafts         (requireApp)

/api/business-profile/*
  - (all routes)       (requireApp)

/api/brand-voice/*
  - (all routes)       (requireApp)

/api/best-practices/*
  - (all routes)       (requireApp)
```

**Estimated Routes**: ~15-20 API routes

---

## Session Data Mapping

### ACE JWT Token

```typescript
{
  userId: string,
  shop: string,
  app: 'ace',
  iat: number,
  exp: number
}
```

### ThunderTex NextAuth Session

```typescript
{
  user: {
    id: string,        // ← maps to userId
    email: string,
    name?: string,
    role: 'user' | 'coach' | 'admin'
  },
  expires: string
}

// Shop ID from:
cookies.get('shopify_shop')  // Set by middleware
```

### Mapping Strategy

```typescript
// ACE way
const userId = req.user.userId;
const shop = req.user.shop;

// ThunderTex way
const userId = session.user.id;
const shop = req.cookies.get("shopify_shop")?.value;
```

---

## RLS Policy Compatibility

### Current RLS Pattern

ThunderTex uses application-level tenant isolation:

```typescript
const client = await getTenantClient(shop);
```

This is **auth-agnostic** - works with both JWT and NextAuth!

### Verification Needed

Test that NextAuth sessions work with existing RLS:

```typescript
// Test query with NextAuth session
const session = await getServerSession(authOptions);
const shop = req.cookies.get("shopify_shop")?.value;

const client = await getTenantClient(shop);
const result = await client.query(
  "SELECT * FROM business_profiles WHERE shop_id = $1",
  [shop],
);
```

Expected: ✅ Should work without RLS changes

---

## Frontend Auth Changes

### ACE Frontend (if any)

```typescript
// Fetch with JWT
fetch("/api/aie/generate", {
  headers: {
    Authorization: `Bearer ${jwtToken}`,
  },
});
```

### ThunderTex Frontend

```typescript
// Fetch with session (automatic via cookies)
fetch("/api/aie/generate", {
  credentials: "include", // Include cookies
});
```

NextAuth handles session cookies automatically - no manual token management needed.

---

## Migration Timeline

### Week 2-3: Core Integration

**Day 1-2**: Auth Infrastructure

- [ ] Create `requireAuth()` compatibility wrapper
- [ ] Test wrapper with sample route
- [ ] Update middleware.ts matchers for ACE routes

**Day 3-4**: AIE Routes

- [ ] Migrate `/api/aie/generate`
- [ ] Migrate `/api/aie/embeddings`
- [ ] Migrate `/api/aie/library`
- [ ] Test AIE generation with NextAuth

**Day 5**: Facebook Routes

- [ ] Migrate OAuth routes
- [ ] Migrate insights/settings
- [ ] Test Facebook integration

**Week 3**: Profile & Voice Routes

- [ ] Migrate business profile routes
- [ ] Migrate brand voice routes
- [ ] Migrate best practices routes

---

## Testing Strategy

### Unit Tests

```typescript
describe("Auth Migration", () => {
  it("should accept NextAuth session", async () => {
    const mockSession = {
      user: { id: "user123", role: "user" },
    };

    // Test route with mocked session
    const response = await GET(mockRequest);
    expect(response.status).toBe(200);
  });

  it("should reject missing session", async () => {
    // Test without session
    const response = await GET(mockRequest);
    expect(response.status).toBe(401);
  });
});
```

### Integration Tests

1. Log in via NextAuth
2. Call migrated API route
3. Verify response and database query
4. Check tenant isolation works

---

## Rollback Strategy

If issues arise during migration:

1. **Keep ACE running** on port 3051 (backup)
2. **Feature flags** to toggle new routes
3. **Database unchanged** - no rollback needed
4. **Quick revert**: Remove NextAuth calls, restore JWT

---

## Security Considerations

### ✅ Improvements with NextAuth

1. **Industry-standard auth** - Better security practices
2. **Built-in CSRF protection** - NextAuth handles this
3. **Session management** - Automatic token refresh
4. **Multi-provider support** - Can add Google/GitHub later

### ⚠️ Watch For

1. **Session expiration** - Configure appropriate timeouts
2. **Cookie security** - Ensure `secure` flag in production
3. **CORS settings** - Update for embedded Shopify app
4. **Token refresh** - Implement refresh strategy

---

## Success Criteria

- [ ] All ACE API routes use NextAuth
- [ ] No JWT dependencies remaining
- [ ] RLS policies work with NextAuth
- [ ] Frontend auth works seamlessly
- [ ] Tests pass for all migrated routes
- [ ] No security regressions
- [ ] Session timeout configured properly

---

## Resources

### NextAuth Docs

- https://next-auth.js.org/getting-started/introduction
- https://next-auth.js.org/configuration/callbacks

### Current Implementation

- ThunderTex: `src/app/api/auth/[...nextauth]/route.ts`
- ThunderTex: `src/middleware.ts`
- ACE: `ace-app/src/lib/shared-backend/auth/`

---

**Status**: Ready for Implementation
**Estimated Effort**: 3-4 days (Week 2-3 of integration)
**Risk Level**: Low (auth-agnostic database layer)
