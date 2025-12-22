/**
 * Facebook OAuth Callback Endpoint
 *
 * GET /api/facebook/oauth/callback
 *
 * Purpose: Handle Facebook OAuth callback, exchange code for token, encrypt and store
 *
 * Flow:
 * 1. Receive authorization code from Facebook
 * 2. Decode state parameter to get shop context
 * 3. Exchange code for access token (Facebook API call)
 * 4. Get user's Facebook business information
 * 5. Encrypt access token
 * 6. Store in integrations table
 * 7. Redirect to dashboard with success message
 *
 * Query Parameters:
 * - code: Authorization code from Facebook
 * - state: Base64url encoded shop context
 * - error: Error code if user denied (optional)
 * - error_description: Error description (optional)
 */

import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { encryptToken } from "@/lib/services/encryption";
import {
  validateFacebookOAuthState,
  type FacebookOAuthState,
} from "@/lib/security/oauth-validation";
import { ZodError } from "zod";
import { logger } from "@/lib/logger";
import { alertIntegrationError } from "@/lib/alerting/critical-alerts";

/**
 * Exchange authorization code for access token
 * https://developers.facebook.com/docs/facebook-login/guides/access-tokens
 */
async function exchangeCodeForToken(code: string): Promise<{
  access_token: string;
  token_type: string;
  expires_in?: number;
}> {
  const appId = process.env.FACEBOOK_APP_ID!;
  const appSecret = process.env.FACEBOOK_APP_SECRET!;
  const redirectUri =
    process.env.FACEBOOK_REDIRECT_URI ||
    `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/api/facebook/oauth/callback`;

  const tokenUrl = new URL(
    "https://graph.facebook.com/v21.0/oauth/access_token",
  );
  tokenUrl.searchParams.set("client_id", appId);
  tokenUrl.searchParams.set("client_secret", appSecret);
  tokenUrl.searchParams.set("redirect_uri", redirectUri);
  tokenUrl.searchParams.set("code", code);

  console.log(
    "🔵 Token exchange URL:",
    tokenUrl.toString().replace(appSecret, "***SECRET***"),
  );

  const response = await fetch(tokenUrl.toString());

  if (!response.ok) {
    const error = await response.text();
    logger.error(
      "Facebook token exchange failed",
      new Error(`${response.status} ${response.statusText}`),
      {
        status: response.status,
        statusText: response.statusText,
        error,
        redirectUri,
        component: "facebook-oauth",
        operation: "token-exchange",
      },
    );
    throw new Error(`Failed to exchange code for token: ${error}`);
  }

  return response.json();
}

/**
 * Get user's Facebook account information
 * https://developers.facebook.com/docs/graph-api/reference/user
 */
async function getUserInfo(accessToken: string): Promise<{
  id: string;
  name: string;
  email?: string;
}> {
  const userUrl = new URL("https://graph.facebook.com/v21.0/me");
  userUrl.searchParams.set("fields", "id,name,email");
  userUrl.searchParams.set("access_token", accessToken);

  const response = await fetch(userUrl.toString());

  if (!response.ok) {
    const error = await response.text();
    logger.error("Facebook user info fetch failed", new Error(error), {
      component: "facebook-oauth",
      operation: "get-user-info",
    });
    throw new Error("Failed to fetch user info");
  }

  return response.json();
}

/**
 * Get user's ad accounts
 * https://developers.facebook.com/docs/marketing-api/reference/user/adaccounts
 */
async function getAdAccounts(
  accessToken: string,
  userId: string,
): Promise<{
  data: Array<{
    id: string;
    account_id: string;
    name: string;
    account_status: number;
  }>;
}> {
  const adAccountsUrl = new URL(
    `https://graph.facebook.com/v21.0/${userId}/adaccounts`,
  );
  adAccountsUrl.searchParams.set("fields", "id,account_id,name,account_status");
  adAccountsUrl.searchParams.set("access_token", accessToken);

  const response = await fetch(adAccountsUrl.toString());

  if (!response.ok) {
    const error = await response.text();
    logger.error("Facebook ad accounts fetch failed", new Error(error), {
      component: "facebook-oauth",
      operation: "get-ad-accounts",
      userId,
    });
    // Don't throw - user might not have ad accounts yet
    return { data: [] };
  }

  return response.json();
}

/**
 * Get user's Facebook Pages
 * https://developers.facebook.com/docs/graph-api/reference/user/accounts
 */
