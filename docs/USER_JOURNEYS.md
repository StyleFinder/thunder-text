# Thunder Text User Journeys

> Comprehensive documentation of all user workflows, from first contact to daily usage.

**Last Updated**: December 6, 2025

---

## Table of Contents

1. [User Types Overview](#user-types-overview)
2. [Entry Points](#entry-points)
3. [New User Journeys](#new-user-journeys)
   - [Shopify App Store Install](#journey-a-shopify-app-store-install)
   - [Direct Website Signup (Shopify)](#journey-b-direct-website-signup-shopify)
   - [Standalone User Signup](#journey-c-standalone-user-signup-no-shopify)
4. [Returning User Journeys](#returning-user-journeys)
   - [Standalone User Login](#journey-d-standalone-user-login)
   - [Shopify Embedded App Access](#journey-e-shopify-embedded-app-access)
   - [Shopify Re-authentication](#journey-f-shopify-re-authentication)
5. [Onboarding Wizard Details](#onboarding-wizard-details)
6. [Authentication Flows](#authentication-flows)
7. [Post-Onboarding Flows](#post-onboarding-flows)
8. [Error Recovery Flows](#error-recovery-flows)
9. [Technical Implementation Reference](#technical-implementation-reference)

---

## User Types Overview

| User Type       | `shop_type`                | Authentication Method     | Has Password | Shopify Connected |
| --------------- | -------------------------- | ------------------------- | ------------ | ----------------- |
| Shopify User    | `shopify`                  | Shopify OAuth             | No           | Yes               |
| Standalone User | `standalone`               | Email/Password (NextAuth) | Yes          | Optional          |
| Coach           | N/A (`coaches` table)      | Email/Password (NextAuth) | Yes          | N/A               |
| Admin           | N/A (`super_admins` table) | Email/Password + 2FA      | Yes          | N/A               |

---

## Entry Points

Users can enter Thunder Text through multiple paths:

```
┌─────────────────────────────────────────────────────────────────┐
│                        ENTRY POINTS                              │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  1. Shopify App Store                                           │
│     └─→ Install Thunder Text → OAuth → /welcome?step=social    │
│                                                                  │
│  2. Thunder Text Website (thundertext.com)                      │
│     └─→ /welcome → Connect Store → OAuth → /welcome?step=social │
│                                                                  │
│  3. Direct Login Page (/auth/login)                             │
│     └─→ Existing standalone users → /dashboard                  │
│                                                                  │
│  4. Signup Page (/auth/signup)                                  │
│     └─→ New standalone users → /dashboard                       │
│                                                                  │
│  5. Shopify Admin Panel                                         │
│     └─→ Existing Shopify users → Embedded app → /dashboard      │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## New User Journeys

### Journey A: Shopify App Store Install

**Scenario**: User discovers Thunder Text in the Shopify App Store and clicks "Install"

```
┌──────────────────────────────────────────────────────────────────┐
│ SHOPIFY APP STORE INSTALL FLOW                                   │
├──────────────────────────────────────────────────────────────────┤
│                                                                   │
│  Shopify App Store                                               │
│       │                                                          │
│       ▼                                                          │
│  Click "Add app" / "Install"                                     │
│       │                                                          │
│       ▼                                                          │
│  Shopify OAuth Consent Screen                                    │
│  (User approves permissions)                                     │
│       │                                                          │
│       ▼                                                          │
│  /api/auth/shopify/callback                                      │
│       │                                                          │
│       ├─→ Create shops record (shop_type: 'shopify')             │
│       ├─→ Store encrypted access_token                           │
│       ├─→ Create 14-day trial subscription                       │
│       ├─→ Initialize default prompts                             │
│       │                                                          │
│       ▼                                                          │
│  Redirect: /welcome?step=social&shop=<domain>                    │
│  (Skips Welcome + Store Connection steps)                        │
│       │                                                          │
│       ▼                                                          │
│  ONBOARDING STEP 3: Connect Ad Platforms                         │
│  (Optional: Meta, Google, TikTok, Pinterest)                     │
│       │                                                          │
│       ▼                                                          │
│  ONBOARDING STEP 4: Complete                                     │
│  (Trial confirmation, feature overview)                          │
│       │                                                          │
│       ▼                                                          │
│  /dashboard?shop=<domain>                                        │
│  ✅ USER READY                                                   │
│                                                                   │
└──────────────────────────────────────────────────────────────────┘
```

**Key Files**:

- OAuth Callback: `src/app/api/auth/shopify/callback/route.ts`
- Welcome Page: `src/app/welcome/page.tsx`

**Database Changes**:

- New record in `shops` table with `shop_type='shopify'`
- New record in `subscriptions` table with `status='trialing'`
- New records in `prompts` table (default prompts)

---

### Journey B: Direct Website Signup (Shopify)

**Scenario**: User visits Thunder Text website directly and wants to connect their Shopify store

```
┌──────────────────────────────────────────────────────────────────┐
│ DIRECT WEBSITE SIGNUP (WITH SHOPIFY) FLOW                        │
├──────────────────────────────────────────────────────────────────┤
│                                                                   │
│  thundertext.com or /welcome                                     │
│       │                                                          │
│       ▼                                                          │
│  ONBOARDING STEP 1: Welcome                                      │
│  (Feature overview, 14-day trial badge)                          │
│       │                                                          │
│       ▼ Click "Get Started"                                      │
│                                                                   │
│  ONBOARDING STEP 2: Connect Store                                │
│  (Platform selection: Shopify, Lightspeed*, CommentSold*)        │
│       │                                                          │
│       ▼ Select "Shopify"                                         │
│                                                                   │
│  Enter Store Domain                                              │
│  (e.g., "my-store" → normalized to "my-store.myshopify.com")    │
│       │                                                          │
│       ▼ Click "Connect Store"                                    │
│                                                                   │
│  sessionStorage.set('onboarding_return', 'social')               │
│  Redirect: /api/auth/shopify?shop=<domain>                       │
│       │                                                          │
│       ▼                                                          │
│  Shopify OAuth Consent Screen                                    │
│  (User approves permissions)                                     │
│       │                                                          │
│       ▼                                                          │
│  /api/auth/shopify/callback                                      │
│  (Same as Journey A from here)                                   │
│       │                                                          │
│       ▼                                                          │
│  /welcome?step=social&shop=<domain>                              │
│       │                                                          │
│       ▼                                                          │
│  Continue onboarding...                                          │
│  ✅ USER READY                                                   │
│                                                                   │
│  * Coming Soon                                                   │
└──────────────────────────────────────────────────────────────────┘
```

**Key Files**:

- Welcome Page: `src/app/welcome/page.tsx`
- Shopify OAuth Init: `src/app/api/auth/shopify/route.ts`
- OAuth Callback: `src/app/api/auth/shopify/callback/route.ts`

---

### Journey C: Standalone User Signup (No Shopify)

**Scenario**: User wants to use Thunder Text without a Shopify store

```
┌──────────────────────────────────────────────────────────────────┐
│ STANDALONE USER SIGNUP FLOW                                      │
├──────────────────────────────────────────────────────────────────┤
│                                                                   │
│  /auth/login                                                     │
│       │                                                          │
│       ▼ Click "Sign up for free"                                 │
│                                                                   │
│  /auth/signup                                                    │
│       │                                                          │
│       ▼                                                          │
│  Fill Registration Form:                                         │
│  - Email address                                                 │
│  - Password (min 8 chars)                                        │
│  - Store name (display name)                                     │
│       │                                                          │
│       ▼ Submit                                                   │
│                                                                   │
│  POST /api/auth/signup                                           │
│       │                                                          │
│       ├─→ Validate email uniqueness                              │
│       ├─→ Hash password (bcrypt)                                 │
│       ├─→ Create shops record:                                   │
│       │   - shop_type: 'standalone'                              │
│       │   - user_type: 'store'                                   │
│       │   - password_hash: <hashed>                              │
│       │   - is_active: true                                      │
│       │                                                          │
│       ▼                                                          │
│  Auto-login via signIn('credentials')                            │
│       │                                                          │
│       ▼                                                          │
│  /dashboard?shop=<generated-domain>                              │
│  ✅ USER READY                                                   │
│                                                                   │
│  NOTE: Standalone users skip onboarding wizard                   │
│  and can optionally connect Shopify later                        │
│  via Settings > Connections                                      │
│                                                                   │
└──────────────────────────────────────────────────────────────────┘
```

**Key Files**:

- Signup Page: `src/app/auth/signup/page.tsx`
- Signup API: `src/app/api/auth/signup/route.ts`
- Auth Options: `src/lib/auth/auth-options.ts`

**Database Changes**:

- New record in `shops` table with `shop_type='standalone'`

---

## Returning User Journeys

### Journey D: Standalone User Login

**Scenario**: Existing standalone user returns to log in

```
┌──────────────────────────────────────────────────────────────────┐
│ STANDALONE USER LOGIN FLOW                                       │
├──────────────────────────────────────────────────────────────────┤
│                                                                   │
│  /auth/login                                                     │
│       │                                                          │
│       ▼                                                          │
│  Enter Credentials:                                              │
│  - Email address                                                 │
│  - Password                                                      │
│       │                                                          │
│       ▼ Submit                                                   │
│                                                                   │
│  signIn('credentials', { userType: 'shop' })                     │
│       │                                                          │
│       ▼                                                          │
│  auth-options.ts authorize():                                    │
│       │                                                          │
│       ├─→ Check account lockout status                           │
│       ├─→ Query shops table:                                     │
│       │   - shop_type = 'standalone'                             │
│       │   - is_active = true                                     │
│       ├─→ bcrypt.compare(password, password_hash)                │
│       │                                                          │
│       ├─ On Failure:                                             │
│       │   ├─→ Record failed attempt                              │
│       │   ├─→ Return error (or lockout after 5 attempts)         │
│       │                                                          │
│       ├─ On Success:                                             │
│       │   ├─→ Clear failed attempts                              │
│       │   ├─→ Create JWT token:                                  │
│       │   │   - id, email, name                                  │
│       │   │   - role: 'user'                                     │
│       │   │   - shopDomain: shop.shop_domain                     │
│       │                                                          │
│       ▼                                                          │
│  Login page fetches session via getSession()                     │
│  Extracts shopDomain from session                                │
│       │                                                          │
│       ▼                                                          │
│  Redirect: /dashboard?shop=<shopDomain>                          │
│  ✅ USER AUTHENTICATED                                           │
│                                                                   │
└──────────────────────────────────────────────────────────────────┘
```

**Key Files**:

- Login Page: `src/app/auth/login/page.tsx`
- Auth Options: `src/lib/auth/auth-options.ts`
- Login Protection: `src/lib/security/login-protection.ts`

**Security Features**:

- Account lockout after 5 failed attempts (15 min)
- bcrypt password hashing
- JWT with 15-min access token, 7-day session

---

### Journey E: Shopify Embedded App Access

**Scenario**: Existing Shopify user accesses Thunder Text from within Shopify Admin

```
┌──────────────────────────────────────────────────────────────────┐
│ SHOPIFY EMBEDDED APP ACCESS FLOW                                 │
├──────────────────────────────────────────────────────────────────┤
│                                                                   │
│  Shopify Admin Panel                                             │
│       │                                                          │
│       ▼ Click "Thunder Text" in Apps                             │
│                                                                   │
│  App loads in Shopify iframe                                     │
│       │                                                          │
│       ▼                                                          │
│  UnifiedAuthProvider detects embedded context:                   │
│  - window.top !== window.self                                    │
│  - OR embedded=1 parameter                                       │
│       │                                                          │
│       ▼                                                          │
│  Import @shopify/app-bridge (NPM)                                │
│  Create App Bridge instance                                      │
│       │                                                          │
│       ▼                                                          │
│  getSessionToken()                                               │
│       │                                                          │
│       ▼                                                          │
│  POST /api/shopify/token-exchange                                │
│  (Exchange session token for access token)                       │
│       │                                                          │
│       ├─→ Validate session token                                 │
│       ├─→ Retrieve/refresh access token                          │
│       ├─→ Store in Supabase                                      │
│       │                                                          │
│       ▼                                                          │
│  App authenticated                                               │
│  Auto-refresh session token every 30 seconds                     │
│       │                                                          │
│       ▼                                                          │
│  /dashboard (embedded)                                           │
│  ✅ USER AUTHENTICATED                                           │
│                                                                   │
└──────────────────────────────────────────────────────────────────┘
```

**Key Files**:

- Auth Provider: `src/app/components/UnifiedAuthProvider.tsx`
- Token Exchange: `src/app/api/shopify/token-exchange/route.ts`

---

### Journey F: Shopify Re-authentication

**Scenario**: Existing Shopify user's token has expired or they need to re-authorize

```
┌──────────────────────────────────────────────────────────────────┐
│ SHOPIFY RE-AUTHENTICATION FLOW                                   │
├──────────────────────────────────────────────────────────────────┤
│                                                                   │
│  User action triggers API call                                   │
│       │                                                          │
│       ▼                                                          │
│  API returns 401 (token expired/invalid)                         │
│       │                                                          │
│       ▼                                                          │
│  Redirect to /api/auth/shopify?shop=<domain>                     │
│       │                                                          │
│       ▼                                                          │
│  Shopify OAuth (may be automatic if already authorized)          │
│       │                                                          │
│       ▼                                                          │
│  /api/auth/shopify/callback                                      │
│       │                                                          │
│       ├─→ Shop exists in database (isNewInstallation = false)    │
│       ├─→ Update access_token, scope, updated_at                 │
│       │                                                          │
│       ▼                                                          │
│  Redirect: /dashboard?shop=<domain>&authenticated=true           │
│  (NOT /welcome - goes straight to dashboard)                     │
│       │                                                          │
│       ▼                                                          │
│  ✅ USER RE-AUTHENTICATED                                        │
│                                                                   │
└──────────────────────────────────────────────────────────────────┘
```

**Key Difference**: Existing shops redirect to `/dashboard`, NOT `/welcome`

---

## Onboarding Wizard Details

The onboarding wizard (`/welcome`) has 4 steps:

### Step 1: Welcome

- **URL**: `/welcome` or `/welcome?step=welcome`
- **Purpose**: Feature overview and value proposition
- **UI Elements**:
  - 14-day free trial badge
  - Feature cards (Thunder Text, ACE Engine, BHB Coach)
  - "Get Started" CTA
- **Action**: Click "Get Started" → Step 2

### Step 2: Connect Store

- **URL**: `/welcome?step=shopify`
- **Purpose**: Platform selection and store connection
- **UI Elements**:
  - Platform cards (Shopify, Lightspeed*, CommentSold*)
  - Store domain input field
  - "What we'll access" permissions list
- **Action**: Enter domain + "Connect Store" → OAuth → Step 3
- **Note**: _Lightspeed and CommentSold are "Coming Soon"_

### Step 3: Ad Platforms (Optional)

- **URL**: `/welcome?step=social&shop=<domain>`
- **Purpose**: Connect advertising platforms for ACE
- **UI Elements**:
  - Shopify (shows as connected)
  - Meta Ads (Facebook/Instagram)
  - Google Ads
  - TikTok Ads\* (Coming Soon)
  - Pinterest Ads\* (Coming Soon)
- **Action**: Connect platforms OR "Skip for Now" → Step 4

### Step 4: Complete

- **URL**: `/welcome?step=complete`
- **Purpose**: Confirmation and trial activation
- **UI Elements**:
  - Success animation with confetti
  - Trial inclusions list
  - "Go to Dashboard" CTA
- **Action**: "Go to Dashboard" → `/dashboard?shop=<domain>`

---

## Authentication Flows

### NextAuth Credential Flow (Standalone Users)

```
┌─────────────────────────────────────────────────────────────────┐
│ NEXTAUTH CREDENTIAL AUTHENTICATION                               │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Client                    Server                   Database    │
│    │                         │                          │       │
│    │  signIn('credentials')  │                          │       │
│    │ ──────────────────────► │                          │       │
│    │                         │                          │       │
│    │                         │  checkLockoutStatus()    │       │
│    │                         │ ◄────────────────────────│       │
│    │                         │                          │       │
│    │                         │  Query shops table       │       │
│    │                         │ ────────────────────────►│       │
│    │                         │                          │       │
│    │                         │  bcrypt.compare()        │       │
│    │                         │ ◄────────────────────────│       │
│    │                         │                          │       │
│    │  JWT Token              │                          │       │
│    │ ◄────────────────────── │                          │       │
│    │                         │                          │       │
│    │  Set session cookie     │                          │       │
│    │ ◄────────────────────── │                          │       │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Shopify OAuth Flow

```
┌─────────────────────────────────────────────────────────────────┐
│ SHOPIFY OAUTH AUTHENTICATION                                     │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Client          Thunder Text        Shopify        Database    │
│    │                  │                 │               │       │
│    │  /api/auth/shopify?shop=x         │               │       │
│    │ ──────────────────►               │               │       │
│    │                  │                 │               │       │
│    │                  │  Generate CSRF state           │       │
│    │                  │  Store state    │               │       │
│    │                  │ ────────────────────────────────►       │
│    │                  │                 │               │       │
│    │  Redirect to Shopify OAuth        │               │       │
│    │ ◄──────────────── │               │               │       │
│    │                  │                 │               │       │
│    │  User approves   │                 │               │       │
│    │ ─────────────────────────────────► │               │       │
│    │                  │                 │               │       │
│    │  Callback with code               │               │       │
│    │ ◄───────────────────────────────── │               │       │
│    │                  │                 │               │       │
│    │  /api/auth/shopify/callback       │               │       │
│    │ ──────────────────►               │               │       │
│    │                  │                 │               │       │
│    │                  │  Verify state   │               │       │
│    │                  │ ◄────────────────────────────────       │
│    │                  │                 │               │       │
│    │                  │  Exchange code for token       │       │
│    │                  │ ────────────────►               │       │
│    │                  │                 │               │       │
│    │                  │  access_token   │               │       │
│    │                  │ ◄────────────── │               │       │
│    │                  │                 │               │       │
│    │                  │  Store token    │               │       │
│    │                  │ ────────────────────────────────►       │
│    │                  │                 │               │       │
│    │  Redirect to /welcome or /dashboard               │       │
│    │ ◄──────────────── │               │               │       │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## Post-Onboarding Flows

### First Product Generation

```
Dashboard → Thunder Text → Upload Image → Generate Description → Save to Shopify
```

### Connect Additional Platforms

```
Dashboard → Settings → Connections → Select Platform → OAuth → Return to Settings
```

### Manage Subscription

```
Dashboard → Settings → Subscription → Select Plan → Payment → Confirmation
```

---

## Error Recovery Flows

### Account Locked (Too Many Failed Logins)

```
Login Attempt → 5th Failure → Account Locked 15 min → Wait → Retry
```

### OAuth State Mismatch

```
OAuth Callback → Invalid State → /auth/error?error=invalid_state → Retry OAuth
```

### Token Expired (Embedded App)

```
API Call → 401 → Token Exchange Retry → If Fails → Re-OAuth Flow
```

---

## Technical Implementation Reference

### Key Files

| Purpose                | File Path                                     |
| ---------------------- | --------------------------------------------- |
| Login Page             | `src/app/auth/login/page.tsx`                 |
| Signup Page            | `src/app/auth/signup/page.tsx`                |
| Signup API             | `src/app/api/auth/signup/route.ts`            |
| NextAuth Config        | `src/lib/auth/auth-options.ts`                |
| Onboarding Wizard      | `src/app/welcome/page.tsx`                    |
| Shopify OAuth Init     | `src/app/api/auth/shopify/route.ts`           |
| Shopify OAuth Callback | `src/app/api/auth/shopify/callback/route.ts`  |
| Token Exchange         | `src/app/api/shopify/token-exchange/route.ts` |
| Embedded Auth Provider | `src/app/components/UnifiedAuthProvider.tsx`  |
| Login Protection       | `src/lib/security/login-protection.ts`        |
| 2FA (Admin Only)       | `src/lib/security/two-factor-auth.ts`         |
| Connections Page       | `src/app/settings/connections/page.tsx`       |
| Dashboard              | `src/app/dashboard/page.tsx`                  |

### Database Tables

| Table           | Purpose                                           |
| --------------- | ------------------------------------------------- |
| `shops`         | Store user accounts (both Shopify and standalone) |
| `subscriptions` | Trial and paid subscription tracking              |
| `prompts`       | User's saved generation prompts                   |
| `coaches`       | Coach user accounts                               |
| `super_admins`  | Admin accounts with 2FA                           |
| `oauth_states`  | CSRF protection for OAuth                         |

### Session & Token Lifecycle

| Token Type            | Duration                | Refresh Mechanism                     |
| --------------------- | ----------------------- | ------------------------------------- |
| JWT Access Token      | 15 minutes              | Auto-refresh for non-admins           |
| NextAuth Session      | 7 days                  | Session cookie                        |
| Shopify Session Token | 1 minute                | Auto-refresh every 30s via App Bridge |
| Shopify Access Token  | Permanent until revoked | Stored in database                    |

---

## Changelog

| Date       | Change                        |
| ---------- | ----------------------------- |
| 2025-12-06 | Initial documentation created |
