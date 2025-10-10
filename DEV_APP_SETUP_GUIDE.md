# Thunder Text Dev App Setup Guide

## 🎯 Goal
Create a dedicated development app for testing cosmetic updates on the `cosmetic-updates` branch without affecting production.

## 📊 Environment Structure

| Environment | Branch | Shopify App | Vercel URL |
|-------------|--------|-------------|------------|
| **Production** | main | Thunder Text | https://thunder-text.onrender.com |
| **Development** | cosmetic-updates | Thunder Text Dev | https://thunder-text-git-cosmetic-updates-zeus-ai.vercel.app |

## 🔧 Step-by-Step Setup

### Step 1: Create Shopify Dev App

**A. Go to Partner Dashboard**
1. Navigate to: https://partners.shopify.com
2. Click **Apps** in the left sidebar
3. Click **Create app** button

**B. Configure App Settings**

**Basic Information:**
- **App name**: `Thunder Text Dev`
- **App type**: Custom app (or Public app if you want to test installation flow)

**App URL Configuration:**
- **App URL**: `https://thunder-text-git-cosmetic-updates-zeus-ai.vercel.app`
- **Allowed redirection URL(s)**:
  ```
  https://thunder-text-git-cosmetic-updates-zeus-ai.vercel.app/api/auth/callback
  ```

**Embedded App Settings:**
- ✅ Enable "Embedded app"
- **App embed URL**: Leave same as App URL

**OAuth & Scopes:**
Required scopes for Thunder Text:
```
read_products
write_products
read_product_listings
write_product_listings
read_content
write_content
write_files
read_files
```

**C. Save and Get Credentials**

After creating the app, you'll get:
- **Client ID** (API Key) - Copy this
- **Client secret** (API Secret) - Copy this

**IMPORTANT**: Keep these credentials secure!

---

### Step 2: Verify Vercel Preview Deployment

**A. Check Preview URL Pattern**

Vercel creates preview URLs in this format:
```
https://[project-name]-git-[branch-name]-[vercel-username].vercel.app
```

For Thunder Text on `cosmetic-updates` branch:
```
https://thunder-text-git-cosmetic-updates-zeus-ai.vercel.app
```

**B. Verify Deployment Exists**

1. Go to: https://vercel.com/dashboard
2. Click on **thunder-text** project
3. Go to **Deployments** tab
4. Find deployment for `cosmetic-updates` branch
5. Copy the exact preview URL

**If no deployment exists:**
- Push any change to `cosmetic-updates` branch
- Vercel will automatically create preview deployment

---

### Step 3: Configure Environment Variables

**A. Vercel Environment Variables (Preview Scope)**

Go to: https://vercel.com/dashboard → thunder-text → Settings → Environment Variables

**Add these variables with PREVIEW SCOPE:**

| Variable Name | Value | Environment |
|---------------|-------|-------------|
| `NEXT_PUBLIC_SHOPIFY_API_KEY` | [Dev App Client ID] | Preview |
| `SHOPIFY_API_SECRET` | [Dev App Client Secret] | Preview |
| `SHOPIFY_APP_URL` | https://thunder-text-git-cosmetic-updates-zeus-ai.vercel.app | Preview |
| `NEXTAUTH_URL` | https://thunder-text-git-cosmetic-updates-zeus-ai.vercel.app | Preview |

**B. Keep Existing Production Variables**

Do NOT modify variables scoped to "Production" - those are for the main app.

**C. Shared Variables (Use Production Values)**

These can remain the same:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_KEY`
- `OPENAI_API_KEY`
- `NEXTAUTH_SECRET`

---

### Step 4: Update Codebase (Optional Branch-Specific Config)

**A. Create Dev-Specific Config (Optional)**

If you want branch-specific behavior, create:

```typescript
// src/config/shopify.ts
export const getShopifyConfig = () => {
  const isPreview = process.env.VERCEL_ENV === 'preview';

  return {
    apiKey: process.env.NEXT_PUBLIC_SHOPIFY_API_KEY!,
    apiSecret: process.env.SHOPIFY_API_SECRET!,
    appUrl: process.env.SHOPIFY_APP_URL!,
    scopes: process.env.SHOPIFY_SCOPES || 'read_products,write_products,...',
    isDevEnvironment: isPreview,
  };
};
```

**B. Update App Detection**

```typescript
// src/lib/shopify/app-name.ts
export const getAppName = () => {
  const isPreview = process.env.VERCEL_ENV === 'preview';
  return isPreview ? 'Thunder Text Dev' : 'Thunder Text';
};
```

---

### Step 5: Deploy and Test

**A. Trigger New Deployment**

After setting environment variables in Vercel:

```bash
cd /Users/bigdaddy/prod_desc/thunder-text

