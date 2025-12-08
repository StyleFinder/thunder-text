import { NextRequest, NextResponse } from "next/server";
import { createCorsHeaders } from "@/lib/middleware/cors";
import { logger } from "@/lib/logger";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

export interface LlmsSettings {
  id?: string;
  shop_id: string;
  include_products: boolean;
  include_collections: boolean;
  include_blog_posts: boolean;
  sync_schedule: "none" | "daily" | "weekly";
  last_generated_at: string | null;
  next_sync_at: string | null;
  last_product_count: number;
  last_collection_count: number;
  last_blog_post_count: number;
  auto_publish: boolean;
  publish_theme_id: string | null;
}

/**
 * GET /api/llms/settings - Get llms.txt settings for a shop
 */
export async function GET(request: NextRequest) {
  const corsHeaders = createCorsHeaders(request);

  try {
    const { searchParams } = new URL(request.url);
    const shop = searchParams.get("shop");

    if (!shop) {
      return NextResponse.json(
        { success: false, error: "Shop parameter required" },
        { status: 400, headers: corsHeaders }
      );
    }

    const fullShop = shop.includes(".myshopify.com")
      ? shop
      : `${shop}.myshopify.com`;

    const supabase = getSupabaseAdmin();

    // First get shop_id from shops table
    const { data: shopData, error: shopError } = await supabase
      .from("shops")
      .select("id")
      .eq("shop_domain", fullShop)
      .single();

    if (shopError || !shopData) {
      logger.error("Shop not found for llms settings", shopError as Error, {
        component: "llms-settings",
        shop: fullShop,
      });
      return NextResponse.json(
        { success: false, error: "Shop not found" },
        { status: 404, headers: corsHeaders }
      );
    }

    // Get or create llms settings for this shop
    const { data: existingSettings, error: settingsError } = await supabase
      .from("llms_settings")
      .select("*")
      .eq("shop_id", shopData.id)
      .single();

    let settings = existingSettings;

    // If no settings exist, create default settings
    if (settingsError?.code === "PGRST116" || !existingSettings) {
      const defaultSettings = {
        shop_id: shopData.id,
        include_products: true,
        include_collections: false,
        include_blog_posts: false,
        sync_schedule: "none",
        last_generated_at: null,
        next_sync_at: null,
        last_product_count: 0,
        last_collection_count: 0,
        last_blog_post_count: 0,
        auto_publish: false,
        publish_theme_id: null,
      };

      const { data: newSettings, error: createError } = await supabase
        .from("llms_settings")
        .insert(defaultSettings)
        .select()
        .single();

      if (createError) {
        logger.error("Failed to create default llms settings", createError as Error, {
          component: "llms-settings",
          shop: fullShop,
        });
        return NextResponse.json(
          { success: false, error: "Failed to create settings" },
          { status: 500, headers: corsHeaders }
        );
      }

      settings = newSettings;
    } else if (settingsError) {
      logger.error("Failed to fetch llms settings", settingsError as Error, {
        component: "llms-settings",
        shop: fullShop,
      });
      return NextResponse.json(
        { success: false, error: "Failed to fetch settings" },
        { status: 500, headers: corsHeaders }
      );
    }

    return NextResponse.json(
      { success: true, settings },
      { headers: corsHeaders }
    );
  } catch (error) {
    logger.error("Error in llms settings GET:", error as Error, {
      component: "llms-settings",
    });
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500, headers: corsHeaders }
    );
  }
}

/**
 * POST /api/llms/settings - Update llms.txt settings for a shop
 */
export async function POST(request: NextRequest) {
  const corsHeaders = createCorsHeaders(request);

  try {
    const { searchParams } = new URL(request.url);
    const shop = searchParams.get("shop");

    if (!shop) {
      return NextResponse.json(
        { success: false, error: "Shop parameter required" },
        { status: 400, headers: corsHeaders }
      );
    }

    const fullShop = shop.includes(".myshopify.com")
      ? shop
      : `${shop}.myshopify.com`;

    const body = await request.json();
    const {
      include_products,
      include_collections,
      include_blog_posts,
      sync_schedule,
    } = body;

    const supabase = getSupabaseAdmin();

    // First get shop_id from shops table
    const { data: shopData, error: shopError } = await supabase
      .from("shops")
      .select("id")
      .eq("shop_domain", fullShop)
      .single();

    if (shopError || !shopData) {
      logger.error("Shop not found for llms settings update", shopError as Error, {
        component: "llms-settings",
        shop: fullShop,
      });
      return NextResponse.json(
        { success: false, error: "Shop not found" },
        { status: 404, headers: corsHeaders }
      );
    }

    // Calculate next_sync_at based on schedule
    let next_sync_at: string | null = null;
    if (sync_schedule === "daily") {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(0, 0, 0, 0); // Midnight
      next_sync_at = tomorrow.toISOString();
    } else if (sync_schedule === "weekly") {
      const nextWeek = new Date();
      nextWeek.setDate(nextWeek.getDate() + 7);
      nextWeek.setHours(0, 0, 0, 0); // Midnight
      next_sync_at = nextWeek.toISOString();
    }

    // Update settings
    const updateData: Partial<LlmsSettings> = {
      include_products: include_products ?? true,
      include_collections: include_collections ?? false,
      include_blog_posts: include_blog_posts ?? false,
      sync_schedule: sync_schedule ?? "none",
      next_sync_at,
    };

    const { data: settings, error: updateError } = await supabase
      .from("llms_settings")
      .upsert({
        shop_id: shopData.id,
        ...updateData,
      }, {
        onConflict: "shop_id",
      })
      .select()
      .single();

    if (updateError) {
      logger.error("Failed to update llms settings", updateError as Error, {
        component: "llms-settings",
        shop: fullShop,
      });
      return NextResponse.json(
        { success: false, error: "Failed to update settings" },
        { status: 500, headers: corsHeaders }
      );
    }

    logger.info("Updated llms settings", {
      component: "llms-settings",
      shop: fullShop,
      settings: updateData,
    });

    return NextResponse.json(
      { success: true, settings },
      { headers: corsHeaders }
    );
  } catch (error) {
    logger.error("Error in llms settings POST:", error as Error, {
      component: "llms-settings",
    });
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500, headers: corsHeaders }
    );
  }
}

export async function OPTIONS(request: NextRequest) {
  const corsHeaders = createCorsHeaders(request);
  return new NextResponse(null, { status: 204, headers: corsHeaders });
}
