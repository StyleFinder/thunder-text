# Security Audit Report: Thunder Text

**Audit Date:** 2026-01-09
**Application:** Thunder Text - Next.js 15 + React 19 Shopify App with Supabase Backend
**Auditor:** Claude Opus 4.5 Security Review

---

## Executive Summary

Thunder Text demonstrates a **solid security foundation** with mature implementations of critical security controls. The codebase shows evidence of security-conscious development practices, including proper authentication mechanisms, input validation, encryption of sensitive data, and comprehensive logging.

### Overall Risk Assessment: **MEDIUM**

| Severity | Count |
|----------|-------|
| Critical | 0 |
| High     | 2 |
| Medium   | 6 |
| Low      | 5 |

### Key Strengths
- AES-256-GCM encryption for Shopify access tokens with key rotation support
- Comprehensive HMAC validation for Shopify webhooks using timing-safe comparisons
- Proper JWT verification using jsonwebtoken library with algorithm pinning
- Progressive account lockout with database persistence (5 attempts / 15 min lockout)
- Two-factor authentication for admin users via TOTP
- Strong Content Security Policy headers
- Rate limiting with Upstash Redis (distributed) and in-memory fallback
- RLS policies for multi-tenant data isolation
- DOMPurify sanitization in EnhancedContentComparison component
- OAuth state validation with cryptographic nonces and cookie-based verification

### Areas Requiring Attention
- XSS vulnerability in BlogCreationModal (missing DOMPurify)
- Dependency vulnerability in preact package
- PDF parsing endpoint missing authentication
- Some routes using legacy shop-domain authentication pattern
- Missing audit logging for admin cross-user access

---

## High Vulnerabilities

### H1: XSS Risk in BlogCreationModal - Missing DOMPurify Sanitization

**Location:** `/Users/bigdaddy/projects/thunder-text/src/app/components/shared/blog-linking/BlogCreationModal.tsx:330`

**Description:** The `BlogCreationModal` component uses `dangerouslySetInnerHTML` to render AI-generated blog content without DOMPurify sanitization. While the similar `EnhancedContentComparison.tsx` correctly uses DOMPurify, BlogCreationModal does not.

**Impact:** If an attacker can influence AI-generated content through prompt injection or compromised API responses, they could execute arbitrary JavaScript in the context of the user's session, potentially stealing session tokens or performing actions on behalf of the user.

**Code Reference:**
```tsx
// BlogCreationModal.tsx:330 - Missing sanitization
<div
  className="p-4 border border-slate-200 rounded-lg bg-white max-h-48 overflow-y-auto text-sm prose prose-sm"
  dangerouslySetInnerHTML={{ __html: generatedContent }}
/>
```

**Remediation Checklist:**
- [ ] Import DOMPurify in BlogCreationModal.tsx
- [ ] Sanitize `generatedContent` before rendering:
  ```tsx
  import DOMPurify from 'dompurify';

  // Configure allowed tags for blog content
  const sanitizedContent = DOMPurify.sanitize(generatedContent, {
    ALLOWED_TAGS: ['p', 'strong', 'em', 'br', 'ul', 'ol', 'li', 'h1', 'h2', 'h3', 'a'],
    ALLOWED_ATTR: ['href', 'target', 'rel']
  });

  <div dangerouslySetInnerHTML={{ __html: sanitizedContent }} />
  ```
- [ ] Apply the same sanitization pattern to any other components rendering AI-generated HTML
- [ ] Add unit tests for XSS prevention in content rendering

**References:**
- OWASP XSS Prevention Cheat Sheet
- CWE-79: Improper Neutralization of Input During Web Page Generation

---

### H2: Dependency Vulnerability - Preact JSON VNode Injection

**Location:** `/Users/bigdaddy/projects/thunder-text/node_modules/preact` (transitive dependency)

**Description:** The project has a high severity vulnerability in the `preact` package (versions 10.28.0 - 10.28.1) which allows JSON VNode Injection.

