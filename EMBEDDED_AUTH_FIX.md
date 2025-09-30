# Embedded App Authentication Fix

## Problem Summary
The embedded app was failing to authenticate when accessed through Shopify admin, but worked with direct URLs.

## Root Causes Identified

### 1. **Duplicate Authentication Providers** ❌
- Had two conflicting providers:
  - `AppBridgeProvider.tsx` - Using CDN script (`window.shopify.idToken()`)
  - `ShopifyAuthProvider.tsx` - Using npm package (`@shopify/app-bridge`)
- This created conflicting App Bridge instances

### 2. **Missing OAuth Callback** ❌
- `ShopifyAuthProvider.tsx` referenced `/api/auth/session-bounce` which didn't exist
- Caused silent authentication failures

### 3. **Inconsistent Token Management** ⚠️
- Multiple token storage mechanisms
- No proper fallback for failed token retrieval

## Solution Implemented

### 1. Created Unified Authentication Provider
**File**: `/src/app/components/UnifiedShopifyAuth.tsx`

Key features:
- Single App Bridge instance using `@shopify/app-bridge` npm package
- Proper embedded context detection
- OAuth fallback when session token fails
- Automatic token refresh every 50 seconds
- Test store bypass for development

### 2. Added OAuth Callback Endpoint
**File**: `/src/app/api/auth/callback/route.ts`

Handles:
- OAuth redirect from Shopify
- Authorization code exchange
- Access token storage in Supabase
- Redirect back to app with embedded parameter

### 3. Updated Layout
**File**: `/src/app/layout.tsx`

Changes:
- Replaced `ShopifyAuthProvider` with `UnifiedShopifyAuth`
- Maintains same context structure
- Backward compatible with existing components

## Authentication Flow (Embedded)

```
1. User opens app in Shopify admin
   ↓
2. App detects embedded context (window.top !== window.self)
   ↓
3. Create App Bridge instance with API key and host
   ↓
4. Attempt to get session token via getSessionToken(app)
   ↓
5a. SUCCESS → Exchange token with /api/shopify/token-exchange
   ↓
6a. Store access token in Supabase
   ↓
7a. Set up auto-refresh (50 second intervals)

5b. FAILURE → Redirect to Shopify OAuth
   ↓
6b. User authorizes app
   ↓
7b. Shopify redirects to /api/auth/callback
   ↓
8b. Exchange auth code for access token
   ↓
9b. Store in Supabase and redirect to app
```

## Environment Variables Required

Ensure these are set in Vercel:

```bash
NEXT_PUBLIC_SHOPIFY_API_KEY=<your_client_id>
SHOPIFY_API_SECRET=<your_client_secret>
SHOPIFY_SCOPES=read_products,write_products,...
NEXT_PUBLIC_SUPABASE_URL=<your_supabase_url>
SUPABASE_SERVICE_KEY=<your_service_key>
```

## Vercel Configuration Checklist

1. **App URLs in Shopify Partner Dashboard**:
   - App URL: `https://thunder-text-nine.vercel.app`
   - Allowed redirect URL: `https://thunder-text-nine.vercel.app/api/auth/callback`

2. **Environment Variables Match**:
   - `NEXT_PUBLIC_SHOPIFY_API_KEY` = Client ID from Shopify
   - `SHOPIFY_API_SECRET` = Client secret from Shopify

3. **App Embed Settings**:
   - Embedded app toggle: ON
   - Frame ancestors in CSP: Already configured in middleware

## Testing Steps

### 1. Test Embedded Context (Primary)
```
1. Go to Shopify admin: https://admin.shopify.com/store/<your-store>
2. Navigate to Apps
3. Click Thunder Text app
4. Verify app loads in iframe without errors
5. Check browser console for authentication logs
6. Verify API calls include session tokens
```

### 2. Test Direct URL (Development Only)
```
1. Visit: https://thunder-text-nine.vercel.app?shop=zunosai-staging-test-store.myshopify.com
2. Should work for test store only
3. Production stores should show error requiring embedded access
```

## Troubleshooting

### Issue: "Missing host parameter"
**Solution**: Ensure app is accessed through Shopify admin, not direct URL

### Issue: "Failed to get session token"
**Solution**:
- Check NEXT_PUBLIC_SHOPIFY_API_KEY matches Shopify Client ID
- Verify app is approved and installed on the store
- Try reinstalling the app

### Issue: "Token exchange failed: invalid_client"
**Solution**:
- Verify SHOPIFY_API_SECRET matches Shopify Client Secret
- Check both values in Vercel environment variables
- Redeploy after changing env vars

### Issue: App works direct but not embedded
**Solution**:
- Check CSP headers allow embedding (already fixed in middleware)
- Verify `forceRedirect: false` in App Bridge config
- Check browser console for iframe/CSP errors

## Files Modified
- ✅ Created: `/src/app/components/UnifiedShopifyAuth.tsx`
- ✅ Created: `/src/app/api/auth/callback/route.ts`
- ✅ Modified: `/src/app/layout.tsx`

## Files to Remove (After Testing)
- 🗑️ `/src/app/components/AppBridgeProvider.tsx` (old duplicate)
- 🗑️ `/src/app/components/ShopifyAuthProvider.tsx` (old provider)

## Next Steps
1. Test in Shopify admin with development store
2. Verify authentication logs in browser console
3. Test token refresh (wait 50+ seconds, make API call)
4. Remove old authentication provider files
5. Update any components using old hooks