async function getFacebookPages(
  accessToken: string,
  userId: string,
): Promise<{
  data: Array<{
    id: string;
    name: string;
    access_token: string;
  }>;
}> {
  const pagesUrl = new URL(
    `https://graph.facebook.com/v21.0/${userId}/accounts`,
  );
  pagesUrl.searchParams.set("fields", "id,name,access_token");
  pagesUrl.searchParams.set("access_token", accessToken);

  const response = await fetch(pagesUrl.toString());

  if (!response.ok) {
    const error = await response.text();
    logger.error("Facebook pages fetch failed", new Error(error), {
      component: "facebook-oauth",
      operation: "get-facebook-pages",
      userId,
    });
    // Don't throw - user might not have pages yet
    return { data: [] };
  }

  return response.json();
}

/**
 * Get Instagram Business Account linked to a Facebook Page
 * https://developers.facebook.com/docs/instagram-api/getting-started
 */
async function getInstagramAccountForPage(
  accessToken: string,
  pageId: string,
): Promise<string | null> {
  try {
    const instagramUrl = new URL(`https://graph.facebook.com/v21.0/${pageId}`);
    instagramUrl.searchParams.set("fields", "instagram_business_account");
    instagramUrl.searchParams.set("access_token", accessToken);

    const response = await fetch(instagramUrl.toString());

    if (!response.ok) {
      const error = await response.text();
      logger.warn("Failed to fetch Instagram account for page", {
        component: "facebook-oauth",
        operation: "get-instagram-account",
        pageId,
        error,
      });
      return null;
    }

    const data = await response.json();
    const instagramAccountId = data?.instagram_business_account?.id || null;

    logger.info("Instagram account lookup result", {
      component: "facebook-oauth",
      operation: "get-instagram-account",
      pageId,
      hasInstagramAccount: !!instagramAccountId,
      instagramAccountId,
    });

    return instagramAccountId;
  } catch (error) {
    logger.error("Error fetching Instagram account", error as Error, {
      component: "facebook-oauth",
      operation: "get-instagram-account",
      pageId,
    });
    return null;
  }
}

