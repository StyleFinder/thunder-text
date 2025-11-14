# Phase 4: Shopify Subscription Integration (UPDATED)

**Change**: Using Shopify's native subscription billing instead of Stripe

**Duration**: 3-4 days (simplified from 1 week)

**Risk Level**: 🟡 MEDIUM (Shopify API integration)

---

## Overview

Shopify provides native app subscription billing through their Billing API. This eliminates need for:

- ❌ Custom Stripe integration
- ❌ Webhook handling for payments
- ❌ PCI compliance burden
- ❌ Custom subscriptions table

Instead, we use:

- ✅ Shopify's `AppSubscription` API
- ✅ Shopify's payment processing
- ✅ Built-in trial period management
- ✅ Automatic charge collection

---

## Shopify Billing Architecture

### **Pricing Plans**

| Plan            | Price     | Apps Included            | Shopify Plan ID                                   |
| --------------- | --------- | ------------------------ | ------------------------------------------------- |
| **ThunderText** | $29/month | ThunderText only         | `gid://shopify/AppSubscription/thundertext_basic` |
| **ACE**         | $49/month | ACE only                 | `gid://shopify/AppSubscription/ace_pro`           |
| **Suite**       | $99/month | ThunderText + ACE + Zeus | `gid://shopify/AppSubscription/suite_bundle`      |

**Trial Period**: 7 days (Shopify built-in)

### **How Shopify Subscriptions Work**

```typescript
// 1. User installs app → Shopify OAuth complete
// 2. App requests subscription via GraphQL mutation
// 3. Shopify redirects user to approval page
// 4. User approves → Shopify creates subscription
// 5. App polls subscription status via GraphQL query
// 6. Subscription active → grant app access
```

---

## Implementation Steps

### **Step 1: Define Subscription Plans**

```typescript
// packages/shared-backend/lib/shopify/subscription-plans.ts

export const SUBSCRIPTION_PLANS = {
  thundertext: {
    name: "ThunderText Basic",
    price: 29.0,
    trialDays: 7,
    features: [
      "Unlimited product descriptions",
      "AI brand voice learning",
      "Multi-language support",
      "SEO optimization",
    ],
    shopifyPlanName: "THUNDERTEXT_BASIC",
    apps: ["thundertext"],
  },
  ace: {
    name: "ACE Pro",
    price: 49.0,
    trialDays: 7,
    features: [
      "AI-powered ad generation",
      "Facebook ad publishing",
      "Campaign management",
      "Performance tracking",
    ],
    shopifyPlanName: "ACE_PRO",
    apps: ["ace"],
  },
  suite: {
    name: "Thunder Suite",
    price: 99.0,
    trialDays: 7,
    features: [
      "All ThunderText features",
      "All ACE features",
      "Zeus Analytics (coming soon)",
      "Priority support",
      "Save $18/month",
    ],
    shopifyPlanName: "SUITE_BUNDLE",
    apps: ["thundertext", "ace", "zeus"],
  },
} as const;

export type PlanType = keyof typeof SUBSCRIPTION_PLANS;
```

### **Step 2: Create Subscription via Shopify API**

```typescript
// packages/shared-backend/lib/shopify/create-subscription.ts

import { shopifyApi } from "@shopify/shopify-api";

export async function createShopifySubscription(
  shop: string,
  planType: PlanType,
): Promise<{ confirmationUrl: string; subscriptionId: string }> {
  const plan = SUBSCRIPTION_PLANS[planType];

  // GraphQL mutation to create subscription
  const mutation = `
    mutation CreateAppSubscription($name: String!, $price: Decimal!, $trialDays: Int!) {
      appSubscriptionCreate(
        name: $name
        test: ${process.env.NODE_ENV !== "production"}
        trialDays: $trialDays
        lineItems: [{
          plan: {
            appRecurringPricingDetails: {
              price: { amount: $price, currencyCode: USD }
              interval: EVERY_30_DAYS
            }
          }
        }]
        returnUrl: "${process.env.APP_URL}/api/shopify/subscription/callback"
      ) {
        appSubscription {
          id
          status
        }
        confirmationUrl
        userErrors {
          field
          message
        }
      }
    }
  `;

  const client = new shopifyApi.clients.Graphql({
    session: await getShopifySession(shop),
  });

  const response = await client.query({
    data: {
      query: mutation,
      variables: {
        name: plan.name,
        price: plan.price,
        trialDays: plan.trialDays,
      },
    },
  });

  const { appSubscription, confirmationUrl, userErrors } =
    response.body.data.appSubscriptionCreate;

  if (userErrors?.length > 0) {
    throw new Error(`Shopify subscription error: ${userErrors[0].message}`);
  }

  return {
    confirmationUrl, // Redirect user here to approve
    subscriptionId: appSubscription.id,
  };
}
```

