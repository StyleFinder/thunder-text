import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth/auth-options";
import { logger } from "@/lib/logger";
import { supabaseAdmin } from "@/lib/supabase/admin";
import {
  getSystemPrompt,
  getCategoryTemplates,
  getCategoryTemplate,
  getGlobalDefaultTemplate,
  updateSystemPrompt,
  type ProductCategory,
} from "@/lib/prompts";

/**
 * Helper to authenticate and get shop ID from session
 *
 * SECURITY: Uses session-based authentication instead of trusting store_id param.
 * Shop ID is derived from the authenticated user's session.
 */
async function getAuthenticatedShopId(): Promise<{
  shopId: string | null;
  error?: string;
  status?: number;
}> {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    return { shopId: null, error: "Authentication required", status: 401 };
  }

  const shopDomain = (session.user as { shopDomain?: string }).shopDomain;
  if (!shopDomain) {
    return {
      shopId: null,
      error: "No shop associated with account",
      status: 403,
    };
  }

  // Get shop_id from database using session's shop domain
  const { data: shopData, error: shopError } = await supabaseAdmin
    .from("shops")
    .select("id")
    .eq("shop_domain", shopDomain)
    .single();

  if (shopError || !shopData) {
    logger.error("Error fetching shop for prompts:", shopError as Error, {
      component: "prompts",
    });
    return { shopId: null, error: "Shop not found", status: 404 };
  }

  return { shopId: shopData.id };
}

/**
 * GET /api/prompts
 *
 * Get all prompts for the authenticated shop
 *
 * SECURITY: Uses session-based authentication. The store_id param is IGNORED -
 * shop ID is derived from the authenticated session.
 */
export async function GET(request: NextRequest) {
  if (
    !process.env.NEXT_PUBLIC_SUPABASE_URL ||
    process.env.NEXT_PUBLIC_SUPABASE_URL === "https://placeholder.supabase.co"
  ) {
    return NextResponse.json(
      { error: "Application not properly configured" },
      { status: 503 },
    );
  }

  try {
    // SECURITY: Get shop ID from session, not from query params
    const auth = await getAuthenticatedShopId();
    if (!auth.shopId) {
      return NextResponse.json(
        { error: auth.error },
        { status: auth.status || 401 },
      );
    }

    const storeId = auth.shopId;
    const { searchParams } = new URL(request.url);
    const category = searchParams.get("category") as ProductCategory;

    // Note: store_id from query params is ignored - we use session-derived shopId

    // Check if requesting global default template
    const getDefault = searchParams.get("get_default");
    if (getDefault === "true") {
      const defaultTemplate = await getGlobalDefaultTemplate(storeId);
      return NextResponse.json({ default_template: defaultTemplate });
    }

    // If specific category requested, return just that template
    if (category) {
      const template = await getCategoryTemplate(storeId, category);
      return NextResponse.json({ category_template: template });
    }

    // Otherwise return system prompt and all category templates
    const [systemPrompt, categoryTemplates] = await Promise.all([
      getSystemPrompt(storeId),
      getCategoryTemplates(storeId),
    ]);

    return NextResponse.json({
      system_prompt: systemPrompt,
      category_templates: categoryTemplates,
    });
  } catch (error) {
    logger.error("Error in GET /api/prompts:", error as Error, {
      component: "prompts",
    });
    return NextResponse.json(
      { error: "Failed to fetch prompts" },
      { status: 500 },
    );
  }
}

/**
 * PUT /api/prompts
 *
 * Update system prompt or category template
 *
 * SECURITY: Uses session-based authentication. The store_id in body is IGNORED -
 * shop ID is derived from the authenticated session.
 */