**Impact:** Could allow attackers to inject malicious VNodes through JSON data, potentially leading to XSS or other client-side attacks.

**Remediation Checklist:**
- [ ] Run `npm audit fix` to update preact to a patched version
- [ ] If automatic fix fails, identify which direct dependency pulls in preact and update it
- [ ] Verify fix with `npm audit` after updating
- [ ] Add npm audit to CI/CD pipeline to catch future vulnerabilities

**References:**
- GitHub Advisory: https://github.com/advisories/GHSA-36hm-qxxp-pg3m

---

## Medium Vulnerabilities

### M1: PDF Parsing Route Missing Authentication

**Location:** `/Users/bigdaddy/projects/thunder-text/src/app/api/parse-pdf/route.ts`

**Description:** The PDF parsing endpoint does not verify user authentication before processing uploaded files. While file validation exists (PDF extension check), any unauthenticated user could potentially abuse this endpoint.

**Impact:**
- Resource exhaustion through repeated large PDF uploads
- Potential information extraction if PDFs contain sensitive data
- Could be used as part of a larger attack chain

**Code Reference:**
```typescript
// parse-pdf/route.ts - No authentication check
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File;
    // Processing happens without verifying user is authenticated
```

**Remediation Checklist:**
- [ ] Add authentication check at the start of the handler:
  ```typescript
  import { getUserId } from "@/lib/auth/content-center-auth";

  export async function POST(request: NextRequest) {
    const userId = await getUserId(request);
    if (!userId) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }
    // ... rest of handler
  }
  ```
- [ ] Add rate limiting to prevent abuse
- [ ] Add explicit file size limits (currently relies on default limits)
- [ ] Log PDF parsing operations for audit trail

**References:** CWE-306: Missing Authentication for Critical Function

---

### M2: Content Samples Route Uses Legacy Shop Domain Authentication

**Location:** `/Users/bigdaddy/projects/thunder-text/src/app/api/content-center/samples/route.ts:23-31`

**Description:** The samples route allows authentication via a shop domain passed in the Authorization header or query parameter. While the content-center-auth module properly validates JWT session tokens, this fallback pattern in getShopDomain() could be exploited if shop domains are guessable.

**Impact:** An attacker who knows a shop's domain could potentially access content samples by passing the domain in the Authorization header (bypassing proper JWT validation).

**Code Reference:**
```typescript
function getShopDomain(request: NextRequest): string | null {
  // Try Authorization header first (embedded app pattern)
  const authHeader = request.headers.get("authorization");
  if (authHeader?.startsWith("Bearer ")) {
    return authHeader.replace("Bearer ", "");
  }
  // Fallback to query parameter
  return request.nextUrl.searchParams.get("shop");
}
```

**Remediation Checklist:**
- [ ] Update the samples route to use `getUserId()` from content-center-auth instead of `getShopDomain()`
- [ ] Remove the legacy shop domain authentication pattern
- [ ] Ensure all content-center routes use proper JWT validation
- [ ] Add integration tests to verify authentication cannot be bypassed

**References:** CWE-287: Improper Authentication

---

### M3: Blog Library Route Allows Admin Cross-User Access Without Audit Logging

**Location:** `/Users/bigdaddy/projects/thunder-text/src/app/api/blogs/library/route.ts:47-62`

**Description:** Admin and coach users can access other users' blog content by passing a `store_id` parameter. While this may be intentional for support purposes, there's no audit logging when admins access user data.

**Impact:** Without audit logging, potential misuse of admin access cannot be detected or investigated.

**Code Reference:**
```typescript
if (storeId && storeId !== userId) {
  // Check if user is admin/coach to query another user's content
  if (session.user.role === "admin" || session.user.role === "coach") {
    // Access is granted without logging
```

**Remediation Checklist:**
- [ ] Add audit logging when admins access user data:
  ```typescript
  if (session.user.role === "admin" || session.user.role === "coach") {
    logger.info("[Blog Library] Admin accessed user data", {
      component: "blogs-library",
      adminId: session.user.id,
      targetUserId: queryStoreId,
      action: "cross_user_read"
    });
  }
  ```
