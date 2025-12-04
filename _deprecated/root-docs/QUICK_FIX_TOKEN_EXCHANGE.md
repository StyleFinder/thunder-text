# Token Exchange Error - Quick Fix

## Current Error
```
Token exchange failed: Missing or invalid client secret
Status: 400
```

## Root Cause
The environment variable `SHOPIFY_API_SECRET` is either:
1. Not loaded in the preview deployment
2. Incorrectly set

## Verification Steps

### 1. Check Vercel Deployment Environment Variables

Go to the specific deployment:
1. https://vercel.com/zeus-ai/thunder-text
2. Click on the latest deployment (cosmetic-updates branch)
3. Click **...** menu → **Environment Variables**
4. Verify these variables are present:

```
NEXT_PUBLIC_SHOPIFY_API_KEY = 8c297db9f019c9e666e17918abe69dee
SHOPIFY_API_SECRET = 2908059cb88a49e5fe2b49fe21612ca3
```

### 2. If Variables Are Missing

The deployment may have been built before variables were added.

**Solution: Redeploy**
```bash
cd /Users/bigdaddy/prod_desc/thunder-text

# Trigger new deployment
git commit --allow-empty -m "chore: redeploy to pick up environment variables"
git push origin cosmetic-updates
```

### 3. If Variables Are Present But Still Failing

**Check in Vercel Dashboard:**
1. Settings → Environment Variables
2. Find `SHOPIFY_API_SECRET`
3. Verify it's set to "Preview" scope (not just Production)
4. Value should be: `2908059cb88a49e5fe2b49fe21612ca3`

**If it's missing Preview scope:**
- Edit the variable
- Check "Preview" checkbox
- Save
- Redeploy

## Expected Behavior After Fix

**Console should show:**
```
✅ Embedded context detected, initializing App Bridge
✅ Got session token successfully
✅ Authentication successful
```

**Not:**
```
❌ Token exchange failed
```

## Quick Test Command

After redeploying, verify environment variables are accessible:

```bash
# Check if deployment has the variables
# Go to: https://vercel.com/zeus-ai/thunder-text
# Click latest deployment → Functions → Check env vars
```

## Dev App Credentials (for reference)

**Thunder Text Dev:**
- Client ID: `8c297db9f019c9e666e17918abe69dee`
- Client Secret: `2908059cb88a49e5fe2b49fe21612ca3`
- App URL: `https://thunder-text-git-cosmetic-updates-zeus-ai.vercel.app`
