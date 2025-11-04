# Thunder Text - Complete Security Action Plan

**Project:** Thunder Text (Shopify App)
**Document Version:** 1.0
**Last Updated:** October 24, 2025
**Status Tracking:** Use checkboxes to track progress

---

## Progress Overview

### ✅ Completed

- [x] Security scanning infrastructure setup
- [x] ESLint security plugins configured
- [x] npm audit integration
- [x] Snyk dependency scanning installed
- [x] Pre-commit hooks configured
- [x] GitHub Actions security workflow
- [x] Object injection vulnerabilities fixed (3/3)
- [x] Security documentation created

### 🔴 Critical (Before Production) - 0/4 Complete

- [ ] Enable and test RLS policies
- [ ] Audit and encrypt all secrets
- [ ] Test multi-tenancy isolation
- [ ] Configure security headers

### 🟡 Short Term (Week 1-2) - 0/5 Complete

- [ ] Set up automated security scanning
- [ ] Implement rate limiting
- [ ] Add security event logging
- [ ] Test all OAuth flows
- [ ] Configure monitoring/alerts

### 🟢 Ongoing - 0/3 Complete

- [ ] Weekly dependency audits
- [ ] Monthly security reviews
- [ ] Quarterly penetration testing

---

## 🔴 CRITICAL TASKS (Complete Before Production)

### Task 1: Enable and Test RLS (Row Level Security) Policies

**Priority:** 🔴 CRITICAL
**Risk:** Multi-tenancy data leak
**Time:** 4-6 hours
**Status:** ⬜ Not Started

#### Subtasks

- [ ] **1.1** Review current database schema (30 min)
  - Location: `supabase/migrations/`
  - Action: List all tables needing RLS
  - Command: `grep -r "CREATE TABLE" supabase/migrations/`

- [ ] **1.2** Create RLS policy migration (2 hours)
  - Create: `supabase/migrations/020_enable_rls_policies.sql`
  - Tables: users, stores, content, samples, voice_profiles, category_templates, shop_sizes
  - Policies: View own store, filter by store_id from JWT

- [ ] **1.3** Create RLS test suite (1.5 hours)
  - Create: `supabase/tests/rls_tests.sql`
  - Tests: 10 test cases for isolation
  - Coverage: All major tables

- [ ] **1.4** Deploy RLS to staging (30 min)
  - Command: `supabase db push`
  - Test: `supabase test db`
  - Verify: No errors

- [ ] **1.5** Integration testing (1 hour)
  - Create: `src/__tests__/security/rls-integration.test.ts`
  - Tests: Cross-store access prevention
  - Run: `npm run test -- rls-integration.test.ts`

- [ ] **1.6** Production deployment
  - Deploy migration to production
  - Monitor for errors
  - Verify multi-tenancy working

**Success Criteria:**

- ✅ All SQL RLS tests pass
- ✅ All integration tests pass
- ✅ No cross-store data leakage
- ✅ Global templates accessible to all stores

**Files to Create/Modify:**

- `supabase/migrations/020_enable_rls_policies.sql` (NEW)
- `supabase/tests/rls_tests.sql` (NEW)
- `src/__tests__/security/rls-integration.test.ts` (NEW)

**Reference:** See "Step 1" in detailed roadmap

---

### Task 2: Audit and Encrypt All Secrets

**Priority:** 🔴 CRITICAL
**Risk:** Data breach, credential exposure
**Time:** 3-4 hours
**Status:** ⬜ Not Started

#### Subtasks

- [ ] **2.1** Audit current secrets (1 hour)
  - Action: Find all `process.env` usage
  - Command: `grep -r "process.env" src/ --include="*.ts"`
  - Create: `docs/SECRETS_AUDIT.md`
  - List: All environment variables and OAuth tokens

- [ ] **2.2** Implement token encryption (2 hours)
  - Create: `src/lib/security/encryption.ts`
  - Algorithm: AES-256-GCM
  - Functions: `encryptToken()`, `decryptToken()`

- [ ] **2.3** Update database schema (30 min)
  - Create: `supabase/migrations/021_encrypt_oauth_tokens.sql`
  - Add: `encrypted_at`, `encryption_version` columns
  - Add: Token format validation

- [ ] **2.4** Encrypt existing tokens (1 hour)
  - Create: `scripts/encrypt-existing-tokens.ts`
  - Action: Encrypt all OAuth tokens in database
  - Verify: All tokens encrypted

- [ ] **2.5** Update integration code (30 min)
  - Modify: `src/lib/shopify/client.ts`
  - Modify: `src/lib/klaviyo/client.ts`
  - Add: Decryption before use

