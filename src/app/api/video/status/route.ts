/**
 * Video Generation Status API Route
 *
 * GET /api/video/status?id={generationId}
 * Poll for the status of a video generation
 *
 * This route supports both:
 * - Kie.ai (Veo 3) for 360° product videos
 * - OpenAI Sora 2 for UGC-style videos
 *
 * When complete, it downloads the video to Supabase storage.
 */

import { NextRequest, NextResponse } from "next/server";
import { getUserId } from "@/lib/auth/content-center-auth";
import { supabaseAdmin } from "@/lib/supabase";
import { logger } from "@/lib/logger";
import { getTaskStatus, KieApiError } from "@/lib/services/kie-ai-client";
import {
  getVideoStatus as getSoraStatus,
  getVideoContent as getSoraContent,
  SoraApiError,
} from "@/lib/services/openai-sora-client";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

interface StatusResponse {
  success: boolean;
  data?: {
    id: string;
    status: "pending" | "processing" | "completed" | "failed" | "refunded";
    progress?: number;
    videoUrl?: string;
    thumbnailUrl?: string;
    duration?: number;
    error?: string;
    createdAt: string;
    completedAt?: string;
  };
  error?: string;
}

/**
 * Download video from URL and upload to Supabase storage
 */
async function storeVideoFromUrl(
  videoUrl: string,
  generationId: string,
  shopId: string,
): Promise<string> {
  try {
    // Download video from external URL
    const response = await fetch(videoUrl);
    if (!response.ok) {
      throw new Error(`Failed to download video: ${response.statusText}`);
    }

    const videoBuffer = await response.arrayBuffer();
    const fileName = `${shopId}/${generationId}.mp4`;

    // Upload to Supabase storage
    const { error: uploadError } = await supabaseAdmin.storage
      .from("product-videos")
      .upload(fileName, videoBuffer, {
        contentType: "video/mp4",
        upsert: true,
      });

    if (uploadError) {
      logger.error("Failed to upload video to storage", uploadError as Error, {
        component: "video-status",
        generationId,
        bucketError: uploadError.message,
      });
      // Throw error instead of silently falling back to external URL
      // External URLs are temporary and will expire
      throw new Error(`Storage upload failed: ${uploadError.message}`);
    }

    // Get public URL
    const { data: urlData } = supabaseAdmin.storage
      .from("product-videos")
      .getPublicUrl(fileName);

    logger.info("Video stored in Supabase", {
      component: "video-status",
      generationId,
      storagePath: fileName,
    });

    return urlData.publicUrl;
  } catch (error) {
    logger.error("Video storage failed", error as Error, {
      component: "video-status",
      generationId,
    });
    // Return original URL as fallback
    return videoUrl;
  }
}

/**
 * Store video from base64 data URL to Supabase storage
 */
async function storeVideoFromBase64(
  dataUrl: string,
  generationId: string,
  shopId: string,
): Promise<string> {
  try {
    // Extract base64 data from data URL (format: data:video/mp4;base64,...)
    const matches = dataUrl.match(/^data:([^;]+);base64,(.+)$/);
    if (!matches) {
      throw new Error("Invalid data URL format");
    }

    const contentType = matches[1];
    const base64Data = matches[2];
    const videoBuffer = Buffer.from(base64Data, "base64");
    const fileName = `${shopId}/${generationId}.mp4`;

    logger.info("Storing UGC video from base64", {
      component: "video-status",
      generationId,
      contentType,
      sizeBytes: videoBuffer.length,
    });

    // Upload to Supabase storage
    const { error: uploadError } = await supabaseAdmin.storage
      .from("product-videos")
      .upload(fileName, videoBuffer, {
        contentType: contentType || "video/mp4",
        upsert: true,
      });

    if (uploadError) {
      logger.error("Failed to upload video to storage", uploadError as Error, {
        component: "video-status",
        generationId,
      });
      throw uploadError;
    }

    // Get public URL
    const { data: urlData } = supabaseAdmin.storage
      .from("product-videos")
      .getPublicUrl(fileName);

    logger.info("UGC video stored in Supabase", {
      component: "video-status",
      generationId,
      storagePath: fileName,
    });

    return urlData.publicUrl;
  } catch (error) {
    logger.error("Video storage from base64 failed", error as Error, {
      component: "video-status",
      generationId,
    });
    throw error;
  }
}

