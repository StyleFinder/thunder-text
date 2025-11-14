# ThunderText & ACE Separation Action Plan

**Project**: Split monolithic ThunderText app into modular architecture with shared backend
**Goal**: Enable separate app listings while maintaining shared infrastructure
**Timeline**: 6-8 weeks total (can be done incrementally without breaking changes)
**Risk Level**: 🟡 MEDIUM (with proper testing and rollback strategy)

---

## Table of Contents

1. [Architecture Overview](#1-architecture-overview)
2. [Shared Resources Inventory](#2-shared-resources-inventory)
3. [Phase-by-Phase Execution Plan](#3-phase-by-phase-execution-plan)
4. [Validation & Testing Strategy](#4-validation--testing-strategy)
5. [Rollback Strategy](#5-rollback-strategy)
6. [Pre-Separation Checklist](#6-pre-separation-checklist)

---

## 1. Architecture Overview

### **Current State (Monolithic)**

```
/thunder-text/
  /src/
    /app/
      /dashboard/           # ThunderText UI
      /product/new/         # ThunderText UI
      /facebook-ads/        # ACE UI
      /api/
        /generate/          # ThunderText logic
        /aie/               # ACE logic
        /business-profile/  # Shared logic
        /facebook/          # Shared logic
    /lib/
      /services/            # Mixed ThunderText + ACE + Shared
```

### **Target State (Modular with Shared Backend)**

```
/thunder-text-platform/
  /packages/
    /shared-backend/              # NEW: Extracted shared services
      /lib/
        /services/
          business-profile-generator.ts
          facebook-api.ts
          openai-client.ts
          encryption.ts
          supabase.ts
        /middleware/
          rate-limit.ts
          auth.ts
        /api/
          errors.ts
      /api/                       # Shared API routes
        /shops/
        /auth/
        /business-profile/
        /facebook/
        /integrations/

    /thundertext-app/             # NEW: ThunderText frontend
      /src/
        /app/
          /dashboard/
          /product/
          /settings/
        /components/
        /lib/
          /thundertext-services/
      /api/                       # ThunderText-specific APIs
        /generate/
        /prompts/
        /categories/

    /ace-app/                     # NEW: ACE frontend
      /src/
        /app/
          /facebook-ads/
          /campaigns/
          /ad-library/
        /components/
        /lib/
          /aie/
      /api/                       # ACE-specific APIs
        /aie/
        /facebook/ad-drafts/

    /shared-ui/                   # NEW: Common UI components
      /components/
        ErrorBoundary.tsx
        UnifiedShopifyAuth.tsx
        PolarisProvider.tsx
```

### **Architecture Benefits**

✅ Each app can deploy independently
✅ Shared backend prevents code duplication (40% of codebase)
✅ Suite subscription logic in single location
✅ Security isolation at app level
✅ Independent UI/UX evolution per app

---

## 2. Shared Resources Inventory

### **2.1 Database Tables (Must Remain Shared)**

| Table                        | Owner          | Access Pattern                                | Migration Required             |
| ---------------------------- | -------------- | --------------------------------------------- | ------------------------------ |
| `shops`                      | Shared Backend | All apps read/write                           | ❌ No - already multi-tenant   |
| `integrations`               | Shared Backend | All apps read, ACE writes                     | ⚠️ Yes - add `app_name` column |
| `business_profiles`          | Shared Backend | All apps read                                 | ❌ No - already shared         |
| `business_profile_responses` | Shared Backend | All apps read                                 | ❌ No - already shared         |
| `interview_prompts`          | Shared Backend | All apps read                                 | ❌ No - already shared         |
| `product_descriptions`       | ThunderText    | ThunderText writes, ACE reads (via drafts)    | ⚠️ Yes - add `app_name` column |
| `facebook_ad_drafts`         | ACE            | ACE writes, references `product_descriptions` | ⚠️ Yes - add `app_name` column |
| `aie_*` tables               | ACE            | ACE only                                      | ⚠️ Yes - add `app_name` column |

**Required Database Migrations**:

```sql
-- Migration 1: Add app_name column to track which app owns data
ALTER TABLE integrations ADD COLUMN app_name TEXT DEFAULT 'thundertext';
ALTER TABLE product_descriptions ADD COLUMN app_name TEXT DEFAULT 'thundertext';
ALTER TABLE facebook_ad_drafts ADD COLUMN app_name TEXT DEFAULT 'ace';
ALTER TABLE aie_ad_requests ADD COLUMN app_name TEXT DEFAULT 'ace';
ALTER TABLE aie_ad_variants ADD COLUMN app_name TEXT DEFAULT 'ace';

-- Migration 2: Update RLS policies for app-level isolation
CREATE POLICY "Users can only access their app's data"
ON product_descriptions FOR ALL
USING (
  shop_id IN (SELECT id FROM shops WHERE id = auth.uid()::uuid)
  AND (
    app_name = current_setting('request.jwt.claim.app', true)
    OR current_setting('request.jwt.claim.apps', true)::jsonb ? app_name
  )
);

-- Repeat for all app-scoped tables
```

### **2.2 Shared Backend Services**

| Service File                    | Used By                                | Must Extract | Dependencies         |
| ------------------------------- | -------------------------------------- | ------------ | -------------------- |
| `business-profile-generator.ts` | ThunderText, ACE                       | ✅ Yes       | OpenAI client        |
| `facebook-api.ts`               | ThunderText (drafts), ACE (publishing) | ✅ Yes       | Supabase, encryption |
| `openai-client.ts`              | ThunderText, ACE                       | ✅ Yes       | OpenAI SDK           |
| `encryption.ts`                 | ThunderText, ACE                       | ✅ Yes       | Crypto               |
| `supabase.ts`                   | ThunderText, ACE                       | ✅ Yes       | Supabase SDK         |
| `rate-limit.ts`                 | All APIs                               | ✅ Yes       | Redis (future)       |
| `errors.ts`                     | All APIs                               | ✅ Yes       | Sentry               |

### **2.3 Shared API Routes**

| Route                       | Purpose                | Must Extract | Security Requirement |
| --------------------------- | ---------------------- | ------------ | -------------------- |
| `/api/auth/callback`        | Shopify OAuth          | ✅ Yes       | App-scoped tokens    |
| `/api/business-profile/*`   | Interview & generation | ✅ Yes       | Shared by all apps   |
| `/api/facebook/oauth`       | Facebook OAuth         | ✅ Yes       | Per-app tokens       |
| `/api/facebook/campaigns`   | Campaign retrieval     | ✅ Yes       | Token validation     |
| `/api/facebook/ad-accounts` | Ad account list        | ✅ Yes       | Token validation     |
| `/api/shops/*`              | Shop management        | ✅ Yes       | Core auth            |

### **2.4 ThunderText-Specific Resources**

| Resource               | Location | Must Move | Dependencies                               |
| ---------------------- | -------- | --------- | ------------------------------------------ |
| `/api/generate`        | Root API | ✅ Yes    | OpenAI (shared), business profile (shared) |
| `/api/prompts`         | Root API | ✅ Yes    | Supabase (shared)                          |
| `/api/categories`      | Root API | ✅ Yes    | Supabase (shared)                          |
| `/api/detect-category` | Root API | ✅ Yes    | OpenAI (shared)                            |
| `/api/enhance`         | Root API | ✅ Yes    | OpenAI (shared)                            |
| `/app/dashboard`       | Frontend | ✅ Yes    | None                                       |
| `/app/product/new`     | Frontend | ✅ Yes    | None                                       |
| `/app/settings`        | Frontend | ✅ Yes    | None                                       |
| `content-generator.ts` | Service  | ✅ Yes    | OpenAI (shared)                            |

### **2.5 ACE-Specific Resources**

| Resource                            | Location | Must Move | Dependencies                                              |
| ----------------------------------- | -------- | --------- | --------------------------------------------------------- |
| `/api/aie/*`                        | Root API | ✅ Yes    | OpenAI (shared), pgvector (shared DB)                     |
| `/api/facebook/ad-drafts`           | Root API | ✅ Yes    | Facebook API (shared), product_descriptions (ThunderText) |
| `/api/facebook/generate-ad-content` | Root API | ✅ Yes    | OpenAI (shared)                                           |
| `/app/facebook-ads`                 | Frontend | ✅ Yes    | None                                                      |
| `/lib/aie/`                         | Service  | ✅ Yes    | OpenAI (shared), Supabase (shared)                        |

### **2.6 External Integrations (All Shared)**

| Service  | API Keys                                 | Access Pattern               | Security                |
| -------- | ---------------------------------------- | ---------------------------- | ----------------------- |
| OpenAI   | `OPENAI_API_KEY`                         | All apps generate AI content | ✅ Shared key OK        |
| Supabase | `SUPABASE_URL`, `SUPABASE_SERVICE_KEY`   | All apps query database      | ✅ Shared key OK        |
| Shopify  | `SHOPIFY_API_KEY`, `SHOPIFY_API_SECRET`  | All apps authenticate        | ✅ Shared key OK        |
| Facebook | `FACEBOOK_APP_ID`, `FACEBOOK_APP_SECRET` | OAuth per-app                | ⚠️ Needs per-app tokens |
| Sentry   | `SENTRY_DSN`                             | All apps report errors       | ✅ Shared DSN OK        |

---

## 3. Phase-by-Phase Execution Plan

### **PHASE 0: Pre-Separation Setup (Week 1)**

**Goal**: Prepare environment and safety nets before any code changes

#### **Action 0.1: Create Feature Branch**

```bash
git checkout -b feature/app-separation
git push -u origin feature/app-separation
```

**Validation**: Branch created, CI passes

#### **Action 0.2: Full Database Backup**

```bash
# Backup all Supabase tables
pg_dump -h db.xxx.supabase.co -U postgres -d postgres > backup_pre_separation.sql

# Backup environment variables
cp .env.local .env.backup

# Document current state
npm run type-check > pre_separation_types.log
npm run test > pre_separation_tests.log
```

**Validation**: Backups stored in safe location, restorable

#### **Action 0.3: Set Up Monitoring**

```typescript
// Add separation tracking to Sentry
Sentry.setTag("separation_phase", "phase_0");
Sentry.setContext("migration", {
  branch: "feature/app-separation",
  phase: "pre-separation",
  timestamp: new Date().toISOString(),
});
```

**Validation**: Sentry tags visible in dashboard

#### **Action 0.4: Create Rollback Script**

```bash
#!/bin/bash
# rollback.sh - Emergency rollback script

echo "🚨 ROLLING BACK APP SEPARATION"

# Restore database
psql -h db.xxx.supabase.co -U postgres -d postgres < backup_pre_separation.sql

# Restore code
git reset --hard origin/main

# Restore env vars
cp .env.backup .env.local

# Restart servers
pm2 restart all

echo "✅ Rollback complete"
```

**Validation**: Script tested on staging environment

---

### **PHASE 1: Extract Shared Backend (Weeks 2-3)**

**Goal**: Create `/packages/shared-backend/` with all shared services

#### **Action 1.1: Create Monorepo Structure**

```bash
# Create packages directory
mkdir -p packages/shared-backend/lib/services
mkdir -p packages/shared-backend/lib/middleware
mkdir -p packages/shared-backend/lib/api
mkdir -p packages/shared-backend/api
```

**Validation**: Directories created

#### **Action 1.2: Move Shared Services**

```bash
# Move shared service files (keep originals as symlinks during transition)
cp src/lib/services/business-profile-generator.ts packages/shared-backend/lib/services/
cp src/lib/services/facebook-api.ts packages/shared-backend/lib/services/
cp src/lib/services/openai-client.ts packages/shared-backend/lib/services/
cp src/lib/services/encryption.ts packages/shared-backend/lib/services/
cp src/lib/supabase.ts packages/shared-backend/lib/

# Create symlinks for backward compatibility
ln -s ../../packages/shared-backend/lib/services/business-profile-generator.ts src/lib/services/business-profile-generator.ts
ln -s ../../packages/shared-backend/lib/services/facebook-api.ts src/lib/services/facebook-api.ts
```

**Validation**:

```bash
# Test imports still work
npm run type-check
# Should pass with 0 errors

# Test APIs still respond
curl http://localhost:3050/api/business-profile/start
# Should return 200 or expected response
```

#### **Action 1.3: Update Import Paths**

```typescript
// Update all imports to use @shared-backend alias
// Before:
import { generateMasterBusinessProfile } from "@/lib/services/business-profile-generator";

// After:
import { generateMasterBusinessProfile } from "@shared-backend/services/business-profile-generator";
```

**Automation Script**:

```bash
# Update import paths
find src/app/api -type f -name "*.ts" -exec sed -i '' \
  's/@\/lib\/services\/business-profile-generator/@shared-backend\/services\/business-profile-generator/g' {} \;

find src/app/api -type f -name "*.ts" -exec sed -i '' \
  's/@\/lib\/services\/facebook-api/@shared-backend\/services\/facebook-api/g' {} \;

# Add more sed commands for other shared services
```

**Validation**:

```bash
npm run type-check  # Must pass
npm run test        # Must pass
```

#### **Action 1.4: Extract Shared API Routes**

```bash
# Move shared API routes
mkdir -p packages/shared-backend/api/shops
mkdir -p packages/shared-backend/api/auth
mkdir -p packages/shared-backend/api/business-profile
mkdir -p packages/shared-backend/api/facebook

# Copy files
cp -r src/app/api/auth/* packages/shared-backend/api/auth/
cp -r src/app/api/business-profile/* packages/shared-backend/api/business-profile/
cp -r src/app/api/facebook/oauth packages/shared-backend/api/facebook/
cp -r src/app/api/facebook/campaigns packages/shared-backend/api/facebook/
```

**Validation**:

```bash
# Test OAuth flow
curl -X POST http://localhost:3050/api/auth/callback?code=xxx&shop=test.myshopify.com
# Should authenticate successfully

# Test business profile
curl http://localhost:3050/api/business-profile/start
# Should return profile start data
```

#### **Action 1.5: Create Shared Backend Package.json**

```json
{
  "name": "@thunder-platform/shared-backend",
  "version": "1.0.0",
  "main": "./lib/index.ts",
  "exports": {
    "./services/*": "./lib/services/*",
    "./middleware/*": "./lib/middleware/*",
    "./api/*": "./lib/api/*"
  },
  "dependencies": {
    "@supabase/supabase-js": "^2.57.2",
    "openai": "^5.23.2",
    "@sentry/nextjs": "^10.23.0"
  }
}
```

**Validation**:

```bash
cd packages/shared-backend
npm install
npm run type-check
```

#### **Action 1.6: Configure TypeScript Path Aliases**

```json
// tsconfig.json (root)
{
  "compilerOptions": {
    "paths": {
      "@shared-backend/*": ["./packages/shared-backend/lib/*"],
      "@thundertext/*": ["./packages/thundertext-app/src/*"],
      "@ace/*": ["./packages/ace-app/src/*"]
    }
  }
}
```

**Validation**:

```bash
npm run type-check  # Should resolve all imports
```

---

### **PHASE 2: Implement App-Scoped Authorization (Week 4)**

**Goal**: Add security layer to prevent cross-app data leakage

#### **Action 2.1: Update JWT Claims Structure**

```typescript
// packages/shared-backend/lib/auth/jwt.ts
export interface JWTClaims {
  sub: string; // User ID
  shopId: string; // Shop UUID
  apps: string[]; // ["thundertext", "ace", "zeus"]
  iat: number; // Issued at
  exp: number; // Expires at
}

export async function createJWT(
  userId: string,
  shopId: string,
  authorizedApps: string[],
): Promise<string> {
  const claims: JWTClaims = {
    sub: userId,
    shopId,
    apps: authorizedApps,
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + 60 * 60 * 24, // 24 hours
  };

  return jwt.sign(claims, process.env.JWT_SECRET!);
}
```

**Validation**:

```typescript
// Test JWT creation
const token = await createJWT("user-123", "shop-abc", ["thundertext", "ace"]);
const decoded = jwt.verify(token, process.env.JWT_SECRET!);
console.assert(decoded.apps.includes("thundertext"));
console.assert(decoded.apps.includes("ace"));
```

#### **Action 2.2: Create App Authorization Middleware**

```typescript
// packages/shared-backend/lib/middleware/require-app.ts
export function requireApp(appName: string) {
  return async (request: NextRequest): Promise<JWTClaims> => {
    const authHeader = request.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      throw new APIError(401, ErrorCode.UNAUTHORIZED, "Missing JWT token");
    }

    const token = authHeader.substring(7);
    const claims = jwt.verify(token, process.env.JWT_SECRET!) as JWTClaims;

    // Check if user has access to this app
    if (!claims.apps.includes(appName)) {
      throw new APIError(
        403,
        ErrorCode.FORBIDDEN,
        `Access denied: ${appName} subscription required`,
        { authorizedApps: claims.apps },
      );
    }

    return claims;
  };
}
```

**Validation**:

```typescript
// Test authorization
const request = new NextRequest("http://localhost:3050/api/aie/generate", {
  headers: { authorization: "Bearer <token-with-only-thundertext>" },
});

try {
  await requireApp("ace")(request);
  throw new Error("Should have thrown 403");
} catch (err) {
  console.assert(err.statusCode === 403);
}
```

#### **Action 2.3: Update API Routes with Authorization**

```typescript
// packages/thundertext-app/api/generate/route.ts
import { requireApp } from "@shared-backend/middleware/require-app";

export async function POST(request: NextRequest) {
  // Enforce ThunderText access
  const claims = await requireApp("thundertext")(request);

  // Rest of route logic...
}

// packages/ace-app/api/aie/generate/route.ts
import { requireApp } from "@shared-backend/middleware/require-app";

export async function POST(request: NextRequest) {
  // Enforce ACE access
  const claims = await requireApp("ace")(request);

  // Rest of route logic...
}
```

**Validation**:

```bash
# Test ThunderText API with ACE token (should fail)
curl -X POST http://localhost:3050/api/generate \
  -H "Authorization: Bearer <ace-only-token>" \
  -d '{"productTitle":"Test"}'
# Expected: 403 Forbidden

# Test ACE API with ThunderText token (should fail)
curl -X POST http://localhost:3050/api/aie/generate \
  -H "Authorization: Bearer <thundertext-only-token>" \
  -d '{"description":"Test"}'
# Expected: 403 Forbidden

# Test with suite token (should succeed for both)
curl -X POST http://localhost:3050/api/generate \
  -H "Authorization: Bearer <suite-token>"
# Expected: 200 OK
```

#### **Action 2.4: Database Migration for App Isolation**

```sql
-- Migration: 20250114_add_app_name_columns.sql

-- Add app_name column to app-specific tables
ALTER TABLE product_descriptions
  ADD COLUMN app_name TEXT DEFAULT 'thundertext' NOT NULL;

ALTER TABLE facebook_ad_drafts
  ADD COLUMN app_name TEXT DEFAULT 'ace' NOT NULL;

ALTER TABLE aie_ad_requests
  ADD COLUMN app_name TEXT DEFAULT 'ace' NOT NULL;

ALTER TABLE aie_ad_variants
  ADD COLUMN app_name TEXT DEFAULT 'ace' NOT NULL;

-- Create index for performance
CREATE INDEX idx_product_descriptions_app ON product_descriptions(shop_id, app_name);
CREATE INDEX idx_ad_drafts_app ON facebook_ad_drafts(shop_id, app_name);

-- Update RLS policies with app-level isolation
DROP POLICY IF EXISTS "Users can access their data" ON product_descriptions;

CREATE POLICY "Users can access their app's data"
ON product_descriptions FOR ALL
USING (
  shop_id IN (SELECT id FROM shops WHERE id = auth.uid()::uuid)
  AND (
    -- Allow if JWT includes this app
    app_name = ANY(
      COALESCE(
        NULLIF(current_setting('request.jwt.claim.apps', true), '')::jsonb,
        '[]'::jsonb
      )::text[]
    )
  )
);

-- Repeat for other app-scoped tables
```

**Validation**:

```bash
# Run migration
npx supabase migration up

# Test RLS policy
psql -h db.xxx.supabase.co -d postgres -c "
  SET request.jwt.claim.apps = '[\"thundertext\"]';
  SELECT * FROM product_descriptions WHERE app_name = 'ace';
"
# Expected: 0 rows (ACE data blocked for ThunderText token)
```

#### **Action 2.5: Update OAuth Token Management**

```sql
-- Migration: 20250114_separate_oauth_tokens.sql

-- Add app_name to integrations table
ALTER TABLE integrations
  ADD COLUMN app_name TEXT DEFAULT 'thundertext';

-- Create unique constraint per app
ALTER TABLE integrations
  DROP CONSTRAINT IF EXISTS integrations_shop_id_provider_key;

ALTER TABLE integrations
  ADD CONSTRAINT integrations_shop_id_provider_app_key
  UNIQUE (shop_id, provider, app_name);

-- Migrate existing tokens (duplicate for each app)
INSERT INTO integrations (shop_id, provider, app_name, encrypted_access_token, token_expires_at, provider_account_id)
SELECT shop_id, provider, 'ace', encrypted_access_token, token_expires_at, provider_account_id
FROM integrations
WHERE provider = 'facebook' AND app_name = 'thundertext';

UPDATE integrations SET app_name = 'ace'
WHERE provider = 'facebook' AND id IN (
  SELECT MAX(id) FROM integrations WHERE provider = 'facebook' GROUP BY shop_id
);
```

**Validation**:

```bash
# Verify separate tokens exist
psql -h db.xxx.supabase.co -d postgres -c "
  SELECT shop_id, provider, app_name, COUNT(*)
  FROM integrations
  GROUP BY shop_id, provider, app_name;
"
# Expected: 2 rows per shop (thundertext + ace)
```

---

### **PHASE 3: Create Separate App Packages (Week 5)**

**Goal**: Split frontends into independent deployable apps

#### **Action 3.1: Create ThunderText App Package**

```bash
# Create package structure
mkdir -p packages/thundertext-app/src/app
mkdir -p packages/thundertext-app/src/components
mkdir -p packages/thundertext-app/api

# Move ThunderText-specific pages
mv src/app/dashboard packages/thundertext-app/src/app/
mv src/app/product packages/thundertext-app/src/app/
mv src/app/settings packages/thundertext-app/src/app/
mv src/app/content-center packages/thundertext-app/src/app/

# Move ThunderText-specific API routes
mv src/app/api/generate packages/thundertext-app/api/
mv src/app/api/prompts packages/thundertext-app/api/
mv src/app/api/categories packages/thundertext-app/api/
mv src/app/api/detect-category packages/thundertext-app/api/
mv src/app/api/enhance packages/thundertext-app/api/
```

**Validation**:

```bash
cd packages/thundertext-app
npm install
npm run dev  # Should start ThunderText app on port 3050
```

#### **Action 3.2: Create ACE App Package**

```bash
# Create package structure
mkdir -p packages/ace-app/src/app
mkdir -p packages/ace-app/src/components
mkdir -p packages/ace-app/api

# Move ACE-specific pages
mv src/app/facebook-ads packages/ace-app/src/app/

# Move ACE-specific API routes
mv src/app/api/aie packages/ace-app/api/
mv src/app/api/facebook/ad-drafts packages/ace-app/api/facebook/
mv src/app/api/facebook/generate-ad-content packages/ace-app/api/facebook/
```

**Validation**:

```bash
cd packages/ace-app
npm install
npm run dev  # Should start ACE app on port 3051
```

#### **Action 3.3: Create Shared UI Package**

```bash
# Create package structure
mkdir -p packages/shared-ui/components

# Move shared UI components
mv src/components/ErrorBoundary.tsx packages/shared-ui/components/
mv src/components/UnifiedShopifyAuth.tsx packages/shared-ui/components/
mv src/components/PolarisProvider.tsx packages/shared-ui/components/
```

**Validation**:

```bash
cd packages/shared-ui
npm install
npm run build  # Should compile shared components
```

#### **Action 3.4: Configure Next.js for Each App**

```typescript
// packages/thundertext-app/next.config.ts
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // ThunderText-specific config
  basePath: "/thundertext", // Optional: URL prefix
  env: {
    APP_NAME: "thundertext",
    APP_PORT: "3050",
  },
  // Shared backend routes
  async rewrites() {
    return [
      {
        source: "/api/auth/:path*",
        destination: "http://localhost:3000/api/auth/:path*", // Shared backend
      },
      {
        source: "/api/business-profile/:path*",
        destination: "http://localhost:3000/api/business-profile/:path*",
      },
    ];
  },
};

export default nextConfig;

// packages/ace-app/next.config.ts
const aceConfig: NextConfig = {
  basePath: "/ace",
  env: {
    APP_NAME: "ace",
    APP_PORT: "3051",
  },
  async rewrites() {
    return [
      {
        source: "/api/auth/:path*",
        destination: "http://localhost:3000/api/auth/:path*",
      },
      {
        source: "/api/business-profile/:path*",
        destination: "http://localhost:3000/api/business-profile/:path*",
      },
    ];
  },
};

export default aceConfig;
```

**Validation**:

```bash
# Test ThunderText routes
curl http://localhost:3050/thundertext/dashboard
# Should return ThunderText dashboard

curl http://localhost:3050/api/generate
# Should hit ThunderText API

curl http://localhost:3050/api/auth/callback
# Should proxy to shared backend

# Test ACE routes
curl http://localhost:3051/ace/facebook-ads
# Should return ACE UI

curl http://localhost:3051/api/aie/generate
# Should hit ACE API

curl http://localhost:3051/api/auth/callback
# Should proxy to shared backend
```

#### **Action 3.5: Update Package.json Scripts**

```json
// Root package.json
{
  "name": "thunder-platform",
  "scripts": {
    "dev": "concurrently \"npm run dev:backend\" \"npm run dev:thundertext\" \"npm run dev:ace\"",
    "dev:backend": "cd packages/shared-backend && npm run dev",
    "dev:thundertext": "cd packages/thundertext-app && npm run dev",
    "dev:ace": "cd packages/ace-app && npm run dev",
    "build": "npm run build:backend && npm run build:thundertext && npm run build:ace",
    "build:backend": "cd packages/shared-backend && npm run build",
    "build:thundertext": "cd packages/thundertext-app && npm run build",
    "build:ace": "cd packages/ace-app && npm run build",
    "test": "npm run test:backend && npm run test:thundertext && npm run test:ace"
  },
  "workspaces": ["packages/*"]
}
```

**Validation**:

```bash
npm run dev
# Should start all 3 services:
# - Shared Backend: http://localhost:3000
# - ThunderText: http://localhost:3050
# - ACE: http://localhost:3051
```

---

### **PHASE 4: Subscription & Billing Integration (Week 6)**

**Goal**: Implement suite subscription logic in shared backend

#### **Action 4.1: Create Subscriptions Table**

```sql
-- Migration: 20250114_create_subscriptions.sql

CREATE TABLE subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id UUID NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
  plan_type TEXT NOT NULL CHECK (plan_type IN ('thundertext', 'ace', 'zeus', 'suite')),
  status TEXT NOT NULL CHECK (status IN ('active', 'trialing', 'past_due', 'cancelled', 'paused')),
  billing_cycle TEXT NOT NULL CHECK (billing_cycle IN ('monthly', 'annual')),

  -- Stripe integration
  stripe_subscription_id TEXT UNIQUE,
  stripe_customer_id TEXT,

  -- Pricing
  monthly_price_cents INTEGER NOT NULL,
  currency TEXT NOT NULL DEFAULT 'USD',

  -- Timestamps
  trial_ends_at TIMESTAMPTZ,
  current_period_start TIMESTAMPTZ NOT NULL,
  current_period_end TIMESTAMPTZ NOT NULL,
  cancelled_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Prevent duplicate active subscriptions per shop
  UNIQUE (shop_id, plan_type, status) WHERE status = 'active'
);

-- Index for fast lookups
CREATE INDEX idx_subscriptions_shop_status ON subscriptions(shop_id, status);
CREATE INDEX idx_subscriptions_stripe ON subscriptions(stripe_subscription_id);

-- Function to check suite access
CREATE OR REPLACE FUNCTION has_app_access(
  p_shop_id UUID,
  p_app_name TEXT
) RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM subscriptions
    WHERE shop_id = p_shop_id
    AND status IN ('active', 'trialing')
    AND (
      -- Has suite subscription (grants access to all apps)
      plan_type = 'suite'
      -- OR has individual app subscription
      OR plan_type = p_app_name
    )
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

**Validation**:

```sql
-- Test subscription access
INSERT INTO subscriptions (shop_id, plan_type, status, billing_cycle, monthly_price_cents, current_period_start, current_period_end)
VALUES
  ('shop-123', 'thundertext', 'active', 'monthly', 2900, NOW(), NOW() + INTERVAL '1 month'),
  ('shop-456', 'suite', 'active', 'monthly', 9900, NOW(), NOW() + INTERVAL '1 month');

SELECT has_app_access('shop-123', 'thundertext');  -- true
SELECT has_app_access('shop-123', 'ace');          -- false
SELECT has_app_access('shop-456', 'thundertext');  -- true (suite)
SELECT has_app_access('shop-456', 'ace');          -- true (suite)
```

#### **Action 4.2: Update JWT Generation with Subscription Check**

```typescript
// packages/shared-backend/lib/auth/jwt.ts
export async function createJWTForShop(shopId: string): Promise<string> {
  // Query subscriptions table to determine authorized apps
  const { data: subscriptions } = await supabaseAdmin
    .from("subscriptions")
    .select("plan_type")
    .eq("shop_id", shopId)
    .in("status", ["active", "trialing"]);

  const authorizedApps: string[] = [];

  for (const sub of subscriptions || []) {
    if (sub.plan_type === "suite") {
      // Suite grants access to all apps
      authorizedApps.push("thundertext", "ace", "zeus");
      break;
    } else {
      authorizedApps.push(sub.plan_type);
    }
  }

  return createJWT("user-from-shop", shopId, authorizedApps);
}
```

**Validation**:

```typescript
// Test JWT generation
const token = await createJWTForShop("shop-123"); // Has ThunderText subscription
const decoded = jwt.decode(token);
console.assert(decoded.apps.includes("thundertext"));
console.assert(!decoded.apps.includes("ace"));

const suiteToken = await createJWTForShop("shop-456"); // Has Suite subscription
const suiteDecoded = jwt.decode(suiteToken);
console.assert(suiteDecoded.apps.includes("thundertext"));
console.assert(suiteDecoded.apps.includes("ace"));
console.assert(suiteDecoded.apps.includes("zeus"));
```

#### **Action 4.3: Create Subscription Management API**

```typescript
// packages/shared-backend/api/subscriptions/route.ts

// GET /api/subscriptions - List shop's subscriptions
export async function GET(request: NextRequest) {
  const claims = await verifyJWT(request);

  const { data, error } = await supabaseAdmin
    .from("subscriptions")
    .select("*")
    .eq("shop_id", claims.shopId)
    .in("status", ["active", "trialing", "past_due"]);

  return NextResponse.json({ subscriptions: data });
}

// POST /api/subscriptions/upgrade - Upgrade to suite
export async function POST(request: NextRequest) {
  const claims = await verifyJWT(request);
  const { plan_type } = await request.json();

  // Validate plan type
  if (!["thundertext", "ace", "zeus", "suite"].includes(plan_type)) {
    throw new APIError(400, ErrorCode.BAD_REQUEST, "Invalid plan type");
  }

  // Check if already subscribed
  const { data: existing } = await supabaseAdmin
    .from("subscriptions")
    .select("*")
    .eq("shop_id", claims.shopId)
    .eq("plan_type", plan_type)
    .eq("status", "active")
    .single();

  if (existing) {
    throw new APIError(
      400,
      ErrorCode.BAD_REQUEST,
      "Already subscribed to this plan",
    );
  }

  // Create Stripe subscription (integration with Stripe API)
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
  const stripeSubscription = await stripe.subscriptions.create({
    customer: claims.stripeCustomerId,
    items: [{ price: PRICE_IDS[plan_type] }],
    trial_period_days: 7,
  });

  // Create subscription record
  const { data: subscription } = await supabaseAdmin
    .from("subscriptions")
    .insert({
      shop_id: claims.shopId,
      plan_type,
      status: "trialing",
      billing_cycle: "monthly",
      monthly_price_cents: PRICING[plan_type],
      stripe_subscription_id: stripeSubscription.id,
      current_period_start: new Date(
        stripeSubscription.current_period_start * 1000,
      ),
      current_period_end: new Date(
        stripeSubscription.current_period_end * 1000,
      ),
      trial_ends_at: new Date(stripeSubscription.trial_end * 1000),
    })
    .select()
    .single();

  return NextResponse.json({ subscription });
}
```

**Validation**:

```bash
# Test subscription creation
curl -X POST http://localhost:3000/api/subscriptions \
  -H "Authorization: Bearer <jwt-token>" \
  -d '{"plan_type":"ace"}'
# Expected: 200, subscription created with 7-day trial

# Test suite access
curl http://localhost:3000/api/subscriptions \
  -H "Authorization: Bearer <jwt-token>"
# Expected: List of active subscriptions
```

#### **Action 4.4: Implement Stripe Webhooks**

```typescript
// packages/shared-backend/api/webhooks/stripe/route.ts

export async function POST(request: NextRequest) {
  const sig = request.headers.get("stripe-signature");
  const body = await request.text();

  // Verify webhook signature
  const event = stripe.webhooks.constructEvent(
    body,
    sig!,
    process.env.STRIPE_WEBHOOK_SECRET!,
  );

  switch (event.type) {
    case "customer.subscription.updated":
      await handleSubscriptionUpdated(event.data.object);
      break;
    case "customer.subscription.deleted":
      await handleSubscriptionCancelled(event.data.object);
      break;
    case "invoice.payment_failed":
      await handlePaymentFailed(event.data.object);
      break;
  }

  return NextResponse.json({ received: true });
}

async function handleSubscriptionUpdated(subscription: Stripe.Subscription) {
  await supabaseAdmin
    .from("subscriptions")
    .update({
      status: subscription.status,
      current_period_start: new Date(subscription.current_period_start * 1000),
      current_period_end: new Date(subscription.current_period_end * 1000),
    })
    .eq("stripe_subscription_id", subscription.id);
}
```

**Validation**:

```bash
# Test Stripe webhook (use Stripe CLI)
stripe trigger customer.subscription.updated
# Expected: Subscription status updated in database
```

---

### **PHASE 5: Testing & Validation (Week 7)**

**Goal**: Comprehensive testing before production deployment

#### **Action 5.1: End-to-End Testing**

```typescript
// e2e/thundertext-ace-separation.test.ts

describe("ThunderText & ACE Separation", () => {
  test("ThunderText user cannot access ACE APIs", async () => {
    // Create ThunderText-only subscription
    const shop = await createTestShop();
    await createSubscription(shop.id, "thundertext");

    // Get JWT token
    const token = await createJWTForShop(shop.id);

    // Try to access ACE API
    const response = await fetch("http://localhost:3051/api/aie/generate", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify({ description: "Test" }),
    });

    expect(response.status).toBe(403);
    expect(await response.json()).toMatchObject({
      error: { code: "FORBIDDEN" },
    });
  });

  test("Suite user can access both ThunderText and ACE", async () => {
    const shop = await createTestShop();
    await createSubscription(shop.id, "suite");

    const token = await createJWTForShop(shop.id);

    // Access ThunderText API
    const ttResponse = await fetch("http://localhost:3050/api/generate", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(ttResponse.status).toBe(200);

    // Access ACE API
    const aceResponse = await fetch("http://localhost:3051/api/aie/generate", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(aceResponse.status).toBe(200);
  });

  test("Shared backend services work for both apps", async () => {
    const shop = await createTestShop();

    // Generate business profile via shared backend
    const profile = await generateMasterBusinessProfile(shop.id);

    // ThunderText should access profile
    const ttResponse = await fetch(
      `http://localhost:3050/api/business-profile?shopId=${shop.id}`,
    );
    expect(ttResponse.status).toBe(200);

    // ACE should access same profile
    const aceResponse = await fetch(
      `http://localhost:3051/api/business-profile?shopId=${shop.id}`,
    );
    expect(aceResponse.status).toBe(200);

    // Profiles should match
    const ttProfile = await ttResponse.json();
    const aceProfile = await aceResponse.json();
    expect(ttProfile.id).toBe(aceProfile.id);
  });
});
```

**Validation**:

```bash
npm run test:e2e
# Expected: All tests pass
```

#### **Action 5.2: Load Testing**

```bash
# Test shared backend can handle concurrent requests from both apps
artillery run load-test.yml

# load-test.yml
config:
  target: 'http://localhost:3000'
  phases:
    - duration: 60
      arrivalRate: 50  # 50 requests/sec
scenarios:
  - name: "Shared Backend Load"
    flow:
      - post:
          url: "/api/business-profile/generate"
          headers:
            Authorization: "Bearer <test-token>"
      - post:
          url: "/api/facebook/campaigns"
          headers:
            Authorization: "Bearer <test-token>"
```

**Validation**:

- P95 latency < 500ms
- 0% error rate
- CPU usage < 80%
- Memory usage < 2GB

#### **Action 5.3: Security Audit**

```bash
# Run automated security scans
npm run security:audit
npm run security:scan

# Manual security checklist
# [ ] JWT tokens expire after 24 hours
# [ ] App-scoped authorization enforced on all routes
# [ ] OAuth tokens isolated per app
# [ ] Rate limiting works per-app
# [ ] SQL injection tests pass
# [ ] XSS tests pass
# [ ] CSRF protection enabled
# [ ] Sensitive data encrypted at rest
```

**Validation**: All security checks pass

---

### **PHASE 6: Staged Deployment (Week 8)**

**Goal**: Deploy to production incrementally without downtime

#### **Action 6.1: Deploy Shared Backend**

```bash
# Deploy shared backend first (backward compatible)
cd packages/shared-backend
npm run build
docker build -t thunder-platform/shared-backend:latest .
docker push thunder-platform/shared-backend:latest

# Deploy to Render/Railway
render deploy --service shared-backend
```

**Validation**:

```bash
# Test production shared backend
curl https://api.thundertext.io/api/health
# Expected: 200 OK
```

#### **Action 6.2: Deploy ThunderText App (Keep Old Version Running)**

```bash
# Deploy ThunderText app to new domain
cd packages/thundertext-app
npm run build
render deploy --service thundertext-app

# Configure DNS
# thundertext.io → thundertext-app
# api.thundertext.io → shared-backend
```

**Validation**:

```bash
# Test production ThunderText
curl https://thundertext.io/dashboard
# Expected: ThunderText dashboard loads

curl https://thundertext.io/api/generate
# Expected: API responds (proxied to shared backend)
```

#### **Action 6.3: Gradual Traffic Migration**

```nginx
# Use Nginx/Cloudflare for gradual rollout
upstream thundertext {
  server old-thundertext.io weight=90;
  server new-thundertext.io weight=10;  # 10% traffic to new version
}

# Week 1: 10% → 25% → 50%
# Week 2: 75% → 100%
# Week 3: Shutdown old version
```

**Validation**:

- Monitor error rates in Sentry
- Monitor performance metrics
- User feedback from 10% cohort

#### **Action 6.4: Deploy ACE App**

```bash
# Deploy ACE as new app listing
cd packages/ace-app
npm run build
render deploy --service ace-app

# Configure DNS
# ace.thundertext.io → ace-app
```

**Validation**:

```bash
# Test ACE production
curl https://ace.thundertext.io/facebook-ads
# Expected: ACE UI loads

# Test cross-app authorization
curl https://ace.thundertext.io/api/aie/generate \
  -H "Authorization: Bearer <thundertext-only-token>"
# Expected: 403 Forbidden (working as intended)
```

#### **Action 6.5: Shopify App Store Listings**

```yaml
# ThunderText App Store Listing
name: "ThunderText - AI Product Descriptions"
listing_url: "https://apps.shopify.com/thundertext"
pricing:
  - plan: "Basic"
    price: "$29/month"
    features:
      - "Unlimited product descriptions"
      - "AI brand voice learning"
      - "Multi-language support"

# ACE App Store Listing
name: "ACE - Ad Creation Engine"
listing_url: "https://apps.shopify.com/ace-ad-engine"
pricing:
  - plan: "Pro"
    price: "$49/month"
    features:
      - "AI-powered ad generation"
      - "Facebook ad publishing"
      - "Performance tracking"

# Suite Bundle (promoted via in-app upgrade flows)
suite_pricing: "$99/month"
savings: "Save $18/month vs. à la carte"
```

**Validation**:

- ThunderText listing approved by Shopify
- ACE listing approved by Shopify
- In-app upgrade flow works

---

## 4. Validation & Testing Strategy

### **4.1 Continuous Validation Checkpoints**

Execute after EACH phase:

```bash
#!/bin/bash
# validate-separation.sh - Run after every phase

echo "🧪 Running validation checks..."

# 1. TypeScript compilation
echo "Checking TypeScript..."
npm run type-check || exit 1

# 2. Unit tests
echo "Running unit tests..."
npm run test || exit 1

# 3. Integration tests
echo "Running integration tests..."
npm run test:integration || exit 1

# 4. API health checks
echo "Checking API health..."
curl -f http://localhost:3000/api/health || exit 1
curl -f http://localhost:3050/api/health || exit 1
curl -f http://localhost:3051/api/health || exit 1

# 5. Database connectivity
echo "Checking database..."
npm run test:db-connection || exit 1

# 6. Security scans
echo "Running security scans..."
npm run security:audit || exit 1

echo "✅ All validation checks passed"
```

### **4.2 Regression Test Suite**

```typescript
// tests/regression/separation-regression.test.ts

describe("Regression Tests - App Separation", () => {
  describe("ThunderText Functionality", () => {
    test("Product description generation still works", async () => {
      const result = await generateProductDescription({
        productTitle: "Organic Cotton T-Shirt",
        category: "Apparel",
        images: ["https://example.com/image.jpg"],
      });

      expect(result.title).toBeDefined();
      expect(result.description).toBeDefined();
    });

    test("Business profile generation still works", async () => {
      const profile = await generateMasterBusinessProfile(responses);
      expect(profile.profileSummary).toBeDefined();
      expect(profile.marketResearch).toBeDefined();
    });
  });

  describe("ACE Functionality", () => {
    test("Ad generation still works", async () => {
      const result = await generateAds({
        shopId: "test-shop",
        platform: "meta",
        goal: "conversion",
        description: "Summer sale campaign",
      });

      expect(result.variants).toHaveLength(3);
      expect(result.imageAnalysis).toBeDefined();
    });

    test("Facebook ad publishing still works", async () => {
      const result = await publishAdToCampaign({
        campaignId: "test-campaign",
        adContent: { headline: "Test", body: "Test" },
      });

      expect(result.adId).toBeDefined();
    });
  });

  describe("Shared Services", () => {
    test("Facebook OAuth still works", async () => {
      const integration = await getFacebookIntegration("test-shop");
      expect(integration.encrypted_access_token).toBeDefined();
    });

    test("OpenAI client still works", async () => {
      const result = await callChatCompletion([
        { role: "user", content: "Test" },
      ]);
      expect(result).toBeDefined();
    });
  });
});
```

**Run regression tests after every phase**:

```bash
npm run test:regression
```

### **4.3 Performance Benchmarks**

Track performance metrics throughout separation:

| Metric                             | Baseline (Monolithic) | Target (Separated) | Tolerance |
| ---------------------------------- | --------------------- | ------------------ | --------- |
| **Product Description Generation** | 3.2s                  | < 3.5s             | +10%      |
| **Ad Generation**                  | 5.8s                  | < 6.5s             | +10%      |
| **Business Profile Generation**    | 12.4s                 | < 13.5s            | +10%      |
| **API Response Time (p95)**        | 320ms                 | < 400ms            | +25%      |
| **Database Query Time**            | 45ms                  | < 60ms             | +33%      |

**Automated Benchmark Script**:

```bash
# benchmark.sh - Run before and after separation
npm run benchmark > benchmark_$(date +%Y%m%d).log

# Compare results
diff benchmark_baseline.log benchmark_after_phase_6.log
```

---

## 5. Rollback Strategy

### **5.1 Emergency Rollback Procedure**

If critical issues arise during separation:

```bash
#!/bin/bash
# emergency-rollback.sh

echo "🚨 INITIATING EMERGENCY ROLLBACK"

# Step 1: Restore database
echo "Restoring database from backup..."
pg_restore -h db.xxx.supabase.co -U postgres -d postgres backup_pre_separation.sql

# Step 2: Revert code to main branch
echo "Reverting code..."
git reset --hard origin/main
git clean -fd

# Step 3: Restore environment variables
echo "Restoring environment..."
cp .env.backup .env.local

# Step 4: Restart services
echo "Restarting services..."
pm2 restart all

# Step 5: Verify health
echo "Verifying system health..."
curl -f http://localhost:3050/api/health || { echo "❌ Health check failed"; exit 1; }

echo "✅ Rollback complete - system restored to pre-separation state"
```

### **5.2 Phase-Specific Rollback**

For each phase, maintain rollback capability:

**Phase 1 Rollback (Shared Backend)**:

```bash
# Remove symlinks, restore original files
rm src/lib/services/*.ts
git checkout src/lib/services/
npm run type-check
```

**Phase 2 Rollback (Authorization)**:

```bash
# Revert JWT changes
git checkout packages/shared-backend/lib/auth/jwt.ts
git checkout packages/*/api/*/route.ts

# Revert database migration
npx supabase migration down 20250114_add_app_name_columns
```

**Phase 3 Rollback (App Packages)**:

```bash
# Move files back to monolithic structure
mv packages/thundertext-app/src/app/* src/app/
mv packages/thundertext-app/api/* src/app/api/
mv packages/ace-app/src/app/* src/app/
```

### **5.3 Canary Deployment for Safe Rollout**

Deploy to small user cohort first:

```yaml
# deployment-strategy.yml
phases:
  - name: "Internal Testing"
    users: ["internal-test@thundertext.io"]
    duration: 2 days
    rollback_trigger: "error_rate > 5%"

  - name: "Beta Users"
    users: ["*@beta.thundertext.io"]
    duration: 1 week
    rollback_trigger: "error_rate > 2%"

  - name: "10% Rollout"
    percentage: 10
    duration: 1 week
    rollback_trigger: "error_rate > 1%"

  - name: "50% Rollout"
    percentage: 50
    duration: 1 week
    rollback_trigger: "error_rate > 0.5%"

  - name: "100% Rollout"
    percentage: 100
```

**Automated Rollback on Error Threshold**:

```typescript
// monitor-and-rollback.ts
setInterval(async () => {
  const errorRate = await getErrorRateFromSentry();

  if (errorRate > ROLLBACK_THRESHOLD) {
    console.error(
      `🚨 Error rate ${errorRate}% exceeds threshold ${ROLLBACK_THRESHOLD}%`,
    );
    await triggerRollback();
    await notifyTeam("Emergency rollback triggered");
  }
}, 60000); // Check every minute
```

---

## 6. Pre-Separation Checklist

### **✅ Before Starting Phase 0**

- [ ] **Team Alignment**: All stakeholders agree on separation plan
- [ ] **Timeline Approval**: 6-8 weeks allocated with buffer for issues
- [ ] **Resource Allocation**: Developers assigned full-time to project
- [ ] **Stakeholder Communication**: Customers notified of upcoming changes (if visible)

### **✅ Before Starting Phase 1**

- [ ] **Full Database Backup**: Verified restorable backup created
- [ ] **Code Repository**: Feature branch created and protected
- [ ] **CI/CD Pipeline**: Automated tests passing consistently
- [ ] **Monitoring Setup**: Sentry, performance metrics, error tracking configured
- [ ] **Rollback Script**: Emergency rollback tested on staging
- [ ] **Documentation**: Current architecture documented

### **✅ Before Starting Phase 2** (Security-Critical)

- [ ] **Security Audit**: Penetration test scheduled for post-implementation
- [ ] **JWT Implementation**: Reviewed by security expert
- [ ] **RLS Policies**: Database isolation policies reviewed
- [ ] **Rate Limiting**: Per-app rate limiting tested
- [ ] **OAuth Isolation**: Separate token management validated

### **✅ Before Starting Phase 3**

- [ ] **Import Path Script**: Automated import updater tested
- [ ] **Package Manager**: npm workspaces configured correctly
- [ ] **TypeScript Paths**: Aliases configured and tested
- [ ] **Development Environment**: All 3 services start locally
- [ ] **Port Allocation**: 3000 (backend), 3050 (ThunderText), 3051 (ACE)

### **✅ Before Starting Phase 4** (Billing-Critical)

- [ ] **Stripe Account**: Production API keys ready
- [ ] **Pricing Approved**: ThunderText ($29), ACE ($49), Suite ($99)
- [ ] **Webhook Endpoint**: Stripe webhooks configured
- [ ] **Trial Period**: 7-day trial confirmed with stakeholders
- [ ] **Subscription Migration**: Existing customers migration plan ready

### **✅ Before Starting Phase 5**

- [ ] **Test Coverage**: >80% code coverage achieved
- [ ] **E2E Tests**: Full user journeys automated
- [ ] **Load Testing**: Artillery/k6 scripts ready
- [ ] **Staging Environment**: Mirrors production configuration
- [ ] **User Acceptance Testing**: UAT plan with beta users

### **✅ Before Starting Phase 6** (Production Deployment)

- [ ] **Deployment Plan**: Step-by-step deployment documented
- [ ] **DNS Configuration**: Domains ready (thundertext.io, ace.thundertext.io)
- [ ] **SSL Certificates**: Valid certificates for all domains
- [ ] **Monitoring Dashboards**: Real-time metrics visible
- [ ] **On-Call Schedule**: 24/7 coverage during rollout week
- [ ] **Communication Plan**: Customer notifications prepared
- [ ] **Rollback Plan**: One-command rollback tested
- [ ] **Backup Plan**: Final production backup created

---

## Success Criteria

### **Technical Success**

✅ Both apps deploy independently
✅ Zero downtime during migration
✅ Performance degradation < 10%
✅ Test coverage maintained > 80%
✅ All security audits pass
✅ Zero data loss or corruption

### **Business Success**

✅ Separate Shopify App Store listings approved
✅ Suite subscription logic working
✅ Revenue tracking per-app functional
✅ Customer churn < 2% during migration
✅ Support ticket volume stable

### **User Experience Success**

✅ Users unaware of backend changes
✅ Login/auth flow seamless
✅ Cross-app navigation smooth
✅ Feature parity maintained
✅ No increase in error reports

---

## Timeline Summary

| Phase                    | Duration | Key Deliverable                    | Risk Level |
| ------------------------ | -------- | ---------------------------------- | ---------- |
| Phase 0: Setup           | 1 week   | Backups, monitoring, rollback plan | 🟢 LOW     |
| Phase 1: Extract Backend | 2 weeks  | Shared backend package             | 🟡 MEDIUM  |
| Phase 2: Authorization   | 1 week   | App-scoped security                | 🔴 HIGH    |
| Phase 3: App Packages    | 1 week   | Separate frontends                 | 🟡 MEDIUM  |
| Phase 4: Billing         | 1 week   | Subscription logic                 | 🔴 HIGH    |
| Phase 5: Testing         | 1 week   | Full validation                    | 🟡 MEDIUM  |
| Phase 6: Deployment      | 1 week   | Staged production rollout          | 🔴 HIGH    |

**Total: 8 weeks** (6-8 weeks with buffer for issues)

---

## Next Steps

1. **Review this plan** with technical team and stakeholders
2. **Validate timeline** and resource allocation
3. **Schedule kickoff meeting** for Phase 0
4. **Assign ownership** for each phase
5. **Set up project tracking** (Jira/Linear/GitHub Projects)
6. **Begin Phase 0** with pre-separation checklist

---

**Plan Author**: Claude (System Architect)
**Plan Status**: ✅ Ready for Review
**Last Updated**: 2025-01-14
