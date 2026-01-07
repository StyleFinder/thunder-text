import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import {
  createCorsHeaders,
  handleCorsPreflightRequest,
} from "@/lib/middleware/cors";
import { logger } from "@/lib/logger";

// OPTIONS handler for CORS preflight
export async function OPTIONS(request: NextRequest) {
  return handleCorsPreflightRequest(request);
}

// Token Exchange endpoint for embedded apps
// This exchanges a session token for an access token
export async function POST(request: NextRequest) {
  const corsHeaders = createCorsHeaders(request);

  try {
    const body = await request.json();
    const { sessionToken, shop } = body;

    if (!sessionToken || !shop) {
      logger.error("Missing required parameters", undefined, {
        hasSessionToken: !!sessionToken,
        hasShop: !!shop,
        component: "shopify-token-exchange",
        operation: "POST",
      });
      return NextResponse.json(
        {
          success: false,
          error: "Missing session token or shop parameter",
        },
        { status: 400, headers: corsHeaders },
      );
    }

    // Prepare token exchange request
    // Normalize shop domain to ensure .myshopify.com suffix
    const fullShopDomain = shop.includes(".myshopify.com")
      ? shop
      : `${shop}.myshopify.com`;
    const tokenExchangeUrl = `https://${fullShopDomain}/admin/oauth/access_token`;

    const exchangeBody = {
      client_id: process.env.NEXT_PUBLIC_SHOPIFY_API_KEY!,
      client_secret: process.env.SHOPIFY_API_SECRET!,
      grant_type: "urn:ietf:params:oauth:grant-type:token-exchange",
      subject_token: sessionToken,
      subject_token_type: "urn:ietf:params:oauth:token-type:id_token",
      requested_token_type:
        "urn:shopify:params:oauth:token-type:offline-access-token",
    };

    // Exchange session token for access token
    const tokenResponse = await fetch(tokenExchangeUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(exchangeBody),
    });

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text();
      logger.error(
        "Token exchange failed",
        new Error(`${tokenResponse.status} ${tokenResponse.statusText}`),
        {
          status: tokenResponse.status,
          statusText: tokenResponse.statusText,
          errorText,
          shop,
          fullShopDomain: shop.includes(".myshopify.com")
            ? shop
            : `${shop}.myshopify.com`,
          requestUrl: tokenExchangeUrl,
          hasApiKey: !!process.env.NEXT_PUBLIC_SHOPIFY_API_KEY,
          hasApiSecret: !!process.env.SHOPIFY_API_SECRET,
          component: "shopify-token-exchange",
          operation: "token-exchange",
        },
      );

      // Try to parse Shopify's error response
      let errorDetails = errorText;
      try {
        const errorJson = JSON.parse(errorText);
        errorDetails =
          errorJson.error_description || errorJson.error || errorText;
      } catch (_e) {
        // Not JSON, use raw text
      }

      return NextResponse.json(
        {
          success: false,
          error: `Token exchange failed: ${errorDetails}`,
          details: errorText,
          debugInfo: {
            shop,
            status: tokenResponse.status,
            hasCredentials: {
              apiKey: !!process.env.NEXT_PUBLIC_SHOPIFY_API_KEY,
              apiSecret: !!process.env.SHOPIFY_API_SECRET,
            },
          },
        },
        { status: tokenResponse.status, headers: corsHeaders },
      );
    }

    const tokenData = await tokenResponse.json();

    // Store the access token in Supabase
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    // Prefer SUPABASE_SERVICE_ROLE_KEY first (the working key)
    const supabaseKey =
      process.env.SUPABASE_SERVICE_ROLE_KEY ||
      process.env.SUPABASE_SECRET_KEY ||
      process.env.SUPABASE_SERVICE_KEY ||
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseKey) {
      logger.error("Missing Supabase configuration", undefined, {
        hasUrl: !!supabaseUrl,
        hasKey: !!supabaseKey,
        urlValue: supabaseUrl,
        component: "shopify-token-exchange",
        operation: "supabase-setup",
      });
      return NextResponse.json(
        {
          success: false,
          error: "Supabase configuration missing - check environment variables",
        },
        { status: 500, headers: corsHeaders },
      );
    }

    const supabase = createClient(supabaseUrl, supabaseKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });

    // Upsert shop token
    const { data: _upsertData, error: dbError } = await supabase
      .from("shops")
      .upsert(
        {
          shop_domain: fullShopDomain,
          access_token: tokenData.access_token,
          scope: tokenData.scope || "",
          is_active: true,
          updated_at: new Date().toISOString(),
        },
        {
          onConflict: "shop_domain",
        },
      )
      .select();

    if (dbError) {
      logger.error("Error storing token in database", dbError as Error, {
        code: dbError.code,
        details: dbError.details,
        hint: dbError.hint,
        shop: fullShopDomain,
        supabaseUrl,
        keyType: process.env.SUPABASE_SERVICE_ROLE_KEY
          ? "service_role"
          : process.env.SUPABASE_SECRET_KEY
            ? "secret"
            : process.env.SUPABASE_SERVICE_KEY
              ? "service"
              : "anon",
        component: "shopify-token-exchange",
        operation: "store-token",
      });
      return NextResponse.json(
        {
          success: false,
          error: "Failed to store access token",
          details: dbError.message,
          hint: dbError.hint,
          code: dbError.code,
        },
        { status: 500, headers: corsHeaders },
      );
    }

    return NextResponse.json(
      {
        success: true,
        message: "Token exchange completed successfully",
        scope: tokenData.scope,
      },
      { headers: corsHeaders },
    );
  } catch (error) {
    logger.error("Unexpected error in token exchange", error as Error, {
      errorType: error?.constructor?.name,
      component: "shopify-token-exchange",
      operation: "POST",
    });
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Token exchange failed",
        details: error instanceof Error ? error.stack : undefined,
      },
      { status: 500, headers: corsHeaders },
    );
  }
}