export async function PUT(request: NextRequest) {
  if (
    !process.env.NEXT_PUBLIC_SUPABASE_URL ||
    process.env.NEXT_PUBLIC_SUPABASE_URL === "https://placeholder.supabase.co"
  ) {
    return NextResponse.json(
      { error: "Application not properly configured" },
      { status: 503 },
    );
  }

  try {
    // SECURITY: Get shop ID from session, not from request body
    const auth = await getAuthenticatedShopId();
    if (!auth.shopId) {
      return NextResponse.json(
        { error: auth.error },
        { status: auth.status || 401 },
      );
    }

    const storeId = auth.shopId;
    const body = await request.json();
    const { type, content, name, template_id } = body;

    // Note: store_id from body is ignored - we use session-derived shopId

    if (!content) {
      return NextResponse.json(
        { error: "Content is required" },
        { status: 400 },
      );
    }

    let result: unknown = null;

    if (type === "system_prompt") {
      result = await updateSystemPrompt(storeId, content, name);
    } else if (type === "category_template" && template_id) {
      // Auto-generate category slug from template name if name changed
      const categorySlug = name
        ? name
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, "_")
            .replace(/^_|_$/g, "")
        : undefined;

      // SECURITY: Update template with session-derived store ID
      const { data, error } = await supabaseAdmin
        .from("category_templates")
        .update({
          ...(name && { name, category: categorySlug }),
          content,
          updated_at: new Date().toISOString(),
        })
        .eq("id", template_id)
        .eq("store_id", storeId) // SECURITY: Use session-derived storeId
        .select()
        .single();

      if (error) {
        logger.error("Error updating template:", error as Error, {
          component: "prompts",
        });
        return NextResponse.json(
          { error: "Failed to update template" },
          { status: 500 },
        );
      }

      result = data;
    } else {
      return NextResponse.json(
        { error: "Invalid type or missing template_id for template update" },
        { status: 400 },
      );
    }

    if (!result) {
      return NextResponse.json(
        { error: "Failed to update prompt" },
        { status: 500 },
      );
    }

    return NextResponse.json({ success: true, data: result });
  } catch (error) {
    logger.error("Error in PUT /api/prompts:", error as Error, {
      component: "prompts",
    });
    return NextResponse.json(
      { error: "Failed to update prompt" },
      { status: 500 },
    );
  }
}

/**
 * POST /api/prompts
 *
 * Create new template
 *
 * SECURITY: Uses session-based authentication. The store_id in body is IGNORED -
 * shop ID is derived from the authenticated session.
 */
export async function POST(request: NextRequest) {
  if (
    !process.env.NEXT_PUBLIC_SUPABASE_URL ||
    process.env.NEXT_PUBLIC_SUPABASE_URL === "https://placeholder.supabase.co"
  ) {
    return NextResponse.json(
      { error: "Application not properly configured" },
      { status: 503 },
    );
  }

  try {
    // SECURITY: Get shop ID from session, not from request body
    const auth = await getAuthenticatedShopId();
    if (!auth.shopId) {
      return NextResponse.json(
        { error: auth.error },
        { status: auth.status || 401 },
      );
    }

    const storeId = auth.shopId;
    const body = await request.json();
    const { type, content, name } = body;

    // Note: store_id from body is ignored - we use session-derived shopId

    if (type !== "category_template" || !content || !name) {
      return NextResponse.json(
        { error: "Missing required fields for template creation" },
        { status: 400 },
      );
    }

    // Auto-generate category slug from template name
    const categorySlug = name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "_")
      .replace(/^_|_$/g, "");

    // SECURITY: Create template with session-derived store ID
    const { data, error } = await supabaseAdmin
      .from("category_templates")
      .insert({
        store_id: storeId, // SECURITY: Use session-derived storeId, not from body
        category: categorySlug,
        name,
        content,
        is_default: false,
        is_active: true,
      })
      .select()
      .single();

    if (error) {
      logger.error("Error creating template:", error as Error, {
        component: "prompts",
      });
      return NextResponse.json(
        { error: "Failed to create template" },
        { status: 500 },
      );
    }

    return NextResponse.json({ success: true, data });
  } catch (error) {
    logger.error("Error in POST /api/prompts:", error as Error, {
      component: "prompts",
    });
    return NextResponse.json(
      { error: "Failed to create template" },
      { status: 500 },
    );
  }
}
