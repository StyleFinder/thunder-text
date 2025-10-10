# Shopify OAuth Authentication Setup

## Overview
The Thunder Text application now properly stores Shopify access tokens in Supabase, enabling real data access from your Shopify store instead of using mock data.

## Setup Instructions

### 1. Apply Database Migration
Run the migration on your Supabase database to create the shops table:

```sql
-- Copy contents of shopify_auth_migration.sql and run in Supabase SQL editor
```

### 2. Configure Supabase Environment Variables
Ensure these are set in your Vercel deployment:

```bash
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_KEY=your-service-key  # Required for token storage
```

### 3. Configure Shopify App
Ensure these are set in your Vercel deployment:

```bash
SHOPIFY_API_KEY=your-shopify-api-key
SHOPIFY_API_SECRET=your-shopify-api-secret
```

### 4. Complete OAuth Flow

#### Option A: Through Shopify Partner Dashboard
1. Install the app on your test store
2. The OAuth flow will automatically store the token

#### Option B: Manual OAuth Flow
1. Visit: `https://thunder-text.onrender.com/api/auth?shop=your-shop-name`
2. Authorize the app
3. Token will be automatically stored in database

### 5. Verify Token Storage
Check if token was stored successfully:

```sql
-- Run in Supabase SQL editor
SELECT shop_domain, is_active, installed_at
FROM shops
WHERE shop_domain = 'your-shop.myshopify.com';
```

## How It Works

### Authentication Flow
1. **OAuth Initiation**: User starts OAuth from `/api/auth` endpoint
2. **Shopify Authorization**: User approves app permissions on Shopify
3. **Callback Processing**: `/api/auth/callback` receives authorization code
4. **Token Exchange**: Code is exchanged for access token
5. **Token Storage**: Token is securely stored in Supabase `shops` table
6. **API Usage**: All API calls retrieve token from database for that shop

### Token Retrieval
When making API calls:
1. API endpoint receives shop domain in query params
2. `getShopToken()` retrieves access token from database
3. Token is used for Shopify Admin API calls
4. Real product data is fetched and returned

## Testing

### Test Token Storage
```bash
# After OAuth, test the products API
curl "https://thunder-text.onrender.com/api/shopify/products?shop=your-shop-name&page=1&limit=5"

# Should return real products from your Shopify store
```

### Test Enhancement Feature
1. Visit: `https://thunder-text.onrender.com/enhance?shop=your-shop-name&authenticated=true`
2. Should display real products from your store
3. Select a product to enhance its description

## Troubleshooting

### No Products Showing
1. Check token is stored: Query the `shops` table
2. Verify shop domain format: Should be `shop-name.myshopify.com`
3. Check Supabase connection: Ensure environment variables are set

### OAuth Errors
1. Verify Shopify API credentials are correct
2. Check callback URL is whitelisted in Shopify app settings
3. Ensure HTTPS is used (required by Shopify)

### Token Not Storing
1. Check Supabase service key is set (not just anon key)
2. Verify database migration was applied
3. Check Supabase logs for any RLS policy issues

## Security Notes
- Tokens are stored encrypted in Supabase
- Row Level Security (RLS) policies protect token access
- Service role is required for token write operations
- Tokens are only accessible server-side, never exposed to client

## Next Steps
After successful setup:
1. Real product data will be available in the enhance feature
2. No more "Failed to fetch products" errors
3. Full integration with your Shopify store's actual inventory