### **Step 3: Handle Subscription Callback**

```typescript
// packages/shared-backend/api/shopify/subscription/callback/route.ts

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const charge_id = searchParams.get("charge_id");
  const shop = searchParams.get("shop");

  if (!charge_id || !shop) {
    return NextResponse.redirect("/error?message=missing_params");
  }

  // Query Shopify to get subscription status
  const subscription = await getShopifySubscription(shop, charge_id);

  if (subscription.status === "ACTIVE") {
    // Store subscription in our database
    await saveSubscriptionToDatabase({
      shop_id: shop,
      shopify_subscription_id: charge_id,
      plan_type: determinePlanType(subscription.name),
      status: "active",
      current_period_start: subscription.createdAt,
      current_period_end: subscription.currentPeriodEnd,
    });

    // Redirect to app with success message
    return NextResponse.redirect(`/dashboard?subscription=success`);
  } else {
    return NextResponse.redirect(`/dashboard?subscription=failed`);
  }
}
```

### **Step 4: Check Subscription Status**

```typescript
// packages/shared-backend/lib/shopify/check-subscription.ts

export async function getActiveSubscription(
  shop: string,
): Promise<{ planType: PlanType; apps: string[] } | null> {
  // Query Shopify for active subscriptions
  const query = `
    query {
      currentAppInstallation {
        activeSubscriptions {
          id
          name
          status
          createdAt
          trialDays
          currentPeriodEnd
        }
      }
    }
  `;

  const client = new shopifyApi.clients.Graphql({
    session: await getShopifySession(shop),
  });

  const response = await client.query({ data: query });
  const subscriptions =
    response.body.data.currentAppInstallation.activeSubscriptions;

  // Find active subscription
  const activeSub = subscriptions.find((sub: any) => sub.status === "ACTIVE");

  if (!activeSub) {
    return null; // No active subscription
  }

  // Determine plan type from subscription name
  const planType = Object.entries(SUBSCRIPTION_PLANS).find(
    ([_, plan]) => plan.shopifyPlanName === activeSub.name,
  )?.[0] as PlanType;

  if (!planType) {
    throw new Error(`Unknown subscription plan: ${activeSub.name}`);
  }

  return {
    planType,
    apps: SUBSCRIPTION_PLANS[planType].apps,
  };
}
```

### **Step 5: Update JWT Generation with Shopify Subscription**

```typescript
// packages/shared-backend/lib/auth/jwt.ts (UPDATED)

export async function createJWTForShop(shop: string): Promise<string> {
  // Check Shopify subscription status
  const subscription = await getActiveSubscription(shop);

  if (!subscription) {
    // No active subscription - grant limited access or require subscription
    throw new APIError(
      402,
      ErrorCode.PAYMENT_REQUIRED,
      "No active subscription found",
    );
  }

  // Get shop UUID from database
  const { data: shopRecord } = await supabaseAdmin
    .from("shops")
    .select("id")
    .eq("shop_domain", shop)
    .single();

  // Create JWT with authorized apps from subscription
  return createJWT(
    "user-from-shop",
    shopRecord.id,
    subscription.apps, // ["thundertext"] or ["thundertext", "ace", "zeus"]
  );
}
```

### **Step 6: Simplified Database Schema**

