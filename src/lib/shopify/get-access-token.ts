import { logger } from "@/lib/logger";

/**
 * Centralized function to get Shopify access token
 * This ensures consistent token retrieval across all API routes
 *
 * SECURITY: Access tokens must NEVER use NEXT_PUBLIC_ prefix as that
 * exposes them to the client bundle. Only server-side env vars are used.
 */
export function getShopifyAccessToken(): string | undefined {
  // SECURITY FIX: Use server-only env var (not NEXT_PUBLIC_)
  // The NEXT_PUBLIC_ prefix would expose the token to the client bundle
  const encodedToken = process.env.SHOPIFY_TOKEN_B64;

  if (encodedToken) {
    try {
      const decodedToken = Buffer.from(encodedToken, "base64").toString(
        "utf-8",
      );
      return decodedToken;
    } catch (error) {
      logger.error("❌ Failed to decode token:", error as Error, {
        component: "get-access-token",
      });
    }
  }

  // Check environment variable (Vercel deployment)
  const envToken = process.env.SHOPIFY_ACCESS_TOKEN;

  if (envToken && envToken !== "") {
    return envToken;
  }

  logger.warn("No Shopify access token found in environment", {
    component: "get-access-token",
  });

  return undefined;
}

/**
 * Check if we have a valid Shopify access token
 */
export function hasValidShopifyToken(): boolean {
  const token = getShopifyAccessToken();
  return !!token && token.length > 20;
}
