# Auth Migration Checklist

## ACE JWT → ThunderTex NextAuth

**Purpose**: Step-by-step checklist for migrating all ACE routes from JWT to NextAuth
**Timeline**: Week 2-3 of Phase 2 (Core Integration)

---

## 📋 Pre-Migration (Day 1)

### Setup

- [ ] Read [AUTH_MIGRATION_STRATEGY.md](AUTH_MIGRATION_STRATEGY.md)
- [ ] Create feature branch: `feature/auth-migration`
- [ ] Create backup tag: `backup-pre-auth-migration`

### Compatibility Layer

- [ ] Create `/src/lib/auth/ace-compat.ts`
- [ ] Implement `requireAuth()` wrapper
- [ ] Add TypeScript types for req.user
- [ ] Test wrapper with sample route

### Testing Infrastructure

- [ ] Set up auth mocking for tests
- [ ] Create auth test helpers
- [ ] Write integration test suite

---

## 🔐 API Route Migration (Day 2-5)

### AIE Routes (Day 2)

#### `/api/aie/generate`

- [ ] Locate: `ace-app/src/app/api/aie/generate/route.ts`
- [ ] Replace `requireApp('ace')` with `requireAuth('user')`
- [ ] Update user context access
- [ ] Test generation with NextAuth session
- [ ] Verify database queries work
- [ ] **Status**: ⬜ Not Started

#### `/api/aie/embeddings`

- [ ] Locate: `ace-app/src/app/api/aie/embeddings/route.ts`
- [ ] Replace auth middleware
- [ ] Update user context
- [ ] Test embedding retrieval
- [ ] **Status**: ⬜ Not Started

#### `/api/aie/library`

- [ ] Locate: `ace-app/src/app/api/aie/library/route.ts`
- [ ] Replace auth middleware
- [ ] Update user context
- [ ] Test library access
- [ ] **Status**: ⬜ Not Started

---

### Facebook OAuth Routes (Day 3)

#### `/api/facebook/oauth/authorize`

- [ ] Locate: `ace-app/src/app/api/facebook/oauth/authorize/route.ts`
- [ ] Replace auth middleware
- [ ] Update user context
- [ ] Test OAuth flow start
- [ ] **Status**: ⬜ Not Started

#### `/api/facebook/oauth/callback`

- [ ] Locate: `ace-app/src/app/api/facebook/oauth/callback/route.ts`
- [ ] Replace auth middleware
- [ ] Update token storage with shop context
- [ ] Test full OAuth flow
- [ ] **Status**: ⬜ Not Started

#### `/api/facebook/oauth/disconnect`

- [ ] Locate: `ace-app/src/app/api/facebook/oauth/disconnect/route.ts`
- [ ] Replace auth middleware
- [ ] Update user context
- [ ] Test disconnect flow
- [ ] **Status**: ⬜ Not Started

---

### Facebook Data Routes (Day 3)

#### `/api/facebook/insights`

- [ ] Locate: `ace-app/src/app/api/facebook/insights/route.ts`
- [ ] Replace auth middleware
- [ ] Update user context
- [ ] Test insights retrieval
- [ ] **Status**: ⬜ Not Started

#### `/api/facebook/settings`

- [ ] Locate: `ace-app/src/app/api/facebook/settings/route.ts`
- [ ] Replace auth middleware
- [ ] Update user context
- [ ] Test settings CRUD
- [ ] **Status**: ⬜ Not Started

#### `/api/facebook/ad-accounts`

- [ ] Locate: `ace-app/src/app/api/facebook/ad-accounts/route.ts`
- [ ] Replace auth middleware
- [ ] Test account listing
- [ ] **Status**: ⬜ Not Started

#### `/api/facebook/campaigns`

- [ ] Locate: `ace-app/src/app/api/facebook/campaigns/route.ts`
- [ ] Replace auth middleware
- [ ] Test campaign management
- [ ] **Status**: ⬜ Not Started

#### `/api/facebook/ad-drafts`

- [ ] Locate: `ace-app/src/app/api/facebook/ad-drafts/route.ts`
- [ ] Replace auth middleware
- [ ] Test draft operations
- [ ] **Status**: ⬜ Not Started

---

### Business Profile Routes (Day 4)

#### `/api/business-profile/*` (all routes)

- [ ] List all business profile API routes
- [ ] Migrate each route systematically
- [ ] Update user context access
- [ ] Test profile builder flow
- [ ] Verify 21-question interview
- [ ] **Status**: ⬜ Not Started