```sql
-- Migration: 20250114_shopify_subscriptions.sql

-- Minimal table to cache Shopify subscription data
CREATE TABLE shopify_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id UUID NOT NULL REFERENCES shops(id) ON DELETE CASCADE,

  -- Shopify subscription details
  shopify_subscription_id TEXT NOT NULL UNIQUE,  -- From Shopify API
  plan_type TEXT NOT NULL CHECK (plan_type IN ('thundertext', 'ace', 'suite')),
  status TEXT NOT NULL CHECK (status IN ('active', 'cancelled', 'frozen', 'pending')),

  -- Timestamps (synced from Shopify)
  trial_ends_at TIMESTAMPTZ,
  current_period_end TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Cache expiry (refresh from Shopify every 1 hour)
  last_synced_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE (shop_id, plan_type)
);

-- Index for fast lookups
CREATE INDEX idx_shopify_subscriptions_shop ON shopify_subscriptions(shop_id);
CREATE INDEX idx_shopify_subscriptions_sync ON shopify_subscriptions(last_synced_at);

-- Function to check if subscription cache is stale
CREATE OR REPLACE FUNCTION is_subscription_stale(sub_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN (
    SELECT last_synced_at < NOW() - INTERVAL '1 hour'
    FROM shopify_subscriptions
    WHERE id = sub_id
  );
END;
$$ LANGUAGE plpgsql;
```

### **Step 7: Subscription Sync Job**

```typescript
// packages/shared-backend/lib/cron/sync-shopify-subscriptions.ts

// Run every hour to sync subscription status from Shopify
export async function syncShopifySubscriptions() {
  console.log("🔄 Syncing Shopify subscriptions...");

  // Get all shops with stale subscription cache
  const { data: shops } = await supabaseAdmin
    .from("shops")
    .select("id, shop_domain")
    .eq("is_active", true);

  for (const shop of shops || []) {
    try {
      // Query current subscription from Shopify
      const subscription = await getActiveSubscription(shop.shop_domain);

      if (subscription) {
        // Update cache in database
        await supabaseAdmin.from("shopify_subscriptions").upsert({
          shop_id: shop.id,
          plan_type: subscription.planType,
          status: "active",
          last_synced_at: new Date().toISOString(),
        });
      } else {
        // Mark subscription as cancelled
        await supabaseAdmin
          .from("shopify_subscriptions")
          .update({ status: "cancelled" })
          .eq("shop_id", shop.id);
      }
    } catch (error) {
      console.error(
        `Error syncing subscription for ${shop.shop_domain}:`,
        error,
      );
    }
  }

  console.log("✅ Subscription sync complete");
}

// Schedule with cron (every hour)
// 0 * * * * node packages/shared-backend/lib/cron/sync-shopify-subscriptions.js
```

### **Step 8: Subscription Management UI**

```typescript
// packages/thundertext-app/src/app/settings/subscription/page.tsx

export default function SubscriptionSettings() {
  const [subscription, setSubscription] = useState(null);

  useEffect(() => {
    // Fetch current subscription
    fetch('/api/subscription')
      .then(res => res.json())
      .then(data => setSubscription(data));
  }, []);

  const handleUpgrade = async (planType: PlanType) => {
    // Create Shopify subscription
    const response = await fetch('/api/subscription/create', {
      method: 'POST',
      body: JSON.stringify({ planType })
    });

    const { confirmationUrl } = await response.json();

    // Redirect to Shopify approval page
    window.location.href = confirmationUrl;
  };

  return (
    <Page title="Subscription">
      {subscription?.planType === 'thundertext' && (
        <Card>
          <Text variant="headingMd">Upgrade to Suite</Text>
          <Text>
            Get ThunderText + ACE + Zeus Analytics for $99/month
            <br />
            <Text variant="bodySm" tone="success">Save $18/month</Text>
          </Text>
          <Button primary onClick={() => handleUpgrade('suite')}>
            Upgrade to Suite
          </Button>
        </Card>
      )}

      <Card>
        <Text variant="headingMd">Try ACE - Ad Creation Engine</Text>
        <Text>Generate high-performing Facebook ads with AI</Text>
        <Button onClick={() => handleUpgrade('ace')}>
          Start 7-Day Free Trial
        </Button>
      </Card>
    </Page>
  );
}
```

---

## Testing & Validation

### **Test Plan**

