# Shared Backend Security Risk Analysis

**Date**: 2025-01-14
**Context**: Evaluating security implications of shared backend architecture for ThunderText, ACE, and Zeus Analytics

---

## Executive Summary

**Risk Level**: 🟡 **MODERATE** - Shared backend increases attack surface but is manageable with proper controls

**Key Risks**:

1. **Cross-App Data Leakage** - One app vulnerability exposes all apps
2. **Cascading Failures** - Backend breach affects all products
3. **Privilege Escalation** - Compromised app token grants multi-app access
4. **Audit Trail Complexity** - Harder to trace which app caused security event

**Mitigation Strategy**: Implement defense-in-depth with scope-based authorization, app-level isolation, and comprehensive monitoring

---

## 1. Attack Surface Analysis

### **Current Architecture Risk Profile**

| Component               | Risk Level | Exposure                                       |
| ----------------------- | ---------- | ---------------------------------------------- |
| **Shared Database**     | 🔴 HIGH    | All apps read/write same tables                |
| **Shared API Routes**   | 🟡 MEDIUM  | Common endpoints increase attack vectors       |
| **Shared OAuth Tokens** | 🔴 HIGH    | Facebook/Shopify tokens accessible by all apps |
| **Shared API Keys**     | 🟡 MEDIUM  | OpenAI, Supabase keys used by all apps         |
| **Cross-App Sessions**  | 🟡 MEDIUM  | JWT tokens grant multi-app access              |

### **Attack Vectors Introduced by Shared Backend**

#### **Vector 1: Cross-App Data Leakage**

**Scenario**:

```
1. Attacker exploits XSS vulnerability in ThunderText frontend
2. Steals JWT token with scope: ["thundertext", "ace", "zeus"]
3. Uses token to access ACE ad campaign data
4. Exfiltrates sensitive ad performance metrics
```

**Current Code Vulnerability** (from `/src/lib/auth/content-center-auth.ts`):

```typescript
// No scope-based authorization - JWT grants access to ALL apps
export async function getUserId(request: NextRequest): Promise<string | null> {
  const token = request.headers.get("authorization")?.replace("Bearer ", "");

  // ❌ VULNERABILITY: No check for which app the token is authorized for
  const {
    data: { user },
  } = await supabase.auth.getUser(token);
  return user?.id || null;
}
```

**Risk**: If one app is compromised, attacker gains access to all apps using the same session token.

#### **Vector 2: SQL Injection in Shared Tables**

**Scenario**:

```
1. ACE has SQL injection vulnerability in ad generation API
2. Attacker injects: '; DROP TABLE shops; --
3. Entire shops table deleted
4. ALL apps (ThunderText, ACE, Zeus) lose authentication
```

**Current Code Vulnerability**:

```typescript
// Many routes use string interpolation - potential SQL injection
const { data } = await supabaseAdmin
  .from("shops")
  .select("*")
  .eq("shop_domain", shopDomain); // ✅ Safe - uses parameterized query

// But some use raw SQL:
const { data } = await supabaseAdmin.rpc("custom_function", {
  query: userInput, // ❌ VULNERABILITY if not sanitized
});
```

**Risk**: SQL injection in one app affects all apps sharing the database.

#### **Vector 3: Rate Limit Bypass**

**Scenario**:

```
1. User has rate limit: 100 req/hour for ThunderText
2. User discovers ACE uses same backend
3. Makes 100 ThunderText requests + 100 ACE requests
4. Bypasses intended 100 req/hour limit
```

**Current Code** (from `/src/lib/middleware/rate-limit.ts`):

```typescript
// Rate limiting is per-user, but not shared across apps
export async function withRateLimit(limit: RateLimitConfig) {
  const key = `ratelimit:${userId}:${endpoint}`; // ❌ Not app-scoped

  // Risk: Each app gets its own rate limit bucket
}
```

**Risk**: Users can abuse rate limits by distributing requests across multiple apps.

#### **Vector 4: Privilege Escalation via OAuth**

