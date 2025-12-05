# Environment Variables

**Version**: 1.0.0
**Last Updated**: 2025-12-05

Complete reference for all environment variables used in Thunder Text across development, staging, and production environments.

---

## Table of Contents

1. [How to Use .env.local](#how-to-use-envlocal)
2. [Environment Variable Table](#environment-variable-table)
3. [Shopify Credentials](#shopify-credentials)
4. [Supabase Credentials](#supabase-credentials)
5. [AI Keys](#ai-keys)
6. [Render/Vercel Differences](#rendervercel-differences)
7. [Security Notes](#security-notes)

---

## How to Use .env.local

### Initial Setup

1. Copy the example file:

   ```bash
   cp .env.example .env.local
   ```

2. Fill in required values (see table below)

3. Never commit `.env.local` to git (already in `.gitignore`)

### File Priority

Next.js loads environment files in this order:

| Environment | Files Loaded (in order)                    |
| ----------- | ------------------------------------------ |
| Development | `.env.local` → `.env.development` → `.env` |
| Production  | `.env.production` → `.env`                 |
| Test        | `.env.test` → `.env`                       |

### Validation

Thunder Text validates environment variables at startup using Zod:

**Location**: `src/lib/env.ts`

```typescript
import { env, clientEnv } from "@/lib/env";

// Server-side (validated)
const apiKey = env.OPENAI_API_KEY;

// Client-side (validated)
const appUrl = clientEnv.NEXT_PUBLIC_APP_URL;
```

If required variables are missing, the app will:

- **Development**: Log warnings, attempt to continue
- **Production**: Fail fast with clear error message

---

## Environment Variable Table

### Required Variables

| Variable                        | Description                               | Example                             | Environment |
| ------------------------------- | ----------------------------------------- | ----------------------------------- | ----------- |
| `SHOPIFY_API_KEY`               | Shopify app API key                       | `abc123def456`                      | All         |
| `SHOPIFY_API_SECRET`            | Shopify app secret                        | `shpss_xxxxx`                       | All         |
| `NEXT_PUBLIC_SUPABASE_URL`      | Supabase project URL                      | `https://xxx.supabase.co`           | All         |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon/public key                  | `eyJhbGciOiJI...`                   | All         |
| `SUPABASE_SERVICE_ROLE_KEY`     | Supabase service role key                 | `eyJhbGciOiJI...`                   | All         |
| `OPENAI_API_KEY`                | OpenAI API key                            | `sk-proj-xxxxx`                     | All         |
| `NEXTAUTH_SECRET`               | NextAuth encryption secret (min 32 chars) | `your-32-char-secret-here`          | All         |
| `NEXTAUTH_URL`                  | Full URL of the app                       | `https://thunder-text.onrender.com` | Production  |
| `ENCRYPTION_KEY`                | 64-char hex key for token encryption      | `a1b2c3...64chars`                  | All         |

### Optional Variables

| Variable              | Description                  | Example                   | Default        | Environment |
| --------------------- | ---------------------------- | ------------------------- | -------------- | ----------- |
| `NEXT_PUBLIC_APP_URL` | Public app URL               | `https://app.zunosai.com` | `NEXTAUTH_URL` | All         |
| `DATABASE_URL`        | Direct PostgreSQL connection | `postgres://...`          | None           | All         |
| `NODE_ENV`            | Environment mode             | `production`              | `development`  | All         |

### Integration Variables

| Variable                | Description            | Example                                                         | Required   |
| ----------------------- | ---------------------- | --------------------------------------------------------------- | ---------- |
| `FACEBOOK_APP_ID`       | Facebook app ID        | `123456789`                                                     | For FB Ads |
| `FACEBOOK_APP_SECRET`   | Facebook app secret    | `abc123...`                                                     | For FB Ads |
| `FACEBOOK_REDIRECT_URI` | OAuth callback URL     | `https://thunder-text.onrender.com/api/facebook/oauth/callback` | For FB Ads |
| `GOOGLE_CLIENT_ID`      | Google OAuth client ID | `xxx.apps.googleusercontent.com`                                | For Google |
| `GOOGLE_CLIENT_SECRET`  | Google OAuth secret    | `GOCSPX-xxx`                                                    | For Google |
| `TIKTOK_CLIENT_KEY`     | TikTok app key         | `abc123`                                                        | For TikTok |
| `TIKTOK_CLIENT_SECRET`  | TikTok app secret      | `xxx`                                                           | For TikTok |

### Email & Notifications

| Variable            | Description          | Example                             | Required   |
| ------------------- | -------------------- | ----------------------------------- | ---------- |
| `RESEND_API_KEY`    | Resend email API key | `re_xxx`                            | For emails |
| `RESEND_FROM_EMAIL` | Email sender address | `Thunder Text <alerts@zunosai.com>` | For emails |

### Monitoring

| Variable            | Description               | Example                     | Required        |
| ------------------- | ------------------------- | --------------------------- | --------------- |
| `SENTRY_DSN`        | Sentry error tracking DSN | `https://xxx@sentry.io/xxx` | Recommended     |
| `SENTRY_AUTH_TOKEN` | Sentry auth token         | `sntrys_xxx`                | For source maps |

### Seasonal Trends Engine

| Variable                         | Description                   | Example     | Default           |
| -------------------------------- | ----------------------------- | ----------- | ----------------- |
| `SERPAPI_KEY`                    | SerpAPI key for Google Trends | `xxx`       | None              |
| `TRENDS_REFRESH_CRON`            | Cron schedule for refresh     | `0 3 * * 1` | Weekly Monday 3AM |
| `TRENDS_BACKFILL_YEARS`          | Years of historical data      | `2`         | `2`               |
| `TRENDS_MAX_CONCURRENT_REQUESTS` | Max parallel API calls        | `5`         | `5`               |
| `TRENDS_RATE_LIMIT_DELAY_MS`     | Delay between calls (ms)      | `1500`      | `1500`            |

---

## Shopify Credentials

### Getting Credentials

1. Go to [Shopify Partners Dashboard](https://partners.shopify.com)
2. Select your app or create new
3. Navigate to **App setup**
4. Copy **API key** and **API secret key**

### Required Scopes

Configure these in Shopify app settings:

```
read_products
write_products
read_product_listings
write_product_listings
read_files
write_files
```

### Development Store

```bash
# Use a development store for testing
SHOPIFY_TEST_STORE=your-dev-store.myshopify.com
```

### App URLs

```bash
# Production
SHOPIFY_APP_URL=https://thunder-text.onrender.com

# Development (ngrok or similar)
SHOPIFY_APP_URL=https://your-tunnel.ngrok.io
```

---

## Supabase Credentials

### Getting Credentials

1. Go to [Supabase Dashboard](https://supabase.com/dashboard)
2. Select your project
3. Navigate to **Settings** → **API**
4. Copy the values:

| Dashboard Field  | Environment Variable            |
| ---------------- | ------------------------------- |
| Project URL      | `NEXT_PUBLIC_SUPABASE_URL`      |
| anon/public key  | `NEXT_PUBLIC_SUPABASE_ANON_KEY` |
| service_role key | `SUPABASE_SERVICE_ROLE_KEY`     |

### Direct Database Connection

For migrations or direct queries:

1. Go to **Settings** → **Database**
2. Copy **Connection string (URI)**

```bash
DATABASE_URL=postgres://postgres:[PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres
```

### Service Role Key Security

The service role key bypasses Row Level Security. Only use it:

- Server-side in API routes
- Never expose to client
- Never commit to git

---

## AI Keys

### OpenAI API Key

1. Go to [OpenAI Platform](https://platform.openai.com/api-keys)
2. Create new secret key
3. Copy immediately (shown only once)

```bash
# Must start with sk-
OPENAI_API_KEY=sk-proj-xxxxx
```

**Rate Limits**: Check your [usage limits](https://platform.openai.com/account/limits)

### Models Used

| Model                    | Purpose         | Cost (approx)                   |
| ------------------------ | --------------- | ------------------------------- |
| `gpt-4`                  | Text generation | $0.03/1K input, $0.06/1K output |
| `gpt-4-vision-preview`   | Image analysis  | $0.01/image                     |
| `text-embedding-ada-002` | Embeddings      | $0.0001/1K tokens               |

---

## Render/Vercel Differences

### Render Configuration

Thunder Text is deployed on Render. Configuration:

**render.yaml**:

```yaml
services:
  - type: web
    name: thunder-text
    env: node
    plan: standard
    buildCommand: npm run build:render
    startCommand: npm start
    envVars:
      - key: NODE_ENV
        value: production
      - key: RENDER_EXTERNAL_URL
        fromService:
          type: web
          name: thunder-text
          property: url
```

**Render-Specific Variables**:

```bash
# Auto-populated by Render
RENDER_EXTERNAL_URL=https://thunder-text.onrender.com
```

### Vercel Configuration (if migrating)

**vercel.json**:

```json
{
  "env": {
    "NEXT_PUBLIC_APP_URL": "@next-public-app-url"
  },
  "build": {
    "env": {
      "NEXTAUTH_URL": "@nextauth-url"
    }
  }
}
```

**Key Differences**:

| Feature               | Render                   | Vercel                   |
| --------------------- | ------------------------ | ------------------------ |
| Build command         | `npm run build:render`   | `npm run build`          |
| Environment variables | Dashboard or render.yaml | Dashboard or vercel.json |
| Auto URLs             | `RENDER_EXTERNAL_URL`    | `VERCEL_URL`             |
| Cold starts           | Standard tier: minimal   | Serverless: variable     |

### Environment-Specific Overrides

**Production (Render)**:

```bash
NODE_ENV=production
NEXTAUTH_URL=https://thunder-text.onrender.com
NEXT_PUBLIC_APP_URL=https://app.zunosai.com
```

**Staging**:

```bash
NODE_ENV=production
NEXTAUTH_URL=https://thunder-text-staging.onrender.com
NEXT_PUBLIC_APP_URL=https://staging.zunosai.com
```

**Development**:

```bash
NODE_ENV=development
NEXTAUTH_URL=http://localhost:3050
NEXT_PUBLIC_APP_URL=http://localhost:3050
```

---

## Security Notes

### Never Commit Secrets

The following should **never** be in git:

```gitignore
# .gitignore entries
.env
.env.local
.env.production
.env.*.local
```

### How Claude Code Should Handle Variables

When generating code:

```typescript
// DO: Reference environment variables correctly
const apiKey = process.env.OPENAI_API_KEY;

// DO: Use the validated env helper
import { env } from "@/lib/env";
const apiKey = env.OPENAI_API_KEY;

// DON'T: Hardcode values
const apiKey = "sk-proj-actual-key-here"; // NEVER

// DON'T: Use placeholder values
const apiKey = "YOUR_API_KEY_HERE"; // Don't commit this
```

### Generating Secure Values

**NEXTAUTH_SECRET** (minimum 32 characters):

```bash
openssl rand -base64 32
```

**ENCRYPTION_KEY** (exactly 64 hex characters):

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### Secret Rotation

When rotating secrets:

1. **NEXTAUTH_SECRET**: Will invalidate all sessions
2. **ENCRYPTION_KEY**: Will break token decryption (re-auth required)
3. **SUPABASE_SERVICE_ROLE_KEY**: Regenerate in Supabase dashboard
4. **OPENAI_API_KEY**: Create new key, delete old after deployment

### Audit Trail

Review `.env.example` before committing to ensure no real values leaked:

```bash
# Check for potential secrets
grep -E "(sk-|eyJ|shpss_)" .env.example
# Should return nothing
```

---

## Quick Reference

### Minimum Required for Development

```bash
# .env.local minimum
SHOPIFY_API_KEY=your_key
SHOPIFY_API_SECRET=your_secret
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...
OPENAI_API_KEY=sk-proj-xxx
NEXTAUTH_SECRET=at-least-32-characters-here
NEXTAUTH_URL=http://localhost:3050
NEXT_PUBLIC_APP_URL=http://localhost:3050
ENCRYPTION_KEY=64-hex-characters-here
```

### Common Issues

| Issue                            | Check                  |
| -------------------------------- | ---------------------- |
| "Invalid environment variables"  | All required vars set? |
| "NEXTAUTH_SECRET must be 32+"    | Secret long enough?    |
| "OpenAI key must start with sk-" | Correct key format?    |
| "Invalid Supabase URL"           | URL includes https://? |

---

_This document is maintained alongside the Thunder Text codebase._