export async function GET(request: NextRequest) {
  let stateData: FacebookOAuthState | undefined;

  try {
    console.log("🔵 Facebook OAuth callback received:", request.url);

    const { searchParams } = new URL(request.url);
    const code = searchParams.get("code");
    const state = searchParams.get("state");
    const error = searchParams.get("error");
    const errorDescription = searchParams.get("error_description");

    console.log("🔵 Callback parameters:", {
      hasCode: !!code,
      hasState: !!state,
      error,
      errorDescription,
    });

    // Handle user denial or errors from Facebook
    if (error) {
      console.log("Facebook OAuth error:", error, errorDescription);

      const redirectUrl = new URL(
        "/settings",
        process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
      );
      redirectUrl.searchParams.set("facebook_error", error);
      if (error === "access_denied") {
        redirectUrl.searchParams.set(
          "message",
          "Facebook authorization was cancelled",
        );
      } else {
        redirectUrl.searchParams.set(
          "message",
          errorDescription || "Facebook authorization failed",
        );
      }

      return NextResponse.redirect(redirectUrl.toString());
    }

    // Validate required parameters
    if (!code || !state) {
      return NextResponse.json(
        { error: "Invalid callback parameters" },
        { status: 400 },
      );
    }

    // Verify environment variables
    if (!process.env.FACEBOOK_APP_ID || !process.env.FACEBOOK_APP_SECRET) {
      logger.error("Facebook app credentials not configured", undefined, {
        component: "facebook-oauth",
        operation: "callback",
      });
      return NextResponse.json(
        { error: "Facebook integration not configured" },
        { status: 500 },
      );
    }

    // Validate state parameter with Zod schema
    // This validates structure, timestamp, and prevents tampering/replay attacks
    try {
      stateData = validateFacebookOAuthState(state);
    } catch (error) {
      if (error instanceof ZodError) {
        logger.error("State validation failed", error, {
          errors: error.errors,
          component: "facebook-oauth",
          operation: "callback",
        });
        return NextResponse.json(
          { error: "Invalid state parameter format", details: error.errors },
          { status: 400 },
        );
      }
      logger.error("State validation error", error as Error, {
        component: "facebook-oauth",
        operation: "callback",
      });
      return NextResponse.json(
        {
          error:
            error instanceof Error ? error.message : "Invalid state parameter",
        },
        { status: 400 },
      );
    }

    const { shop_id, shop_domain } = stateData;

    console.log("🔵 Processing Facebook OAuth callback for shop:", shop_domain);
    console.log("🔵 State data:", {
      shop_id,
      shop_domain,
      hasHost: !!stateData.host,
      hasEmbedded: !!stateData.embedded,
    });

    // Exchange authorization code for access token
    console.log("🔵 Starting token exchange...");
    const tokenData = await exchangeCodeForToken(code);
    console.log("🔵 Token exchange successful");
    const { access_token, expires_in } = tokenData;

    // Get user's Facebook information
    const userInfo = await getUserInfo(access_token);

    // Get user's ad accounts
    const adAccountsData = await getAdAccounts(access_token, userInfo.id);
    const adAccounts = adAccountsData.data || [];

    // Find first active ad account
    const activeAdAccount =
      adAccounts.find((acc) => acc.account_status === 1) || adAccounts[0];

    // Get user's Facebook Pages (required for creating ad creatives)
    const pagesData = await getFacebookPages(access_token, userInfo.id);
    const pages = pagesData.data || [];
    const primaryPage = pages[0]; // Use first page as primary

    // Get Instagram Business Account linked to the primary Facebook Page
    // This is required for creating ads that appear on Instagram
    let instagramAccountId: string | null = null;
    if (primaryPage?.id) {
      instagramAccountId = await getInstagramAccountForPage(
        access_token,
        primaryPage.id,
      );
      console.log("🔵 Instagram account lookup:", {
        pageId: primaryPage.id,
        instagramAccountId,
      });
    }

    // Encrypt access token before storage
    const encryptedAccessToken = await encryptToken(access_token);

    // Calculate token expiration (Facebook tokens typically last 60 days)
    const tokenExpiresAt = expires_in
      ? new Date(Date.now() + expires_in * 1000)
      : new Date(Date.now() + 60 * 24 * 60 * 60 * 1000); // Default: 60 days

    // Verify shop exists before attempting upsert
    const { data: shopExists, error: shopCheckError } = await supabaseAdmin
      .from("shops")
      .select("id, shop_domain")
      .eq("id", shop_id)
      .single();

    if (shopCheckError || !shopExists) {
      logger.error("Shop does not exist", shopCheckError as Error, {
        shop_id,
        shop_domain,
        component: "facebook-oauth",
        operation: "callback",
      });
      throw new Error(`Shop not found: ${shop_domain}`);
    }

    // Prepare upsert data
    const upsertData = {
      shop_id,
      provider: "facebook",
      encrypted_access_token: encryptedAccessToken,
      token_expires_at: tokenExpiresAt.toISOString(),
      provider_account_id: userInfo.id,
      provider_account_name: userInfo.name,
      // facebook_page_id: primaryPage?.id || null, // TEMP: Commented out due to schema cache issue
      is_active: true,
      additional_metadata: {
        email: userInfo.email,
        facebook_page_id: primaryPage?.id || null, // Stored in metadata until schema cache refreshes
        instagram_account_id: instagramAccountId, // Instagram Business Account linked to the Page
        // Store ALL ad accounts fetched from Facebook (never modified after OAuth)
        all_ad_accounts: adAccounts.map((acc) => ({
          id: acc.id,
          account_id: acc.account_id,
          name: acc.name,
          status: acc.account_status,
        })),
        // ad_accounts contains user-selected accounts (initially all, can be filtered later)
        ad_accounts: adAccounts.map((acc) => ({
          id: acc.id,
          account_id: acc.account_id,
          name: acc.name,
          status: acc.account_status,
        })),
        primary_ad_account_id: activeAdAccount?.id,
        primary_ad_account_name: activeAdAccount?.name,
        facebook_pages: pages.map((page) => ({
          id: page.id,
          name: page.name,
        })),
        primary_page_id: primaryPage?.id,
        primary_page_name: primaryPage?.name,
        connected_at: new Date().toISOString(),
      },
      updated_at: new Date().toISOString(),
    };

    // Store integration in database
    const { data: integration, error: dbError } = await supabaseAdmin
      .from("integrations")
      .upsert(upsertData, { onConflict: "shop_id,provider" })
      .select()
      .single();

    if (dbError) {
      logger.error("Failed to store Facebook integration", dbError as Error, {
        code: (dbError as { code?: string })?.code,
        details: (dbError as { details?: string })?.details,
        hint: (dbError as { hint?: string })?.hint,
        component: "facebook-oauth",
        operation: "store-integration",
      });
      throw dbError;
    }

    if (!integration) {
      logger.error("No integration data returned from upsert", undefined, {
        component: "facebook-oauth",
        operation: "store-integration",
      });
      throw new Error("Failed to store integration - no data returned");
    }

    // Verify the record was actually inserted by reading it back
    const { data: verifiedIntegration, error: verifyError } =
      await supabaseAdmin
        .from("integrations")
        .select("id, shop_id, provider, is_active")
        .eq("shop_id", shop_id)
        .eq("provider", "facebook")
        .single();

    if (verifyError || !verifiedIntegration) {
      // CRITICAL: Integration save claimed success but verification failed
      await alertIntegrationError(
        "Facebook integration verification failed - data may not have been saved",
        {
          shopId: shop_id,
          shopDomain: shop_domain,
          provider: "facebook",
          facebookUserId: userInfo.id,
          facebookUserName: userInfo.name,
          hadAdAccounts: adAccounts.length > 0,
        },
        verifyError,
      );
      // Log additional details for debugging
      logger.error(
        "Integration verification failed after upsert",
        verifyError as Error,
        {
          component: "facebook-oauth",
          operation: "verify-integration",
          shopId: shop_id,
          shopDomain: shop_domain,
        },
      );
    } else {
      logger.info("Facebook integration verified successfully", {
        component: "facebook-oauth",
        operation: "verify-integration",
        integrationId: verifiedIntegration.id,
        shopId: shop_id,
        isActive: verifiedIntegration.is_active,
      });
    }

    // Redirect based on return_to parameter (onboarding, connections, or main app)
    // Restore host and embedded params to maintain Shopify embedded app context (if they exist)
    let redirectPath = "/facebook-ads"; // Default
    if (stateData.return_to === "welcome") {
      redirectPath = "/welcome";
    } else if (stateData.return_to === "/settings/connections") {
      redirectPath = "/settings/connections";
    }

    const redirectUrl = new URL(
      redirectPath,
      process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
    );

    redirectUrl.searchParams.set("shop", shop_domain);

    // For onboarding flow, set step=social
    if (stateData.return_to === "welcome") {
      redirectUrl.searchParams.set("step", "social");
    }

    // Only add host and embedded if they have valid (non-null) values
    if (stateData.host && stateData.host !== "null") {
      redirectUrl.searchParams.set("host", stateData.host);
    }
    if (stateData.embedded && stateData.embedded !== "null") {
      redirectUrl.searchParams.set("embedded", stateData.embedded);
    }

    redirectUrl.searchParams.set("authenticated", "true");
    redirectUrl.searchParams.set("facebook_connected", "true");

    // If multiple ad accounts are available, prompt user to select which ones to use
    if (adAccounts.length > 1) {
      redirectUrl.searchParams.set("select_ad_accounts", "true");
      redirectUrl.searchParams.set(
        "message",
        "Facebook connected! Please select which ad accounts to use.",
      );
    } else {
      redirectUrl.searchParams.set(
        "message",
        "Facebook account connected successfully",
      );
    }

    return NextResponse.redirect(redirectUrl.toString());
  } catch (error) {
    logger.error("Error in Facebook OAuth callback", error as Error, {
      component: "facebook-oauth",
      operation: "callback",
      shopDomain: stateData?.shop_domain,
    });

    // Redirect to Facebook Ads page with error message
    // Restore host and embedded params to maintain Shopify embedded app context (if they exist)
    const redirectUrl = new URL(
      "/facebook-ads",
      process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
    );
    redirectUrl.searchParams.set("shop", stateData?.shop_domain || "");

    // Only add host and embedded if they have valid (non-null) values
    if (stateData?.host && stateData.host !== "null") {
      redirectUrl.searchParams.set("host", stateData.host);
    }
    if (stateData?.embedded && stateData.embedded !== "null") {
      redirectUrl.searchParams.set("embedded", stateData.embedded);
    }

    redirectUrl.searchParams.set("authenticated", "true");
    redirectUrl.searchParams.set("facebook_error", "true");
    redirectUrl.searchParams.set(
      "message",
      "Failed to connect Facebook account. Please try again.",
    );

    return NextResponse.redirect(redirectUrl.toString());
  }
}