# Make a small change to trigger deployment
git commit --allow-empty -m "chore: trigger preview deployment with new dev app config"
git push origin cosmetic-updates
```

**B. Wait for Deployment**
- Go to Vercel dashboard
- Watch deployment complete (~2-3 minutes)
- Verify preview URL is live

**C. Install Dev App on Test Store**

1. Go to: https://partners.shopify.com/apps/[your-dev-app-id]
2. Click **Select store** → Choose `zunosai-staging-test-store`
3. Click **Install app**
4. Or use direct installation URL:
   ```
   https://thunder-text-git-cosmetic-updates-zeus-ai.vercel.app/api/install?shop=zunosai-staging-test-store.myshopify.com
   ```

**D. Test Authentication**

1. After installation, app should redirect to Shopify admin
2. Click on **Apps** → **Thunder Text Dev**
3. App should load in iframe
4. Check browser console for authentication logs:
   ```
   ✅ Embedded context detected
   ✅ Got session token successfully
   ✅ Authentication successful
   ```

---

### Step 6: Verification Checklist

**Before Testing:**
- [ ] Shopify dev app created
- [ ] App URL matches Vercel preview URL
- [ ] OAuth callback URL configured
- [ ] Vercel environment variables set (Preview scope)
- [ ] New deployment triggered and completed
- [ ] Preview URL is accessible

**During Testing:**
- [ ] App installs successfully on test store
- [ ] App loads in Shopify admin iframe (no X-Frame-Options error)
- [ ] Authentication completes without errors
- [ ] Can navigate between pages
- [ ] API calls work (test by creating/viewing products)

**After Testing:**
- [ ] Uninstall old/broken apps from test store
- [ ] Document any issues found
- [ ] Update this guide with learnings

---

## 🔍 Troubleshooting

### Issue: "App URL mismatch"
**Solution**: Ensure Shopify app URL exactly matches Vercel preview URL
```bash
# Verify preview URL
curl -I https://thunder-text-git-cosmetic-updates-zeus-ai.vercel.app/
```

### Issue: "OAuth callback failed"
**Solution**: Check allowed redirect URLs in Shopify app settings
- Must include: `/api/auth/callback`
- Must use HTTPS (not HTTP)
- No trailing slashes

### Issue: "Environment variables not updating"
**Solution**:
1. Ensure variables are scoped to "Preview" not "Production"
2. Trigger new deployment after changing env vars:
   ```bash
   git commit --allow-empty -m "chore: trigger redeploy"
   git push
   ```

### Issue: "X-Frame-Options: deny"
**Solution**: Verify `vercel.json` and `next.config.ts` have correct frame headers
- Should have `X-Frame-Options: ALLOWALL` (matches main branch)
- CSP should include Shopify domains

### Issue: "Cannot find app in Shopify admin"
**Solution**:
1. Reinstall app from Partner Dashboard
2. Or use direct install URL
3. Check app is enabled for development store

---

## 📋 Quick Reference

### Vercel Preview URL Pattern
```
https://thunder-text-git-[branch-name]-zeus-ai.vercel.app
```

### Installation URL Format
```
https://[preview-url]/api/install?shop=[store-name].myshopify.com
```

### Check Environment Variables
```bash
# In Vercel preview deployment, check:
process.env.VERCEL_ENV === 'preview'  // true
process.env.NEXT_PUBLIC_SHOPIFY_API_KEY  // Dev app client ID
```

### Useful Commands
```bash
# Trigger new deployment
git commit --allow-empty -m "chore: redeploy" && git push

# Check deployment status
vercel ls

# Check environment variables (requires Vercel CLI)
vercel env ls --scope preview
```

---

## 🎯 Next Steps After Setup

1. **Test Cosmetic Updates**: Make UI changes on `cosmetic-updates` branch
2. **Verify in Dev App**: Test changes in Shopify admin via dev app
3. **Merge to Main**: When ready, merge cosmetic-updates → main
4. **Update Production**: Production app automatically gets updates

---

## 📚 Additional Resources

- [Shopify App Setup](https://shopify.dev/docs/apps/getting-started)
- [Vercel Preview Deployments](https://vercel.com/docs/concepts/deployments/preview-deployments)
- [Environment Variables in Vercel](https://vercel.com/docs/concepts/projects/environment-variables)
- [Shopify OAuth](https://shopify.dev/docs/apps/auth/oauth)

---

**Last Updated**: 2025-09-30
**Branch**: cosmetic-updates
**Status**: Ready for setup