```typescript
// tests/shopify-subscriptions.test.ts

describe("Shopify Subscription Integration", () => {
  test("Create ThunderText subscription", async () => {
    const shop = "test-shop.myshopify.com";

    const result = await createShopifySubscription(shop, "thundertext");

    expect(result.confirmationUrl).toContain("shopify.com");
    expect(result.subscriptionId).toBeDefined();
  });

  test("JWT includes correct apps for ThunderText subscription", async () => {
    const shop = "test-shop.myshopify.com";

    // Mock Shopify subscription response
    mockShopifyAPI({
      activeSubscriptions: [
        {
          name: "THUNDERTEXT_BASIC",
          status: "ACTIVE",
        },
      ],
    });

    const token = await createJWTForShop(shop);
    const decoded = jwt.decode(token);

    expect(decoded.apps).toEqual(["thundertext"]);
    expect(decoded.apps).not.toContain("ace");
  });

  test("JWT includes all apps for Suite subscription", async () => {
    const shop = "test-shop.myshopify.com";

    mockShopifyAPI({
      activeSubscriptions: [
        {
          name: "SUITE_BUNDLE",
          status: "ACTIVE",
        },
      ],
    });

    const token = await createJWTForShop(shop);
    const decoded = jwt.decode(token);

    expect(decoded.apps).toEqual(["thundertext", "ace", "zeus"]);
  });

  test("API rejects request without active subscription", async () => {
    const shop = "test-shop.myshopify.com";

    mockShopifyAPI({
      activeSubscriptions: [], // No active subscription
    });

    await expect(createJWTForShop(shop)).rejects.toThrow(
      "No active subscription found",
    );
  });
});
```

### **Manual Testing Checklist**

- [ ] Install ThunderText app on test store
- [ ] Create ThunderText subscription ($29/month)
- [ ] Verify 7-day trial starts
- [ ] Access ThunderText features (should work)
- [ ] Try to access ACE API (should get 403 Forbidden)
- [ ] Upgrade to Suite subscription ($99/month)
- [ ] Verify both ThunderText and ACE accessible
- [ ] Cancel subscription in Shopify admin
- [ ] Verify JWT no longer grants access
- [ ] Test subscription sync job runs every hour

---

## Migration Strategy

### **Existing Customers**

If you have existing paying customers, grandfather them in:

```typescript
// Migration script: grandfather-existing-customers.ts

const existingCustomers = await supabaseAdmin
  .from("shops")
  .select("*")
  .eq("is_active", true);

for (const shop of existingCustomers) {
  // Grant suite subscription to all existing customers (free forever)
  await createShopifySubscription(shop.shop_domain, "suite");

  console.log(`✅ Grandfathered ${shop.shop_domain} with Suite access`);
}
```

### **New Customers**

New installs require subscription:

```typescript
// packages/shared-backend/api/auth/callback/route.ts

export async function GET(request: NextRequest) {
  const { shop, code } = request.nextUrl.searchParams;

  // Complete Shopify OAuth
  await completeShopifyOAuth(shop, code);

  // Check if subscription exists
  const subscription = await getActiveSubscription(shop);

  if (!subscription) {
    // Redirect to subscription selection page
    return NextResponse.redirect(`/choose-plan?shop=${shop}`);
  }

  // Has subscription → redirect to dashboard
  return NextResponse.redirect("/dashboard");
}
```

---

## Benefits of Shopify Subscriptions vs. Stripe

| Feature               | Shopify                  | Stripe                                 |
| --------------------- | ------------------------ | -------------------------------------- |
| **Setup Complexity**  | ✅ Simple (GraphQL API)  | ❌ Complex (webhooks, customer portal) |
| **PCI Compliance**    | ✅ Shopify handles       | ❌ Your responsibility                 |
| **Payment Methods**   | ✅ All Shopify-supported | ⚠️ Must configure each                 |
| **Trial Management**  | ✅ Built-in              | ❌ Custom logic required               |
| **Merchant Fees**     | ⚠️ Shopify takes 20%     | ✅ Stripe 2.9% + $0.30                 |
| **Shopify App Store** | ✅ Required for listing  | ❌ Not allowed                         |
| **Cancellation Flow** | ✅ Shopify admin         | ❌ Custom portal                       |

**Recommendation**: Use Shopify subscriptions - simpler, less code, required for App Store listing.

---

## Updated Timeline

**Phase 4: Shopify Subscriptions** (3-4 days, down from 1 week)

- Day 1: Define subscription plans, implement GraphQL mutations
- Day 2: Build subscription callback handler, JWT integration
- Day 3: Create subscription sync job, database schema
- Day 4: Testing, UI for subscription management

**Total Project Timeline**: 6-7 weeks (reduced from 8 weeks)

---

## Next Steps

1. Review Shopify Billing API documentation: https://shopify.dev/docs/apps/billing
2. Set up test subscriptions in Shopify Partner Dashboard
3. Test subscription flow in development store
4. Begin Phase 4 implementation with Shopify subscriptions
