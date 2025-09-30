# Vercel Environment Variables Setup - Thunder Text Dev

## 🎯 Purpose
Configure Vercel preview environment variables for Thunder Text Dev app (cosmetic-updates branch).

## 📋 Environment Variables to Set

Go to: https://vercel.com/zeus-ai/thunder-text/settings/environment-variables

### Required Variables for PREVIEW Environment

| Variable Name | Value | Environment Scope |
|---------------|-------|-------------------|
| `NEXT_PUBLIC_SHOPIFY_API_KEY` | `8c297db9f019c9e666e17918abe69dee` | **Preview** |
| `SHOPIFY_API_SECRET` | `2908059cb88a49e5fe2b49fe21612ca3` | **Preview** |
| `SHOPIFY_APP_URL` | `https://thunder-text-git-cosmetic-updates-zeus-ai.vercel.app` | **Preview** |
| `NEXTAUTH_URL` | `https://thunder-text-git-cosmetic-updates-zeus-ai.vercel.app` | **Preview** |

### Shared Variables (Already Set - No Changes Needed)

These variables should already exist and be shared across all environments:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_KEY`
- `OPENAI_API_KEY`
- `NEXTAUTH_SECRET`
- `SHOPIFY_SCOPES`

## 🔧 Step-by-Step Configuration

### Step 1: Access Vercel Dashboard
1. Go to: https://vercel.com/dashboard
2. Select project: **thunder-text**
3. Click **Settings** tab
4. Click **Environment Variables** in left sidebar

### Step 2: Add Dev App Client ID
1. Click **Add New** button
2. Fill in:
   - **Name**: `NEXT_PUBLIC_SHOPIFY_API_KEY`
   - **Value**: `8c297db9f019c9e666e17918abe69dee`
   - **Environment**: Check **ONLY** "Preview" (uncheck Production and Development)
3. Click **Save**

### Step 3: Add Dev App Secret
1. Click **Add New** button
2. Fill in:
   - **Name**: `SHOPIFY_API_SECRET`
   - **Value**: `2908059cb88a49e5fe2b49fe21612ca3`
   - **Environment**: Check **ONLY** "Preview" (uncheck Production and Development)
3. Click **Save**

### Step 4: Add Dev App URL
1. Click **Add New** button
2. Fill in:
   - **Name**: `SHOPIFY_APP_URL`
   - **Value**: `https://thunder-text-git-cosmetic-updates-zeus-ai.vercel.app`
   - **Environment**: Check **ONLY** "Preview"
3. Click **Save**

### Step 5: Add NextAuth URL
1. Click **Add New** button
2. Fill in:
   - **Name**: `NEXTAUTH_URL`
   - **Value**: `https://thunder-text-git-cosmetic-updates-zeus-ai.vercel.app`
   - **Environment**: Check **ONLY** "Preview"
3. Click **Save**

## ⚠️ Important Notes

### Environment Scope
- **CRITICAL**: These variables MUST be set to "Preview" scope ONLY
- Do NOT select "Production" or "Development"
- This ensures dev app credentials only work on preview deployments

### Existing Variables
- If these variables already exist for Preview, UPDATE them with new values
- Do NOT delete Production-scoped variables
- Production app uses different credentials

### Security
- Dev app credentials are now documented in this file
- This file is in `.gitignore` and won't be committed
- Keep credentials secure and don't share publicly

## 🚀 After Setting Variables

### Trigger New Deployment
After saving all environment variables:

```bash
cd /Users/bigdaddy/prod_desc/thunder-text

# Trigger new deployment to pick up new env vars
git commit --allow-empty -m "chore: trigger preview deployment with dev app credentials"
git push origin cosmetic-updates
```

### Verify Variables in Deployment
1. Wait for deployment to complete (~2-3 minutes)
2. Go to deployment in Vercel dashboard
3. Click **...** menu → **Environment Variables**
4. Verify dev app credentials are present

### Test Installation
1. Go to: https://partners.shopify.com/apps
2. Select **Thunder Text Dev**
3. Click **Select store** → `zunosai-staging-test-store`
4. Click **Install app**

Or use direct installation URL:
```
https://thunder-text-git-cosmetic-updates-zeus-ai.vercel.app/api/install?shop=zunosai-staging-test-store.myshopify.com
```

## ✅ Verification Checklist

After deployment completes:

- [ ] Preview deployment shows "Ready" status
- [ ] Environment variables visible in deployment settings
- [ ] Preview URL loads without errors: https://thunder-text-git-cosmetic-updates-zeus-ai.vercel.app
- [ ] App installs on test store
- [ ] App loads in Shopify admin iframe
- [ ] No X-Frame-Options errors in console
- [ ] Authentication completes successfully

## 🔍 Troubleshooting

### Issue: Variables Not Updating
**Solution**: Trigger new deployment after setting variables
```bash
git commit --allow-empty -m "chore: redeploy" && git push
```

### Issue: Wrong Credentials Being Used
**Solution**: Check environment scope
- Preview deployments should use Preview-scoped variables
- Verify in deployment settings that correct values are loaded

### Issue: "Client ID mismatch"
**Solution**: Ensure NEXT_PUBLIC_SHOPIFY_API_KEY matches Shopify dev app Client ID
- Shopify: `8c297db9f019c9e666e17918abe69dee`
- Vercel Preview: Should be same value

## 📚 Reference

### Shopify Dev App Details
- **App Name**: Thunder Text Dev
- **Client ID**: `8c297db9f019c9e666e17918abe69dee`
- **Client Secret**: `2908059cb88a49e5fe2b49fe21612ca3`
- **App URL**: https://thunder-text-git-cosmetic-updates-zeus-ai.vercel.app
- **OAuth Callback**: https://thunder-text-git-cosmetic-updates-zeus-ai.vercel.app/api/auth/callback

### Vercel Preview Deployment
- **Project**: thunder-text
- **Branch**: cosmetic-updates
- **URL Pattern**: `https://thunder-text-git-cosmetic-updates-zeus-ai.vercel.app`
- **Environment**: Preview

---

**Status**: Ready to configure in Vercel Dashboard
**Next Step**: Set environment variables in Vercel UI following steps above