- [ ] **2.6** Generate encryption key (30 min)
  - Generate: 32-byte encryption key
  - Store: Add `ENCRYPTION_KEY` to Render env vars
  - Add: To `.env.local` (NOT committed!)
  - Verify: Key is 64 hex characters

**Success Criteria:**

- ✅ All OAuth tokens encrypted in database
- ✅ Encryption key stored securely
- ✅ Decryption works in all flows
- ✅ No plaintext tokens in database

**Files to Create/Modify:**

- `docs/SECRETS_AUDIT.md` (NEW)
- `src/lib/security/encryption.ts` (NEW)
- `supabase/migrations/021_encrypt_oauth_tokens.sql` (NEW)
- `scripts/encrypt-existing-tokens.ts` (NEW)
- `src/lib/shopify/client.ts` (MODIFY)
- `src/lib/klaviyo/client.ts` (MODIFY)

**Environment Variables to Add:**

- `ENCRYPTION_KEY` (64 hex characters)

**Reference:** See "Step 2" in detailed roadmap

---

### Task 3: Test Multi-Tenancy Isolation

**Priority:** 🔴 CRITICAL
**Risk:** Data leak between stores
**Time:** 2-3 hours
**Status:** ⬜ Not Started

#### Subtasks

- [ ] **3.1** Create multi-tenancy test suite (1.5 hours)
  - Create: `src/__tests__/security/multi-tenancy.test.ts`
  - Tests: API isolation, DB isolation, subdomain routing, JWT validation
  - Coverage: All data access patterns

- [ ] **3.2** Run multi-tenancy tests (30 min)
  - Start: `npm run dev`
  - Run: `npm run test -- multi-tenancy.test.ts`
  - Document: Any failures

- [ ] **3.3** Fix any failures (1 hour)
  - Review: Test failures
  - Fix: Missing RLS policies
  - Fix: API route checks
  - Fix: Subdomain routing
  - Retest: Until all pass

**Success Criteria:**

- ✅ All multi-tenancy tests pass
- ✅ No cross-store data access possible
- ✅ Subdomain routing enforces isolation
- ✅ JWT tampering detected

**Files to Create:**

- `src/__tests__/security/multi-tenancy.test.ts` (NEW)

**Reference:** See "Step 3" in detailed roadmap

---

### Task 4: Configure Security Headers

**Priority:** 🔴 CRITICAL
**Risk:** XSS, clickjacking, MITM attacks
**Time:** 1-2 hours
**Status:** ⬜ Not Started

#### Subtasks

- [ ] **4.1** Add security headers to Next.js (30 min)
  - Modify: `next.config.js`
  - Add: Strict-Transport-Security, X-Frame-Options, etc.
  - Headers: 7 security headers total

- [ ] **4.2** Configure Content Security Policy (1 hour)
  - Modify: `src/middleware.ts`
  - Add: CSP for Shopify + Supabase + OpenAI
  - Allow: Only necessary domains

- [ ] **4.3** Test security headers (30 min)
  - Create: `src/__tests__/security/headers.test.ts`
  - Run: `npm run test -- headers.test.ts`
  - Verify: All headers present

- [ ] **4.4** Verify in production (15 min)
  - Deploy: To staging environment
  - Test: https://securityheaders.com
  - Goal: A+ rating

**Success Criteria:**

- ✅ All security headers present
- ✅ CSP configured correctly
- ✅ Tests pass
- ✅ A+ rating on securityheaders.com

**Files to Create/Modify:**

- `next.config.js` (MODIFY)
- `src/middleware.ts` (MODIFY)
- `src/__tests__/security/headers.test.ts` (NEW)

**Reference:** See "Step 4" in detailed roadmap

---

## 🟡 SHORT TERM TASKS (Week 1-2)

### Task 5: Set Up Automated Security Scanning

**Priority:** 🟡 Important
**Time:** 1 hour
**Status:** ⬜ Not Started (Infrastructure already in place)

#### Subtasks

- [ ] **5.1** Add Snyk token (5 min)
  - Sign up: https://snyk.io
  - Generate: Auth token
  - Add: `SNYK_TOKEN` to GitHub Secrets

- [ ] **5.2** Enable Dependabot (5 min)
  - GitHub: Settings → Security & analysis
  - Enable: Dependabot alerts
  - Enable: Dependabot security updates

- [ ] **5.3** Verify weekly scans (10 min)
  - Check: `.github/workflows/security-scan.yml`
  - Schedule: Every Monday 9 AM UTC
  - Test: Trigger manually

