# Vercel Security Headers Issue - CRITICAL

## Problem
Vercel is adding `X-Frame-Options: DENY` at the **platform level**, which cannot be overridden by code configuration.

## Verification
```bash
curl -I https://thunder-text-git-cosmetic-updates-zeus-ai.vercel.app/
# Returns: X-Frame-Options: DENY
```

This is happening **after** all our configurations (next.config.ts, vercel.json, middleware).

## Root Cause
Vercel has platform-level security headers that are:
1. Added **after** your application code runs
2. **Cannot** be overridden by next.config.ts
3. **Cannot** be overridden by vercel.json headers
4. **Cannot** be overridden by middleware

This is a Vercel security feature, not a bug.

## Solutions (In order of preference)

### Solution 1: Vercel Dashboard Settings ⭐ EASIEST

**Steps**:
1. Go to: https://vercel.com/dashboard
2. Select project: **thunder-text** (or **StyleFinder/thunder-text**)
3. Click **Settings** tab
4. Navigate to **Security** section (left sidebar)
5. Look for one of these settings:
   - "Secure Frame Headers"
   - "X-Frame-Options"
   - "Security Headers"
   - "Content Security Policy"
6. **Disable** the setting or set to **"Custom"**
7. Redeploy the application

**Expected Setting Names** (varies by Vercel version):
- "Enable Secure Headers" → Turn OFF
- "X-Frame-Options Policy" → Set to "Disabled" or "Custom"
- "Frame Protection" → Disable

### Solution 2: Contact Vercel Support

If you can't find the setting:
1. Go to Vercel Dashboard → Help
2. Submit ticket: "Need to disable X-Frame-Options for Shopify embedded app"
3. Reference: https://vercel.com/docs/edge-network/headers

### Solution 3: Use Cloudflare Worker Proxy

Deploy a Cloudflare Worker that:
1. Proxies requests to your Vercel app
2. Removes X-Frame-Options header
3. Adds correct CSP frame-ancestors

**This is complex and should be last resort**.

### Solution 4: Move Away From Vercel

Consider alternatives:
- Render.com (no forced security headers)
- Railway.app
- Fly.io
- Self-hosted on AWS/GCP/Azure

## Why Our Code Fixes Didn't Work

| What We Tried | Why It Failed |
|---------------|---------------|
| `next.config.ts` headers | Vercel runs after Next.js |
| `vercel.json` headers | Platform headers override config |
| Middleware `response.headers.set()` | Vercel adds headers post-middleware |
| Deleting the header | Vercel re-adds it |

## Vercel's Header Addition Order

```
1. Your Next.js app runs
2. Your middleware runs
3. Response generated
4. ⚡ VERCEL PLATFORM ADDS SECURITY HEADERS ⚡ ← Can't override
5. Response sent to browser
```

## Immediate Action Required

**You must access Vercel Dashboard to disable platform security headers.**

Without this, the embedded Shopify app **will not work**, period.

## Verification After Fix

After disabling in Vercel Dashboard:
```bash
# Should NOT show X-Frame-Options: DENY
curl -I https://thunder-text-git-cosmetic-updates-zeus-ai.vercel.app/ | grep -i frame

# Should show our custom headers:
# Content-Security-Policy: frame-ancestors 'self' https://*.myshopify.com ...
# x-frame-options: SAMEORIGIN (or absent)
```

## Related Vercel Documentation

- https://vercel.com/docs/edge-network/headers
- https://vercel.com/docs/projects/project-configuration#headers
- https://github.com/vercel/next.js/discussions/36419 (similar issues)

## Alternative Workaround: API Route Proxy

If dashboard settings don't work, we can create an API route that serves HTML:

```typescript
// src/app/api/embed/route.ts
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const response = NextResponse.next();

  response.headers.delete('X-Frame-Options');
  response.headers.set('Content-Security-Policy',
    "frame-ancestors 'self' https://*.myshopify.com https://admin.shopify.com");

  return response;
}
```

But this requires restructuring the entire app, which is significant work.

## Recommendation

**IMMEDIATE ACTION**: Access Vercel Dashboard → Settings → Security → Disable X-Frame-Options

This is the only practical solution that doesn't require major refactoring.