- [ ] Consider adding a justification requirement for admin access
- [ ] Implement an admin access audit dashboard
- [ ] Review all routes where admins can access user data

**References:** CWE-778: Insufficient Logging

---

### M4: Products Update Route Should Verify Shop Ownership After Token Exchange

**Location:** `/Users/bigdaddy/projects/thunder-text/src/app/api/products/update/route.ts:89-102`

**Description:** The products update route accepts an Authorization header token and uses it for token exchange, but should verify the authenticated shop matches the requested shop after token resolution.

**Impact:** Potential cross-shop product modification if session token validation doesn't enforce shop binding.

**Remediation Checklist:**
- [ ] After token exchange, verify the authenticated shop matches the requested shop:
  ```typescript
  // After getting accessToken from token exchange
  // Verify the shop from the token matches the requested shop
  const tokenShop = await verifyTokenShop(accessToken, fullShopDomain);
  if (!tokenShop.valid) {
    return NextResponse.json(
      { error: "Shop mismatch - access denied" },
      { status: 403, headers: corsHeaders }
    );
  }
  ```
- [ ] Add logging for shop mismatch attempts
- [ ] Review all API routes that accept shop parameter with authentication

**References:** CWE-639: Authorization Bypass Through User-Controlled Key

---

### M5: In-Memory Rate Limiting Fallback Not Suitable for Multi-Instance Production

**Location:** `/Users/bigdaddy/projects/thunder-text/src/lib/middleware/rate-limit.ts:31-49`

**Description:** When Upstash Redis is not configured, rate limiting falls back to an in-memory store. This works for single-instance deployments but fails to provide protection in multi-instance production environments.

**Impact:** Attackers could bypass rate limits by having their requests distributed across different instances (rate limits multiplied by instance count).

**Code Reference:**
```typescript
// src/lib/middleware/rate-limit.ts:31-49
const rateLimitStore = new Map<string, RateLimitEntry>();
```

**Remediation Checklist:**
- [ ] Make `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN` required in production
- [ ] Add startup validation that fails if Redis is not configured in production:
  ```typescript
  if (process.env.NODE_ENV === 'production' && !redis) {
    logger.error("CRITICAL: Redis not configured for production rate limiting", {
      component: "rate-limit"
    });
    // Consider failing startup or sending alert
  }
  ```
- [ ] Log warning when falling back to in-memory rate limiting
- [ ] Add monitoring for rate limit provider in use

**References:** OWASP Rate Limiting Cheat Sheet

---

### M6: OAuth State Parameter Has 10-Minute Validity Window

**Location:** `/Users/bigdaddy/projects/thunder-text/src/lib/security/oauth-validation.ts:22`

**Description:** OAuth state parameters are valid for 10 minutes (`MAX_STATE_AGE_MS = 10 * 60 * 1000`). While this provides usability, it extends the window for CSRF attacks if an attacker captures the OAuth initiation URL.

**Impact:** Extended window for state parameter replay attacks if an attacker captures the OAuth initiation URL.

**Remediation Checklist:**
- [ ] Reduce state validity to 5 minutes (300 seconds)
- [ ] Ensure single-use state tokens are properly enforced (already implemented via cookie-based verification)
- [ ] Log and alert on state parameter reuse attempts
- [ ] Add rate limiting for OAuth initiation requests

**References:** RFC 6749 - OAuth 2.0 Security Considerations

---

## Low Vulnerabilities

### L1: Shopify OAuth Callback Uses Multiple Fallback Strategies for Pending Shop Resolution

**Location:** `/Users/bigdaddy/projects/thunder-text/src/app/api/auth/shopify/callback/route.ts:163-220`

**Description:** The OAuth callback uses up to 4 strategies to find pending shop records, including "most recent pending shop in last 30 min" which could theoretically match the wrong user in a race condition.

**Impact:** In rare edge cases with concurrent signups, a user might be linked to the wrong pending shop record.

