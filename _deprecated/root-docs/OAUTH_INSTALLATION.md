# OAuth Installation Guide for Thunder Text

## Quick Start - Install App via OAuth

To install Thunder Text in your development store using OAuth:

1. **Update Vercel Environment Variables** (if not done):
   - Go to: https://vercel.com/stylefinder/thunder-text/settings/environment-variables
   - Update these variables:
   ```
   SHOPIFY_API_KEY=fa85f3902882734b800968440c27447d
   SHOPIFY_API_SECRET=c7fa2886986c1295ecc1bfffe34bd415
   SHOPIFY_APP_URL=https://thunder-text.onrender.com
   ```
   - Click "Save" and redeploy

2. **Install App via OAuth**:

   Visit this URL to start the OAuth flow:
   ```
   https://thunder-text.onrender.com/api/auth?shop=zunosai-staging-test-store
   ```

   This will:
   - Redirect you to Shopify's OAuth consent page
   - Ask you to approve the app's permissions
   - Exchange authorization code for access token
   - Store the token in Supabase
   - Redirect to the app with authentication complete

## How OAuth Works

### 1. Installation Flow
```
User clicks Install →
  /api/auth →
    Shopify OAuth page →
      User approves →
        /api/auth/callback/shopify →
          Token stored in Supabase →
            App ready to use
```

### 2. Token Storage
- Tokens are stored in Supabase `shops` table
- Each shop has its own access token
- Tokens persist across sessions
- No more hardcoded tokens needed!

### 3. Token Usage
When making API calls:
```javascript
// The system automatically:
// 1. Checks for OAuth token in database
// 2. Falls back to env variable (dev only)
// 3. Uses token for API calls

const { accessToken } = await getShopToken(shop)
// Use accessToken for Shopify API calls
```

## Testing OAuth Flow

### Option 1: Direct OAuth Installation (Recommended)
1. Visit the OAuth URL above
2. Approve the app installation
3. Check that token is stored in Supabase

### Option 2: Manual Testing
```bash
# Test if OAuth token exists
curl https://thunder-text.onrender.com/api/debug/token-status?shop=zunosai-staging-test-store

# If no token, initiate OAuth
open https://thunder-text.onrender.com/api/auth?shop=zunosai-staging-test-store
```

## Verify Installation

After OAuth installation, verify:

1. **Check Supabase**:
   - Go to Supabase dashboard
   - Check `shops` table
   - Should see entry for `zunosai-staging-test-store.myshopify.com`

2. **Test the App**:
   - Visit: https://thunder-text.onrender.com/enhance?shop=zunosai-staging-test-store&authenticated=true
   - Should work without any token errors

## Benefits of OAuth

✅ **Multi-store Ready**: Each store gets its own token
✅ **Secure**: No hardcoded tokens in code
✅ **Scalable**: Ready for Shopify App Store
✅ **Proper Scopes**: Only requests needed permissions
✅ **Token Rotation**: Can easily refresh/update tokens

## Troubleshooting

### "Invalid API credentials"
- Ensure SHOPIFY_API_KEY and SHOPIFY_API_SECRET match Partner Dashboard
- Redeploy after updating environment variables

### "OAuth error: invalid_request"
- Check that redirect URI matches: https://thunder-text.onrender.com/api/auth/callback/shopify
- Ensure shop domain includes .myshopify.com

### "No token found"
- Complete OAuth installation first
- Check Supabase `shops` table for token

## Next Steps

1. ✅ Complete OAuth installation
2. ✅ Remove dependency on custom app
3. ✅ Delete custom app from Shopify admin
4. ✅ Use OAuth tokens for all API calls
5. 🎯 Ready for multi-store support!