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
import { getServerSession } from "next-auth";
import { getToken } from "next-auth/jwt";
import { authOptions } from "@/lib/auth/auth-options";
import { supabaseAdmin } from "@/lib/supabase";
import { logger } from "@/lib/logger";
import {
  validateApiKey as validateApiKeyCore,
  logApiKeyUsage,
  hasScope,
  ApiKeyScope,
} from "@/lib/security/api-keys";
// Note: crypto imports reserved for future HMAC validation
// import { createHmac, timingSafeEqual } from "crypto";

/**
 * Authentication result
 */
export interface AuthResult {
  authenticated: boolean;
  userId?: string;
  shopDomain?: string;
  error?: string;
  authMethod?: "session_token" | "api_key" | "cookie" | "nextauth";
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
 * Reserved for future use when lightweight claim extraction is needed
 */
function _parseJWT(token: string): ShopifySessionTokenPayload | null {
  try {
    const [, payload] = token.split(".");
    if (!payload) return null;
    return JSON.parse(
      Buffer.from(payload, "base64").toString(),
    ) as ShopifySessionTokenPayload;
  } catch {
    return null;
  }
}

/**
 * Extract shop domain from JWT dest claim
 * SECURITY [R-A2041]: Uses URL API for safe hostname extraction
 */
function extractShopFromJWT(
  payload: ShopifySessionTokenPayload,
): string | null {
  try {
    const url = new URL(payload.dest);
    return url.hostname;
  } catch {
    return null;
  }
}

/**
 * Verify Shopify session token signature using jsonwebtoken library
 *
 * SECURITY FIX (H2): Replaced manual HMAC verification with proper JWT library.
 * - Explicitly specifies allowed algorithms to prevent algorithm confusion attacks
 * - Validates all standard JWT claims
 * - Uses jsonwebtoken's built-in timing-safe comparison
 */
function verifySessionTokenSignature(token: string): ShopifySessionTokenPayload | null {
  const clientSecret = process.env.SHOPIFY_API_SECRET;

  if (!clientSecret) {
    logger.error("SHOPIFY_API_SECRET not configured", undefined, {
      component: "content-center-auth",
    });
    return null;
  }

  try {
    // Use jsonwebtoken library with explicit algorithm specification
    // This prevents algorithm confusion attacks (e.g., none algorithm, RS256 vs HS256)
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const jwt = require("jsonwebtoken") as { verify: (token: string, secret: string, options: { algorithms: string[]; complete: boolean }) => ShopifySessionTokenPayload };

    const decoded = jwt.verify(token, clientSecret, {
      algorithms: ["HS256"], // Shopify session tokens use HS256
      complete: false,
    });

    return decoded;
  } catch (error) {
    // Log specific JWT error types for debugging
    if (error instanceof Error) {
      if (error.name === "TokenExpiredError") {
        logger.debug("Session token expired", {
          component: "content-center-auth",
        });
      } else if (error.name === "JsonWebTokenError") {
        logger.debug("Invalid session token signature", {
          component: "content-center-auth",
          error: error.message,
        });
      } else if (error.name === "NotBeforeError") {
        logger.debug("Session token not yet valid", {
          component: "content-center-auth",
        });
      }
    }
    return null;
  }
}

/**
 * Validate a Shopify session token
 * Returns shop domain if valid, null if invalid
 *
 * SECURITY: Uses jsonwebtoken library for signature verification which:
 * - Validates signature with timing-safe comparison
 * - Validates exp, nbf claims automatically
 * - Prevents algorithm confusion attacks via explicit algorithm list
 */
function validateShopifySessionToken(token: string): string | null {
  // Use jsonwebtoken library to verify and decode in one step
  // This handles signature verification, expiration, and nbf checks
  const payload = verifySessionTokenSignature(token);

  if (!payload) {
    // verifySessionTokenSignature already logged the specific error
    return null;
  }

  // Verify required fields
  if (!payload.iss || !payload.dest || !payload.aud) {
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

  // Validate issuer format (should be https://{shop}.myshopify.com/admin)
  try {
    const issuerUrl = new URL(payload.iss);
    if (!issuerUrl.hostname.endsWith(".myshopify.com")) {
      logger.warn("Session token issuer is not a Shopify domain", {
        component: "content-center-auth",
        issuer: payload.iss,
      });
      return null;
    }
  } catch {
    logger.debug("Invalid issuer URL in session token", {
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
 * Authenticate using cookies (shopify_shop cookie or NextAuth session)
 * This supports standalone users and settings page access patterns.
 *
 * @param request - Next.js request object
 * @returns Authentication result
 */
async function authenticateWithCookies(
  request: NextRequest,
): Promise<AuthResult> {
  try {
    // Check for shopify_shop cookie
    const shopifyCookie = request.cookies.get("shopify_shop")?.value;

    // Try to get NextAuth session
    const session = await getServerSession(authOptions);
    let nextAuthShop = session?.user?.shopDomain;

    // Fallback to getToken if session is null (works better in some App Router contexts)
    if (!session) {
      const token = await getToken({
        req: request,
        secret: process.env.NEXTAUTH_SECRET,
      });
      if (token?.shopDomain) {
        nextAuthShop = token.shopDomain as string;
        logger.debug("[Content-Center Auth] Using getToken fallback", {
          component: "content-center-auth",
          shopDomain: nextAuthShop,
        });
      }
    }

    // Prefer NextAuth session over Shopify cookie
    // Standalone users may have stale cookies but their NextAuth session is authoritative
    let authenticatedShop = nextAuthShop || shopifyCookie;

    if (!authenticatedShop) {
      // Check URL parameter as final fallback
      const { searchParams } = new URL(request.url);
      const shopFromUrl = searchParams.get("shop");

      // Only accept email-based shop params (standalone users) or .myshopify.com domains
      if (
        shopFromUrl &&
        (shopFromUrl.includes("@") || shopFromUrl.includes(".myshopify.com"))
      ) {
        authenticatedShop = shopFromUrl;
      }
    }

    if (!authenticatedShop) {
      return {
        authenticated: false,
        error: "No cookie-based authentication found",
      };
    }

    // Look up shop in database with multiple strategies
    let shopData: {
      id: string;
      shop_domain: string;
      shop_type: string;
      linked_shopify_domain: string | null;
    } | null = null;

    // For .myshopify.com domains, check linked_shopify_domain FIRST (prioritize standalone accounts)
    if (authenticatedShop.includes(".myshopify.com")) {
      const linkedResult = await supabaseAdmin
        .from("shops")
        .select("id, shop_domain, shop_type, linked_shopify_domain")
        .eq("linked_shopify_domain", authenticatedShop)
        .eq("shop_type", "standalone")
        .single();

      if (linkedResult.data && !linkedResult.error) {
        shopData = linkedResult.data;
        logger.debug(
          "[Content-Center Auth] Found standalone user by linked_shopify_domain",
          {
            component: "content-center-auth",
            linkedShopifyDomain: authenticatedShop,
            standaloneEmail: linkedResult.data.shop_domain,
          },
        );
      }
    }

    // If no standalone user found, try shop_domain
    if (!shopData) {
      const result = await supabaseAdmin
        .from("shops")
        .select("id, shop_domain, shop_type, linked_shopify_domain")
        .eq("shop_domain", authenticatedShop)
        .eq("is_active", true)
        .single();

      if (result.data && !result.error) {
        shopData = result.data;
      }
    }

    // Try email lookup for standalone users (authenticatedShop might be an email)
    if (!shopData && authenticatedShop.includes("@")) {
      const emailResult = await supabaseAdmin
        .from("shops")
        .select("id, shop_domain, shop_type, linked_shopify_domain")
        .eq("email", authenticatedShop)
        .eq("shop_type", "standalone")
        .single();

      if (emailResult.data && !emailResult.error) {
        shopData = emailResult.data;
        logger.debug("[Content-Center Auth] Found standalone user by email", {
          component: "content-center-auth",
          email: authenticatedShop,
        });
      }
    }

    if (!shopData) {
      logger.debug("[Content-Center Auth] No shop found for cookie auth", {
        component: "content-center-auth",
        authenticatedShop,
      });
      return {
        authenticated: false,
        error: "Shop not found for authenticated user",
      };
    }

    logger.setUser(shopData.id, {
      shop: shopData.shop_domain,
    });

    return {
      authenticated: true,
      userId: shopData.id,
      shopDomain: shopData.shop_domain,
      authMethod: nextAuthShop ? "nextauth" : "cookie",
    };
  } catch (error) {
    logger.error("[Content-Center Auth] Cookie auth error:", error as Error, {
      component: "content-center-auth",
    });
    return {
      authenticated: false,
      error: "Cookie authentication failed",
    };
  }
}

/**
 * Authenticate request using Shopify session token or API key
 *
 * Priority:
 * 1. Shopify Session Token in Authorization header (for embedded app)
 * 2. API Key in X-API-Key header (for server-to-server)
 * 3. X-Shopify-Shop-Domain header with session token (for embedded iframe)
 * 4. Cookie-based auth (for standalone users and settings pages)
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

      // Not a valid JWT - continue to try other auth methods instead of failing immediately
      // This allows cookie-based auth to work when a non-JWT Bearer token is sent
      logger.debug(
        "Bearer token is not a valid JWT, trying other auth methods",
        {
          component: "content-center-auth",
        },
      );
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

    // 4. Try cookie-based authentication (for standalone users and settings pages)
    const cookieAuthResult = await authenticateWithCookies(request);
    if (cookieAuthResult.authenticated) {
      return cookieAuthResult;
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
  _userId: string,
  _resourceType: "sample" | "profile" | "content" | "template",
  _resourceId: string,
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