**Scenario**:

```
1. User authorizes ThunderText (minimal Shopify scopes)
2. ThunderText OAuth token stored in shared 'integrations' table
3. ACE accesses same token, requests elevated scopes
4. User unknowingly grants ACE access to sensitive data
```

**Current Code** (from `/src/lib/services/facebook-api.ts`):

```typescript
// All apps share the same Facebook OAuth token
async function getAccessToken(shopId: string): Promise<string> {
  const integration = await getIntegration(shopId);

  // ❌ VULNERABILITY: No check for which app requested the token
  return await decryptToken(integration.encrypted_access_token);
}
```

**Risk**: One app can abuse OAuth tokens obtained by another app with different permissions.

---

## 2. Data Isolation Risks

### **Problem: Shared Database Tables**

**Vulnerable Tables**:

| Table                  | Risk        | Why                                                         |
| ---------------------- | ----------- | ----------------------------------------------------------- |
| `shops`                | 🔴 CRITICAL | Core auth table - compromise affects ALL apps               |
| `integrations`         | 🔴 CRITICAL | OAuth tokens - one app can abuse another's tokens           |
| `business_profiles`    | 🟡 MEDIUM   | Sensitive brand data - cross-app leakage possible           |
| `product_descriptions` | 🟡 MEDIUM   | ThunderText data accessible by ACE via `facebook_ad_drafts` |
| `aie_ad_requests`      | 🟡 MEDIUM   | Ad strategy data - competitor analysis risk                 |

### **Current Isolation Mechanism: Row Level Security (RLS)**

**Existing RLS Policies** (from Supabase migrations):

```sql
-- shops table RLS
CREATE POLICY "Users can only access their own shop"
ON shops FOR ALL
USING (id = auth.uid()::uuid);

-- ❌ PROBLEM: RLS assumes auth.uid() is shop owner
-- What if JWT is compromised? Attacker has shop owner privileges across ALL apps
```

**Gap**: RLS policies don't differentiate between apps - if you have access to the shop, you have access to ALL shop data across ALL apps.

### **Data Leakage Risk Matrix**

| Data Type             | Stored In                                | Accessible By                 | Sensitivity | Risk                           |
| --------------------- | ---------------------------------------- | ----------------------------- | ----------- | ------------------------------ |
| Shopify OAuth tokens  | `shops.access_token`                     | ThunderText, ACE, Zeus        | 🔴 CRITICAL | If leaked, full store takeover |
| Facebook OAuth tokens | `integrations.encrypted_access_token`    | ThunderText, ACE              | 🔴 CRITICAL | If leaked, ad account takeover |
| Product descriptions  | `product_descriptions.generated_content` | ThunderText, ACE (via drafts) | 🟡 MEDIUM   | Competitive intelligence       |
| Ad campaign strategy  | `aie_ad_requests.description`            | ACE                           | 🟡 MEDIUM   | Marketing strategy exposure    |
| Business profile      | `business_profiles.master_profile_text`  | ThunderText, ACE, Zeus        | 🟡 MEDIUM   | Brand positioning data         |
| Customer data         | None (Shopify-hosted)                    | None                          | N/A         | ✅ Safe - not stored           |

---

## 3. Authentication & Authorization Gaps

### **Current Authentication Flow**

```typescript
// Step 1: User installs ThunderText on Shopify
// Shopify OAuth → shops.access_token stored

// Step 2: User accesses ThunderText
// Shop session created → JWT issued with claims: { shopId, userId }

// Step 3: User clicks "Try ACE" link
// Same JWT used → ACE authenticates user automatically

// ❌ PROBLEM: JWT doesn't specify which apps user authorized
```

### **Missing Authorization Checks**

**Gap 1: No App-Level Scopes**

```typescript
// Current JWT claims
{
  "sub": "user-123",
  "shopId": "shop-abc",
  "exp": 1234567890
  // ❌ MISSING: "apps": ["thundertext", "ace"]
}

// Should be:
{
  "sub": "user-123",
  "shopId": "shop-abc",
  "apps": ["thundertext"], // User only authorized ThunderText
  "exp": 1234567890
}
```

