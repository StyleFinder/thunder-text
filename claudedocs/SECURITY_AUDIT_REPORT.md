# Security Audit Report - Thunder Text

**Audit Date:** January 7, 2026
**Application:** Thunder Text (Next.js Shopify App)
**Auditor:** Claude Security Engineer
**Scope:** Full codebase security review for production deployment

---

## Executive Summary

Thunder Text demonstrates a **mature security posture** with several industry-standard security controls already in place. The application includes comprehensive authentication mechanisms, input sanitization, rate limiting, CSRF protection, and proper encryption for sensitive data. However, several areas require attention before production deployment.

### Risk Assessment Summary

| Severity | Count | Status |
|----------|-------|--------|
| Critical | 1 | Requires immediate attention |
| High | 3 | Should be addressed before production |
| Medium | 5 | Should be addressed in near-term |
| Low | 4 | Recommended improvements |

### Key Strengths Identified
- Comprehensive input sanitization library with XSS protection
- Proper webhook HMAC signature validation using timing-safe comparison
- AES-256-GCM encryption for sensitive tokens (Facebook OAuth)
- Rate limiting infrastructure with Upstash Redis support
- Account lockout protection against brute force attacks
- Two-factor authentication for admin accounts
- Comprehensive security headers (CSP, HSTS, X-Frame-Options)
- Pre-build auth bypass detection script
- Debug route protection in production

---

## Critical Vulnerabilities

### [C1] Exposed API Secrets in .env.local File (Committed or Accessible)

- **Location**: `/Users/bigdaddy/projects/thunder-text/.env.local`
- **Description**: During the audit, the `.env.local` file was found to be accessible and contains actual production/development secrets including Shopify API keys and secrets. While `.env*` is in `.gitignore`, the file permissions (644) allow read access to any user on the system.
- **Impact**: If this file is accidentally committed or the server is compromised, all API credentials (Shopify, Supabase, OpenAI, Facebook) would be exposed, allowing attackers to:
  - Access all shop data via Shopify API
  - Read/modify database records via Supabase service role key
  - Generate content using OpenAI at the organization's expense
  - Access Facebook business accounts

- **Remediation Checklist**:
  - [ ] Verify `.env.local` is NOT committed to git: `git ls-files --error-unmatch .env.local` should fail
  - [ ] Restrict file permissions: `chmod 600 .env.local`
  - [ ] Use secrets manager (e.g., HashiCorp Vault, AWS Secrets Manager) for production
  - [ ] Rotate all credentials shown in .env.local immediately if any have been committed
  - [ ] Add pre-commit hook to prevent env file commits:
    ```bash
    # .husky/pre-commit
    if git diff --cached --name-only | grep -E '\.env\.local|\.env\.production'; then
      echo "Error: Attempting to commit env file with secrets"
      exit 1
    fi
    ```

