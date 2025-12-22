/**
 * Content Center Authentication Utilities
 *
 * SECURITY HARDENED:
 * - Replaced shop-as-token pattern with proper Shopify session token validation
 * - Session tokens are JWT signed by Shopify and verified cryptographically
 * - Supports API key authentication for server-to-server calls
 *
 * Authentication methods (in priority order):
 * 1. Shopify Session Token (JWT in Authorization header) - for embedded app requests
 * 2. API Key (X-API-Key header) - for server-to-server calls
 */

import { NextRequest } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { logger } from "@/lib/logger";
import {
  validateApiKey as validateApiKeyCore,
  logApiKeyUsage,
  hasScope,
  ApiKeyScope,
} from "@/lib/security/api-keys";
import { createHmac, timingSafeEqual } from "crypto";

/**
 * Authentication result
 */
export interface AuthResult {
  authenticated: boolean;
  userId?: string;
  shopDomain?: string;
  error?: string;
  authMethod?: "session_token" | "api_key";
}

/**
 * SECURITY [R-A2041]: Safe Bearer token extraction
 *
 * Uses substring(7) instead of .replace('Bearer ', '') because:
 * - Single replacement only affects first occurrence
 * - Malformed header "Bearer Bearer token" would become "Bearer token" (still has prefix!)
 * - This pattern is INTENTIONALLY safe because startsWith() validates the prefix first
 *
 * DEFENSE-IN-DEPTH:
 * - startsWith() ensures prefix exists before extraction
 * - substring() extracts everything after the 7-character prefix
 * - Combined, these prevent Bearer prefix bypass attacks
 *
 * @param authHeader - Authorization header value
 * @returns Token without Bearer prefix, or null if invalid
 */
export function extractBearerToken(authHeader: string | null): string | null {
  if (!authHeader?.startsWith("Bearer ")) {
    return null;
  }
  // SECURITY: substring(7) is safe because we validated the prefix with startsWith()
  return authHeader.substring(7);
}

/**
 * Shopify Session Token JWT Payload
 */
interface ShopifySessionTokenPayload {
  iss: string; // Issuer: https://{shop}.myshopify.com/admin
  dest: string; // Destination: https://{shop}.myshopify.com
  aud: string; // Audience: App's client ID
  sub: string; // Subject: User ID
  exp: number; // Expiration timestamp
  nbf: number; // Not before timestamp
  iat: number; // Issued at timestamp
  jti: string; // JWT ID (unique identifier)
  sid: string; // Session ID
}

/**
 * Parse a JWT without verification (for extracting claims)
 */
function parseJWT(token: string): ShopifySessionTokenPayload | null {
  try {
    const [, payload] = token.split(".");
    if (!payload) return null;
    return JSON.parse(Buffer.from(payload, "base64").toString()) as ShopifySessionTokenPayload;
  } catch {
    return null;
  }
}

/**
 * Extract shop domain from JWT dest claim
 * SECURITY [R-A2041]: Uses URL API for safe hostname extraction
 */
function extractShopFromJWT(payload: ShopifySessionTokenPayload): string | null {
  try {
    const url = new URL(payload.dest);
    return url.hostname;
  } catch {
    return null;
  }
}

/**
 * Verify Shopify session token signature using HMAC-SHA256
 * SECURITY: Uses timing-safe comparison to prevent timing attacks
 */
function verifySessionTokenSignature(token: string): boolean {
  const clientSecret = process.env.SHOPIFY_API_SECRET;

  if (!clientSecret) {
    logger.error("SHOPIFY_API_SECRET not configured", undefined, {
      component: "content-center-auth",
    });
    return false;
  }

  try {
    const [header, payload, signature] = token.split(".");

    if (!header || !payload || !signature) {
      return false;
    }

    // Create the signing input (header.payload)
    const signingInput = `${header}.${payload}`;

    // Create HMAC-SHA256 signature
    const hmac = createHmac("sha256", clientSecret);
    hmac.update(signingInput);
    const expectedSignature = hmac.digest("base64url");

    // Timing-safe comparison
    try {
      const expectedBuffer = Buffer.from(expectedSignature, "utf8");
      const receivedBuffer = Buffer.from(signature, "utf8");

      if (expectedBuffer.length !== receivedBuffer.length) {
        return false;
      }

      return timingSafeEqual(expectedBuffer, receivedBuffer);
    } catch {
      return false;
    }
  } catch {
    return false;
  }
}

/**
 * Validate a Shopify session token
 * Returns shop domain if valid, null if invalid
 */