**Gap 2: No API Route Protection**

```typescript
// Example: ACE API route
export async function POST(request: NextRequest) {
  const userId = await getUserId(request); // ✅ Checks authentication

  // ❌ MISSING: Check if user has ACE subscription
  // ❌ MISSING: Check if user authorized ACE app

  const result = await generateAds(...);
  return NextResponse.json(result);
}
```

### **Exploitation Scenario**

```
1. Attacker subscribes to ThunderText ($29/month)
2. Attacker inspects network requests, finds JWT token
3. Attacker crafts POST /api/aie/generate request with stolen JWT
4. Backend accepts JWT (valid for ThunderText)
5. Attacker generates ACE ads without paying for ACE ($49/month)
6. Result: $49/month revenue loss + unauthorized API usage
```

---

## 4. Cascading Failure Risks

### **Scenario 1: DDoS Attack on Shared Backend**

**Attack Flow**:

```
1. Attacker targets ThunderText with DDoS (100K req/sec)
2. Shared backend API becomes unresponsive
3. ACE and Zeus also go down (same backend)
4. ALL customers across ALL apps experience outage
```

**Impact**:

- 1 app vulnerability = 3 apps offline
- Customers blame ALL products for unreliability
- Revenue loss across entire suite

**Current Mitigation**: Rate limiting per-user
**Gap**: No DDoS protection at infrastructure level

### **Scenario 2: Database Breach**

**Attack Flow**:

```
1. Attacker exploits SQL injection in Zeus Analytics
2. Gains database admin access via Supabase RLS bypass
3. Exfiltrates ALL tables: shops, integrations, business_profiles, aie_ad_requests
4. Data breach affects ALL customers across ALL apps
```

**Impact**:

- Shopify OAuth tokens leaked → store takeovers
- Facebook OAuth tokens leaked → ad account hijacking
- Business profiles leaked → competitive intelligence
- GDPR violation → fines + lawsuits

**Current Mitigation**: Supabase RLS policies
**Gap**: RLS can be bypassed if attacker gains service role key

### **Scenario 3: Malicious Insider**

**Attack Flow**:

```
1. Developer with backend access goes rogue
2. Developer has SUPABASE_SERVICE_KEY environment variable
3. Developer writes script to exfiltrate all customer data
4. Data sold on dark web
```

**Impact**:

- No audit trail (service key bypasses RLS)
- Difficult to detect (legitimate credentials)
- Affects all apps simultaneously

**Current Mitigation**: None
**Gap**: No database activity monitoring or anomaly detection

---

## 5. Mitigation Strategies

### **🔴 CRITICAL - Must Implement**

#### **Mitigation 1: App-Scoped Authorization**

**Implementation**:

```typescript
// 1. Add app scopes to JWT
interface JWTClaims {
  sub: string;
  shopId: string;
  apps: string[]; // ["thundertext", "ace", "zeus"]
  exp: number;
}

// 2. Create authorization middleware
export function requireApp(appName: string) {
  return async (request: NextRequest) => {
    const token = await verifyJWT(request);

    if (!token.apps.includes(appName)) {
      throw new APIError(403, ErrorCode.FORBIDDEN,
        `Access denied: ${appName} subscription required`);
    }

    return token;
  };
}

// 3. Protect API routes
export async function POST(request: NextRequest) {
  const token = await requireApp('ace')(request); // ✅ Enforces ACE access

  const result = await generateAds(...);
  return NextResponse.json(result);
}
```

**Benefit**: Prevents cross-app token abuse, enforces subscription checks

#### **Mitigation 2: Database-Level App Isolation**

**Implementation**:

