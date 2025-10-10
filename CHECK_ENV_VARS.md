# Environment Variables Checklist for Vercel

## Required Environment Variables

The following environment variables MUST be set in your Vercel dashboard for Token Exchange to work:

### 1. Shopify API Credentials (REQUIRED for Token Exchange)
```
SHOPIFY_API_KEY=<your_shopify_client_id>
SHOPIFY_API_SECRET=<your_shopify_client_secret>
```

**Where to find these:**
1. Go to https://partners.shopify.com
2. Navigate to Apps → Your App → Configuration
3. Copy the "Client ID" → Use as `SHOPIFY_API_KEY`
4. Copy the "Client secret" → Use as `SHOPIFY_API_SECRET`

### 2. Supabase Credentials (REQUIRED for token storage)
```
NEXT_PUBLIC_SUPABASE_URL=<your_supabase_url>
NEXT_PUBLIC_SUPABASE_ANON_KEY=<your_supabase_anon_key>
SUPABASE_SERVICE_KEY=<your_supabase_service_key>
```

### 3. OpenAI API Key (REQUIRED for AI features)
```
OPENAI_API_KEY=<your_openai_api_key>
```

## How to Add to Vercel

1. Go to https://vercel.com/dashboard
2. Select your "thunder-text" project
3. Go to Settings → Environment Variables
4. Add each variable above
5. Make sure to select all environments (Production, Preview, Development)
6. Click Save

## Current Error Analysis

Based on the console errors, the Token Exchange is failing because:
- The server is returning 500 errors
- Error message: "Missing Shopify API credentials in environment"

This means `SHOPIFY_API_KEY` and/or `SHOPIFY_API_SECRET` are not set in Vercel.

## Verification Steps

After adding the environment variables:
1. Trigger a new deployment (push any small change)
2. Wait for deployment to complete
3. Test at: https://thunder-text.onrender.com/products?shop=zunosai-staging-test-store

## Alternative: Use Existing Token

If you already have the app installed and have an access token in the database, the app should work without Token Exchange. Check your Supabase `shops` table to see if there's an entry for your shop with an access_token.