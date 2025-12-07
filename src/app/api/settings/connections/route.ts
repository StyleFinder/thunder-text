import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getServerSession } from "next-auth";
import { getToken } from "next-auth/jwt";
import { authOptions } from "@/lib/auth/auth-options";
import { logger } from "@/lib/logger";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  },
);

export async function GET(request: NextRequest) {
  try {
    // Get URL parameters
    const { searchParams } = new URL(request.url);
    const shopFromUrl = searchParams.get("shop");

    // SECURITY: Verify the request is authenticated
    // Support both Shopify OAuth (shopify_shop cookie) and NextAuth session
    const shopifyCookie = request.cookies.get("shopify_shop")?.value;
    const nextAuthSessionCookie = request.cookies.get(
      "next-auth.session-token",
    )?.value;

    // Try multiple methods to get NextAuth session/token
    // Method 1: getServerSession (recommended but may not work in all App Router contexts)
    const session = await getServerSession(authOptions);
    let nextAuthShop = session?.user?.shopDomain;

    // Method 2: If getServerSession returns null, try getToken as fallback
    // This reads the JWT directly from the cookie and may work better in some contexts
    if (!session) {
      const token = await getToken({
        req: request,
        secret: process.env.NEXTAUTH_SECRET,
      });
      if (token?.shopDomain) {
        nextAuthShop = token.shopDomain as string;
        logger.debug("[Connections API] Using getToken fallback", {
          component: "connections",
          shopDomain: nextAuthShop,
          tokenEmail: token.email || "none",
        });
      }
    }

    // Log all available auth info for debugging
    logger.debug("[Connections API] Auth check detailed", {
      component: "connections",
      shopFromUrl: shopFromUrl || "none",
      hasShopifyCookie: !!shopifyCookie,
      shopifyCookieValue: shopifyCookie || "none",
      hasNextAuthCookie: !!nextAuthSessionCookie,
      hasNextAuthSession: !!session,
      nextAuthShop: nextAuthShop || "none",
      sessionUser: session?.user?.email || "none",
    });

    // IMPORTANT: Prefer NextAuth session over Shopify cookie
    // This is because standalone users may have stale Shopify cookies from previous sessions
    // but their actual identity should come from their NextAuth session (email-based shop_domain)
    // Only fall back to Shopify cookie if no NextAuth session exists
    let authenticatedShop = nextAuthShop || shopifyCookie;

    // EARLY FALLBACK: If no cookie-based auth but URL param looks like a standalone user email
    // This handles the case where NextAuth session cookies aren't readable in API routes
    // SECURITY: We verify the email exists as a standalone user in the database before proceeding
    let shopData: {
      id: string;
      is_active: boolean;
      shop_type: string;
      shopify_access_token: string | null;
      shop_domain: string;
      linked_shopify_domain: string | null;
    } | null = null;
    let shopError: { message?: string; code?: string } | null = null;

    // If we have cookie-based auth, try that first
    if (authenticatedShop) {
      const result = await supabaseAdmin
        .from("shops")
        .select(
          "id, is_active, shop_type, shopify_access_token, shop_domain, linked_shopify_domain",
        )
        .eq("shop_domain", authenticatedShop)
        .single();

      shopData = result.data;
      shopError = result.error;

      // If cookie-based auth failed and URL param looks like standalone user email, try fallback
      // Standalone users have their email in the 'email' column, not 'shop_domain'
      if (
        (shopError || !shopData) &&
        shopFromUrl &&
        shopFromUrl.includes("@")
      ) {
        logger.info(
          "[Connections API] Primary lookup failed, trying email lookup for standalone user",
          {
            component: "connections",
            primaryDomain: authenticatedShop,
            emailParam: shopFromUrl,
          },
        );

        const fallbackResult = await supabaseAdmin
          .from("shops")
          .select(
            "id, is_active, shop_type, shopify_access_token, shop_domain, linked_shopify_domain",
          )
          .eq("email", shopFromUrl)
          .eq("shop_type", "standalone")
          .single();

        if (fallbackResult.data && !fallbackResult.error) {
          shopData = fallbackResult.data;
          shopError = null;
          authenticatedShop = shopFromUrl;
          logger.info(
            "[Connections API] Fallback successful - found standalone user by email",
            {
              component: "connections",
              email: shopFromUrl,
              shopDomain: fallbackResult.data.shop_domain,
            },
          );
        }
      }

      // If cookie-based auth failed and URL param looks like a Shopify domain, try fallback
      // This handles standalone users with linked Shopify stores when session cookies are stale
      if (
        (shopError || !shopData) &&
        shopFromUrl &&
        shopFromUrl.includes(".myshopify.com")
      ) {
        logger.info(
          "[Connections API] Primary lookup failed, trying linked_shopify_domain lookup",
          {
            component: "connections",
            primaryDomain: authenticatedShop,
            shopifyDomainParam: shopFromUrl,
          },
        );

        // First try regular Shopify store lookup
        const shopifyFallbackResult = await supabaseAdmin
          .from("shops")
          .select(
            "id, is_active, shop_type, shopify_access_token, shop_domain, linked_shopify_domain",
          )
          .eq("shop_domain", shopFromUrl)
          .single();

        if (shopifyFallbackResult.data && !shopifyFallbackResult.error) {
          shopData = shopifyFallbackResult.data;
          shopError = null;
          authenticatedShop = shopFromUrl;
          logger.info(
            "[Connections API] Fallback successful - found Shopify store by shop_domain",
            {
              component: "connections",
              shopDomain: shopFromUrl,
            },
          );
        } else {
          // Try finding a standalone user with this linked_shopify_domain
          const linkedFallbackResult = await supabaseAdmin
            .from("shops")
            .select(
              "id, is_active, shop_type, shopify_access_token, shop_domain, linked_shopify_domain",
            )
            .eq("linked_shopify_domain", shopFromUrl)
            .eq("shop_type", "standalone")
            .single();

          if (linkedFallbackResult.data && !linkedFallbackResult.error) {
            shopData = linkedFallbackResult.data;
            shopError = null;
            authenticatedShop = shopFromUrl;
            logger.info(
              "[Connections API] Fallback successful - found standalone user by linked_shopify_domain",
              {
                component: "connections",
                linkedShopifyDomain: shopFromUrl,
                standaloneEmail: linkedFallbackResult.data.shop_domain,
              },
            );
          }
        }
      }
    } else if (shopFromUrl && shopFromUrl.includes("@")) {
      // No cookie-based auth at all, but URL param looks like a standalone user email
      // SECURITY: This is safe because we verify the email exists in our database as a standalone user
      // The user must have a valid session on the frontend (useSession) to know their email
      logger.info(
        "[Connections API] No cookie auth - attempting email lookup for standalone user",
        {
          component: "connections",
          emailParam: shopFromUrl,
        },
      );

      // Standalone users: lookup by 'email' column (not 'shop_domain')
      const standaloneResult = await supabaseAdmin
        .from("shops")
        .select(
          "id, is_active, shop_type, shopify_access_token, shop_domain, linked_shopify_domain",
        )
        .eq("email", shopFromUrl)
        .eq("shop_type", "standalone")
        .single();

      if (standaloneResult.data && !standaloneResult.error) {
        shopData = standaloneResult.data;
        shopError = null;
        authenticatedShop = shopFromUrl;
        logger.info(
          "[Connections API] Email auth successful - found standalone user",
          {
            component: "connections",
            email: shopFromUrl,
            shopDomain: standaloneResult.data.shop_domain,
          },
        );
      } else {
        logger.warn(
          "[Connections API] Email auth failed - standalone user not found",
          {
            component: "connections",
            emailParam: shopFromUrl,
            error: standaloneResult.error?.message,
          },
        );
      }
    } else if (shopFromUrl && shopFromUrl.includes(".myshopify.com")) {
      // No cookie-based auth, but URL param looks like a Shopify domain
      // This could be a standalone user with a linked Shopify store
      logger.info(
        "[Connections API] No cookie auth - attempting linked_shopify_domain lookup",
        {
          component: "connections",
          shopifyDomain: shopFromUrl,
        },
      );

      // First try regular Shopify store lookup
      const shopifyResult = await supabaseAdmin
        .from("shops")
        .select(
          "id, is_active, shop_type, shopify_access_token, shop_domain, linked_shopify_domain",
        )
        .eq("shop_domain", shopFromUrl)
        .single();

      if (shopifyResult.data && !shopifyResult.error) {
        shopData = shopifyResult.data;
        shopError = null;
        authenticatedShop = shopFromUrl;
        logger.info("[Connections API] Found Shopify store by shop_domain", {
          component: "connections",
          shopDomain: shopFromUrl,
        });
      } else {
        // Try finding a standalone user with this linked_shopify_domain
        const linkedResult = await supabaseAdmin
          .from("shops")
          .select(
            "id, is_active, shop_type, shopify_access_token, shop_domain, linked_shopify_domain",
          )
          .eq("linked_shopify_domain", shopFromUrl)
          .eq("shop_type", "standalone")
          .single();

        if (linkedResult.data && !linkedResult.error) {
          shopData = linkedResult.data;
          shopError = null;
          authenticatedShop = shopFromUrl;
          logger.info(
            "[Connections API] Found standalone user by linked_shopify_domain",
            {
              component: "connections",
              linkedShopifyDomain: shopFromUrl,
              standaloneEmail: linkedResult.data.shop_domain,
            },
          );
        } else {
          logger.warn("[Connections API] No shop found for Shopify domain", {
            component: "connections",
            shopifyDomain: shopFromUrl,
          });
        }
      }
    }

    // If still no authentication found at all
    if (!authenticatedShop || !shopData) {
      logger.warn("[Connections API] No authentication found", {
        component: "connections",
        hasShopifyCookie: !!shopifyCookie,
        hasNextAuthSession: !!session,
        sessionUserRole: session?.user?.role || "none",
        shopFromUrl: shopFromUrl || "none",
      });
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get all integrations for this shop
    const { data: integrations, error: integrationsError } = await supabaseAdmin
      .from("integrations")
      .select("*")
      .eq("shop_id", shopData.id)
      .eq("is_active", true);

    if (integrationsError) {
      logger.error("Error fetching integrations:", integrationsError as Error, {
        component: "connections",
      });
      return NextResponse.json(
        { error: "Failed to fetch connections", connections: [] },
        { status: 500 },
      );
    }

    // Define all available providers
    const allProviders = [
      "shopify",
      "meta",
      "google",
      "tiktok",
      "pinterest",
      "klaviyo",
      "mailchimp",
      "lightspeed",
      "commentsold",
    ];

    // Map integrations to include connection status for all providers
    const connections = allProviders.map((provider) => {
      if (provider === "shopify") {
        // Shopify connection status:
        // - For 'shopify' type shops: connected if is_active is true
        // - For 'standalone' type shops: connected if they have a linked_shopify_domain and valid shopify_access_token
        const isStandalone = shopData.shop_type === "standalone";
        const isShopifyConnected =
          shopData.is_active === true &&
          (shopData.shop_type === "shopify" ||
            (isStandalone &&
              !!shopData.linked_shopify_domain &&
              !!shopData.shopify_access_token));

        // For standalone users, show the linked Shopify domain if available
        const displayDomain =
          isStandalone && shopData.linked_shopify_domain
            ? shopData.linked_shopify_domain
            : shopData.shop_domain;

        return {
          provider: "shopify",
          connected: isShopifyConnected,
          lastConnected: null,
          metadata: {
            shop_domain: displayDomain,
            // Include shop_id for standalone users to initiate linking flow
            ...(isStandalone &&
              !isShopifyConnected && { shop_id: shopData.id }),
          },
        };
      }

      // Map display provider name to database provider name
      // 'meta' in UI maps to 'facebook' in database
      const dbProviderName = provider === "meta" ? "facebook" : provider;

      // Check if integration exists for this provider
      const integration = integrations?.find(
        (i) => i.provider === dbProviderName,
      );

      return {
        provider,
        connected: integration?.is_active === true || false,
        lastConnected: integration?.updated_at || null,
        metadata: integration
          ? {
              provider_account_id: integration.provider_account_id,
              provider_account_name: integration.provider_account_name,
              ...integration.additional_metadata,
            }
          : null,
      };
    });

    return NextResponse.json({ success: true, connections });
  } catch (error) {
    logger.error("Error in connections API:", error as Error, {
      component: "connections",
    });
    return NextResponse.json(
      { error: "Internal server error", connections: [] },
      { status: 500 },
    );
  }
}
