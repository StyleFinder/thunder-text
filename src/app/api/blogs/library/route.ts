import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/auth-options";
import { supabaseAdmin } from "@/lib/supabase";
import { withRateLimit, RATE_LIMITS } from "@/lib/middleware/rate-limit";
import { logger } from "@/lib/logger";
import type { BlogOption, FetchBlogsResponse } from "@/types/blog-linking";

/**
 * GET /api/blogs/library
 * Fetch blog posts from the Content Library (generated_content table)
 *
 * Query parameters:
 * - store_id: Store UUID (required)
 * - limit: Maximum number of blogs to return (default: 20, max: 50)
 * - search: Search in topic and content text
 * - saved_only: Only return saved blogs (default: true)
 */
export async function GET(
  request: NextRequest
): Promise<NextResponse<{ success: boolean; data?: FetchBlogsResponse; error?: string }>> {
  try {
    // Authenticate user
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const userId = session.user.id;

    // Rate limiting
    const rateLimitCheck = await withRateLimit(RATE_LIMITS.READ)(request, userId);
    if (rateLimitCheck) {
      return rateLimitCheck as NextResponse<{ success: boolean; data?: FetchBlogsResponse; error?: string }>;
    }

    const { searchParams } = new URL(request.url);

    // Parse query parameters
    const storeId = searchParams.get("store_id");
    const limitParam = parseInt(searchParams.get("limit") || "20");
    const limit = Math.min(Math.max(1, limitParam), 50); // Clamp between 1 and 50
    const search = searchParams.get("search");
    const savedOnly = searchParams.get("saved_only") !== "false"; // Default true

    // Note: The generated_content table uses the user's session ID as store_id,
    // not the shop UUID or shop domain. The storeId param may be a shop domain
    // (from BlogLinkingSection) but we query using the authenticated user's ID.
    // This ensures users only see their own content.

    // For admin/coach users, they can optionally query another user's content
    // by passing a specific user ID as store_id
    let queryStoreId = userId;

    if (storeId && storeId !== userId) {
      // Check if user is admin/coach to query another user's content
      if (session.user.role === "admin" || session.user.role === "coach") {
        // If storeId looks like a shop domain, resolve it to user_id
        if (storeId.includes(".myshopify.com") || storeId.includes(".")) {
          const { data: shopData } = await supabaseAdmin
            .from("shops")
            .select("user_id")
            .eq("shop_domain", storeId.includes(".myshopify.com") ? storeId : `${storeId}.myshopify.com`)
            .single();

          if (shopData?.user_id) {
            queryStoreId = shopData.user_id;
          }
        } else {
          // Treat as user ID directly
          queryStoreId = storeId;
        }

        // M3 SECURITY: Audit log admin/coach cross-user access
        logger.info("Admin/coach cross-user access", {
          component: "blogs-library",
          action: "cross_user_access",
          actorId: userId,
          actorRole: session.user.role,
          targetUserId: queryStoreId,
          requestedStoreId: storeId,
        });
      }
      // For regular users, ignore the storeId param and use their own userId
    }

    // Build query for blogs only
    let query = supabaseAdmin
      .from("generated_content")
      .select("id, topic, generated_text, word_count, created_at, is_saved", { count: "exact" })
      .eq("store_id", queryStoreId)
      .eq("content_type", "blog");

    // Only return saved blogs by default
    if (savedOnly) {
      query = query.eq("is_saved", true);
    }

    // Apply search filter
    if (search) {
      query = query.or(`topic.ilike.%${search}%,generated_text.ilike.%${search}%`);
    }

    // Order by most recent first, limit results
    query = query.order("created_at", { ascending: false }).limit(limit);

    const { data, error, count } = await query;

    if (error) {
      logger.error("Error fetching library blogs:", error as Error, {
        component: "blogs-library",
        storeId: queryStoreId,
      });
      return NextResponse.json(
        { success: false, error: "Failed to fetch blogs" },
        { status: 500 }
      );
    }

    // Transform to BlogOption format
    const blogs: BlogOption[] = (data || []).map((item) => ({
      id: item.id,
      title: item.topic || "Untitled Blog",
      excerpt: extractExcerpt(item.generated_text, 150),
      createdAt: item.created_at,
      source: "library" as const,
    }));

    logger.debug("Fetched library blogs", {
      component: "blogs-library",
      storeId: queryStoreId,
      count: blogs.length,
    });

    return NextResponse.json({
      success: true,
      data: {
        blogs,
        totalCount: count || 0,
      },
    });
  } catch (error) {
    logger.error("Error in GET /api/blogs/library:", error as Error, {
      component: "blogs-library",
    });
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * Extract a plain text excerpt from HTML content
 */
function extractExcerpt(htmlContent: string | null, maxLength: number): string {
  if (!htmlContent) return "";

  // Strip HTML tags
  const plainText = htmlContent.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();

  // Truncate to max length
  if (plainText.length <= maxLength) {
    return plainText;
  }

  // Find last space before maxLength to avoid cutting words
  const truncated = plainText.substring(0, maxLength);
  const lastSpace = truncated.lastIndexOf(" ");

  return lastSpace > 0 ? truncated.substring(0, lastSpace) + "..." : truncated + "...";
}