**Remediation Checklist:**
- [ ] Add additional verification such as matching email or IP address
- [ ] Consider using a more deterministic linking mechanism (e.g., signed state parameter containing pending shop ID)
- [ ] Add logging to track which strategy was used and monitor for anomalies
- [ ] Add a unique constraint to prevent multiple pending shops from conflicting

**References:** CWE-362: Concurrent Execution Using Shared Resource with Improper Synchronization

---

### L2: Session Cookie Not Using Secure Prefix

**Location:** `/Users/bigdaddy/projects/thunder-text/src/lib/auth/auth-options.ts:227-236`

**Description:** The NextAuth session cookie uses `next-auth.session-token` name without the `__Host-` or `__Secure-` prefix. Modern browsers provide additional protection with these prefixes.

**Code Reference:**
```typescript
cookies: {
  sessionToken: {
    name: "next-auth.session-token",
    options: {
      httpOnly: true,
      sameSite: "strict", // Good - using strict
      path: "/",
      secure: process.env.NODE_ENV === "production",
    },
  },
},
```

**Remediation Checklist:**
- [ ] Consider using `__Host-next-auth.session-token` for production (requires `Secure`, `Path=/`, no `Domain`)
- [ ] Test cookie handling across all supported browsers
- [ ] Update cookie reading logic to handle prefixed cookie names

**References:** MDN Web Docs - Set-Cookie Security

---

### L3: CORS Configuration Allows All Localhost Ports in Development

**Location:** `/Users/bigdaddy/projects/thunder-text/src/middleware.ts:57-58`

**Description:** In development mode, CORS allows any localhost port via `origin.startsWith("http://localhost:")`. While this aids development, it could be exploited if development mode is accidentally enabled.

**Remediation Checklist:**
- [ ] Restrict to specific ports: 3000, 3050, 3001 (common development ports only)
- [ ] Add build-time check to ensure development CORS is not enabled in production builds
- [ ] Use environment variable allowlist for development ports

**References:** OWASP CORS Security Cheat Sheet

---

### L4: Error Messages May Leak Implementation Details in Some Routes

**Location:** Various API routes

**Description:** While most error handling is properly sanitized (e.g., products update route returns generic "Internal server error"), some routes include more detailed error information that could help attackers understand the system architecture.

**Remediation Checklist:**
- [ ] Audit all API routes for error message content
- [ ] Standardize error responses with generic messages for production
- [ ] Log detailed errors server-side only
- [ ] Implement error reference IDs that can be correlated with server logs

**References:** OWASP Error Handling Cheat Sheet

---

### L5: Bcrypt Salt Rounds Could Be Higher

**Location:** Password hashing in signup route (uses 12 rounds)

**Description:** Password hashing uses 12 salt rounds. While acceptable, modern recommendations suggest 12-14 rounds for 2024+ security requirements.

**Remediation Checklist:**
- [ ] Consider increasing to 13 or 14 rounds for new passwords
- [ ] Implement adaptive hashing that increases rounds over time
- [ ] Add password rehashing on successful login if using lower rounds

**References:** OWASP Password Storage Cheat Sheet

---

## General Security Recommendations

### Authentication and Authorization
- [ ] **Implement refresh token rotation**: Rotate refresh tokens on each use to detect token theft
- [ ] **Add session binding**: Bind session tokens to device/browser fingerprints for sensitive operations
- [ ] **Extend 2FA to shop users**: Currently only admins have 2FA option; consider offering to all users
- [ ] **Add session revocation UI**: Allow users to see and revoke active sessions

### API Security
- [ ] **Standardize authentication across all routes**: Migrate all routes to use content-center-auth
- [ ] **Add request signing for sensitive operations**: Implement HMAC signing for product updates
- [ ] **Implement API abuse detection**: Add monitoring for unusual access patterns beyond rate limiting

### Monitoring and Alerting
- [ ] **Add security event alerting**: Create alerts for:
  - Failed authentication spikes
  - Rate limit breaches
  - Admin cross-user access
  - OAuth state validation failures
