# Supabase API Key Migration

**Date**: October 9, 2025, 1:15 PM UTC
**Issue**: Token exchange failing with "Supabase configuration missing"

## Root Cause Identified

The token exchange endpoint was failing because:
1. ❌ `SUPABASE_SERVICE_KEY` was NOT set on Render
2. ❌ `NEXT_PUBLIC_SUPABASE_ANON_KEY` was NOT set on Render
3. ✅ `NEXT_PUBLIC_SUPABASE_URL` was correctly set

The code requires EITHER `SUPABASE_SERVICE_KEY` OR `NEXT_PUBLIC_SUPABASE_ANON_KEY`:
```typescript
const supabaseKey = process.env.SUPABASE_SERVICE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
```

Since both were undefined, the check failed with:
> "Supabase configuration missing - check environment variables"

## Supabase Key Migration

**Important**: Supabase is transitioning from legacy service role keys to new API keys.

### Legacy Format (OLD - Being Phased Out):
- `SUPABASE_SERVICE_KEY` - Service role JWT token
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Anon role JWT token

### New Format (CURRENT - Recommended):
- **Project API Key** - Replaces service role key
- **Anon/Public Key** - Public-facing key

## Required Environment Variables for Render

According to user's screenshots (pending), we need to set:

### Option 1: Use Legacy Keys (Temporary)
```bash
NEXT_PUBLIC_SUPABASE_URL=https://***REMOVED***.supabase.co
SUPABASE_SERVICE_KEY=<service_role_jwt_from_dashboard>
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon_jwt_from_dashboard>
```

### Option 2: Use New API Keys (Recommended)
```bash
NEXT_PUBLIC_SUPABASE_URL=https://***REMOVED***.supabase.co
SUPABASE_API_KEY=<new_api_key_from_dashboard>
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon_key_from_dashboard>
```

## Code Changes Needed (If Using New API Keys)

If we switch to the new API key format, we need to update:

### 1. Token Exchange Endpoint
**File**: `/src/app/api/shopify/token-exchange/route.ts`
**Lines**: 143-146

Change from:
```typescript
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
```

To:
```typescript
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_API_KEY || process.env.SUPABASE_SERVICE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
```

### 2. Token Manager
**File**: `/src/lib/shopify/token-manager.ts`

Update `getSupabaseClient()` function to check for new API key:
```typescript
const supabaseKey = process.env.SUPABASE_API_KEY ||
                    process.env.SUPABASE_SERVICE_KEY ||
                    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
```

### 3. Environment Check Endpoint
**File**: `/src/app/api/debug/env-check/route.ts`

Add check for new API key:
```typescript
supabaseApiKey: {
  exists: !!process.env.SUPABASE_API_KEY,
  preview: process.env.SUPABASE_API_KEY
    ? process.env.SUPABASE_API_KEY.substring(0, 20) + '...'
    : 'NOT SET',
  length: process.env.SUPABASE_API_KEY?.length || 0,
  note: 'New Supabase API key format'
}
```

## Next Steps

1. **User provides API keys** from Supabase dashboard screenshots
2. **Determine which format** (legacy or new)
3. **Update Render environment variables** with correct keys
4. **Update code** if using new API key format
5. **Deploy and test** token exchange
6. **Verify product creation** works end-to-end

## Current Status

- **Deployment**: dep-d3jr90nfte5s738198e0 building
- **Environment Variables**: Attempted to add legacy keys, but user indicates we should use new format
- **Waiting For**: User to provide new API keys from screenshots

## Testing After Fix

Once environment variables are updated, test by:
1. Loading Thunder Text app in Shopify admin
2. Checking browser console for token exchange success
3. Creating a product description
4. Verifying product appears in Shopify admin

Expected success logs:
```
✅ Got session token successfully
🔄 Exchanging session token for access token...
📥 Token exchange response status: 200
✅ Authentication successful
```

Server logs should show:
```
✅ [TOKEN-EXCHANGE] Token exchange successful
💾 [TOKEN-EXCHANGE] Access token stored successfully
```
