# ThunderTex Code Review Preparation Guide

**App**: ThunderTex - AI-Powered Product Description Generator
**Prepared For**: External Agency Review & Shopify App Review

---

## 1. Project Overview

### What ThunderTex Does
ThunderTex is a Shopify app that uses AI (OpenAI GPT-4) to generate SEO-optimized product descriptions. Merchants can:
- Create brand voice profiles
- Generate descriptions based on product data
- Manage content in a centralized library
- Connect to Facebook, Google, and TikTok for ad campaigns

### Technology Stack

| Layer | Technology | Version |
|-------|------------|---------|
| Framework | Next.js (App Router) | 15.5.2 |
| Language | TypeScript | 5.x |
| Database | Supabase (PostgreSQL) | - |
| Authentication | NextAuth.js | 4.24.10 |
| UI | Shopify Polaris | 13.x |
| AI | OpenAI API | GPT-4 |
| Validation | Zod | 3.24.1 |
| Error Tracking | Sentry | 10.27.0 |
| Testing | Jest + Playwright | 30.1.3 |

---

## 2. Directory Structure

```
thunder-text/
├── src/
│   ├── app/                          # Next.js App Router
│   │   ├── (auth)/                   # Auth route group
│   │   ├── (protected)/              # Protected routes
│   │   ├── api/                      # API endpoints
│   │   │   ├── auth/                 # Auth endpoints
│   │   │   ├── business-profile/     # Profile management
│   │   │   ├── content-center/       # Content library
│   │   │   ├── facebook/             # Facebook integration
│   │   │   ├── google/               # Google integration
│   │   │   ├── tiktok/               # TikTok integration
│   │   │   ├── webhooks/             # Shopify webhooks
│   │   │   └── debug/                # Debug endpoints
│   │   └── layout.tsx
│   ├── components/                   # React components
│   │   ├── ui/                       # Base UI components
│   │   └── features/                 # Feature-specific
│   ├── lib/                          # Core libraries
│   │   ├── auth/                     # Authentication
│   │   ├── security/                 # Security utilities
│   │   ├── middleware/               # Custom middleware
│   │   ├── services/                 # Business logic
│   │   └── utils/                    # Utilities
│   ├── middleware.ts                 # Route middleware
│   └── __tests__/                    # Test files
│       ├── security/                 # Security tests
│       └── auth/                     # Auth tests
├── supabase/
│   └── migrations/                   # 51 SQL migrations
├── docs/                             # Documentation
├── .github/workflows/                # CI/CD
└── Configuration files
```

---

## 3. Key Files for Review

### Security-Critical Files

| File | Purpose | Priority |
|------|---------|----------|
| `src/middleware.ts` | CORS, CSP, route protection | Critical |
| `src/lib/middleware/webhook-validation.ts` | Shopify webhook HMAC | Critical |
| `src/lib/security/oauth-validation.ts` | OAuth state handling | Critical |
| `src/lib/security/input-sanitization.ts` | XSS prevention | Critical |
| `src/lib/auth/auth-options.ts` | NextAuth configuration | Critical |
| `src/lib/postgres.ts` | Database tenant isolation | Critical |
| `src/lib/middleware/rate-limit.ts` | Rate limiting | High |

### Configuration Files

| File | Purpose |
|------|---------|
| `next.config.ts` | Security headers, CSP |
| `tsconfig.json` | TypeScript strict mode |
| `eslint.config.mjs` | Security linting rules |
| `.env.example` | Environment template |
| `shopify.app.toml` | Shopify app config |

### Database Security

| File | Purpose |
|------|---------|
| `supabase/migrations/20251024_fix_rls_policies_production.sql` | RLS policies |
| `src/__tests__/security/rls-integration.test.ts` | RLS testing |

---

## 4. Authentication Flow

### Shopify OAuth

```
1. Merchant clicks "Install" in Shopify App Store
2. → /api/auth/shopify?shop=store.myshopify.com
3. App validates shop domain format
4. App generates OAuth state (shop + timestamp + nonce)
5. → Redirect to Shopify OAuth consent screen
6. Merchant grants permissions
7. → /api/auth/shopify/callback?code=xxx&state=xxx
8. App validates state parameter
9. App exchanges code for access token
10. App stores token in Supabase (encrypted)
11. → Redirect to /app (protected dashboard)
```

### NextAuth Session

```typescript
// Session structure
{
  user: {
    id: string,
    email: string,
    role: 'admin' | 'coach' | 'shop',
    shopDomain?: string,
  },
  expires: string // ISO date
}
```

---

## 5. API Route Patterns

### Protected Route Pattern

```typescript
// Example: /api/business-profile/answer
export async function POST(request: Request) {
  // 1. Authentication check
  const userId = await getUserId(request);
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // 2. Input validation with Zod
  const body = await request.json();
  const result = AnswerSchema.safeParse(body);
  if (!result.success) {
    return NextResponse.json(
      { error: 'Validation failed', details: result.error.flatten() },
      { status: 400 }
    );
  }

  // 3. Business logic with tenant isolation
  const { data } = await supabaseAdmin
    .from('business_profiles')
    .select('*')
    .eq('store_id', userId)  // Always filter by tenant
    .single();

  // 4. Return response
  return NextResponse.json({ data });
}
```

### Webhook Pattern

```typescript
// Example: /api/webhooks/app-uninstalled
export async function POST(request: Request) {
  // 1. Validate webhook signature
  const validation = await validateWebhook(request);
  if (!validation.valid) {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
  }

  // 2. Parse validated body
  const data = JSON.parse(validation.body!);

  // 3. Process webhook
  await handleAppUninstalled(data);

  return NextResponse.json({ success: true });
}
```

