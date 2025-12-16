# Thunder Text Deployment Instructions

## Platform: Render

Thunder Text is deployed on Render at https://thunder-text.onrender.com

## Shopify Apps

### Production App: Thunder Text
- **API Key**: `613bffa12a51873c2739ae67163a72e2`
- **Handle**: `thunder-text-29`
- **Dashboard URL**: https://partners.shopify.com (Thunder Text)

### Development App: Thunder Text Dev
- **API Key**: `b5651b35edf4f4c2222243626a5f721a`
- **Handle**: `thunder-text-dev-4`
- **Dashboard URL**: https://partners.shopify.com (Thunder Text Dev)

## Environment Variables

All environment variables are configured in Render Dashboard:
- `NODE_ENV=production`
- `SHOPIFY_API_KEY` - Production Shopify API key
- `SHOPIFY_API_SECRET` - Production Shopify API secret
- `SHOPIFY_APP_HANDLE=thunder-text-29`
- `NEXT_PUBLIC_SHOPIFY_API_KEY` - Same as SHOPIFY_API_KEY
- `NEXT_PUBLIC_APP_URL=https://thunder-text.onrender.com`
- `SUPABASE_URL`, `SUPABASE_SERVICE_KEY`
- `OPENAI_API_KEY`
- `NEXTAUTH_SECRET`
- `NEXTAUTH_URL=https://thunder-text.onrender.com`

## Deployment

### GitHub Integration (Recommended)
1. Push changes to the `main` branch
2. Render automatically deploys from GitHub

### Manual Deploy
```bash
# Create a clean build
npm run build

# Render uses render.yaml for configuration
# Push to GitHub to trigger deployment
git push origin main
```

## Post-Deployment Testing
1. Health check: `https://thunder-text.onrender.com/api/health`
2. Database connection: Verified via Supabase
3. Shopify OAuth: Test with development store

## Shopify Billing Setup (Managed Pricing)

1. Go to Shopify Partners Dashboard
2. Select the app (Production: Thunder Text, Dev: Thunder Text Dev)
3. Navigate to **App setup** → **Pricing**
4. Enable **Managed Pricing**
5. Create pricing plans with trial periods

## Current Status
- Database: Supabase (upkmmwvbspgeanotzknk)
- Environment Variables: Configured in Render
- Core APIs: Working
- Shopify OAuth: Token Exchange enabled
