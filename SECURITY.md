# Security Policy

## Reporting Vulnerabilities

If you discover a security vulnerability in Thunder Text, please report it responsibly:

1. **Do NOT** create a public GitHub issue
2. Email security concerns to: [security@zunosai.com]
3. Include detailed steps to reproduce the vulnerability
4. Allow reasonable time for us to address the issue before disclosure

We will acknowledge receipt within 48 hours and provide a more detailed response within 7 days.

## Security Standards

Thunder Text follows security best practices aligned with the [Shieldfy API Security Checklist](https://github.com/shieldfy/API-Security-Checklist).

### Authentication & Authorization

- **JWT-based sessions** with short-lived access tokens (15 min) and refresh tokens (7 days)
- **bcrypt password hashing** with appropriate work factor
- **Brute force protection**: 5 failed attempts triggers 15-minute lockout
- **HttpOnly cookies** with `SameSite=Lax` for session storage
- **2FA support** for admin users via TOTP

### Shopify OAuth Security

- **HMAC-SHA256 signature verification** with timing-safe comparison
- **Domain validation** regex: `^[a-zA-Z0-9-]+\.myshopify\.com$`
- **JWT payload verification** for embedded app authentication
- **State parameter** validation with cryptographic random hash

### Input Validation

- **File upload validation**:
  - Magic byte verification (prevents MIME type spoofing)
  - File size limits per type
  - Allowlist of supported MIME types
  - Binary content detection in text files
- **Content-Type validation** on all endpoints
- **Input sanitization** for XSS and injection prevention

### Rate Limiting

- **Redis-backed distributed rate limiting** (Upstash)
- Configurable limits per endpoint category:
  - GENERATION: 100 requests/hour
  - READ: 1000 requests/hour
  - WRITE: 200 requests/hour
  - VOICE_GENERATION: 10 requests/hour
- Graceful fallback to in-memory limiting if Redis unavailable

### Security Headers

All responses include:

- `Content-Security-Policy` with strict directives
- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: DENY`
- `X-XSS-Protection: 1; mode=block`
- `Referrer-Policy: strict-origin-when-cross-origin`
- `Permissions-Policy` restricting sensitive APIs
- `Strict-Transport-Security` (production only)

### Error Handling

- **Error sanitization** - internal errors are logged server-side; clients receive generic messages
- **Error correlation IDs** for troubleshooting without exposing internals
- **No stack traces** or implementation details in production responses

### Monitoring & Logging

- **Sentry integration** with PII scrubbing:
  - Authorization/cookie headers removed
  - Dynamic URL segments replaced with placeholders
  - Sensitive breadcrumb data filtered
- **Structured logging** without credentials or passwords
- Production sampling: 10% of transactions to reduce costs

## Environment Security

### Required Environment Variables

See `.env.example` for the complete list. Critical secrets:

- `NEXTAUTH_SECRET` - Generate with `openssl rand -base64 32`
- `ENCRYPTION_KEY` - 64-character hex key
- `SUPABASE_SERVICE_ROLE_KEY` - Never expose in client code
- `SHOPIFY_API_SECRET` - Keep server-side only

### Secret Rotation

Rotate credentials immediately if:

- Suspected exposure in logs or error messages
- Team member departure
- Security incident
- Credentials found in git history

### Git Security

- `.env.local` and all `.env.*` files are gitignored
- Pre-commit hooks block commits containing secrets
- Regular audits of git history for exposed credentials

## Development Security

### Pre-commit Checks

Automated checks run on every commit:

- ESLint security plugins (`@eslint/security`, `no-secrets`)
- TypeScript type checking
- Prettier formatting

### CI/CD Security

- **Snyk vulnerability monitoring** for dependencies
- **Auth bypass detection** in build scripts
- **Automated security scanning** in CI pipeline

## Incident Response

1. **Identify** - Detect and confirm the security incident
2. **Contain** - Isolate affected systems, rotate credentials
3. **Investigate** - Determine scope and root cause
4. **Remediate** - Fix vulnerability, deploy patches
5. **Review** - Post-incident analysis and documentation

## Security Checklist for Contributors

Before submitting code:

- [ ] No hardcoded credentials or API keys
- [ ] Input validation on all user-supplied data
- [ ] Output encoding for XSS prevention
- [ ] Parameterized queries (no SQL concatenation)
- [ ] Rate limiting on new endpoints
- [ ] Error messages don't leak implementation details
- [ ] Sensitive operations require authentication
- [ ] Tests cover security edge cases

## Dependencies

Security-sensitive dependencies are monitored via Snyk and npm audit.

Run security checks:

```bash
npm run security:check
npm audit
```

## Contact

For security inquiries: security@zunosai.com