---

### Brand Voice Routes (Day 4)

#### `/api/brand-voice/*` (all routes)

- [ ] List all brand voice API routes
- [ ] Migrate each route
- [ ] Update user context
- [ ] Test voice analysis
- [ ] **Status**: ⬜ Not Started

---

### Best Practices Routes (Day 5)

#### `/api/best-practices/*` (all routes)

- [ ] List all best practices API routes
- [ ] Migrate each route
- [ ] Update RAG retrieval
- [ ] Test embedding search
- [ ] **Status**: ⬜ Not Started

---

## 🎨 Frontend Updates (Day 5)

### Remove JWT Token Management

- [ ] Remove JWT storage code
- [ ] Remove Authorization headers
- [ ] Update fetch calls to use credentials: 'include'
- [ ] Test session cookie handling

### Session Context

- [ ] Update useSession hooks
- [ ] Remove custom auth state management
- [ ] Test session persistence
- [ ] Verify auto-refresh

---

## 🔒 Security Verification (Day 5)

### Session Security

- [ ] Verify `secure` flag on cookies (production)
- [ ] Check `httpOnly` flag
- [ ] Validate `sameSite` setting for embedded apps
- [ ] Test session expiration

### CSRF Protection

- [ ] Verify NextAuth CSRF tokens
- [ ] Test form submissions
- [ ] Check API route protection

### Tenant Isolation

- [ ] Test multi-tenant queries with NextAuth
- [ ] Verify RLS policies enforce shop scope
- [ ] Test cross-tenant access prevention

---

## 🧪 Testing (Day 6)

### Unit Tests

- [ ] Auth middleware tests
- [ ] Session validation tests
- [ ] User context tests
- [ ] Role-based access tests

### Integration Tests

- [ ] Full auth flow (login → API call → data access)
- [ ] OAuth integration (Facebook)
- [ ] AIE generation with auth
- [ ] Business profile with auth

### E2E Tests

- [ ] Complete user journey
- [ ] Session persistence across routes
- [ ] Logout and re-authentication

---

## 🧹 Cleanup (Day 6)

### Remove JWT Code

- [ ] Delete `ace-app/src/lib/shared-backend/auth/jwt.ts`
- [ ] Delete `ace-app/src/lib/shared-backend/auth/middleware.ts`
- [ ] Remove `jsonwebtoken` dependency (if not needed)
- [ ] Remove `@types/jsonwebtoken`

### Update Documentation

- [ ] Remove JWT references
- [ ] Document NextAuth usage
- [ ] Update API documentation

---

## ✅ Completion Criteria

### Functionality

- [ ] All ACE routes use NextAuth
- [ ] No JWT dependencies remain
- [ ] All tests passing
- [ ] No authentication errors in logs

### Security

- [ ] Session cookies secure
- [ ] CSRF protection active
- [ ] Tenant isolation verified
- [ ] No security regressions

### Performance

- [ ] Session lookup performant
- [ ] No authentication bottlenecks
- [ ] Cookie size optimized

---

## 📊 Progress Tracking

| Category         | Routes  | Migrated | Status     |
| ---------------- | ------- | -------- | ---------- |
| AIE              | 3       | 0        | ⬜ Pending |
| Facebook OAuth   | 3       | 0        | ⬜ Pending |
| Facebook Data    | 5       | 0        | ⬜ Pending |
| Business Profile | ~5      | 0        | ⬜ Pending |
| Brand Voice      | ~3      | 0        | ⬜ Pending |
| Best Practices   | ~2      | 0        | ⬜ Pending |
| **Total**        | **~21** | **0**    | **0%**     |

---

## 🚨 Rollback Plan

If major issues occur:

1. **Revert auth changes**:

   ```bash
   git revert <commit-hash>
   git push
   ```

2. **Keep ACE running** as fallback (port 3051)

3. **Database unchanged** - no rollback needed

4. **Debug and retry** - auth is isolated layer

---

## 📝 Notes & Issues

### Blockers

- None currently identified

### Questions

- None

### Decisions Made

- Using `requireAuth()` compatibility wrapper for gradual migration
- Keeping JWT dependency temporarily for legacy token verification (if needed)
- Prioritizing AIE routes first (most critical)

---

**Start Date**: TBD (Week 2 of Phase 2)
**Target Completion**: 6 working days
**Owner**: Integration Team
**Status**: 📋 Ready to Start
