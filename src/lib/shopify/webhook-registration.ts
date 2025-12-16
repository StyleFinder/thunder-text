/**
 * Shopify Webhook Registration
 *
 * Registers required webhooks with Shopify using the GraphQL Admin API.
 * Called during app installation to set up:
 * - APP_SUBSCRIPTIONS_UPDATE - For billing status changes
 * - APP_UNINSTALLED - For cleanup when app is removed
 * - SHOP_UPDATE - For shop data changes
 */

import { logger } from "@/lib/logger";

/**
 * Required webhook topics for Thunder Text
 */
export const REQUIRED_WEBHOOKS = [
  {
    topic: "APP_SUBSCRIPTIONS_UPDATE",
    path: "/api/webhooks/app-subscriptions-update",
  },
  {
    topic: "APP_UNINSTALLED",
    path: "/api/webhooks/app-uninstalled",
  },
  {
    topic: "SHOP_UPDATE",
    path: "/api/webhooks/shop-update",
  },
  {
    topic: "CUSTOMERS_DATA_REQUEST",
    path: "/api/webhooks/customers/data-request",
  },
  {
    topic: "CUSTOMERS_REDACT",
    path: "/api/webhooks/customers/redact",
  },
  {
    topic: "SHOP_REDACT",
    path: "/api/webhooks/shop/redact",
  },
] as const;

/**
 * GraphQL mutation to create a webhook subscription
 */
const WEBHOOK_SUBSCRIPTION_CREATE = `
  mutation webhookSubscriptionCreate($topic: WebhookSubscriptionTopic!, $webhookSubscription: WebhookSubscriptionInput!) {
    webhookSubscriptionCreate(topic: $topic, webhookSubscription: $webhookSubscription) {
      webhookSubscription {
        id
        topic
        endpoint {
          __typename
          ... on WebhookHttpEndpoint {
            callbackUrl
          }
        }
      }
      userErrors {
        field
        message
      }
    }
  }
`;

/**
 * GraphQL query to list existing webhook subscriptions
 */
const WEBHOOK_SUBSCRIPTIONS_LIST = `
  query {
    webhookSubscriptions(first: 50) {
      edges {
        node {
          id
          topic
          endpoint {
            __typename
            ... on WebhookHttpEndpoint {
              callbackUrl
            }
          }
        }
      }
    }
  }
`;

/**
 * GraphQL mutation to delete a webhook subscription
 */
const WEBHOOK_SUBSCRIPTION_DELETE = `
  mutation webhookSubscriptionDelete($id: ID!) {
    webhookSubscriptionDelete(id: $id) {
      deletedWebhookSubscriptionId
      userErrors {
        field
        message
      }
    }
  }
`;

interface WebhookNode {
  id: string;
  topic: string;
  endpoint: {
    __typename: string;
    callbackUrl?: string;
  };
}

/**
 * Register all required webhooks for a shop
 *
 * @param shopDomain - The shop's Shopify domain
 * @param accessToken - The shop's access token
 * @returns Object with success status and any errors
 */
