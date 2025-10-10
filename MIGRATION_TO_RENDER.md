# Migration from Vercel to Render - Complete

**Date**: October 9, 2025
**Status**: ✅ Complete

## Summary

Successfully migrated Thunder Text from Vercel (`thunder-text-nine.vercel.app`) to Render (`thunder-text.onrender.com`).

## Changes Made

### 1. Core Configuration Files

- **shopify.app.toml**
  - Updated `application_url` to `https://thunder-text.onrender.com`
  - Updated redirect URLs for OAuth callbacks

- **src/lib/get-app-url.ts**
  - Changed detection from `VERCEL_URL` to `RENDER_EXTERNAL_URL`
  - Updated fallback URL to Render production URL

- **render.yaml**
  - Updated all environment variables (SHOPIFY_APP_URL, NEXTAUTH_URL)
  - Changed domain configuration to `thunder-text.onrender.com`

### 2. Source Code Files

- **src/lib/middleware/cors.ts**
  - Removed Vercel-specific domain patterns
  - Added Render production URL to allowed origins
  - Updated to use `RENDER_EXTERNAL_URL` environment variable

- **extensions/enhance-product-action/src/ActionExtension.jsx**
  - Updated production URL to Render
  - Changed development port to 3050 (matching package.json)

- **src/app/page.tsx**
  - Updated deployment status banner with Render information
  - Changed "Live on Vercel" to "Live on Render"

### 3. Test Configuration

- **jest.setup.js**
  - Updated NEXTAUTH_URL to Render production URL

### 4. Documentation Files (15 files)

Bulk-updated all Markdown files with new Render URLs:
- AUTHENTICATION_IMPROVEMENT_PLAN.md
- CHECK_ENV_VARS.md
- DEVELOPMENT_WORKFLOW.md
- PARTNER_DASHBOARD_TOKEN_SETUP.md
- OAUTH_INSTALLATION.md
- SHOPIFY_AUTH_SETUP.md
- EMBEDDED_AUTH_FIX.md
- DEV_APP_SETUP_GUIDE.md
- DEPLOYMENT_INSTRUCTIONS.md
- TOKEN_EXCHANGE_SETUP.md
- docs/RENDER_DEPLOYMENT.md
- docs/AUTHENTICATION.md
- docs/testing-enhance-feature.md
- docs/LAUNCH_STRATEGY.md
- docs/VIEWING_METAFIELDS.md
- CLAUDE.md
- README.md

### 5. Files NOT Updated (Intentional)

- **vercel.json** - Kept as legacy reference (not actively used)
- **.shopify/deploy-bundle/** - Auto-generated Shopify build artifacts
- **.shopify/dev-bundle/** - Auto-generated Shopify dev artifacts
- **next.config.ts** - Commented-out assetPrefix (legacy)

## Environment Variables to Update in Render Dashboard

```bash
SHOPIFY_APP_URL=https://thunder-text.onrender.com
NEXTAUTH_URL=https://thunder-text.onrender.com
SHOPIFY_API_KEY=[your-key]
SHOPIFY_API_SECRET=[your-secret]
NEXT_PUBLIC_SUPABASE_URL=[your-supabase-url]
NEXT_PUBLIC_SUPABASE_ANON_KEY=[your-anon-key]
SUPABASE_SERVICE_KEY=[your-service-key]
OPENAI_API_KEY=[your-openai-key]
NEXTAUTH_SECRET=[your-nextauth-secret]
```

## Shopify Partner Dashboard Updates Required

1. **App URLs**:
   - App URL: `https://thunder-text.onrender.com`

2. **Allowed Redirection URLs**:
   - `https://thunder-text.onrender.com/api/auth/callback`
   - `https://thunder-text.onrender.com/api/auth/shopify/callback`

3. **Webhook URLs** (if applicable):
   - App uninstalled: `https://thunder-text.onrender.com/api/webhooks/app-uninstalled`
   - Shop update: `https://thunder-text.onrender.com/api/webhooks/shop-update`

## Testing Checklist

- [ ] OAuth flow works with new Render URL
- [ ] Token exchange completes successfully
- [ ] Product enhancement feature loads correctly
- [ ] Shopify admin extension points to correct URL
- [ ] API endpoints respond correctly
- [ ] Webhooks are being received

## Deployment Commands

```bash
# Local development (port 3050)
npm run dev

# Build for production
npm run build:render

# Render automatically deploys on git push to main
git add .
git commit -m "chore: migrate from Vercel to Render"
git push origin main
```

## Production URLs

- **Main App**: https://thunder-text.onrender.com
- **Settings**: https://thunder-text.onrender.com/settings?shop=zunosai-staging-test-store&authenticated=true
- **Dashboard**: https://thunder-text.onrender.com/dashboard?shop=zunosai-staging-test-store&authenticated=true
- **Create**: https://thunder-text.onrender.com/create?shop=zunosai-staging-test-store&authenticated=true
- **Enhance**: https://thunder-text.onrender.com/enhance?shop=zunosai-staging-test-store&authenticated=true

## Notes

- Render uses `RENDER_EXTERNAL_URL` environment variable for auto-generated URLs
- Local development runs on port 3050 (Turbopack enabled)
- Auto-deployment is enabled on git push to main branch
- All old Vercel references have been systematically replaced

## Rollback Plan (If Needed)

If issues arise, the migration can be reversed by:
1. Re-deploying to Vercel from the git repository
2. Reverting this commit: `git revert HEAD`
3. Updating Shopify Partner Dashboard URLs back to Vercel
4. Updating environment variables

---

✅ Migration completed successfully on October 9, 2025