```sql
-- Add app_name column to sensitive tables
ALTER TABLE aie_ad_requests ADD COLUMN app_name TEXT DEFAULT 'ace';
ALTER TABLE product_descriptions ADD COLUMN app_name TEXT DEFAULT 'thundertext';

-- Update RLS policies with app check
CREATE POLICY "Users can only access their app's data"
ON aie_ad_requests FOR ALL
USING (
  shop_id IN (
    SELECT id FROM shops WHERE id = auth.uid()::uuid
  )
  AND app_name = current_setting('request.jwt.claims', true)::json->>'app'
);
```

**Benefit**: Database-enforced app isolation, even if JWT is compromised

#### **Mitigation 3: Separate OAuth Tokens per App**

**Implementation**:

```sql
-- Add app_name to integrations table
ALTER TABLE integrations ADD COLUMN app_name TEXT;
ALTER TABLE integrations ADD CONSTRAINT unique_app_integration
  UNIQUE (shop_id, provider, app_name);

-- Now each app gets its own Facebook token
INSERT INTO integrations (shop_id, provider, app_name, encrypted_access_token)
VALUES
  ('shop-123', 'facebook', 'thundertext', '...'),
  ('shop-123', 'facebook', 'ace', '...');
```

**Benefit**: One app can't abuse another app's OAuth tokens

#### **Mitigation 4: App-Scoped Rate Limiting**

**Implementation**:

```typescript
export async function withRateLimit(limit: RateLimitConfig) {
  // Include app name in rate limit key
  const appName = request.headers.get("x-app-name");
  const key = `ratelimit:${userId}:${appName}:${endpoint}`;

  // Now each app has separate rate limit bucket
}
```

**Benefit**: Prevents rate limit bypass via multiple apps

### **🟡 IMPORTANT - Strongly Recommended**

#### **Mitigation 5: Comprehensive Audit Logging**

**Implementation**:

```typescript
// Log all sensitive operations
export async function auditLog(event: {
  userId: string;
  shopId: string;
  appName: string;
  action: string; // 'oauth_token_access', 'shop_data_read', 'ad_generation'
  resource: string;
  ipAddress: string;
  userAgent: string;
}) {
  await supabaseAdmin.from("audit_logs").insert({
    ...event,
    timestamp: new Date().toISOString(),
  });

  // Send to Sentry for monitoring
  Sentry.captureMessage(`Audit: ${event.action}`, {
    level: "info",
    extra: event,
  });
}
```

**Benefit**: Detect suspicious activity, forensic analysis after breach

#### **Mitigation 6: Secrets Rotation Policy**

**Implementation**:

- Rotate Supabase service role key every 90 days
- Rotate OAuth client secrets every 6 months
- Rotate encryption keys annually
- Store secrets in HashiCorp Vault (not env vars)

**Benefit**: Limits damage window if secrets are compromised

#### **Mitigation 7: Database Activity Monitoring**

**Implementation**:

```sql
-- Enable Supabase audit logging
ALTER DATABASE postgres SET log_statement = 'all';
ALTER DATABASE postgres SET log_connections = 'on';

-- Monitor for anomalies
-- - Unusual query patterns (e.g., SELECT * FROM shops)
-- - High-volume data exfiltration
-- - Access from unexpected IP addresses
```

**Benefit**: Early detection of data breaches

### **🟢 RECOMMENDED - Best Practice**

#### **Mitigation 8: API Gateway with WAF**

**Implementation**:

- Deploy Cloudflare WAF in front of backend
- Block SQL injection patterns
- Rate limit at edge (before hitting backend)
- DDoS protection with challenge pages

**Benefit**: Infrastructure-level security before requests reach backend

#### **Mitigation 9: Principle of Least Privilege**

**Implementation**:

```typescript
// Create app-specific database users
CREATE USER thundertext_app WITH PASSWORD '...';
CREATE USER ace_app WITH PASSWORD '...';

-- Grant only necessary permissions
GRANT SELECT, INSERT, UPDATE ON product_descriptions TO thundertext_app;
GRANT SELECT, INSERT, UPDATE ON aie_ad_requests TO ace_app;

-- Deny cross-app access
REVOKE ALL ON aie_ad_requests FROM thundertext_app;
REVOKE ALL ON product_descriptions FROM ace_app;
```

