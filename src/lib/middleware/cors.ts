/**
 * CORS middleware for Shopify embedded app
 * Restricts API access to authorized Shopify domains only
 */

import { logger } from "@/lib/logger";

export function createCorsHeaders(request: Request): HeadersInit {
  const origin = request.headers.get("origin") || "";

  // Define allowed origins for Shopify embedded apps
  const allowedOrigins = [
    // Shopify admin domains
    /^https:\/\/[a-zA-Z0-9][a-zA-Z0-9-]*\.myshopify\.com$/,
    /^https:\/\/admin\.shopify\.com$/,
    /^https:\/\/[a-zA-Z0-9][a-zA-Z0-9-]*\.spin\.dev$/, // Shopify development stores
    /^https:\/\/[a-zA-Z0-9][a-zA-Z0-9-]*\.shopifypreview\.com$/, // Shopify preview stores
    // Our app domains (Render deployment)
    "https://thunder-text.onrender.com",
    "https://app.zunosai.com",
    process.env.NEXT_PUBLIC_APP_URL ? process.env.NEXT_PUBLIC_APP_URL : null,
    process.env.RENDER_EXTERNAL_URL ? process.env.RENDER_EXTERNAL_URL : null,
    // Development (allow localhost on any port and ngrok tunnels)
    process.env.NODE_ENV === "development" ? "http://localhost:3000" : null,
    process.env.NODE_ENV === "development" ? "http://localhost:3050" : null,
    process.env.NODE_ENV === "development"
      ? /^https:\/\/[a-zA-Z0-9-]+\.ngrok\.io$/
      : null,
    process.env.NODE_ENV === "development"
      ? /^https:\/\/[a-zA-Z0-9-]+\.ngrok-free\.app$/
      : null,
    process.env.NODE_ENV === "development"
      ? /^https:\/\/[a-zA-Z0-9-]+\.ngrok\.app$/
      : null,
  ].filter(Boolean);

  // Check if origin is allowed
  const isAllowed = allowedOrigins.some((pattern) => {
    if (pattern instanceof RegExp) {
      return pattern.test(origin);
    }
    return pattern === origin;
  });

  // Log for debugging
  logger.debug("CORS check", { component: "cors", origin, isAllowed });

  // For embedded Shopify apps, sometimes origin is not sent
  // Check referer header as fallback
  const referer = request.headers.get("referer") || "";
  const isShopifyReferer =
    referer.includes(".myshopify.com") ||
    referer.includes("admin.shopify.com") ||
    referer.includes("thunder-text") ||
    referer.includes(".spin.dev");

  if (!isAllowed && origin) {
    // Return restrictive headers for unauthorized origins
    logger.warn("CORS violation attempt", { component: "cors", origin });
    return {
      "Access-Control-Allow-Origin": "null",
      "Access-Control-Allow-Methods": "OPTIONS",
      "Access-Control-Max-Age": "0",
    };
  }

  // If no origin but valid Shopify referer, extract and validate referer origin
  if (!origin && isShopifyReferer) {
    try {
      const refererUrl = new URL(referer);
      const refererOrigin = refererUrl.origin;

      // Validate referer origin against allowed patterns
      const refererAllowed = allowedOrigins.some((pattern) => {
        if (pattern instanceof RegExp) {
          return pattern.test(refererOrigin);
        }
        return pattern === refererOrigin;
      });

      if (refererAllowed) {
        return {
          "Access-Control-Allow-Origin": refererOrigin,
          "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
          "Access-Control-Allow-Headers":
            "Content-Type, Authorization, X-Requested-With",
          "Access-Control-Allow-Credentials": "true",
          "Access-Control-Max-Age": "86400",
        };
      }
    } catch {
      logger.warn("Invalid referer URL", { component: "cors", referer });
    }

    // If referer parsing failed or not allowed, deny
    return {
      "Access-Control-Allow-Origin": "null",
      "Access-Control-Allow-Methods": "OPTIONS",
      "Access-Control-Max-Age": "0",
    };
  }

  // Return headers for allowed origins only
  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
    "Access-Control-Allow-Headers":
      "Content-Type, Authorization, X-Requested-With",
    "Access-Control-Allow-Credentials": "true",
    "Access-Control-Max-Age": "86400", // 24 hours
  };
}

/**
 * Handle preflight OPTIONS requests
 */
export function handleCorsPreflightRequest(request: Request): Response {
  const headers = createCorsHeaders(request);

  return new Response(null, {
    status: 204,
    headers,
  });
}

/**
 * Apply CORS headers to a response
 */
export function applyCorsHeaders(
  response: Response,
  request: Request,
): Response {
  const corsHeaders = createCorsHeaders(request);

  // Clone response and add CORS headers
  const newHeaders = new Headers(response.headers);
  Object.entries(corsHeaders).forEach(([key, value]) => {
    if (value) newHeaders.set(key, value as string);
  });

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers: newHeaders,
  });
}
