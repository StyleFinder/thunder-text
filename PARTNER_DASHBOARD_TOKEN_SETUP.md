# Partner Dashboard App Token Setup

## The Issue
When a Shopify app is installed through the Partner Dashboard (not through the public OAuth flow), Shopify manages the authentication internally. The app gets session tokens through App Bridge, but these are short-lived JWT tokens that expire quickly.

## Understanding Token Types

### Session Tokens (What we have)
- Short-lived JWT tokens from App Bridge
- Valid for ~1 minute
- Automatically renewed by App Bridge
- Used for embedded app authentication
- Available when app is loaded in Shopify admin

### Access Tokens (What we need for API calls)
- Long-lived permanent tokens
- Don't expire unless app is uninstalled
- Stored in database for server-side API calls
- Required for background jobs and webhooks

## Solution for Partner Dashboard Installations

Since your app was installed via Partner Dashboard, you need to get the permanent access token. Here are your options:

### Option 1: Get Token from Partner Dashboard (Recommended)

1. **Access Partner Dashboard**
   - Go to https://partners.shopify.com
   - Navigate to Apps → Your App → Test stores

2. **Get the Access Token**
   Unfortunately, Partner Dashboard doesn't directly show access tokens. You'll need to:
   - Use Shopify CLI to get the token
   - Or trigger the OAuth flow manually once

### Option 2: Use Shopify CLI

```bash
# Install Shopify CLI if not already installed
npm install -g @shopify/cli

# Navigate to your app directory
cd /Users/bigdaddy/prod_desc/thunder-text

# Get app info (this will show your access token)
shopify app info --store=zunosai-staging-test-store.myshopify.com
```

### Option 3: Manual OAuth Flow (One-time)

Even though the app is installed, you can still do the OAuth flow once to get a permanent token:

1. Visit this URL in your browser:
   ```
   https://thunder-text-nine.vercel.app/api/auth?shop=zunosai-staging-test-store
   ```

2. Authorize the app when prompted

3. The token will be automatically stored in your Supabase database

### Option 4: Manual Database Insertion

If you have the access token from another source, you can manually insert it:

1. Go to your Supabase dashboard
2. Navigate to the SQL editor
3. Run this query (replace 'your-actual-token' with the real token):

```sql
INSERT INTO shops (
  shop_domain,
  access_token,
  scope,
  is_active
) VALUES (
  'zunosai-staging-test-store.myshopify.com',
  'shpat_YOUR_ACTUAL_TOKEN_HERE', -- Replace this!
  'read_products,write_products,read_product_listings,read_inventory,write_inventory',
  true
)
ON CONFLICT (shop_domain)
DO UPDATE SET
  access_token = EXCLUDED.access_token,
  is_active = true,
  updated_at = NOW();
```

## Testing the Connection

After setting up the token, test it:

1. **Visit the test page:**
   ```
   https://thunder-text-nine.vercel.app/test-session?shop=zunosai-staging-test-store&authenticated=true
   ```

2. **Check the enhance feature:**
   ```
   https://thunder-text-nine.vercel.app/enhance?shop=zunosai-staging-test-store&authenticated=true
   ```

## How It Works Now

The updated system uses a priority order for authentication:

1. **Session Token (App Bridge)** - For embedded app requests
2. **Database Token** - For server-side API calls
3. **Mock Data** - Fallback when no token available

This ensures the app works in all scenarios:
- Embedded in Shopify admin (uses session tokens)
- Standalone access (uses database tokens)
- Development/demo (uses mock data)

## Troubleshooting

### "Still seeing mock data"
- The app doesn't have a valid access token in the database
- Follow Option 3 (Manual OAuth Flow) to get a permanent token

### "Session token not found"
- The app isn't properly embedded in Shopify admin
- Make sure you're accessing through Shopify admin, not directly

### "API calls failing"
- Check if SHOPIFY_AUTH_BYPASS is set to false in production
- Verify the token is correctly stored in the database

## Next Steps

1. Get the permanent access token using one of the methods above
2. Store it in the database
3. Test the enhance feature with real product data
4. The app will now show real products from your Shopify store!