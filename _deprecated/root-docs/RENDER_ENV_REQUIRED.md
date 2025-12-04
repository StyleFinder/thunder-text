# Required Render Environment Variables

## Critical Issue
The Thunder Text app is currently returning 503 errors because required environment variables are not configured on Render.

## Required Environment Variables

### Supabase Configuration
```bash
NEXT_PUBLIC_SUPABASE_URL=https://***REMOVED***.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon_key_from_supabase>
SUPABASE_SERVICE_KEY=<service_role_key_from_supabase>
```

### Shopify Configuration
```bash
NEXT_PUBLIC_SHOPIFY_API_KEY=<shopify_api_key>
SHOPIFY_API_SECRET=<shopify_api_secret>
SHOPIFY_SCOPES=write_products,read_products,read_orders
```

### OpenAI Configuration
```bash
OPENAI_API_KEY=<openai_api_key>
```

### Development Settings (Optional)
```bash
SHOPIFY_AUTH_BYPASS=false
DEVELOPMENT_STORE_ID=550e8400-e29b-41d4-a716-446655440000
```

## How to Set on Render

1. Go to https://dashboard.render.com
2. Select your Thunder Text service
3. Go to "Environment" tab
4. Add each variable listed above
5. Click "Save Changes"
6. Render will automatically redeploy

## Current Errors

Without these variables:
- ✅ Build completes (fixed with lazy initialization)
- ❌ All API endpoints return 503
- ❌ App Bridge initialization fails
- ❌ Template loading fails
- ❌ Category loading fails
- ❌ Authentication fails

## Verification

After setting environment variables, check:
- App loads without 503 errors
- Template dropdown populates
- Category dropdown populates
- Image upload and AI generation works