**Benefit**: Even if one app is compromised, can't access other app's data

#### **Mitigation 10: Penetration Testing**

**Implementation**:

- Hire external security firm
- Test for: SQL injection, XSS, CSRF, privilege escalation
- Focus on cross-app attack vectors
- Annual re-testing after major changes

**Benefit**: Proactively discover vulnerabilities before attackers do

---

## 6. Risk Comparison: Shared vs. Separate Backends

### **Shared Backend Risk Profile**

| Risk Category          | Likelihood | Impact    | Combined Risk                                                        |
| ---------------------- | ---------- | --------- | -------------------------------------------------------------------- |
| Cross-app data leakage | 🟡 MEDIUM  | 🔴 HIGH   | 🔴 **HIGH**                                                          |
| Cascading failures     | 🟡 MEDIUM  | 🔴 HIGH   | 🔴 **HIGH**                                                          |
| OAuth token abuse      | 🟡 MEDIUM  | 🔴 HIGH   | 🔴 **HIGH**                                                          |
| Rate limit bypass      | 🟢 LOW     | 🟡 MEDIUM | 🟡 **MEDIUM**                                                        |
| Privilege escalation   | 🟡 MEDIUM  | 🔴 HIGH   | 🔴 **HIGH**                                                          |
| **Overall Risk**       |            |           | 🔴 **HIGH** (without mitigations) → 🟡 **MEDIUM** (with mitigations) |

### **Separate Backends Risk Profile**

| Risk Category          | Likelihood | Impact    | Combined Risk |
| ---------------------- | ---------- | --------- | ------------- |
| Cross-app data leakage | 🟢 NONE    | N/A       | 🟢 **NONE**   |
| Cascading failures     | 🟢 NONE    | N/A       | 🟢 **NONE**   |
| OAuth token abuse      | 🟢 NONE    | N/A       | 🟢 **NONE**   |
| Code duplication bugs  | 🟡 MEDIUM  | 🟡 MEDIUM | 🟡 **MEDIUM** |
| Inconsistent security  | 🟡 MEDIUM  | 🔴 HIGH   | 🔴 **HIGH**   |
| **Overall Risk**       |            |           | 🟡 **MEDIUM** |

### **Key Insight**

- **Shared Backend** = Centralized risk (easier to secure, harder to contain breach)
- **Separate Backends** = Distributed risk (harder to secure consistently, easier to contain breach)

**Recommendation**: Shared backend is acceptable IF all 🔴 CRITICAL mitigations are implemented.

---

## 7. Compliance Implications

### **GDPR Considerations**

**Risk**: Shared backend = shared data processor

**Implications**:

- All apps must have identical GDPR policies
- Data breach in one app = notification for all apps
- Right to deletion must cascade across all apps
- Data portability must include all app data

**Mitigation**:

```typescript
// Implement unified GDPR compliance API
export async function deleteCustomerData(shopId: string) {
  // Delete from ALL app tables
  await supabaseAdmin
    .from("product_descriptions")
    .delete()
    .eq("shop_id", shopId);
  await supabaseAdmin.from("aie_ad_requests").delete().eq("shop_id", shopId);
  await supabaseAdmin.from("shops").delete().eq("id", shopId);

  // Notify all apps of deletion
  await notifyApps("customer_deleted", { shopId });
}
```

### **PCI DSS (if processing payments)**

**Risk**: Shared backend = shared PCI scope

**Implications**:

- All apps must be PCI compliant
- One app vulnerability = entire backend fails audit
- Expensive annual audits for entire backend

**Mitigation**: Use external payment processor (Stripe) - keep payments OUT of shared backend

### **SOC 2 Compliance**

**Risk**: Shared backend = shared security controls

**Implications**:

- Access controls must cover all apps
- Logging must track cross-app access
- Incident response must consider multi-app impact

