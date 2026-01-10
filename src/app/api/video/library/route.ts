/**
 * Video Library API Route
 *
 * GET /api/video/library
 * List all generated videos for the current user
 *
 * Returns completed videos that can be downloaded/exported
 */

import { NextRequest, NextResponse } from "next/server";
import { getUserId } from "@/lib/auth/content-center-auth";
import { supabaseAdmin } from "@/lib/supabase";
import { logger } from "@/lib/logger";

export const dynamic = "force-dynamic";

interface VideoItem {
  id: string;
  videoUrl: string;
  thumbnailUrl?: string;
  sourceImageUrl: string;
  prompt: string;
  model: string;
  aspectRatio: string;
  durationSeconds?: number;
  status: string;
  createdAt: string;
  completedAt?: string;
  expiresAt?: string;
  daysUntilExpiration?: number;
  generationType?: "360" | "ugc";
  ugcProductName?: string;
}

interface LibraryResponse {
  success: boolean;
  data?: {
    videos: VideoItem[];
    total: number;
  };
  error?: string;
}

export async function GET(
  request: NextRequest,
): Promise<NextResponse<LibraryResponse>> {
  try {
    // 1. Authenticate
    const userId = await getUserId(request);
    if (!userId) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 },
      );
    }

    // 2. Get query params for pagination
    const { searchParams } = new URL(request.url);
    const limit = Math.min(parseInt(searchParams.get("limit") || "20", 10), 50);
    const offset = parseInt(searchParams.get("offset") || "0", 10);

    // 3. Fetch videos from database (only non-expired)
    logger.debug("Fetching video library", {
      component: "video-library",
      userId,
      limit,
      offset,
    });

    const {
      data: videos,
      error: fetchError,
      count,
    } = await supabaseAdmin
      .from("video_generations")
      .select("*", { count: "exact" })
      .eq("shop_id", userId)
      .in("status", ["completed", "processing", "pending", "failed"])
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (fetchError) {
      logger.error(
        "Database query failed for video library",
        fetchError as Error,
        {
          component: "video-library",
          userId,
        },
      );
      throw fetchError;
    }

    logger.debug("Video library query result", {
      component: "video-library",
      userId,
      videosFound: videos?.length ?? 0,
      totalCount: count,
    });

    // Filter out expired videos in application code
    // (more reliable than complex OR clauses in PostgREST)
    const now = new Date();
    const nonExpiredVideos = (videos || []).filter((v) => {
      if (!v.expires_at) return true;
      return new Date(v.expires_at) > now;
    });

    // 4. Transform to response format with expiration info
    const videoItems: VideoItem[] = nonExpiredVideos.map((v) => {
      // Calculate days until expiration
      let daysUntilExpiration: number | undefined;
      if (v.expires_at) {
        const expiresDate = new Date(v.expires_at);
        const nowDate = new Date();
        const diffTime = expiresDate.getTime() - nowDate.getTime();
        daysUntilExpiration = Math.max(
          0,
          Math.ceil(diffTime / (1000 * 60 * 60 * 24)),
        );
      }

      return {
        id: v.id,
        videoUrl: v.video_url || "",
        thumbnailUrl: v.thumbnail_url,
        sourceImageUrl: v.source_image_url,
        prompt: v.prompt,
        model: v.model,
        aspectRatio: v.aspect_ratio,
        durationSeconds: v.duration_seconds,
        status: v.status,
        createdAt: v.created_at,
        completedAt: v.completed_at,
        expiresAt: v.expires_at,
        daysUntilExpiration,
        // Normalize legacy "REFERENCE_2_VIDEO" to "360"
        generationType: (v.generation_type === "REFERENCE_2_VIDEO"
          ? "360"
          : v.generation_type) as "360" | "ugc" | undefined,
        ugcProductName: v.ugc_product_name,
      };
    });

    logger.info("Video library fetched", {
      component: "video-library",
      shopId: userId,
      count: videoItems.length,
      total: count,
    });

    return NextResponse.json({
      success: true,
      data: {
        videos: videoItems,
        total: count || 0,
      },
    });
  } catch (error) {
    logger.error("Video library fetch error", error as Error, {
      component: "video-library",
    });

    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 },
    );
  }
}
