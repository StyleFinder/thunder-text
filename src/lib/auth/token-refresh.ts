/**
 * Token refresh manager for handling online access token renewal
 * Online tokens expire after 24 hours and need to be refreshed
 */
import { exchangeToken } from "@/lib/shopify/token-exchange";
import { supabaseAdmin } from "@/lib/supabase";
import { logger } from "@/lib/logger";

export class TokenRefreshManager {
  private static instance: TokenRefreshManager;
  private refreshTimers = new Map<string, NodeJS.Timeout>();
  private refreshPromises = new Map<string, Promise<string>>();

  private constructor() {}

  static getInstance(): TokenRefreshManager {
    if (!TokenRefreshManager.instance) {
      TokenRefreshManager.instance = new TokenRefreshManager();
    }
    return TokenRefreshManager.instance;
  }

  /**
   * Schedule a token refresh before it expires
   * @param shop - Shop domain
   * @param expiresIn - Token expiration time in seconds
   */
  scheduleRefresh(shop: string, expiresIn: number) {
    // Clear any existing timer for this shop
    this.clearRefresh(shop);

    // Schedule refresh 5 minutes before expiry (with minimum 1 minute)
    const refreshTime = Math.max((expiresIn - 300) * 1000, 60000);

    logger.info("Scheduling token refresh", {
      component: "token-refresh",
      shop,
      refreshTimeSeconds: refreshTime / 1000,
    });

    const timer = setTimeout(async () => {
      try {
        await this.refreshToken(shop);
      } catch (error) {
        logger.error(
          `❌ Failed to refresh token for ${shop}:`,
          error as Error,
          { component: "token-refresh" },
        );
        // Retry with exponential backoff
        this.retryRefresh(shop, 1);
      }
    }, refreshTime);

    this.refreshTimers.set(shop, timer);
  }

  /**
   * Refresh a shop's access token
   * @param shop - Shop domain
   * @returns New access token
   */
  async refreshToken(shop: string): Promise<string> {
    // Check if refresh is already in progress
    const existingPromise = this.refreshPromises.get(shop);
    if (existingPromise) {
      return existingPromise;
    }

    // Create refresh promise
    const refreshPromise = this.performTokenRefresh(shop);
    this.refreshPromises.set(shop, refreshPromise);

    try {
      const result = await refreshPromise;
      return result;
    } finally {
      // Clean up promise
      this.refreshPromises.delete(shop);
    }
  }

  private async performTokenRefresh(shop: string): Promise<string> {
    // Get a fresh session token from the client
    // In a real implementation, this would need to be triggered from the client side
    // For now, we'll use the stored refresh token or trigger a new session

    try {
      // Try to get current session info from database
      const { data: shopData, error: shopError } = await supabaseAdmin
        .from("shops")
        .select("access_token, refresh_token, scope")
        .eq("shop_domain", shop)
        .single();

      if (shopError || !shopData) {
        throw new Error(`Shop not found: ${shop}`);
      }

      // For online tokens, we need a fresh session token from the client
      // This is typically done through the App Bridge on the client side
      // Since we can't get it server-side, we'll mark the token as needing refresh

      // Mark token as expiring soon in database
      const { error: updateError } = await supabaseAdmin
        .from("shops")
        .update({
          token_expires_at: new Date(Date.now() + 300000).toISOString(), // 5 minutes
          needs_token_refresh: true,
          updated_at: new Date().toISOString(),
        })
        .eq("shop_domain", shop);

      if (updateError) {
        logger.error(
          "❌ Failed to mark token for refresh:",
          updateError as Error,
          { component: "token-refresh" },
        );
      }

      // In a production app, this would trigger a client-side refresh flow
      // The client would then call token exchange with a fresh session token

      // Return existing token for now (client will handle refresh)
      return shopData.access_token;
    } catch (error) {
      logger.error(`❌ Token refresh failed for ${shop}:`, error as Error, {
        component: "token-refresh",
      });
      throw error;
    }
  }

  /**
   * Retry token refresh with exponential backoff
   */
  private retryRefresh(shop: string, attempt: number) {
    const maxAttempts = 5;
    if (attempt > maxAttempts) {
      logger.error(
        "Max refresh retries reached",
        new Error("Max retries exceeded"),
        {
          component: "token-refresh",
          shop,
          attempts: maxAttempts,
        },
      );
      return;
    }

    const delay = Math.min(1000 * Math.pow(2, attempt), 30000); // Max 30 seconds

    setTimeout(async () => {
      try {
        await this.refreshToken(shop);
      } catch (_error) {
        this.retryRefresh(shop, attempt + 1);
      }
    }, delay);
  }

  /**
   * Clear scheduled refresh for a shop
   */
  clearRefresh(shop: string) {
    const timer = this.refreshTimers.get(shop);
    if (timer) {
      clearTimeout(timer);
      this.refreshTimers.delete(shop);
      logger.debug("Cleared token refresh timer", {
        component: "token-refresh",
        shop,
      });
    }
  }

  /**
   * Clear all refresh timers (for cleanup)
   */
  clearAllRefreshes() {
    for (const [shop, timer] of this.refreshTimers) {
      clearTimeout(timer);
      logger.debug("Cleared token refresh timer", {
        component: "token-refresh",
        shop,
      });
    }
    this.refreshTimers.clear();
    this.refreshPromises.clear();
  }

  /**
   * Check if a token needs refresh based on expiration
   */
  static tokenNeedsRefresh(expiresAt: string | Date): boolean {
    const expiry = new Date(expiresAt);
    const now = new Date();
    const bufferTime = 5 * 60 * 1000; // 5 minutes buffer

    return expiry.getTime() - now.getTime() < bufferTime;
  }

  /**
   * Handle token refresh response from client
   * Called when client provides a fresh session token
   */
  async handleClientTokenRefresh(
    shop: string,
    sessionToken: string,
  ): Promise<{ success: boolean; accessToken?: string; error?: string }> {
    try {
      logger.info("Processing client token refresh", {
        component: "token-refresh",
        shop,
      });

      // Exchange session token for new access token
      const response = await exchangeToken({
        shop,
        sessionToken,
        clientId: process.env.SHOPIFY_API_KEY || "",
        clientSecret: process.env.SHOPIFY_API_SECRET || "",
        requestedTokenType: "online", // Online tokens for embedded apps
      });

      if (!response.access_token) {
        throw new Error("No access token in response");
      }

      // Calculate expiration (24 hours for online tokens)
      const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

      // Update token in database
      const { error: updateError } = await supabaseAdmin
        .from("shops")
        .update({
          access_token: response.access_token,
          scope: response.scope,
          token_expires_at: expiresAt.toISOString(),
          needs_token_refresh: false,
          updated_at: new Date().toISOString(),
        })
        .eq("shop_domain", shop);

      if (updateError) {
        logger.error(
          "❌ Failed to update refreshed token:",
          updateError as Error,
          { component: "token-refresh" },
        );
        throw updateError;
      }

      // Schedule next refresh
      this.scheduleRefresh(shop, 24 * 60 * 60); // 24 hours

      return {
        success: true,
        accessToken: response.access_token,
      };
    } catch (error) {
      logger.error(
        `❌ Client token refresh failed for ${shop}:`,
        error as Error,
        { component: "token-refresh" },
      );
      return {
        success: false,
        error: error instanceof Error ? error.message : "Token refresh failed",
      };
    }
  }
}

// Export singleton instance
export const tokenRefreshManager = TokenRefreshManager.getInstance();
