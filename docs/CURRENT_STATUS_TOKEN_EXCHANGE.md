# Token Exchange Issue - Current Status

**Date**: October 9, 2025, 1:05 PM UTC
**Current Deploy ID**: dep-d3jr5qk9c44c73c3qvg0 (building)

## Problem Summary

Token exchange endpoint (`/api/shopify/token-exchange`) returns 500 errors, preventing:
- Access tokens from being stored in database
- Product creation (fails with 401 authentication required)
- All other API calls that require authentication

## Root Cause Analysis

**Client-side behavior (from console logs):**
```
layout-99f2e57a87988d05.js:1 🔄 Exchanging session token for access token...
thunder-text.onrender.com/api/shopify/token-exchange:1 Failed to load resource: the server responded with a status of 500 ()
layout-99f2e57a87988d05.js:1 📥 Token exchange response status: 500
layout-99f2e57a87988d05.js:1 ❌ Token exchange failed
```

**What we know:**
1. ✅ Session token is being obtained from Shopify App Bridge
2. ✅ Client is correctly calling `/api/shopify/token-exchange` with session token and shop
3. ❌ Server returns 500 error (internal server error)
4. ❌ No access token stored in database
5. ❌ All subsequent API calls fail with 401

## Fixes Implemented

### 1. Comprehensive Error Logging (Commit: 63e23f9)
Added detailed server-side logging to token exchange endpoint:
- Request validation with token lengths and shop domains
- Environment variable verification
- Shopify API request/response logging
- Supabase storage logging
- Database error details
- All logs tagged with `[TOKEN-EXCHANGE]` prefix

### 2. Runtime Error Fixes (Commit: b27e330)
Fixed critical bugs in product creation endpoint:
- Line 201: `store.shop_domain` → `shopDomain`
- Line 471: `store.shop_domain` → `shopDomain`
- Removed references to undefined `session` and `supabaseAdmin` variables

These would have caused crashes AFTER token exchange worked.

## Deployment Status

**Previous Deployment** (dep-d3jr3f7fte5s7381548g):
- Status: Live
- Deployed: 13:03 UTC
- Code: Comprehensive logging (commit 63e23f9)

**Current Deployment** (dep-d3jr5qk9c44c73c3qvg0):
- Status: Building
- Code: Runtime error fixes (commit b27e330)
- Will include both logging AND bug fixes

## Next Steps

### Immediate (Once Deployment Completes):
1. **Test the app** - Try to create a product description
2. **Retrieve server logs** using:
   ```bash
   curl -s "https://api.render.com/v1/services/srv-d3jgbii4d50c73f6biog/logs?limit=100" \
     -H "Authorization: Bearer rnd_6hTqU8nqmxQ2aoYv1oH1IREXqTkm" | \
     grep "\[TOKEN-EXCHANGE\]"
   ```
3. **Analyze the detailed error logs** to identify exact failure point

### Expected Log Output:
The new logging will show:
- `🔄 [TOKEN-EXCHANGE] Starting token exchange process`
- `📥 [TOKEN-EXCHANGE] Request body: {...}`
- `🔑 [TOKEN-EXCHANGE] Environment variables check: {...}`
- `📤 [TOKEN-EXCHANGE] Sending token exchange request to Shopify: {...}`
- `📨 [TOKEN-EXCHANGE] Shopify API response: {...}`
- Either:
  - `✅ [TOKEN-EXCHANGE] Token exchange successful: {...}`
  - `❌ [TOKEN-EXCHANGE] Token exchange failed: {...}` ← This will show WHY

### Possible Root Causes We'll See:

1. **Environment Variable Issues:**
   - Missing `SHOPIFY_API_SECRET`
   - Wrong `NEXT_PUBLIC_SHOPIFY_API_KEY`
   - Supabase credentials incorrect

2. **Shopify API Issues:**
   - Invalid session token format
   - Wrong shop domain
   - API credentials mismatch
   - Scope/permissions issues

3. **Database Issues:**
   - Can't connect to Supabase
   - RLS policy blocking writes
   - Table schema mismatch

## Files Modified

1. `/src/app/api/shopify/token-exchange/route.ts` - Enhanced logging
2. `/src/app/api/shopify/products/create/route.ts` - Fixed runtime errors + enhanced logging

## Testing Instructions

Once deployment completes:
1. Go to Thunder Text app in Shopify admin
2. Upload a product image
3. Click "Generate Description"
4. **Open browser console** (F12) and check for errors
5. **The server logs will now show exactly what's failing**

## Key Console Logs to Watch For:

**Client-side (browser console):**
- `🔄 Exchanging session token for access token...`
- `📥 Token exchange response status: 500` ← This is the problem
- `❌ Token exchange failed: {error details}`

**Server-side (Render logs):**
- Look for `[TOKEN-EXCHANGE]` tagged messages
- Look for `❌` error markers
- Error details will be in structured JSON format

## Environment Variables to Verify

Make sure these are set on Render:
- `NEXT_PUBLIC_SHOPIFY_API_KEY` - Client ID (public)
- `SHOPIFY_API_SECRET` - Client secret (private)
- `NEXT_PUBLIC_SUPABASE_URL` - Supabase project URL
- `SUPABASE_SERVICE_KEY` - Supabase service role key
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Supabase anon key