function validateShopifySessionToken(token: string): string | null {
  // Parse the JWT
  const payload = parseJWT(token);
  if (!payload) {
    logger.debug("Failed to parse session token JWT", {
      component: "content-center-auth",
    });
    return null;
  }

  // Verify required fields
  if (!payload.iss || !payload.dest || !payload.aud || !payload.exp) {
    logger.debug("Session token missing required fields", {
      component: "content-center-auth",
    });
    return null;
  }

  // Verify the audience matches our app's client ID
  const expectedClientId =
    process.env.NEXT_PUBLIC_SHOPIFY_API_KEY || process.env.SHOPIFY_API_KEY;
  if (expectedClientId && payload.aud !== expectedClientId) {
    logger.debug("Session token audience mismatch", {
      component: "content-center-auth",
      expected: expectedClientId,
      received: payload.aud,
    });
    return null;
  }

  // Check not before
  const now = Math.floor(Date.now() / 1000);
  if (payload.nbf && payload.nbf > now) {
    logger.debug("Session token not yet valid", {
      component: "content-center-auth",
    });
    return null;
  }

  // Check expiration
  if (payload.exp < now) {
    logger.debug("Session token expired", {
      component: "content-center-auth",
    });
    return null;
  }

  // Verify signature
  if (!verifySessionTokenSignature(token)) {
    logger.warn("Session token signature verification failed", {
      component: "content-center-auth",
    });
    return null;
  }

  // Extract shop from dest claim
  const shop = extractShopFromJWT(payload);
  if (!shop) {
    logger.debug("Could not extract shop from session token", {
      component: "content-center-auth",
    });
    return null;
  }

  return shop;
}

/**
 * Authenticate request using Shopify session token or API key
 *
 * Priority:
 * 1. Shopify Session Token in Authorization header (for embedded app)
 * 2. API Key in X-API-Key header (for server-to-server)
 *
 * @param request - Next.js request object
 * @returns Authentication result with shop domain as user ID if successful
 */
export async function authenticateRequest(
  request: NextRequest,
): Promise<AuthResult> {
  try {
    // 1. Try Shopify Session Token (Authorization: Bearer <jwt>)
    const authHeader = request.headers.get("authorization");
    const bearerToken = extractBearerToken(authHeader);

    if (bearerToken) {
      // Check if it looks like a JWT (three parts separated by dots)
      if (bearerToken.split(".").length === 3) {
        const shopDomain = validateShopifySessionToken(bearerToken);

        if (shopDomain) {
          // Verify shop exists in database
          const { data: shopData, error } = await supabaseAdmin
            .from("shops")
            .select("id, shop_domain")
            .eq("shop_domain", shopDomain)
            .eq("is_active", true)
            .single();

          if (error || !shopData) {
            logger.warn("Shop not found or inactive", {
              component: "content-center-auth",
              shopDomain,
            });
            return {
              authenticated: false,
              error: "Shop not found. Please install the app first.",
            };
          }

          // Set user context for error tracking
          logger.setUser(shopData.id, {
            shop: shopData.shop_domain,
          });

          return {
            authenticated: true,
            userId: shopData.id,
            shopDomain: shopData.shop_domain,
            authMethod: "session_token",
          };
        }
      }

      // Not a valid JWT - don't accept raw shop domains
      logger.warn("Invalid authorization token format", {
        component: "content-center-auth",
      });
      return {
        authenticated: false,
        error: "Invalid authorization token. Expected Shopify session token (JWT).",
      };
    }

    // 2. Try API Key authentication (X-API-Key header)
    const apiKeyResult = await validateApiKeyWithDetails(request);
    if (apiKeyResult.authenticated && apiKeyResult.shopId) {
      return {
        authenticated: true,
        userId: apiKeyResult.shopId,
        authMethod: "api_key",
      };
    }

    // 3. Check X-Shopify-Shop-Domain header (for embedded app iframe context)
    // This is only valid when combined with session token validation done by middleware
    const shopHeader = request.headers.get("x-shopify-shop-domain");
    const sessionTokenHeader = request.headers.get("x-shopify-session-token");

    if (shopHeader && sessionTokenHeader) {
      const shopDomain = validateShopifySessionToken(sessionTokenHeader);
      if (shopDomain && shopDomain === shopHeader) {
        // Verify shop exists in database
        const { data: shopData, error } = await supabaseAdmin
          .from("shops")
          .select("id, shop_domain")
          .eq("shop_domain", shopDomain)
          .eq("is_active", true)
          .single();

        if (!error && shopData) {
          logger.setUser(shopData.id, {
            shop: shopData.shop_domain,
          });

          return {
            authenticated: true,
            userId: shopData.id,
            shopDomain: shopData.shop_domain,
            authMethod: "session_token",
          };
        }
      }
    }

    return {
      authenticated: false,
      error:
        "Authentication required. Provide Authorization header with Shopify session token or X-API-Key header.",
    };
  } catch (error) {
    logger.error("Authentication error:", error as Error, {
      component: "content-center-auth",
    });
    return {
      authenticated: false,
      error: "Authentication failed",
    };
  }
}

