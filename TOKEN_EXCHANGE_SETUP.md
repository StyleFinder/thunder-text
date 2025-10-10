# Token Exchange Authentication Setup

## Overview
Thunder Text now uses Shopify's Token Exchange API for authentication, replacing the deprecated static access token approach.

## What Was Implemented

### 1. Token Exchange Core (`/src/lib/shopify/token-exchange.ts`)
- `exchangeToken()` - Exchanges session tokens for access tokens
- `getOrExchangeToken()` - Gets token from DB or exchanges session token
- `validateSessionToken()` - Validates JWT session tokens

### 2. Updated Authentication Flow (`/src/lib/shopify/client.ts`)
- `getShopifyAccessToken()` - New function to handle token retrieval
- `shopifyGraphQL()` - Updated to use Token Exchange authentication
- Removed all demo mode and mock data

### 3. API Endpoints
- `/api/shopify/auth/token-exchange` - New endpoint for token exchange
- `/api/auth/callback/shopify` - OAuth callback (already handles initial auth)
- `/api/shopify/products` - Updated to require valid tokens

### 4. Database Token Management (`/src/lib/shopify/token-manager.ts`)
- `storeShopToken()` - Saves access tokens to Supabase
- `getShopToken()` - Retrieves tokens from database
- `saveShopToken()` - Alias for Token Exchange flow

## Required Vercel Environment Variables

Add these to your Vercel dashboard:

```env
# Shopify API Credentials (from Shopify Partners Dashboard)
SHOPIFY_API_KEY=your_shopify_client_id
SHOPIFY_API_SECRET=your_shopify_client_secret

# Supabase (for token storage)
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_KEY=your_supabase_service_key

# OpenAI (for AI features)
OPENAI_API_KEY=your_openai_api_key
```

## Authentication Flow

### Initial App Installation
1. Merchant installs app via Shopify App Store
2. OAuth flow redirects to `/api/auth/callback/shopify`
3. Authorization code exchanged for offline access token
4. Token saved to Supabase database

### Subsequent API Calls
1. Frontend loads with Shopify App Bridge
2. App Bridge provides session tokens (60-second expiry)
3. Session tokens can be exchanged for access tokens if needed
4. Access tokens used for all Shopify API calls

### Token Types
- **Session Token**: JWT from App Bridge, expires in 60 seconds
- **Offline Access Token**: Permanent token from OAuth/Token Exchange
- **Online Access Token**: User-specific, expires with session

## Testing the Implementation

1. **Install the App**
   - Go to Shopify Partners Dashboard
   - Install app on test store
   - OAuth flow should complete and save token

2. **Verify Token Storage**
   - Check Supabase `shops` table
   - Should see entry with access_token for your shop

3. **Test Product Loading**
   - Visit: https://thunder-text.onrender.com/products?shop=zunosai-staging-test-store
   - Products should load from Shopify API

4. **Test Enhancement Flow**
   - Select a product to enhance
   - Should load product data without errors

## Troubleshooting

### "Unable to load products" Error
- Check Vercel environment variables
- Verify app is installed on the shop
- Check Supabase for saved access token

### "Authentication required" Error
- App needs to be installed via OAuth flow
- Token may be missing from database
- Check SHOPIFY_API_KEY and SHOPIFY_API_SECRET

### Token Exchange Failures
- Session token may be expired (60-second limit)
- Invalid API credentials
- Network/firewall issues

## Next Steps

1. **Frontend Integration**
   - Update enhance page to get session tokens from App Bridge
   - Pass session tokens to backend when needed

2. **Error Handling**
   - Better user feedback for auth failures
   - Automatic re-authentication flows

3. **Security**
   - Implement HMAC validation for webhooks
   - Add rate limiting for token exchange

## References
- [Shopify Token Exchange Docs](https://shopify.dev/docs/apps/auth/get-access-tokens/token-exchange)
- [Session Tokens Guide](https://shopify.dev/docs/apps/auth/session-tokens)
- [App Bridge Authentication](https://shopify.dev/docs/apps/tools/app-bridge/authentication)