/**
 * Poll Kie.ai for 360° video status
 */
async function pollKieStatus(
  generation: Record<string, unknown>,
  generationId: string,
  userId: string,
): Promise<NextResponse<StatusResponse>> {
  try {
    const taskStatus = await getTaskStatus(generation.kie_task_id as string);

    if (taskStatus.status === "completed" && taskStatus.result) {
      // Store video in Supabase
      const storedVideoUrl = await storeVideoFromUrl(
        taskStatus.result.videoUrl,
        generationId,
        userId,
      );

      // Update generation record
      await supabaseAdmin
        .from("video_generations")
        .update({
          status: "completed",
          video_url: storedVideoUrl,
          thumbnail_url: taskStatus.result.thumbnailUrl,
          duration_seconds: taskStatus.result.duration,
          completed_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("id", generationId);

      logger.info("360° video generation completed", {
        component: "video-status",
        generationId,
        duration: taskStatus.result.duration,
      });

      return NextResponse.json({
        success: true,
        data: {
          id: generation.id as string,
          status: "completed",
          videoUrl: storedVideoUrl,
          thumbnailUrl: taskStatus.result.thumbnailUrl,
          duration: taskStatus.result.duration,
          createdAt: generation.created_at as string,
          completedAt: new Date().toISOString(),
        },
      });
    }

    if (taskStatus.status === "failed") {
      await supabaseAdmin
        .from("video_generations")
        .update({
          status: "failed",
          error_message: taskStatus.error || "Generation failed",
          error_code: "KIE_FAILED",
          updated_at: new Date().toISOString(),
        })
        .eq("id", generationId);

      logger.warn("360° video generation failed", {
        component: "video-status",
        generationId,
        error: taskStatus.error,
      });

      return NextResponse.json({
        success: true,
        data: {
          id: generation.id as string,
          status: "failed",
          error: taskStatus.error || "Video generation failed",
          createdAt: generation.created_at as string,
        },
      });
    }

    // Still processing
    return NextResponse.json({
      success: true,
      data: {
        id: generation.id as string,
        status: "processing",
        progress: taskStatus.progress,
        createdAt: generation.created_at as string,
      },
    });
  } catch (kieError) {
    if (kieError instanceof KieApiError) {
      logger.error("Kie.ai status check failed", kieError, {
        component: "video-status",
        generationId,
        kieCode: kieError.code,
      });

      return NextResponse.json({
        success: true,
        data: {
          id: generation.id as string,
          status: "processing",
          createdAt: generation.created_at as string,
        },
      });
    }
    throw kieError;
  }
}

/**
 * Poll OpenAI Sora for UGC video status
 */
async function pollSoraStatus(
  generation: Record<string, unknown>,
  generationId: string,
  userId: string,
): Promise<NextResponse<StatusResponse>> {
  try {
    const videoId = generation.sora_video_id as string;
    const soraStatus = await getSoraStatus(videoId);

    if (soraStatus.status === "completed") {
      // Get the video content (returns base64 data URL from Sora API)
      const content = await getSoraContent(videoId);

      let storedVideoUrl: string;

      if (content.data) {
        // Video content is base64 data URL
        storedVideoUrl = await storeVideoFromBase64(
          content.data,
          generationId,
          userId,
        );
      } else if (content.url) {
        // Fallback to URL if available
        storedVideoUrl = await storeVideoFromUrl(
          content.url,
          generationId,
          userId,
        );
      } else {
        throw new SoraApiError(
          "Video completed but no content available",
          "no_content",
          500,
        );
      }

      // Update generation record
      await supabaseAdmin
        .from("video_generations")
        .update({
          status: "completed",
          video_url: storedVideoUrl,
          duration_seconds: 12, // UGC videos are always 12 seconds
          completed_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("id", generationId);

      logger.info("UGC video generation completed", {
        component: "video-status",
        generationId,
        videoId,
      });

      return NextResponse.json({
        success: true,
        data: {
          id: generation.id as string,
          status: "completed",
          videoUrl: storedVideoUrl,
          duration: 12,
          createdAt: generation.created_at as string,
          completedAt: new Date().toISOString(),
        },
      });
    }

    if (soraStatus.status === "failed") {
      const errorMessage =
        soraStatus.error?.message || "UGC video generation failed";
      const errorCode = soraStatus.error?.code || "SORA_FAILED";

      await supabaseAdmin
        .from("video_generations")
        .update({
          status: "failed",
          error_message: errorMessage,
          error_code: errorCode,
          updated_at: new Date().toISOString(),
        })
        .eq("id", generationId);

      logger.warn("UGC video generation failed", {
        component: "video-status",
        generationId,
        error: errorMessage,
      });

      return NextResponse.json({
        success: true,
        data: {
          id: generation.id as string,
          status: "failed",
          error: errorMessage,
          createdAt: generation.created_at as string,
        },
      });
    }

    // Still processing (queued or processing)
    return NextResponse.json({
      success: true,
      data: {
        id: generation.id as string,
        status: "processing",
        createdAt: generation.created_at as string,
      },
    });
  } catch (soraError) {
    if (soraError instanceof SoraApiError) {
      logger.error("Sora status check failed", soraError, {
        component: "video-status",
        generationId,
        soraCode: soraError.code,
      });

      // Don't fail the request - just return current status
      return NextResponse.json({
        success: true,
        data: {
          id: generation.id as string,
          status: "processing",
          createdAt: generation.created_at as string,
        },
      });
    }
    throw soraError;
  }
}

export async function GET(
  request: NextRequest,
): Promise<NextResponse<StatusResponse>> {
  try {
    // 1. Authenticate
    const userId = await getUserId(request);
    if (!userId) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 },
      );
    }

    // 2. Get generation ID from query
    const { searchParams } = new URL(request.url);
    const generationId = searchParams.get("id");

    if (!generationId) {
      return NextResponse.json(
        { success: false, error: "Missing generation ID" },
        { status: 400 },
      );
    }

    // 3. Fetch generation record
    const { data: generation, error: fetchError } = await supabaseAdmin
      .from("video_generations")
      .select("*")
      .eq("id", generationId)
      .eq("shop_id", userId)
      .single();

    if (fetchError || !generation) {
      return NextResponse.json(
        { success: false, error: "Generation not found" },
        { status: 404 },
      );
    }

    // 4. If already completed or failed, return cached result
    if (generation.status === "completed" || generation.status === "refunded") {
      return NextResponse.json({
        success: true,
        data: {
          id: generation.id,
          status: generation.status,
          videoUrl: generation.video_url,
          thumbnailUrl: generation.thumbnail_url,
          duration: generation.duration_seconds,
          createdAt: generation.created_at,
          completedAt: generation.completed_at,
        },
      });
    }

    if (generation.status === "failed") {
      return NextResponse.json({
        success: true,
        data: {
          id: generation.id,
          status: "failed",
          error: generation.error_message,
          createdAt: generation.created_at,
        },
      });
    }

    // 5. Determine generation type and poll appropriate API
    const isUGC = generation.generation_type === "ugc";
    const taskId = isUGC ? generation.sora_video_id : generation.kie_task_id;

    if (!taskId) {
      return NextResponse.json({
        success: true,
        data: {
          id: generation.id,
          status: "pending",
          createdAt: generation.created_at,
        },
      });
    }

    // 6. Poll based on generation type
    if (isUGC) {
      // Poll Sora for UGC videos
      return await pollSoraStatus(generation, generationId, userId);
    } else {
      // Poll Kie.ai for 360° videos
      return await pollKieStatus(generation, generationId, userId);
    }
  } catch (error) {
    logger.error("Status check error", error as Error, {
      component: "video-status",
    });

    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 },
    );
  }
}