/**
 * Simplified authentication helper that returns user ID or null
 *
 * @param request - Next.js request object
 * @returns User ID if authenticated, null otherwise
 */
export async function getUserId(request: NextRequest): Promise<string | null> {
  const result = await authenticateRequest(request);
  return result.authenticated ? result.userId! : null;
}

/**
 * Check if a user has access to a specific resource
 * This is a placeholder for future role-based access control (RBAC)
 *
 * @param userId - User ID to check
 * @param resourceType - Type of resource (sample, profile, content, template)
 * @param resourceId - ID of the resource
 * @returns True if user has access, false otherwise
 */
export async function hasResourceAccess(
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  userId: string,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  resourceType: "sample" | "profile" | "content" | "template",
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  resourceId: string,
): Promise<boolean> {
  // For now, RLS policies handle access control at database level
  // This function is a placeholder for future enhancements like:
  // - Team collaboration features
  // - Shared voice profiles
  // - Admin access to all resources

  // Currently, all access control is handled by RLS policies
  // which ensure users can only access their own resources
  return true;
}

/**
 * API key authentication result with extended info
 */
export interface ApiKeyAuthResult {
  authenticated: boolean;
  shopId?: string;
  keyId?: string;
  scopes?: ApiKeyScope[];
  error?: string;
}

/**
 * Validate API key for server-to-server requests
 *
 * Supports:
 * - Webhook callbacks
 * - Third-party integrations
 * - Automated content generation
 *
 * @param request - Next.js request object
 * @returns True if valid API key, false otherwise
 */
export async function validateApiKey(request: NextRequest): Promise<boolean> {
  const result = await validateApiKeyWithDetails(request);
  return result.authenticated;
}

/**
 * Validate API key with full details
 * Returns shop ID, scopes, and other metadata for authorization checks
 *
 * @param request - Next.js request object
 * @returns Full authentication result with shop and scope info
 */
export async function validateApiKeyWithDetails(
  request: NextRequest,
): Promise<ApiKeyAuthResult> {
  const apiKey = request.headers.get("x-api-key");

  if (!apiKey) {
    return {
      authenticated: false,
      error: "Missing API key. Provide X-API-Key header.",
    };
  }

  const validationResult = await validateApiKeyCore(apiKey);

  if (!validationResult.valid) {
    logger.warn("API key validation failed", {
      component: "content-center-auth",
      error: validationResult.error,
    });
    return {
      authenticated: false,
      error: validationResult.error || "Invalid API key",
    };
  }

  // SECURITY: Set user context for Sentry error tracking
  if (validationResult.shopId) {
    logger.setUser(validationResult.shopId, {
      shop: `api-key:${validationResult.keyId}`,
    });
  }

  return {
    authenticated: true,
    shopId: validationResult.shopId,
    keyId: validationResult.keyId,
    scopes: validationResult.scopes,
  };
}

/**
 * Validate API key and check for required scope
 * Use this for endpoints that need specific permissions
 *
 * @param request - Next.js request object
 * @param requiredScope - The scope required for this operation
 * @returns Authentication result with scope check
 */
export async function validateApiKeyWithScope(
  request: NextRequest,
  requiredScope: ApiKeyScope,
): Promise<ApiKeyAuthResult> {
  const result = await validateApiKeyWithDetails(request);

  if (!result.authenticated) {
    return result;
  }

  if (!result.scopes || !hasScope(result.scopes, requiredScope)) {
    logger.warn("API key missing required scope", {
      component: "content-center-auth",
      keyId: result.keyId,
      requiredScope,
      availableScopes: result.scopes,
    });
    return {
      authenticated: false,
      error: `Insufficient permissions. Required scope: ${requiredScope}`,
    };
  }

  return result;
}

/**
 * Log API usage for monitoring and rate limiting
 * Call this after successful API operations
 *
 * @param keyId - API key ID from validation result
 * @param request - Next.js request object
 * @param statusCode - HTTP response status code
 * @param responseTimeMs - Response time in milliseconds
 * @param errorMessage - Optional error message if request failed
 */
export async function logApiUsage(
  keyId: string,
  request: NextRequest,
  statusCode: number,
  responseTimeMs: number,
  errorMessage?: string,
): Promise<void> {
  const url = new URL(request.url);
  await logApiKeyUsage(
    keyId,
    url.pathname,
    request.method,
    statusCode,
    responseTimeMs,
    {
      ipAddress:
        request.headers.get("x-forwarded-for") ||
        request.headers.get("x-real-ip") ||
        undefined,
      userAgent: request.headers.get("user-agent") || undefined,
      errorMessage,
    },
  );
}

// Re-export types and utilities for convenience
export type { ApiKeyScope } from "@/lib/security/api-keys";
export { hasScope } from "@/lib/security/api-keys";