export async function registerWebhooks(
  shopDomain: string,
  accessToken: string
): Promise<{ success: boolean; errors: string[] }> {
  const errors: string[] = [];
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL;

  if (!baseUrl) {
    logger.error("NEXT_PUBLIC_APP_URL not configured", undefined, {
      component: "webhook-registration",
      shopDomain,
    });
    return {
      success: false,
      errors: ["App URL not configured"],
    };
  }

  // First, get existing webhooks to avoid duplicates
  let existingWebhooks: WebhookNode[] = [];
  try {
    const listResponse = await fetch(
      `https://${shopDomain}/admin/api/2024-01/graphql.json`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Shopify-Access-Token": accessToken,
        },
        body: JSON.stringify({ query: WEBHOOK_SUBSCRIPTIONS_LIST }),
      }
    );

    const listData = await listResponse.json();
    existingWebhooks =
      listData.data?.webhookSubscriptions?.edges?.map(
        (e: { node: WebhookNode }) => e.node
      ) || [];

    logger.info("Retrieved existing webhooks", {
      component: "webhook-registration",
      shopDomain,
      count: existingWebhooks.length,
    });
  } catch (error) {
    logger.error("Failed to list existing webhooks", error as Error, {
      component: "webhook-registration",
      shopDomain,
    });
  }

  // Register each required webhook
  for (const webhook of REQUIRED_WEBHOOKS) {
    const callbackUrl = `${baseUrl}${webhook.path}`;

    // Check if webhook already exists with correct URL
    const existing = existingWebhooks.find(
      (w) =>
        w.topic === webhook.topic &&
        w.endpoint.__typename === "WebhookHttpEndpoint" &&
        w.endpoint.callbackUrl === callbackUrl
    );

    if (existing) {
      logger.info("Webhook already registered", {
        component: "webhook-registration",
        shopDomain,
        topic: webhook.topic,
      });
      continue;
    }

    // Delete any existing webhooks for this topic with wrong URL
    const wrongUrls = existingWebhooks.filter(
      (w) =>
        w.topic === webhook.topic &&
        w.endpoint.__typename === "WebhookHttpEndpoint" &&
        w.endpoint.callbackUrl !== callbackUrl
    );

    for (const wrongWebhook of wrongUrls) {
      try {
        await fetch(`https://${shopDomain}/admin/api/2024-01/graphql.json`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-Shopify-Access-Token": accessToken,
          },
          body: JSON.stringify({
            query: WEBHOOK_SUBSCRIPTION_DELETE,
            variables: { id: wrongWebhook.id },
          }),
        });
        logger.info("Deleted old webhook with wrong URL", {
          component: "webhook-registration",
          shopDomain,
          topic: webhook.topic,
          oldUrl: wrongWebhook.endpoint.callbackUrl,
        });
      } catch (error) {
        logger.error("Failed to delete old webhook", error as Error, {
          component: "webhook-registration",
          shopDomain,
          topic: webhook.topic,
        });
      }
    }

    // Create the webhook
    try {
      const response = await fetch(
        `https://${shopDomain}/admin/api/2024-01/graphql.json`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-Shopify-Access-Token": accessToken,
          },
          body: JSON.stringify({
            query: WEBHOOK_SUBSCRIPTION_CREATE,
            variables: {
              topic: webhook.topic,
              webhookSubscription: {
                callbackUrl,
                format: "JSON",
              },
            },
          }),
        }
      );

      const data = await response.json();

      if (data.data?.webhookSubscriptionCreate?.userErrors?.length > 0) {
        const userErrors = data.data.webhookSubscriptionCreate.userErrors;
        const errorMsg = userErrors.map((e: { message: string }) => e.message).join(", ");
        errors.push(`${webhook.topic}: ${errorMsg}`);
        logger.error("Webhook registration user errors", undefined, {
          component: "webhook-registration",
          shopDomain,
          topic: webhook.topic,
          errors: userErrors,
        });
      } else if (data.data?.webhookSubscriptionCreate?.webhookSubscription) {
        logger.info("Webhook registered successfully", {
          component: "webhook-registration",
          shopDomain,
          topic: webhook.topic,
          webhookId: data.data.webhookSubscriptionCreate.webhookSubscription.id,
        });
      } else if (data.errors) {
        const errorMsg = data.errors.map((e: { message: string }) => e.message).join(", ");
        errors.push(`${webhook.topic}: ${errorMsg}`);
        logger.error("Webhook registration GraphQL errors", undefined, {
          component: "webhook-registration",
          shopDomain,
          topic: webhook.topic,
          errors: data.errors,
        });
      }
    } catch (error) {
      const errorMsg =
        error instanceof Error ? error.message : "Unknown error";
      errors.push(`${webhook.topic}: ${errorMsg}`);
      logger.error("Webhook registration failed", error as Error, {
        component: "webhook-registration",
        shopDomain,
        topic: webhook.topic,
      });
    }
  }

  return {
    success: errors.length === 0,
    errors,
  };
}

/**
 * Verify that all required webhooks are registered
 *
 * @param shopDomain - The shop's Shopify domain
 * @param accessToken - The shop's access token
 * @returns Object with verification results
 */
export async function verifyWebhooks(
  shopDomain: string,
  accessToken: string
): Promise<{
  allRegistered: boolean;
  registered: string[];
  missing: string[];
}> {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL;

  try {
    const response = await fetch(
      `https://${shopDomain}/admin/api/2024-01/graphql.json`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Shopify-Access-Token": accessToken,
        },
        body: JSON.stringify({ query: WEBHOOK_SUBSCRIPTIONS_LIST }),
      }
    );

    const data = await response.json();
    const existingWebhooks: WebhookNode[] =
      data.data?.webhookSubscriptions?.edges?.map(
        (e: { node: WebhookNode }) => e.node
      ) || [];

    const registered: string[] = [];
    const missing: string[] = [];

    for (const required of REQUIRED_WEBHOOKS) {
      const expectedUrl = `${baseUrl}${required.path}`;
      const exists = existingWebhooks.some(
        (w) =>
          w.topic === required.topic &&
          w.endpoint.__typename === "WebhookHttpEndpoint" &&
          w.endpoint.callbackUrl === expectedUrl
      );

      if (exists) {
        registered.push(required.topic);
      } else {
        missing.push(required.topic);
      }
    }

    return {
      allRegistered: missing.length === 0,
      registered,
      missing,
    };
  } catch (error) {
    logger.error("Failed to verify webhooks", error as Error, {
      component: "webhook-registration",
      shopDomain,
    });
    return {
      allRegistered: false,
      registered: [],
      missing: REQUIRED_WEBHOOKS.map((w) => w.topic),
    };
  }
}
