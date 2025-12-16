import { createClient } from "@supabase/supabase-js";
import { logger } from "@/lib/logger";

// Types matching our database schema
export type IntegrationProvider =
  | "shopify"
  | "meta"
  | "google"
  | "tiktok"
  | "pinterest"
  | "klaviyo"
  | "mailchimp";
export type ProductTier =
  | "ace"
  | "thunder"
  | "zeus"
  | "bundle_all"
  | "coaching_only";

export interface IntegrationData {
  access_token: string;
  refresh_token?: string;
  expires_at?: Date;
  scopes: string[];
  metadata?: Record<string, any>;
}

export class IntegrationService {
  private supabase;

  constructor() {
    // Initialize with Service Role Key for backend access
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const serviceRoleKey =
      process.env.SUPABASE_SERVICE_ROLE_KEY ||
      process.env.SUPABASE_SERVICE_KEY!;

    if (!supabaseUrl || !serviceRoleKey) {
      throw new Error("Missing Supabase credentials for IntegrationService");
    }

    this.supabase = createClient(supabaseUrl, serviceRoleKey);
  }

  /**
   * Retrieves an active access token for a specific shop and provider.
   * Performs a subscription check to ensure the shop is allowed to access this integration.
   */
  async getAccessToken(
    shopId: string,
    provider: IntegrationProvider,
    requiredProduct?: ProductTier,
  ): Promise<string | null> {
    // 1. Check Subscription (The Gatekeeper)
    if (requiredProduct) {
      const hasAccess = await this.checkSubscription(shopId, requiredProduct);
      if (!hasAccess) {
        console.warn(
          `Shop ${shopId} attempted to access ${provider} without active subscription to ${requiredProduct}`,
        );
        return null;
      }
    }

    // 2. Fetch Integration
    const { data, error } = await this.supabase
      .from("integrations")
      .select("access_token, expires_at, refresh_token")
      .eq("shop_id", shopId)
      .eq("provider", provider)
      .eq("status", "active")
      .single();

    if (error || !data) {
      logger.error(
        `Failed to fetch ${provider} token for shop ${shopId}:`,
        error as Error,
        { component: "integration-service" },
      );
      return null;
    }

    // 3. Check Expiry & Refresh if needed (Placeholder for refresh logic)
    if (data.expires_at && new Date(data.expires_at) < new Date()) {
      console.log(`Token for ${provider} expired, attempting refresh...`);
      // TODO: Implement refresh logic here or return null to trigger re-auth flow
      // return await this.refreshToken(shopId, provider, data.refresh_token);
      return null;
    }

    return data.access_token;
  }

  /**
   * Saves or updates an integration token.
   */
  async saveIntegration(
    shopId: string,
    provider: IntegrationProvider,
    data: IntegrationData,
  ): Promise<boolean> {
    const { error } = await this.supabase.from("integrations").upsert(
      {
        shop_id: shopId,
        provider: provider,
        access_token: data.access_token,
        refresh_token: data.refresh_token,
        expires_at: data.expires_at,
        scopes: data.scopes,
        metadata: data.metadata || {},
        status: "active",
        updated_at: new Date(),
      },
      {
        onConflict: "shop_id, provider",
      },
    );

    if (error) {
      logger.error(
        `Failed to save ${provider} integration for shop ${shopId}:`,
        error as Error,
        { component: "integration-service" },
      );
      return false;
    }

    return true;
  }

  /**
   * Checks if a shop has an active subscription for a given product.
   *
   * SECURITY: For trialing subscriptions, also verifies the trial hasn't expired
   * by checking current_period_end against the current date.
   */
  async checkSubscription(
    shopId: string,
    product: ProductTier,
  ): Promise<boolean> {
    // If checking for a specific product, we also accept 'bundle_all'
    const validProducts = [product, "bundle_all"];

    const { data, error } = await this.supabase
      .from("subscriptions")
      .select("status, current_period_end")
      .eq("shop_id", shopId)
      .in("product", validProducts)
      .in("status", ["active", "trialing"]) // Allow active and trialing
      .maybeSingle();

    if (error) {
      logger.error(
        `Error checking subscription for shop ${shopId}:`,
        error as Error,
        { component: "integration-service" },
      );
      return false;
    }

    if (!data) {
      return false;
    }

    // SECURITY: For trialing subscriptions, verify trial hasn't expired
    if (data.status === "trialing" && data.current_period_end) {
      const trialEndDate = new Date(data.current_period_end);
      const now = new Date();

      if (trialEndDate < now) {
        logger.warn(`Trial expired for shop ${shopId}`, {
          component: "integration-service",
          trialEndDate: trialEndDate.toISOString(),
        });
        return false;
      }
    }

    return true;
  }

  /**
   * Disconnects an integration (sets status to disconnected).
   */
  async disconnectIntegration(
    shopId: string,
    provider: IntegrationProvider,
  ): Promise<boolean> {
    const { error } = await this.supabase
      .from("integrations")
      .update({ status: "disconnected", updated_at: new Date() })
      .eq("shop_id", shopId)
      .eq("provider", provider);

    return !error;
  }
}

// Singleton instance for easy import
export const integrationService = new IntegrationService();