- [ ] **5.4** Set up Slack alerts (40 min)
  - Create: `.github/workflows/security-alerts.yml`
  - Setup: Slack webhook
  - Add: `SLACK_WEBHOOK_URL` to GitHub Secrets
  - Test: Send test alert

**Success Criteria:**

- ✅ Snyk running in CI/CD
- ✅ Dependabot enabled
- ✅ Weekly scans scheduled
- ✅ Alerts configured

**Files to Create:**

- `.github/workflows/security-alerts.yml` (NEW)

**Secrets to Add:**

- `SNYK_TOKEN` (GitHub Secrets)
- `SLACK_WEBHOOK_URL` (GitHub Secrets)

**Reference:** See "Step 5" in detailed roadmap

---

### Task 6: Implement Rate Limiting

**Priority:** 🟡 Important
**Risk:** DDoS, resource exhaustion
**Time:** 2-3 hours
**Status:** ⬜ Not Started

#### Subtasks

- [ ] **6.1** Install Upstash Rate Limit (15 min)
  - Install: `npm install @upstash/ratelimit @upstash/redis`
  - Sign up: https://console.upstash.com
  - Get: Redis URL and token
  - Add: To environment variables

- [ ] **6.2** Create rate limiter utility (30 min)
  - Create: `src/lib/security/rate-limit.ts`
  - Limiters: Global, API, Auth, AI
  - Limits: Appropriate for each use case

- [ ] **6.3** Add middleware rate limiting (1 hour)
  - Modify: `src/middleware.ts`
  - Add: Global rate limit check
  - Headers: X-RateLimit-\* headers

- [ ] **6.4** Add API route rate limiting (1 hour)
  - Modify: `src/app/api/generate/create/route.ts`
  - Modify: `src/app/api/enhance/route.ts`
  - Add: Per-store rate limits

- [ ] **6.5** Test rate limiting (30 min)
  - Create: `src/__tests__/security/rate-limit.test.ts`
  - Test: Exceeding limits
  - Test: Separate store limits
  - Run: `npm run test -- rate-limit.test.ts`

**Success Criteria:**

- ✅ Rate limiting active on all routes
- ✅ Per-store isolation working
- ✅ Headers showing limit status
- ✅ Tests pass

**Files to Create/Modify:**

- `src/lib/security/rate-limit.ts` (NEW)
- `src/middleware.ts` (MODIFY)
- `src/app/api/generate/create/route.ts` (MODIFY)
- `src/app/api/enhance/route.ts` (MODIFY)
- `src/__tests__/security/rate-limit.test.ts` (NEW)

**Environment Variables:**

- `UPSTASH_REDIS_REST_URL`
- `UPSTASH_REDIS_REST_TOKEN`

**Reference:** See "Step 6" in detailed roadmap

---

### Task 7: Add Security Event Logging

**Priority:** 🟡 Important
**Time:** 2 hours
**Status:** ⬜ Not Started

#### Subtasks

- [ ] **7.1** Create audit log table (30 min)
  - Create: `supabase/migrations/022_security_audit_log.sql`
  - Fields: event_type, severity, user_id, store_id, metadata
  - Enable: RLS policies

- [ ] **7.2** Create logging utility (45 min)
  - Create: `src/lib/security/audit-log.ts`
  - Functions: `logSecurityEvent()`, helpers
  - Events: Login, logout, unauthorized, rate limit, etc.

- [ ] **7.3** Integrate into auth flow (30 min)
  - Modify: `src/app/api/auth/login/route.ts`
  - Log: Successful and failed logins
  - Log: Logout events

- [ ] **7.4** Add logging to rate limiter (15 min)
  - Modify: Rate limiting middleware
  - Log: Rate limit violations

**Success Criteria:**

- ✅ Audit log table created
- ✅ All security events logged
- ✅ Logs queryable by store
- ✅ Critical events trigger alerts

**Files to Create/Modify:**

- `supabase/migrations/022_security_audit_log.sql` (NEW)
- `src/lib/security/audit-log.ts` (NEW)
- `src/app/api/auth/login/route.ts` (MODIFY)
- `src/middleware.ts` (MODIFY - add rate limit logging)

**Reference:** See "Step 7" in detailed roadmap

---

### Task 8: Test All OAuth Flows

**Priority:** 🟡 Important
**Time:** 3-4 hours
**Status:** ⬜ Not Started

#### Subtasks

- [ ] **8.1** Create OAuth test checklist (30 min)
  - Create: `docs/OAUTH_TEST_CHECKLIST.md`
  - List: All OAuth providers (Shopify, Klaviyo, Meta, Google)
  - Checklist: Security items to verify

