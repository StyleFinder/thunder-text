# Troubleshooting Guide

**Version**: 1.0.0
**Last Updated**: 2025-12-05

This guide provides fixes for common development and production issues.

---

## Table of Contents

1. [Local Setup Issues](#local-setup-issues)
2. [Supabase Migration Errors](#supabase-migration-errors)
3. [Shopify OAuth Redirect Problems](#shopify-oauth-redirect-problems)
4. [AI Rate Limit Failures](#ai-rate-limit-failures)
5. [Deployment Errors](#deployment-errors)

---

## Local Setup Issues

### Node Version Mismatch

**Symptom**: Build fails with syntax errors or module resolution issues

**Solution**:

```bash
# Check Node version (requires 18+)
node --version

# Use nvm to switch
nvm use 18
# or
nvm use 20

# Reinstall dependencies
rm -rf node_modules package-lock.json
npm install
```

### Port Already in Use

**Symptom**: `Error: listen EADDRINUSE: address already in use :::3050`

**Solution**:

```bash
# Find process using port
lsof -i :3050

# Kill it
kill -9 <PID>

# Or use the npm script
npm run dev:kill

# Then start fresh
npm run dev
```

### Environment Variables Not Loading

**Symptom**: `Invalid environment variables` or undefined values

**Solution**:

```bash
# 1. Check file exists
ls -la .env.local

# 2. Ensure no syntax errors (no spaces around =)
# Wrong: API_KEY = value
# Right: API_KEY=value

# 3. Check for required variables
grep -E "^[A-Z]" .env.local | wc -l
# Should show ~15+ variables

# 4. Restart dev server (env loaded at startup)
npm run dev
```

### TypeScript Errors

**Symptom**: Red squiggles in IDE, build failures

**Solution**:

```bash
# 1. Regenerate TypeScript cache
rm -rf .next
npm run type-check

# 2. If module not found errors
npm install

# 3. Restart TypeScript server (VS Code)
# Cmd+Shift+P -> "TypeScript: Restart TS Server"
```

### Dependencies Installation Fails

**Symptom**: `npm install` errors, peer dependency conflicts

**Solution**:

```bash
# Clear npm cache
npm cache clean --force

# Remove existing install
rm -rf node_modules package-lock.json

# Install with legacy peer deps (if conflicts)
npm install --legacy-peer-deps
```

---

## Supabase Migration Errors

### Connection Refused

**Symptom**: `Error: connect ECONNREFUSED`

**Solution**:

```bash
# 1. Check Supabase project is active
# Go to supabase.com dashboard and check project status

# 2. Verify URL format
echo $NEXT_PUBLIC_SUPABASE_URL
# Should be: https://xxxxx.supabase.co

# 3. Check if project is paused (free tier)
# Supabase Dashboard -> Project Settings -> General
```

### RLS Policy Errors

**Symptom**: `new row violates row-level security policy`

**Diagnosis**:

```sql
-- Check policies on table
SELECT * FROM pg_policies WHERE tablename = 'your_table';
```

**Solution**:

```sql
-- Ensure service role is used for admin operations
-- In code, use supabaseAdmin, not the anon client

-- Or add permissive policy for service role
CREATE POLICY "Service role full access" ON table_name
  FOR ALL TO service_role
  USING (true) WITH CHECK (true);
```

### Migration Conflict

**Symptom**: Migration fails due to existing objects

**Solution**:

```sql
-- Check for existing objects
SELECT * FROM pg_tables WHERE tablename = 'table_name';

-- Drop and recreate if safe (CAUTION: data loss)
DROP TABLE IF EXISTS table_name CASCADE;

-- Or modify migration to use IF NOT EXISTS
CREATE TABLE IF NOT EXISTS table_name (...);
```

### pgvector Extension Missing

**Symptom**: `ERROR: type "vector" does not exist`

**Solution**:

```sql
-- Enable extension (must be done by project owner)
CREATE EXTENSION IF NOT EXISTS vector;

-- Verify
SELECT * FROM pg_extension WHERE extname = 'vector';
```

---

## Shopify OAuth Redirect Problems

### Invalid Redirect URI

**Symptom**: OAuth fails with "redirect_uri mismatch"

**Solution**:

1. Go to Shopify Partners Dashboard
2. Select your app → App setup
3. Verify **Allowed redirection URL(s)** includes:
   ```
   https://thunder-text.onrender.com/api/auth/callback/shopify
   https://thunder-text.onrender.com/api/shopify/callback
   http://localhost:3050/api/auth/callback/shopify (for dev)
   ```

### Session Cookie Issues

**Symptom**: User logged out after OAuth, session not persisting

**Solution**:

```bash
# 1. Check NEXTAUTH_URL matches deployment URL
NEXTAUTH_URL=https://thunder-text.onrender.com

# 2. Check cookies in browser DevTools
# Application → Cookies → should see next-auth.session-token

# 3. Check secure cookie settings (production)
# Must use HTTPS in production
```

### Token Exchange Failure

**Symptom**: `Failed to exchange code for access token`

**Diagnosis**:

```typescript
// Check logs for actual error
logger.error("Token exchange failed", error, {
  component: "shopify-oauth",
  shop: shopDomain,
});
```

**Common Causes**:

1. **Code expired**: Codes are single-use and expire quickly
2. **Wrong secret**: Verify `SHOPIFY_API_SECRET` is correct
3. **Clock skew**: Server time must be accurate

### App Not Appearing in Shopify Admin

**Symptom**: After install, can't find the app

**Solution**:

1. Thunder Text is **non-embedded** (external app)
2. Access via direct URL: `https://thunder-text.onrender.com`
3. Or bookmark link in Shopify Admin → Apps → Thunder Text

---

## AI Rate Limit Failures

### OpenAI Rate Limit

**Symptom**: `Error: Rate limit exceeded` or 429 status

**Diagnosis**:

```bash
# Check your usage
curl https://api.openai.com/v1/usage \
  -H "Authorization: Bearer $OPENAI_API_KEY"
```

**Solution**:

```typescript
// 1. Implement exponential backoff (already in codebase)
async function generateWithRetry(prompt: string, maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await openai.chat.completions.create({...});
    } catch (error) {
      if (error.status === 429) {
        await sleep(Math.pow(2, i) * 1000); // Exponential backoff
        continue;
      }
      throw error;
    }
  }
}

// 2. Upgrade OpenAI plan for higher limits
// https://platform.openai.com/account/billing
```

### Embedding Quota Exceeded

**Symptom**: Embedding generation fails consistently

**Solution**:

```bash
# Check embedding cache hit rate
# High cache hits = fewer API calls needed

# In Supabase SQL:
SELECT
  COUNT(*) as total,
  COUNT(*) FILTER (WHERE hit_count > 0) as cached
FROM aie_embedding_cache;
```

### Token Limit Exceeded

**Symptom**: `This model's maximum context length is 8192 tokens`

**Solution**:

```typescript
// Truncate input to fit context
function truncateToTokenLimit(text: string, maxTokens: number): string {
  // Rough estimate: 1 token ≈ 4 characters
  const maxChars = maxTokens * 4;
  if (text.length > maxChars) {
    return text.slice(0, maxChars) + "...";
  }
  return text;
}
```

---

## Deployment Errors

### Render Deployment

#### Build Timeout

**Symptom**: Build exceeds 15 minutes, killed

**Solution**:

```bash
# 1. Use the render-specific build script
npm run build:render

# 2. Clear .next before build
rm -rf .next && next build

# 3. Upgrade Render plan if consistently timing out
```

#### Out of Memory

**Symptom**: `JavaScript heap out of memory`

**Solution**:

```bash
# Increase Node memory in render.yaml
envVars:
  - key: NODE_OPTIONS
    value: --max-old-space-size=4096
```

#### Environment Variables Not Available

**Symptom**: App starts but features don't work

**Solution**:

1. Render Dashboard → Your Service → Environment
2. Ensure all required variables are set
3. Check for typos in variable names
4. Redeploy after adding variables

### Vercel Deployment

#### Edge Function Errors

**Symptom**: API routes fail on Vercel Edge

**Solution**:

```typescript
// Some libs don't work in Edge runtime
// Use Node.js runtime instead:
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
```

#### Build Cache Issues

**Symptom**: Old code running after deployment

**Solution**:

```bash
# Force clean build
vercel --force

# Or in dashboard: Deployments → ... → Redeploy
```

### Common Production Issues

#### CORS Errors

**Symptom**: `Access-Control-Allow-Origin` errors in console

**Diagnosis**:

```typescript
// Check middleware.ts for allowed origins
const allowedDomains = [
  "https://thunder-text.onrender.com",
  "https://app.zunosai.com",
];
```

**Solution**:
Add your domain to the allowed list in `src/middleware.ts`

#### Mixed Content Warnings

**Symptom**: HTTPS page loading HTTP resources

**Solution**:

```bash
# Ensure all URLs use HTTPS
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co  # Not http://
```

#### Cold Start Delays

**Symptom**: First request takes 10+ seconds

**Solution**:

1. Render: Upgrade to Standard plan (no cold starts)
2. Vercel: Configure warm-up routes
3. Supabase: Keep project active (don't let it pause)

---

## Quick Diagnostics

### Health Check Script

```bash
#!/bin/bash
# save as scripts/health-check.sh

echo "🔍 Checking Thunder Text health..."

# Node version
echo "Node: $(node --version)"

# Environment
echo "NODE_ENV: $NODE_ENV"
echo "Has OPENAI_API_KEY: $([ -n "$OPENAI_API_KEY" ] && echo 'Yes' || echo 'No')"
echo "Has SUPABASE_URL: $([ -n "$NEXT_PUBLIC_SUPABASE_URL" ] && echo 'Yes' || echo 'No')"

# Dependencies
echo "Dependencies: $(npm ls --depth=0 2>/dev/null | wc -l) packages"

# TypeScript
echo "TypeScript: $(npm run type-check 2>&1 | tail -1)"

# Tests
echo "Tests: $(npm test -- --passWithNoTests 2>&1 | grep -E "Tests|PASS|FAIL" | head -1)"

echo "✅ Health check complete"
```

### Log Locations

| Environment | Location            |
| ----------- | ------------------- |
| Development | Terminal console    |
| Render      | Dashboard → Logs    |
| Sentry      | sentry.io dashboard |
| Supabase    | Dashboard → Logs    |

---

## Getting Help

If issues persist:

1. Check [GitHub Issues](https://github.com/your-org/thunder-text/issues)
2. Search Sentry for similar errors
3. Review recent commits for breaking changes
4. Ask in team Slack channel

---

_This guide is maintained alongside the Thunder Text codebase._