---

## 6. Security Implementation Details

### Row Level Security (RLS)

All tables use RLS for multi-tenant isolation:

```sql
-- Example: content_samples table
CREATE POLICY "Shops access own content samples"
  ON content_samples FOR ALL
  TO authenticated
  USING (store_id = auth.uid())
  WITH CHECK (store_id = auth.uid());
```

**Tables with RLS**:
- `shops`
- `content_samples`
- `brand_voice_profiles`
- `generated_content`
- `business_profiles`

### Input Sanitization

```typescript
// src/lib/security/input-sanitization.ts
sanitizeHTML(input)      // Removes XSS vectors
sanitizeURL(url)         // Blocks javascript:, data: protocols
sanitizeFilename(name)   // Prevents path traversal
sanitizeEmail(email)     // Validates format
```

### Webhook Validation

```typescript
// src/lib/middleware/webhook-validation.ts
// Uses HMAC-SHA256 with timing-safe comparison
const expectedHmac = crypto
  .createHmac('sha256', process.env.SHOPIFY_WEBHOOK_SECRET!)
  .update(rawBody, 'utf8')
  .digest('base64');

return crypto.timingSafeEqual(
  Buffer.from(receivedHmac),
  Buffer.from(expectedHmac)
);
```

### Rate Limiting

```typescript
// Current limits
RATE_LIMITS = {
  GENERATION: { maxRequests: 100, windowMs: 1 hour },  // AI calls
  READ:       { maxRequests: 1000, windowMs: 1 hour }, // Queries
  WRITE:      { maxRequests: 200, windowMs: 1 hour },  // Updates
  VOICE:      { maxRequests: 10, windowMs: 1 hour },   // Expensive ops
}
```

---

## 7. Testing

### Running Tests

```bash
# All tests
npm test

# Security tests only
npm test -- --testPathPattern=security

# With coverage
npm run test:coverage

# E2E tests
npm run test:e2e
```

### Test Coverage

| Area | Coverage |
|------|----------|
| RLS isolation | 90%+ |
| Auth flows | 80%+ |
| Input validation | 70%+ |
| API routes | 60%+ |

### Key Test Files

- `src/__tests__/security/rls-integration.test.ts` - 575 lines
- `src/__tests__/security/tenant-isolation.test.ts`
- `src/__tests__/auth/shopify-auth.test.ts`
- `src/__tests__/auth/token-manager.test.ts`

---

## 8. Environment Variables

### Required (Production)

```bash
# Shopify
SHOPIFY_API_KEY=your-api-key
SHOPIFY_API_SECRET=your-api-secret
SHOPIFY_WEBHOOK_SECRET=your-webhook-secret
SHOPIFY_SCOPES=read_products,write_products,...

# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...

# NextAuth
NEXTAUTH_SECRET=32-byte-random-string
NEXTAUTH_URL=https://thunder-text.onrender.com

# OpenAI
OPENAI_API_KEY=sk-...

# Encryption
ENCRYPTION_KEY=64-char-hex-string

# Optional: Social OAuth
FACEBOOK_APP_ID=...
FACEBOOK_APP_SECRET=...
GOOGLE_OAUTH_ID=...
GOOGLE_OAUTH_SECRET=...
```

### Validation

Environment variables should be validated at startup (see Security Audit for implementation).

---

## 9. Deployment

### Current Setup
- **Hosting**: Render
- **URL**: https://thunder-text.onrender.com
- **Build Command**: `npm run build:render`

### Deploy Process

```bash
# Build includes security checks
npm run build:render
# Runs: npm install && check-auth-bypass.js && next build
```

---

## 10. Code Quality Checklist

### Before Submitting for Review

```bash
# TypeScript - no errors
npx tsc --noEmit

# Lint - no warnings
npm run lint

# Security lint
npm run security:lint

# Dependency audit
npm audit --audit-level=high

# Tests pass
npm test

# Build succeeds
npm run build
```

### Manual Review Checklist

- [ ] No `any` types in security-critical code
- [ ] All API routes have authentication
- [ ] All inputs validated with Zod
- [ ] No hardcoded secrets
- [ ] No `console.log` in production code
- [ ] Error messages don't leak sensitive info
- [ ] RLS enabled on all tables
- [ ] Webhooks verify HMAC signatures

---

## 11. Known Technical Debt

| Item | Location | Priority |
|------|----------|----------|
| In-memory rate limiting | `src/lib/middleware/rate-limit.ts` | High |
| Debug endpoints need auth | `src/app/api/debug/` | High |
| CSP frame-ancestors wildcard | `next.config.ts` | Critical |
| SSL verification disabled | `src/lib/postgres.ts` | Critical |

---

## 12. Questions for Reviewer

1. **OAuth Flow**: Is the current state validation sufficient, or should we implement session-based state storage?

2. **Rate Limiting**: For a single-instance deployment, is in-memory rate limiting acceptable, or should we mandate Redis?

3. **Debug Endpoints**: Should these be completely removed in production, or is auth + admin-only sufficient?

4. **Token Expiration**: Current JWT is 30 days. Is this acceptable for a Shopify app, or should we implement refresh tokens?

---

## 13. Contact

For questions during review:
- **Primary Contact**: [Your Name]
- **Email**: [Your Email]
- **Response Time**: Within 24 hours

---

*Last updated: December 4, 2025*
