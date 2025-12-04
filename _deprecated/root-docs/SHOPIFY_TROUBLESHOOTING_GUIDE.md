# Shopify App Data Troubleshooting Guide

## Lessons Learned from Thunder Text Integration

### Overview

This guide documents the issues encountered and solutions found while getting Thunder Text to display real Shopify product data instead of mock data.

---

## 🔍 The Problem We Faced

**Symptom:** The app showed old "snowboard" products that had been deleted from Shopify, instead of the current "Chic Black" clothing products.

**Root Causes:** Multiple configuration and authentication issues that created a cascade of problems.

---

## 🏗️ Architecture Understanding

### How Shopify Apps Connect to Store Data

```
[Shopify Store] <-- API Token --> [Your App] <-- Token Storage --> [Database]
     |                                |                                |
  Products                      Thunder Text                      Supabase
```

**Key Concept:** Your app doesn't store product data - it stores an **access token** (like a password) that allows it to fetch products from Shopify in real-time.

### Analogy: The Library Card System

- **Shopify Store** = Library with books (products)
- **Access Token** = Library card that lets you check out books
- **Supabase** = Your wallet where you keep the library card
- **Thunder Text** = You, trying to get books from the library

If you have the wrong wallet (wrong Supabase), or no library card (no token), you can't get real books - so you read fake ones instead (mock data).

---

## 🔧 Issues Encountered & Solutions

### Issue 1: OAuth Token Not Being Stored

**Problem:** OAuth flow succeeded but token wasn't saved to database
**Symptom:** "Unauthorized" errors when calling Shopify API
**Solution:**

```sql
-- Manually insert token into Supabase
INSERT INTO shops (shop_domain, access_token, scope, is_active)
VALUES (
  'your-store.myshopify.com',
  'shpat_your_token_here',
  'read_products,write_products',
  true
);
```

### Issue 2: Wrong Supabase Project Connected

**Problem:** Vercel was using the wrong Supabase project ID
**Symptom:** Token not found errors even after storing it
**Solution:** Update Vercel environment variables:

- `NEXT_PUBLIC_SUPABASE_URL` = `https://<YOUR_PROJECT_ID>.supabase.co`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` = (correct project's key)
- `SUPABASE_SERVICE_KEY` = (correct project's service key)

### Issue 3: API Key Mismatches

**Problem:** Different API keys in different places

- shopify.app.toml had `fa85f...`
- .env had `4022d6e...`
- Shopify Partner Dashboard had different key
  **Solution:** Ensure all locations use the same API key from Shopify Partner Dashboard

### Issue 4: Mock Data Fallback

**Problem:** When no valid token found, app showed hardcoded mock products
**Symptom:** Seeing products that don't exist in your store
**Solution:** Fix token storage and retrieval to avoid mock data fallback

### Issue 5: Product Status Filtering

**Problem:** GraphQL returned ALL products including archived/deleted ones
**Symptom:** Old deleted products still appearing
**Solution:** Filter products by status:

```javascript
// Show only draft and active products
const products = allProducts.filter(
  (product) => product.status === "draft" || product.status === "active",
);
```

---

## 📋 Troubleshooting Checklist

When Shopify data isn't showing correctly, check these in order:

### 1. Verify Token Exists

```bash
# Check if token is stored in database
curl "https://your-app.vercel.app/api/debug/token-status?shop=your-shop"
```

### 2. Test Token Directly with Shopify

```bash
# Test if token works with Shopify API
curl -X GET "https://your-store.myshopify.com/admin/api/2024-10/shop.json" \
  -H "X-Shopify-Access-Token: shpat_your_token"
```

### 3. Check Environment Variables

Create a debug endpoint to verify configuration:

```javascript
// api/debug/supabase-check/route.ts
export async function GET() {
  return NextResponse.json({
    supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL,
    hasCorrectProject:
      process.env.NEXT_PUBLIC_SUPABASE_URL?.includes("correct_project_id"),
  });
}
```

### 4. Compare REST vs GraphQL Results

```bash
# REST API (usually more reliable)
curl -X GET "https://your-store.myshopify.com/admin/api/2024-10/products.json" \
  -H "X-Shopify-Access-Token: your_token"

# GraphQL (what the app uses)
curl -X POST "https://your-store.myshopify.com/admin/api/2024-10/graphql.json" \
  -H "Content-Type: application/json" \
  -H "X-Shopify-Access-Token: your_token" \
  -d '{"query": "{ products(first: 5) { edges { node { title status } } } }"}'
```

### 5. Check Product Status

Products in Shopify have three statuses:

- **Active**: Published and visible to customers
- **Draft**: Work in progress, not published
- **Archived**: Soft-deleted but still in database

---

## 🚀 Quick Fix Guide

### "I see wrong/old products"

1. Check which products GraphQL actually returns
2. Add status filtering to exclude archived products
3. Clear any caching mechanisms

### "I see mock/fake data"

1. Token is missing or invalid
2. Check token in Supabase: `SELECT * FROM shops WHERE shop_domain = 'your-store.myshopify.com';`
3. Verify environment variables point to correct Supabase project

### "I get Unauthorized errors"

1. Token is wrong or expired
2. Get fresh token from Shopify Partner Dashboard
3. Update token in database
4. Verify API credentials match everywhere

### "Nothing works"

Run this diagnostic flow:

```bash
# 1. Check if app can reach Supabase
curl "https://your-app.vercel.app/api/debug/supabase-check"

# 2. Check if token exists
curl "https://your-app.vercel.app/api/debug/token-status?shop=your-shop"

# 3. Test token directly
curl -X GET "https://your-store.myshopify.com/admin/api/2024-10/shop.json" \
  -H "X-Shopify-Access-Token: your_token"

# 4. Check what products API returns
curl "https://your-app.vercel.app/api/shopify/products?shop=your-shop"
```

---

## 🎯 Key Takeaways

1. **Shopify apps don't store product data** - they fetch it real-time using access tokens
2. **Environment variables are critical** - wrong Supabase URL = no token = no data
3. **GraphQL vs REST can differ** - GraphQL might return different results than REST API
4. **Product status matters** - Always filter to exclude archived products
5. **Mock data is a fallback** - If you see fake data, your authentication is broken
6. **Debug endpoints are essential** - Create endpoints to check token status and configuration

---

## 🛠️ Preventive Measures

### For New Projects

1. Create debug endpoints from the start
2. Use environment variable validation on startup
3. Add comprehensive logging for token retrieval
4. Test with both REST and GraphQL APIs
5. Document which Supabase project is used where

### Code to Add to Every Shopify App

```javascript
// Debug endpoint for token status
export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const shop = searchParams.get("shop");

  return NextResponse.json({
    shop,
    hasToken: !!(await getShopToken(shop)).accessToken,
    supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL,
    environment: process.env.NODE_ENV,
  });
}
```

---

## 📝 Configuration Template

Keep this information documented for each Shopify app:

```yaml
Project: Thunder Text
Shopify Store: <YOUR_STORE>.myshopify.com
Supabase Project ID: <YOUR_SUPABASE_PROJECT_ID>
Shopify API Key: <YOUR_SHOPIFY_API_KEY>
Token Prefix: shpat_
Deployment: Vercel (auto-deploy from GitHub)
GitHub Repo: <YOUR_ORG>/<YOUR_REPO>
```

---

## Final Words

Most Shopify app data issues boil down to authentication problems. When in doubt:

1. Check the token
2. Check it's stored correctly
3. Check it's being retrieved correctly
4. Check it works with Shopify directly

If all those pass, then look at the actual API queries and filtering logic.
