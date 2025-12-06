import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getServerSession } from "next-auth";
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
    // SECURITY: Verify the request is authenticated
    // Support both Shopify OAuth (shopify_shop cookie) and NextAuth session
    const shopifyCookie = request.cookies.get("shopify_shop")?.value;

    // Check NextAuth session for standalone users (uses getServerSession like other routes)
    const session = await getServerSession(authOptions);
    const nextAuthShop = session?.user?.shopDomain;

    // Use whichever authentication method is present
    // This is the AUTHORITATIVE shop domain from auth, not from URL params
    const authenticatedShop = shopifyCookie || nextAuthShop;

    // Log authentication status for debugging
    logger.debug("[Connections API] Auth check", {
      component: "connections",
      hasShopifyCookie: !!shopifyCookie,
      hasNextAuthSession: !!session,
      nextAuthShop: nextAuthShop || "none",
      sessionUser: session?.user?.email || "none",
    });

    if (!authenticatedShop) {
      // No authentication found - user is not authenticated
      logger.warn("[Connections API] No authentication found", {
        component: "connections",
        hasShopifyCookie: !!shopifyCookie,
        hasNextAuthSession: !!session,
        sessionUserRole: session?.user?.role || "none",
      });
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Use the authenticated shop domain for database lookup
    // This ensures we always use the correct shop_domain from the user's auth,
    // not from URL params which could be incorrect (e.g., standalone user with Shopify URL)
    const shopDomainToLookup = authenticatedShop;

    // First, get the shop_id, is_active, shop_type, and access_token from shop_domain
    const { data: shopData, error: shopError } = await supabaseAdmin
      .from("shops")
      .select("id, is_active, shop_type, access_token, shop_domain")
      .eq("shop_domain", shopDomainToLookup)
      .single();

    if (shopError || !shopData) {
      logger.error("[Connections API] Shop not found in database", {
        component: "connections",
        shopDomainToLookup,
        error: shopError?.message || "No data returned",
        errorCode: shopError?.code,
      });
      return NextResponse.json(
        { error: `Shop not found for domain: ${shopDomainToLookup}`, connections: [] },
        { status: 404 },
      );
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
        // - For 'standalone' type shops: connected if they have a valid Shopify access token
        const isShopifyConnected =
          shopData.is_active === true &&
          (shopData.shop_type === "shopify" ||
            (shopData.shop_type === "standalone" && !!shopData.access_token));
        return {
          provider: "shopify",
          connected: isShopifyConnected,
          lastConnected: null,
          metadata: {
            shop_domain: shopData.shop_domain,
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