- **References**: [OWASP Secrets Management](https://cheatsheetseries.owasp.org/cheatsheets/Secrets_Management_Cheat_Sheet.html)

---

## High Vulnerabilities

### [H1] Debug Endpoints Accessible with Environment Variable Override

- **Location**:
  - `/Users/bigdaddy/projects/thunder-text/src/app/api/debug/` (multiple routes)
  - `/Users/bigdaddy/projects/thunder-text/src/lib/env-config.ts`
- **Description**: While debug routes are protected in production via `guardDebugRoute()`, the protection relies solely on `NODE_ENV`. Debug routes expose sensitive information including database connections, environment variables (partially redacted), and allow manual token updates.
- **Impact**: If an attacker can manipulate `NODE_ENV` or if a misconfiguration occurs, debug endpoints could expose:
  - Database connection status and shop data
  - Environment variable presence/configuration
  - Ability to inject tokens via `/api/debug/update-token`

- **Remediation Checklist**:
  - [ ] Add IP allowlist for debug routes (even in development):
    ```typescript
    // src/app/api/debug/_middleware-guard.ts
    const ALLOWED_DEBUG_IPS = ['127.0.0.1', '::1'];
    export function guardDebugRoute(routeName: string, request: NextRequest) {
      const clientIP = request.headers.get('x-forwarded-for')?.split(',')[0] ||
                       request.headers.get('x-real-ip');
      if (!ALLOWED_DEBUG_IPS.includes(clientIP || '')) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
      // ... existing checks
    }
    ```
  - [ ] Remove debug routes from production builds entirely using Next.js conditional compilation
  - [ ] Add authentication requirement even for development debug routes
  - [ ] Remove `/api/debug/update-token` endpoint - tokens should never be manually injectable

- **References**: [CWE-489: Active Debug Code](https://cwe.mitre.org/data/definitions/489.html)

---

### [H2] Missing Rate Limiting on Critical Authentication Endpoints

- **Location**:
  - `/Users/bigdaddy/projects/thunder-text/src/app/api/auth/[...nextauth]/route.ts`
  - `/Users/bigdaddy/projects/thunder-text/src/app/api/auth/signup/route.ts`
  - `/Users/bigdaddy/projects/thunder-text/src/app/api/auth/forgot-password/route.ts`
- **Description**: While the content generation APIs have rate limiting via `withRateLimit()`, the core authentication endpoints do not have request-level rate limiting. The login protection only tracks failed attempts per email, not request volume.
- **Impact**:
  - Authentication endpoints vulnerable to credential stuffing attacks
  - Password reset abuse (email bombing)
  - Signup spam creating numerous fake accounts

- **Remediation Checklist**:
  - [ ] Add IP-based rate limiting to `/api/auth/[...nextauth]`:
    ```typescript
    // In auth route handler
    const rateLimitResult = await checkRateLimitAsync(
      clientIP, // Use IP instead of userId
      { maxRequests: 10, windowMs: 60000, message: 'Too many login attempts' }
    );
    if (!rateLimitResult.allowed) {
      return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 });
    }
    ```
  - [ ] Implement rate limiting on signup endpoint (5 signups per IP per hour)
  - [ ] Rate limit password reset requests (3 per email per hour, 10 per IP per hour)
  - [ ] Consider CAPTCHA for repeated failed authentication attempts

- **References**: [OWASP Authentication Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html)

---

### [H3] Insufficient Authorization Checks in Shop-Scoped API Routes

- **Location**:
  - `/Users/bigdaddy/projects/thunder-text/src/app/api/generate/route.ts` (lines 37-69)
  - Multiple other API routes
- **Description**: The `/api/generate` endpoint validates shop existence via `shop_domain` in the request body, but does not verify that the authenticated user has permission to act on behalf of that shop. A malicious user could potentially generate content for another shop by guessing or knowing their domain.
- **Impact**: Unauthorized access to shop resources, potential billing fraud (content generation costs attributed to wrong shop)

- **Remediation Checklist**:
  - [ ] Require NextAuth session for all shop-scoped operations:
    ```typescript
    // In /api/generate/route.ts
    import { getServerSession } from 'next-auth';
    import { authOptions } from '@/lib/auth/auth-options';

    export async function POST(request: NextRequest) {
      const session = await getServerSession(authOptions);
      if (!session?.user?.shopId) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }

      // Use session.user.shopId instead of request body
      const shopId = session.user.shopId;
      // ... rest of handler
    }
    ```
  - [ ] Remove reliance on `shop` parameter from request body for authorization
  - [ ] Audit all API routes in `/src/app/api/` for similar patterns
  - [ ] Implement middleware-level authorization checks

- **References**: [OWASP Broken Access Control](https://owasp.org/Top10/A01_2021-Broken_Access_Control/)

---

## Medium Vulnerabilities

### [M1] Cookie Security Configuration Could Be Strengthened

- **Location**: `/Users/bigdaddy/projects/thunder-text/src/lib/auth/auth-options.ts` (lines 232-241)
- **Description**: Session cookie configuration has `sameSite: "lax"` and `secure` is conditionally set based on `NODE_ENV`. While functional, this configuration could be strengthened.
- **Impact**: Reduced protection against CSRF attacks in some scenarios

- **Remediation Checklist**:
  - [ ] Consider `sameSite: "strict"` for highest CSRF protection (test with OAuth flows first)
  - [ ] Ensure `secure: true` is always set in production (verify `NODE_ENV` is set correctly)
  - [ ] Add `__Host-` prefix for additional cookie security:
    ```typescript
    cookies: {
      sessionToken: {
        name: process.env.NODE_ENV === 'production'
          ? '__Host-next-auth.session-token'
          : 'next-auth.session-token',
        options: {
          httpOnly: true,
          sameSite: 'strict',
          path: '/',
          secure: process.env.NODE_ENV === 'production',
        },
      },
    },
    ```

- **References**: [OWASP Session Management Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html)

---

### [M2] Potential Information Disclosure in Error Responses

- **Location**: Multiple API routes, example:
  - `/Users/bigdaddy/projects/thunder-text/src/app/api/products/update/route.ts` (line 116)
- **Description**: Some API routes include stack traces in error responses when `NODE_ENV === 'development'`. While this is intentional for debugging, the condition could be accidentally true in production if environment is misconfigured.
- **Impact**: Stack traces reveal internal file paths, library versions, and code structure to attackers

- **Remediation Checklist**:
  - [ ] Create centralized error handler that never includes stack traces in HTTP responses:
    ```typescript
    // src/lib/api/error-handler.ts
    export function createErrorResponse(error: Error, status: number = 500) {
      const isDev = process.env.NODE_ENV === 'development';

      // Log full error server-side
      logger.error('API Error', error, { status });

      // Return sanitized response
      return NextResponse.json({
        error: isDev ? error.message : 'Internal server error',
        // Never include stack in response, even in dev
      }, { status });
    }
    ```
  - [ ] Audit all routes for `stack` in responses
  - [ ] Remove `...(process.env.NODE_ENV === "development" && { stack: errorStack })` patterns

- **References**: [CWE-209: Error Message Information Leak](https://cwe.mitre.org/data/definitions/209.html)

---

### [M3] Admin Invitation URL Exposed in API Response

- **Location**: `/Users/bigdaddy/projects/thunder-text/src/app/api/admin/invite-coach/route.ts` (line 58)
- **Description**: The coach invitation endpoint returns the full invitation URL including the secure token in the API response. This is noted with a TODO comment.
- **Impact**: Invitation tokens could be intercepted or logged, allowing unauthorized access to coach accounts

- **Remediation Checklist**:
  - [ ] Implement email delivery for invitation links (using Resend or similar)
  - [ ] Remove `inviteUrl` from API response once email is implemented
  - [ ] Add token expiration check (already has 7-day expiry, verify it's enforced)
  - [ ] Log invitation sends for audit trail (without the token)

- **References**: [OWASP Forgot Password Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Forgot_Password_Cheat_Sheet.html)

---

### [M4] CORS Configuration Allows Development Patterns in Production Check

- **Location**: `/Users/bigdaddy/projects/thunder-text/src/middleware.ts` (lines 27-59)
- **Description**: The `isAllowedOrigin` function correctly restricts origins in production, but the ngrok allowance pattern could be exploited if an attacker creates a malicious domain ending in `.ngrok.app`.
- **Impact**: Potential CORS bypass in edge cases

- **Remediation Checklist**:
  - [ ] Remove ngrok allowance in production builds:
    ```typescript
    function isAllowedOrigin(origin: string): boolean {
      // Production-only domains
      const allowedDomains = [
        "https://thunder-text.onrender.com",
        "https://app.zunosai.com",
      ];

      if (allowedDomains.includes(origin)) return true;

      // Development only - never in production
      if (process.env.NODE_ENV === "development") {
        if (origin.startsWith("http://localhost:")) return true;
        // Ngrok should only be allowed for specific, known tunnels
        const ALLOWED_NGROK = process.env.DEV_NGROK_DOMAIN;
        if (ALLOWED_NGROK && origin === ALLOWED_NGROK) return true;
      }

      return false;
    }
    ```
  - [ ] Consider using environment variable for explicit ngrok domain in development

- **References**: [OWASP CORS Security](https://owasp.org/www-community/attacks/CORS_OriginHeaderScrutiny)

---

### [M5] Shopify Access Token Stored Unencrypted

- **Location**:
  - `/Users/bigdaddy/projects/thunder-text/src/app/api/auth/shopify/callback/route.ts`
  - Database `shops.shopify_access_token` column
- **Description**: While Facebook OAuth tokens are encrypted using AES-256-GCM before storage, Shopify access tokens appear to be stored unencrypted in the database.
- **Impact**: Database breach would expose all Shopify access tokens, allowing unauthorized shop access

- **Remediation Checklist**:
  - [ ] Encrypt Shopify access tokens before database storage:
    ```typescript
    // In callback route
    import { encryptToken } from '@/lib/services/encryption';

    const encryptedToken = await encryptToken(accessToken);

    await supabaseAdmin
      .from('shops')
      .update({ shopify_access_token: encryptedToken })
      .eq('id', shopId);
    ```
  - [ ] Create migration to encrypt existing tokens
  - [ ] Update token retrieval to decrypt:
    ```typescript
    import { decryptToken } from '@/lib/services/encryption';

    const shop = await getShop(shopId);
    const accessToken = await decryptToken(shop.shopify_access_token);
    ```
  - [ ] Ensure ENCRYPTION_KEY is set and secure

- **References**: [OWASP Cryptographic Storage Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Cryptographic_Storage_Cheat_Sheet.html)

---

## Low Vulnerabilities

### [L1] Password Policy Could Be Strengthened

- **Location**: `/Users/bigdaddy/projects/thunder-text/src/lib/security/password-validation.ts`
- **Description**: Current password requirements (8 chars, uppercase, lowercase, numbers) are adequate but could be strengthened. Symbols are optional and minimum length is at industry minimum.
- **Impact**: Passwords may be more susceptible to brute force attacks

- **Remediation Checklist**:
  - [ ] Increase minimum length to 12 characters
  - [ ] Consider requiring symbols for admin accounts
  - [ ] Add password breach checking (Have I Been Pwned API):
    ```typescript
    import crypto from 'crypto';

    async function isPasswordBreached(password: string): Promise<boolean> {
      const hash = crypto.createHash('sha1').update(password).digest('hex').toUpperCase();
      const prefix = hash.slice(0, 5);
      const suffix = hash.slice(5);

      const response = await fetch(`https://api.pwnedpasswords.com/range/${prefix}`);
      const text = await response.text();

      return text.includes(suffix);
    }
    ```

- **References**: [NIST Digital Identity Guidelines](https://pages.nist.gov/800-63-3/sp800-63b.html)

---

### [L2] Missing Subresource Integrity (SRI) for External Scripts

- **Location**: `/Users/bigdaddy/projects/thunder-text/next.config.ts` (CSP configuration)
- **Description**: While CSP is configured, there's no SRI enforcement for any external scripts (Sentry CDN).
- **Impact**: If external CDN is compromised, malicious code could be injected

- **Remediation Checklist**:
  - [ ] Add SRI hashes for Sentry scripts if loaded externally
  - [ ] Consider self-hosting critical scripts
  - [ ] Add `require-sri-for` directive to CSP (if browser support is acceptable)

- **References**: [MDN Subresource Integrity](https://developer.mozilla.org/en-US/docs/Web/Security/Subresource_Integrity)

---

### [L3] Logging May Include Sensitive Data Paths

- **Location**: `/Users/bigdaddy/projects/thunder-text/src/lib/logger.ts`
- **Description**: The logger sends context to Sentry which could potentially include sensitive data paths or identifiers. While not logging actual secrets, metadata could be useful to attackers.
- **Impact**: Information disclosure through error tracking

- **Remediation Checklist**:
  - [ ] Implement data scrubbing in Sentry configuration:
    ```typescript
    // sentry.client.config.ts
    Sentry.init({
      beforeSend(event) {
        // Scrub potentially sensitive data
        if (event.request?.headers) {
          delete event.request.headers['authorization'];
          delete event.request.headers['cookie'];
        }
        return event;
      },
    });
    ```
  - [ ] Review Sentry data scrubbing settings in dashboard
  - [ ] Add PII scrubbing for email patterns in logs

- **References**: [Sentry Data Scrubbing](https://docs.sentry.io/product/data-management-settings/scrubbing/)

---

### [L4] Session Token Expiration Window Could Be Shortened

- **Location**: `/Users/bigdaddy/projects/thunder-text/src/lib/auth/auth-options.ts` (lines 16-17)
- **Description**: Access tokens expire in 15 minutes but session lasts 7 days. While this is a reasonable balance, shorter session duration would reduce exposure window.
- **Impact**: Longer window for session hijacking if tokens are compromised

- **Remediation Checklist**:
  - [ ] Consider reducing session duration to 24 hours for shop users
  - [ ] Implement session invalidation on password change
  - [ ] Add "remember me" option instead of default 7-day session
  - [ ] Track active sessions and allow users to revoke

- **References**: [OWASP Session Management](https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html)

---

## General Security Recommendations

### Infrastructure & Deployment

- [ ] Enable Render's DDoS protection and WAF if available
- [ ] Configure Supabase connection pooling and rate limits
- [ ] Set up automated security scanning in CI/CD pipeline (npm audit, Snyk)
- [ ] Enable Supabase audit logging for sensitive operations
- [ ] Configure database connection encryption (SSL/TLS)
- [ ] Set up security monitoring and alerting (integrate with existing Slack alerts)

### Code Security

- [ ] Implement Content Security Policy reporting endpoint to catch violations
- [ ] Add security-focused ESLint rules (already using `eslint-plugin-security`)
- [ ] Consider implementing request signing for internal API calls
- [ ] Add automated dependency vulnerability scanning to CI pipeline
- [ ] Implement API versioning deprecation strategy

### Monitoring & Incident Response

- [ ] Set up security event monitoring in Sentry
- [ ] Create incident response runbook for security events
- [ ] Configure alerts for unusual API patterns (high volume, errors)
- [ ] Implement session anomaly detection (geographic, device fingerprint)
- [ ] Enable and monitor Supabase security audit logs

### Compliance Considerations

- [ ] Document data retention policies for GDPR compliance
- [ ] Implement data export functionality for GDPR data subject requests
- [ ] Review and document PII handling procedures
- [ ] Create security documentation for SOC 2 preparation if needed

---

## Security Posture Improvement Plan

### Phase 1: Critical (Before Production - Week 1)
1. Verify `.env.local` is not committed and rotate any exposed credentials
2. Implement rate limiting on authentication endpoints
3. Fix authorization checks in shop-scoped API routes
4. Encrypt Shopify access tokens in database

### Phase 2: High Priority (Week 2-3)
1. Remove or secure debug endpoints
2. Implement email delivery for coach invitations
3. Strengthen CORS configuration
4. Audit all error responses for information disclosure

### Phase 3: Medium Priority (Month 1)
1. Strengthen cookie security configuration
2. Implement password breach checking
3. Add SRI for external resources
4. Enhance logging data scrubbing

### Phase 4: Ongoing
1. Regular dependency updates and vulnerability scanning
2. Quarterly security reviews
3. Penetration testing before major releases
4. Security awareness updates as new features are added

---

## Appendix: Security Controls Already in Place

The following security controls were found to be properly implemented:

1. **Authentication**
   - NextAuth.js with secure JWT handling
   - Bcrypt password hashing with proper salt rounds
   - Two-factor authentication for admin accounts
   - Account lockout after failed attempts (5 attempts, 15-minute lockout)

2. **Input Validation**
   - Comprehensive input sanitization library (`/lib/security/input-sanitization.ts`)
   - Zod schema validation throughout
   - XSS protection with DOMPurify for HTML rendering
   - Path traversal protection in file handling

3. **API Security**
   - Rate limiting infrastructure with Redis backend
   - CORS properly configured for allowed origins
   - Webhook signature validation with HMAC-SHA256 and timing-safe comparison
   - API key management with hashing and scope-based access

4. **Data Protection**
   - AES-256-GCM encryption for Facebook OAuth tokens
   - Row Level Security (RLS) enabled in Supabase
   - Service role key usage restricted to server-side code
   - Secure state parameter handling in OAuth flows

5. **Infrastructure**
   - Comprehensive security headers (CSP, HSTS, X-Frame-Options, etc.)
   - Debug routes protected in production
   - Pre-build auth bypass detection
   - Sentry error tracking with user context

---

**Report Generated:** January 7, 2026
**Next Review Recommended:** April 7, 2026 (or after major feature additions)