- [ ] **8.2** Test Shopify OAuth (1 hour)
  - Manual: Complete OAuth flow
  - Verify: State parameter validation
  - Verify: Redirect URI validation
  - Verify: Token encryption
  - Create: Automated tests

- [ ] **8.3** Test Klaviyo integration (45 min)
  - Manual: API key validation
  - Verify: Encryption
  - Verify: Invalid key rejection

- [ ] **8.4** Test Meta OAuth (1 hour)
  - Manual: Complete OAuth flow
  - Verify: All security checks
  - Create: Automated tests

- [ ] **8.5** Test Google Ads OAuth (1 hour)
  - Manual: Complete OAuth flow
  - Verify: All security checks
  - Create: Automated tests

**Success Criteria:**

- ✅ All OAuth flows tested
- ✅ State validation working
- ✅ Tokens encrypted
- ✅ Automated tests created

**Files to Create:**

- `docs/OAUTH_TEST_CHECKLIST.md` (NEW)
- `src/__tests__/security/oauth.test.ts` (NEW)

**Reference:** See "Step 8" in detailed roadmap

---

### Task 9: Configure Monitoring & Alerts

**Priority:** 🟡 Important
**Time:** 2-3 hours
**Status:** ⬜ Not Started

#### Subtasks

- [ ] **9.1** Set up Sentry (1 hour)
  - Install: `npm install @sentry/nextjs`
  - Run: `npx @sentry/wizard@latest -i nextjs`
  - Configure: `sentry.client.config.ts`
  - Add: Security event filtering

- [ ] **9.2** Configure uptime monitoring (30 min)
  - Create: `src/app/api/health/route.ts`
  - Configure: Render health checks
  - Or: Set up UptimeRobot

- [ ] **9.3** Set up log aggregation (1 hour)
  - Option 1: Use Render native logs
  - Option 2: Integrate LogDNA/Datadog
  - Configure: Log shipping

- [ ] **9.4** Test alerts (30 min)
  - Trigger: Test error in Sentry
  - Trigger: Test downtime alert
  - Verify: Notifications received

**Success Criteria:**

- ✅ Error tracking with Sentry
- ✅ Uptime monitoring configured
- ✅ Log aggregation working
- ✅ Alerts firing correctly

**Files to Create:**

- `sentry.client.config.ts` (NEW - created by wizard)
- `src/app/api/health/route.ts` (NEW)

**Environment Variables:**

- `NEXT_PUBLIC_SENTRY_DSN`
- `SENTRY_AUTH_TOKEN`

**Reference:** See "Step 9" in detailed roadmap

---

## 🟢 ONGOING TASKS

### Task 10: Weekly Dependency Audits

**Priority:** 🟢 Maintenance
**Time:** 15-30 min/week
**Status:** ⬜ Not Started

#### Process

- [ ] **Every Monday:** Run security check
  - Command: `npm run security:check`
  - Review: Output for vulnerabilities
  - Fix: Critical/high issues immediately
  - Plan: Medium/low issues for sprint

- [ ] **Review Dependabot PRs**
  - Check: All automated PRs
  - Merge: Non-breaking updates
  - Test: Breaking updates before merge

**Automation:**

- GitHub Actions runs automatically (configured ✅)
- Results posted to PRs
- Weekly email summary

**Reference:** See "Step 10" in detailed roadmap

---

### Task 11: Monthly Security Reviews

**Priority:** 🟢 Maintenance
**Time:** 2-3 hours/month
**Status:** ⬜ Not Started

#### Checklist

- [ ] **Dependency Review**
  - Run: `npm audit`
  - Review: Dependabot PRs
  - Update: Major dependencies

- [ ] **Code Review**
  - Review: Security lint warnings
  - Check: New security TODOs
  - Review: Recent PRs

- [ ] **Access Review**
  - Review: Render access
  - Review: Supabase access
  - Review: GitHub collaborators
  - Rotate: API keys if needed

- [ ] **Log Review**
  - Review: `security_audit_log` table
  - Check: Sentry errors
  - Review: Rate limit violations

- [ ] **Infrastructure**
  - Verify: RLS enabled
  - Check: Database backups
  - Verify: Encryption keys secure
  - Test: Disaster recovery

- [ ] **Compliance**
  - Review: Data retention
  - Update: Privacy policy
  - Check: GDPR compliance

**Documentation:**

- Use: `docs/MONTHLY_SECURITY_REVIEW.md` template
- Track: Action items
- Schedule: First Monday of each month

**Reference:** See "Step 11" in detailed roadmap

