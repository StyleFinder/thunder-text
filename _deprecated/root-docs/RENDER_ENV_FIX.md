# Render Environment Variables - Fix Required

## Problem
Thunder Text is returning 503 errors because Next.js client-side variables need the `NEXT_PUBLIC_` prefix.

## Current Render Configuration

You have these variables set:
```
✅ SUPABASE_SERVICE_ROLE_KEY
✅ SHOPIFY_API_KEY
✅ SHOPIFY_API_SECRET
✅ SHOPIFY_APP_URL
✅ SHOPIFY_SCOPES
✅ OPENAI_API_KEY
✅ SESSION_SECRET
❌ SUPABASE_URL (wrong - needs NEXT_PUBLIC_ prefix)
```

## Required Changes on Render Dashboard

### 1. Add These Variables:
```bash
NEXT_PUBLIC_SUPABASE_URL=https://***REMOVED***.supabase.co
NEXT_PUBLIC_SHOPIFY_API_KEY=fa85f3902882734b800968440c27447d
```

### 2. Optional - Add Anon Key (for fallback):
```bash
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVwa21td3Zic3BnZWFub3R6a25rIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDQxNDkxODMsImV4cCI6MjA1OTcyNTE4M30.PtvW_aSkwHhtZPyRk9_s_w-dWFGFE5v9kPJi0T8AxtI
```

## Why This Matters

Next.js requires the `NEXT_PUBLIC_` prefix for variables that need to be:
1. **Available in browser** (client-side code)
2. **Embedded in the build** (so they work at runtime)

Without this prefix:
- Browser code can't access these variables
- API route checks fail with 503
- App Bridge can't initialize
- All client-side features break

## How to Fix

1. Go to: https://dashboard.render.com
2. Select: Thunder Text service
3. Click: **Environment** tab
4. Click: **Add Environment Variable**
5. Add each variable listed above
6. Click: **Save Changes**
7. Render will automatically redeploy (takes ~2-3 minutes)

## After Fix - Expected Behavior

✅ No more 503 errors
✅ Template dropdown loads
✅ Category dropdown loads
✅ App Bridge initializes
✅ AI generation works
✅ All API endpoints respond correctly

## Quick Test

After deployment, open browser console and check:
```javascript
// Should show the URL, not undefined
console.log(process.env.NEXT_PUBLIC_SUPABASE_URL)
```
