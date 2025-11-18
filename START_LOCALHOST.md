# Thunder Text - Localhost Startup Guide

## 🎯 Simple 3-Step Startup (Use This Every Time)

### Step 1: Start ngrok (Terminal 1)

```bash
cd /Users/bigdaddy/prod_desc/thunder-text
npm run dev:ngrok
```

**Look for this line:**

```
started tunnel ... url=https://XXXXXX.ngrok-free.app
```

**Copy the URL** (example: `https://90b58cba2741.ngrok-free.app`)

---

### Step 2: Update .env.local

Open `/Users/bigdaddy/prod_desc/thunder-text/.env.local`

**Find and replace these 5 URLs with your ngrok URL:**

```bash
# Change this:
SHOPIFY_APP_URL=https://OLD_URL.ngrok-free.app

# To this (use YOUR ngrok URL):
SHOPIFY_APP_URL=https://90b58cba2741.ngrok-free.app
```

**All 5 URLs to update:**

1. `SHOPIFY_APP_URL=`
2. `SHOPIFY_REDIRECT_URI=` (add `/api/auth/shopify` at the end)
3. `NEXTAUTH_URL=`
4. `NEXT_PUBLIC_APP_URL=`
5. `FACEBOOK_REDIRECT_URI=` (add `/api/facebook/oauth/callback` at the end)

**Example:**

```bash
SHOPIFY_APP_URL=https://90b58cba2741.ngrok-free.app
SHOPIFY_REDIRECT_URI=https://90b58cba2741.ngrok-free.app/api/auth/shopify
NEXTAUTH_URL=https://90b58cba2741.ngrok-free.app
NEXT_PUBLIC_APP_URL=https://90b58cba2741.ngrok-free.app
FACEBOOK_REDIRECT_URI=https://90b58cba2741.ngrok-free.app/api/facebook/oauth/callback
```

**Save the file.**

---

### Step 3: Start Next.js (Terminal 2)

```bash
cd /Users/bigdaddy/prod_desc/thunder-text
npm run dev
```

**Wait for:**

```
✓ Ready in XXXms
○ Local: http://localhost:3050
```

---

## ✅ You're Ready!

**Open in browser:**

```
https://YOUR_NGROK_URL.ngrok-free.app/dashboard?shop=zunosai-staging-test-store&authenticated=true
```

**Example:**

```
https://90b58cba2741.ngrok-free.app/dashboard?shop=zunosai-staging-test-store&authenticated=true
```

---

## 🔄 Making Code Changes

1. **Edit any file** in your code editor
2. **Save the file**
3. **Browser auto-refreshes** in 1-2 seconds
4. **Test your changes** immediately

**That's it!** No git push, no Render deploy, no waiting 5 minutes.

---

## 🛑 Shutting Down

**Terminal 1 (ngrok):**

```bash
Ctrl + C
```

**Terminal 2 (Next.js):**

```bash
Ctrl + C
```

---

## 📋 Next Time You Start

### Option A: Same ngrok URL Still Works

If your ngrok URL hasn't changed:

1. Skip Step 2 (don't update .env.local)
2. Just run Steps 1 and 3

### Option B: New ngrok URL (Most Common)

Every time ngrok restarts, you get a **new URL**:

1. Do all 3 steps
2. Update Shopify Partner Dashboard with new URL

---

## 🔧 Updating Shopify Partner Dashboard

**When ngrok URL changes, update Shopify:**

1. Go to: https://partners.shopify.com/organizations
2. Select your Thunder Text app
3. Go to **Configuration** → **App Setup**
4. Update these fields:

```
App URL:
https://YOUR_NEW_NGROK_URL.ngrok-free.app

Allowed redirection URLs:
https://YOUR_NEW_NGROK_URL.ngrok-free.app/api/auth/shopify
```

5. Click **Save**

---

## 🐛 Common Issues

### "Cannot find module" or "Module not found"

```bash
npm install --legacy-peer-deps
npm run dev
```

### Changes not showing up

```bash
# Clear Next.js cache
rm -rf .next
npm run dev
```

### ngrok URL changed

1. Get new ngrok URL from Terminal 1
2. Update `.env.local` (Step 2)
3. Update Shopify Partner Dashboard
4. Restart Next.js (Ctrl+C, then `npm run dev`)

### Port 3050 already in use

```bash
# Kill existing process
lsof -ti:3050 | xargs kill -9

# Try again
npm run dev
```

---

## ⚡ Pro Tips

### Use Two Terminal Windows Side-by-Side

- **Left:** ngrok (rarely touch)
- **Right:** Next.js dev server (restart when needed)

### Keep .env.local Open

Have it ready to update ngrok URLs quickly

### Bookmark Shopify Partners

https://partners.shopify.com/organizations

### Test URLs

Add these to your browser bookmarks:

- Dashboard: `https://YOUR_NGROK_URL/dashboard?shop=zunosai-staging-test-store&authenticated=true`
- Settings: `https://YOUR_NGROK_URL/settings?shop=zunosai-staging-test-store&authenticated=true`
- Create: `https://YOUR_NGROK_URL/create?shop=zunosai-staging-test-store&authenticated=true`

---

## 📊 Localhost vs Render Speed

| Task                     | Localhost      | Render    |
| ------------------------ | -------------- | --------- |
| Code change → See result | **2 seconds**  | 5 minutes |
| Daily iterations         | **100+**       | 10-20     |
| Development speed        | **10x faster** | Baseline  |

**Recommendation:** Use localhost for 95% of development, Render only for final testing before release.