**Mitigation**: Implement comprehensive audit logging and app-scoped authorization

---

## 8. Incident Response Plan

### **Scenario: Cross-App JWT Token Leak**

**Detection**:

```typescript
// Anomaly detection
if (requestsFromIP > 1000 && appsAccessed.length > 1) {
  alert("Possible JWT token leak - cross-app abuse detected");
}
```

**Response**:

1. **Immediate** (< 5 min): Revoke compromised JWT tokens, force re-authentication
2. **Short-term** (< 1 hour): Audit all requests from compromised token, identify data accessed
3. **Medium-term** (< 24 hours): Notify affected customers, reset OAuth tokens
4. **Long-term** (< 1 week): Implement app-scoped authorization (Mitigation 1)

### **Scenario: SQL Injection in Shared Database**

**Detection**:

```sql
-- Monitor for suspicious queries
SELECT * FROM pg_stat_statements
WHERE query LIKE '%DROP TABLE%' OR query LIKE '%1=1%';
```

**Response**:

1. **Immediate** (< 1 min): Kill malicious query, block attacking IP
2. **Short-term** (< 10 min): Restore from backup if data deleted
3. **Medium-term** (< 1 hour): Patch SQL injection vulnerability
4. **Long-term** (< 1 week): Implement prepared statements everywhere, add WAF

### **Scenario: Supabase Service Key Compromise**

**Detection**:

```typescript
// Monitor for service key usage from unexpected IPs
if (serviceKeyUsage.ipAddress !== ALLOWED_IPS) {
  alert("Service key used from unauthorized IP!");
}
```

**Response**:

1. **Immediate** (< 5 min): Rotate service key in Supabase dashboard
2. **Short-term** (< 30 min): Update env vars on all servers
3. **Medium-term** (< 2 hours): Audit all database operations since compromise
4. **Long-term** (< 1 week): Move secrets to HashiCorp Vault, implement anomaly detection

---

## 9. Security Checklist

### **Pre-Launch Requirements** (🔴 BLOCKING)

- [ ] **App-scoped authorization** - JWT includes app list, API routes enforce app access
- [ ] **Separate OAuth tokens per app** - Each app gets its own Facebook/Shopify tokens
- [ ] **Database-level app isolation** - RLS policies check app name
- [ ] **App-scoped rate limiting** - Separate rate limit buckets per app
- [ ] **Comprehensive audit logging** - All sensitive operations logged with app context
- [ ] **Secrets rotation policy** - 90-day rotation schedule documented
- [ ] **Penetration testing** - External security firm audit completed

### **Post-Launch Monitoring** (🟡 IMPORTANT)

- [ ] **Database activity monitoring** - Anomaly detection for unusual queries
- [ ] **API gateway with WAF** - Cloudflare or AWS WAF deployed
- [ ] **Principle of least privilege** - App-specific database users created
- [ ] **Incident response plan** - Cross-app breach scenarios documented
- [ ] **GDPR compliance audit** - Unified data deletion/portability tested
- [ ] **SOC 2 audit** - Annual compliance audit scheduled

---

## 10. Conclusion

**Security Verdict**: Shared backend is **ACCEPTABLE** with proper mitigations, but requires **SIGNIFICANT security investment** (estimated 3-4 weeks of security hardening).

**Required Mitigations** (Must implement before production):

1. ✅ App-scoped authorization (JWT with app list)
2. ✅ Separate OAuth tokens per app
3. ✅ Database-level app isolation (RLS with app checks)
4. ✅ App-scoped rate limiting
5. ✅ Comprehensive audit logging
6. ✅ Penetration testing

**Without these mitigations**: Risk level is 🔴 **UNACCEPTABLY HIGH** - do not launch shared backend.

**With these mitigations**: Risk level drops to 🟡 **MODERATE** - acceptable for SaaS applications.

**Alternative**: If security investment is too high, consider **separate backends per app** to reduce attack surface at the cost of code duplication.