- [ ] **Implement request correlation IDs**: Add correlation IDs to track requests across services
- [ ] **Create security incident runbook**: Document response procedures for common security events

### Dependency Management
- [ ] **Enable Dependabot or Renovate**: Automate dependency updates with security priority
- [ ] **Add npm audit to CI/CD**: Block deployments with high severity vulnerabilities (already configured)
- [ ] **Review transitive dependencies**: Audit indirect dependencies quarterly for security issues
- [ ] **Pin dependency versions**: Use exact versions in package.json for predictable builds

### Infrastructure Security
- [ ] **Verify Supabase RLS policies**: Ensure Row Level Security is properly configured on all tables
- [ ] **Review Render deployment configuration**: Ensure no debug flags in production
- [ ] **Add request timeout enforcement**: Ensure all routes have appropriate timeouts
- [ ] **Enable database query logging**: For audit trail and anomaly detection

---

## Security Posture Improvement Plan

### Immediate (This Week)
1. **[H1]** Add DOMPurify to BlogCreationModal
2. **[H2]** Run `npm audit fix` to update preact
3. **[M1]** Add authentication to parse-pdf route

### Short-term (Next 2 Weeks)
4. **[M2-M4]** Standardize authentication patterns across all routes
5. **[M3]** Add comprehensive audit logging for admin actions
6. **[M5]** Make Redis required for production rate limiting

### Medium-term (Next Month)
7. Implement security event alerting
8. Add request correlation IDs
9. Review and update all error messages
10. Consider extending 2FA to shop users

### Long-term (Quarterly)
11. External penetration testing
12. Security training for development team
13. SOC 2 Type 2 compliance preparation
14. Implement bug bounty program

---

## Appendix: Files Reviewed

| File | Purpose |
|------|---------|
| `src/middleware.ts` | Request routing and CORS handling |
| `src/lib/auth/auth-options.ts` | NextAuth configuration |
| `src/lib/auth/content-center-auth.ts` | API authentication (JWT validation) |
| `src/lib/middleware/webhook-validation.ts` | Shopify webhook HMAC validation |
| `src/lib/middleware/rate-limit.ts` | Rate limiting implementation |
| `src/lib/security/input-sanitization.ts` | XSS and injection prevention |
| `src/lib/security/oauth-validation.ts` | OAuth state validation |
| `src/lib/security/two-factor-auth.ts` | 2FA implementation |
| `src/lib/security/login-protection.ts` | Account lockout |
| `src/lib/security/password-validation.ts` | Password policy |
| `src/lib/services/encryption.ts` | Token encryption (AES-256-GCM) |
| `src/lib/supabase.ts` | Database client configuration |
| `src/lib/supabase/admin.ts` | Admin database client |
| `src/lib/shopify/token-manager.ts` | Shopify token management |
| `src/app/api/auth/shopify/callback/route.ts` | Shopify OAuth callback |
| `src/app/api/parse-pdf/route.ts` | PDF parsing endpoint |
| `src/app/api/video/upload-image/route.ts` | File upload handling |
| `src/app/api/products/update/route.ts` | Product update API |
| `src/app/api/content-center/samples/route.ts` | Content samples API |
| `src/app/api/content-center/content/[id]/route.ts` | Content detail API |
| `src/app/api/blogs/library/route.ts` | Blog library API |
| `src/app/api/webhooks/app-uninstalled/route.ts` | Webhook handler |
| `src/app/components/shared/blog-linking/BlogCreationModal.tsx` | Blog creation UI |
| `src/app/components/shared/EnhancedContentComparison.tsx` | Content comparison UI |
| `next.config.ts` | Security headers configuration |
| `package.json` | Dependencies |
| `.env.example` | Environment variable documentation |
| `SECURITY.md` | Existing security documentation |

---

**Report Generated:** 2026-01-09
**Next Review Recommended:** 2026-04-09 (Quarterly)
