# Environment Variables Backup - Phase 0

**Date**: 2025-11-14
**Purpose**: Pre-separation environment configuration backup
**Branch**: feature/app-separation

⚠️ **SECURITY NOTE**: This document lists environment variable NAMES only, not values. Actual secrets remain in `.env.local` which is gitignored.

## Current Environment Configuration

### Shopify Configuration (6 variables)

- `SHOPIFY_API_KEY` - Shopify app API key
- `NEXT_PUBLIC_SHOPIFY_API_KEY` - Public Shopify API key
- `SHOPIFY_API_SECRET` - Shopify app secret (🔒 SECRET)
- `SHOPIFY_SCOPES` - OAuth permission scopes
- `SHOPIFY_APP_URL` - Current ngrok tunnel URL (dev mode)
- `SHOPIFY_REDIRECT_URI` - OAuth callback URL
- `SHOPIFY_TEST_STORE` - Development store name
- `SHOPIFY_ACCESS_TOKEN` - Store access token (🔒 SECRET)

### Supabase Configuration (3 variables)

- `NEXT_PUBLIC_SUPABASE_URL` - Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Public anonymous key
- `SUPABASE_SERVICE_KEY` - Service role key (🔒 SECRET)

**Project ID**: upkmmwvbspgeanotzknk

### OpenAI Configuration (1 variable)

- `OPENAI_API_KEY` - Master OpenAI API key (🔒 SECRET)

### NextAuth Configuration (2 variables)

- `NEXTAUTH_SECRET` - Session encryption key (🔒 SECRET)
- `NEXTAUTH_URL` - Auth callback URL

### App URLs (1 variable)

- `NEXT_PUBLIC_APP_URL` - Public app URL

### Facebook Ads Integration (4 variables)

- `FACEBOOK_APP_ID` - Facebook app ID
- `FACEBOOK_APP_SECRET` - Facebook app secret (🔒 SECRET)
- `FACEBOOK_REDIRECT_URI` - OAuth callback URL
- `ENCRYPTION_KEY` - OAuth token encryption key (🔒 SECRET)

### Email Service (2 variables)

- `RESEND_API_KEY` - Resend API key (🔒 SECRET)
- `RESEND_FROM_EMAIL` - Sender email address

### External Services (2 variables)

- `SERPAPI_KEY` - SerpAPI key for trends (🔒 SECRET)
- `NEXT_PUBLIC_SENTRY_DSN` - Sentry error tracking DSN

### Environment Control (1 variable)

- `NODE_ENV` - development|production

## Total Environment Variables: 23

## Separation Impact Analysis

### 🟢 Shared Across Both Apps (Will move to shared-backend)

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_KEY`
- `OPENAI_API_KEY`
- `NEXTAUTH_SECRET`
- `ENCRYPTION_KEY`
- `NEXT_PUBLIC_SENTRY_DSN`
- `NODE_ENV`

**Count**: 8 variables (35%)

### 🔵 ThunderText-Specific (Will stay in thundertext-app)

- `SHOPIFY_API_KEY`
- `NEXT_PUBLIC_SHOPIFY_API_KEY`
- `SHOPIFY_API_SECRET`
- `SHOPIFY_SCOPES`
- `SHOPIFY_APP_URL`
- `SHOPIFY_REDIRECT_URI`
- `SHOPIFY_TEST_STORE`
- `SHOPIFY_ACCESS_TOKEN`
- `SERPAPI_KEY` (for product trends)

**Count**: 9 variables (39%)

### 🟡 ACE-Specific (Will move to ace-app)

- `FACEBOOK_APP_ID`
- `FACEBOOK_APP_SECRET`
- `FACEBOOK_REDIRECT_URI`
- `RESEND_API_KEY` (for ad campaign alerts)
- `RESEND_FROM_EMAIL`

**Count**: 5 variables (22%)

### 🟣 Deployment-Specific (Both apps need separate values)

- `NEXT_PUBLIC_APP_URL`
- `NEXTAUTH_URL`

**Count**: 2 variables (9%)

## Post-Separation Environment Structure

### /packages/shared-backend/.env

```bash
# Shared services
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_KEY=
OPENAI_API_KEY=
NEXTAUTH_SECRET=
ENCRYPTION_KEY=
NEXT_PUBLIC_SENTRY_DSN=
NODE_ENV=
```

### /packages/thundertext-app/.env.local

```bash
# ThunderText-specific
SHOPIFY_API_KEY=
NEXT_PUBLIC_SHOPIFY_API_KEY=
SHOPIFY_API_SECRET=
SHOPIFY_SCOPES=
SHOPIFY_APP_URL=
SHOPIFY_REDIRECT_URI=
SHOPIFY_TEST_STORE=
SHOPIFY_ACCESS_TOKEN=
SERPAPI_KEY=

# App-specific deployment
NEXT_PUBLIC_APP_URL=https://thundertext.app
NEXTAUTH_URL=https://thundertext.app

# Reference shared backend (via import)
SHARED_BACKEND_URL=http://localhost:3000
```

### /packages/ace-app/.env.local

```bash
# ACE-specific
FACEBOOK_APP_ID=
FACEBOOK_APP_SECRET=
FACEBOOK_REDIRECT_URI=
RESEND_API_KEY=
RESEND_FROM_EMAIL=

# App-specific deployment
NEXT_PUBLIC_APP_URL=https://ace.app
NEXTAUTH_URL=https://ace.app

# Reference shared backend (via import)
SHARED_BACKEND_URL=http://localhost:3001
```

## Restoration Procedure

If rollback needed:

1. Copy `.env.local` from this backup location
2. Update ngrok URLs if applicable
3. Verify all 23 variables present
4. Test authentication flow

## Security Best Practices

✅ **Maintained**:

- All secrets in `.env.local` (gitignored)
- No secrets in codebase
- Separate dev/prod configurations

🔒 **Enhanced for Separation**:

- App-scoped API keys (separate Shopify apps)
- Isolated OAuth tokens per app
- Separate Sentry projects for error tracking
- App-specific encryption keys

## Validation Checklist

- ✅ All 23 environment variables documented
- ✅ Separation impact analyzed (35% shared, 39% ThunderText, 22% ACE, 9% deployment)
- ✅ Post-separation structure designed
- ✅ Security model maintained
- ⏳ New .env files created (Phase 3)
- ⏳ Separate Shopify apps registered (Phase 3)
- ⏳ Separate Facebook apps registered (Phase 3)