---

### Task 12: Quarterly Penetration Testing

**Priority:** 🟢 Maintenance
**Time:** Varies
**Status:** ⬜ Not Started

#### Options

- [ ] **DIY Approach (Free)**
  - Tool: OWASP ZAP
  - Command: `docker run -t owasp/zap2docker-stable zap-baseline.py -t https://your-site.com`
  - Tool: Snyk deep scan
  - Command: `snyk test --all-projects`

- [ ] **Professional Approach ($500-2000)**
  - Services: Cobalt.io, Synack, HackerOne
  - Deliverable: OWASP Top 10 assessment
  - Deliverable: Vulnerability report
  - Track: Remediation progress

**Schedule:** Every 3 months (January, April, July, October)

**Reference:** See "Step 12" in detailed roadmap

---

## Quick Reference

### Commands

```bash
# Security scan (run anytime)
npm run security:check

# Individual scans
npm run security:lint
npm run security:audit
npm run security:scan

# Run tests
npm run test -- security/

# Database migrations
supabase db push
supabase test db

# Generate encryption key
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### Important Files

**Configuration:**

- `eslint.config.mjs` - Security linting rules
- `next.config.js` - Security headers
- `src/middleware.ts` - Rate limiting, CSP

**Tests:**

- `src/__tests__/security/` - All security tests

**Documentation:**

- `docs/security-scanning.md` - Security tools guide
- `docs/SECURITY_SCAN_REPORT.md` - Latest scan results
- `docs/SECURITY_QUICK_REFERENCE.md` - Quick commands

**Database:**

- `supabase/migrations/` - All database changes
- `supabase/tests/` - Database tests

### Environment Variables Checklist

**Current (Already Set):**

- ✅ `NEXT_PUBLIC_SUPABASE_URL`
- ✅ `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- ✅ `SUPABASE_SERVICE_KEY`
- ✅ `SHOPIFY_API_KEY`
- ✅ `SHOPIFY_API_SECRET`
- ✅ `NEXTAUTH_SECRET`
- ✅ `OPENAI_API_KEY`

**To Add:**

- [ ] `ENCRYPTION_KEY` (Task 2)
- [ ] `UPSTASH_REDIS_REST_URL` (Task 6)
- [ ] `UPSTASH_REDIS_REST_TOKEN` (Task 6)
- [ ] `NEXT_PUBLIC_SENTRY_DSN` (Task 9)
- [ ] `SENTRY_AUTH_TOKEN` (Task 9)

**GitHub Secrets:**

- [ ] `SNYK_TOKEN` (Task 5)
- [ ] `SLACK_WEBHOOK_URL` (Task 5)

---

## Progress Tracking

### Week 1 Timeline (Critical Tasks)

**Day 1-2: RLS Policies**

- [ ] Review schema (0.5h)
- [ ] Create migration (2h)
- [ ] Create tests (1.5h)
- [ ] Deploy & test (2h)

**Day 3: Encrypt Secrets**

- [ ] Audit secrets (1h)
- [ ] Implement encryption (2h)
- [ ] Update code (1h)

**Day 4: Multi-Tenancy**

- [ ] Create tests (1.5h)
- [ ] Run & fix (1.5h)

**Day 5: Security Headers**

- [ ] Configure headers (0.5h)
- [ ] Configure CSP (1h)
- [ ] Test & verify (0.5h)

### Week 2 Timeline (Short-Term Tasks)

**Day 1: Scanning**

- [ ] Snyk setup (1h)

**Day 2: Rate Limiting**

- [ ] Upstash setup (0.5h)
- [ ] Implement (2.5h)

**Day 3: Logging**

- [ ] Audit log (2h)

**Day 4-5: OAuth & Monitoring**

- [ ] Test OAuth (3h)
- [ ] Setup monitoring (2h)

---

## Getting Help

**Stuck on a task?** Say:

- "Help with Task 1" - I'll guide you through RLS policies
- "Start Task 2" - I'll implement encryption
- "Explain Task 6" - I'll explain rate limiting

**Ready to start?** Say:

- "Let's begin" - I'll start with Task 1
- "Start all critical tasks" - I'll work through Tasks 1-4
- "Just do Task X" - I'll focus on specific task

**Need documentation?** All detailed steps are in:

- This document (overview + checklists)
- Individual task files referenced above
- `docs/security-scanning.md` (tools guide)

---

## Document History

**v1.0** - October 24, 2025

- Initial comprehensive security action plan
- All tasks from roadmap consolidated
- Progress tracking added
- Quick reference section added

---

**Next Update:** After completing first critical task
