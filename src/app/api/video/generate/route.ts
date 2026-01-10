/**
 * Video Generation API Route
 *
 * POST /api/video/generate
 * Starts a product video generation using Kie.ai Veo 3.1
 *
 * Flow:
 * 1. Authenticate request
 * 2. Check credit balance
 * 3. Run Gemini quality pre-check
 * 4. Start Kie.ai generation
 * 5. Return task ID for polling
 */

import { NextRequest, NextResponse } from "next/server";
import { getUserId } from "@/lib/auth/content-center-auth";
import { supabaseAdmin } from "@/lib/supabase";
import { logger } from "@/lib/logger";
import {
  startVideoGeneration,
  KieModel,
  AspectRatio,
  KieApiError,
} from "@/lib/services/kie-ai-client";
import {
  checkImageQuality,
  QualityCheckResult,
} from "@/lib/services/gemini-vision-check";

/**
 * Route segment config
 * - 120s timeout for quality check + API call
 */
export const maxDuration = 120;
export const dynamic = "force-dynamic";

/**
 * Request body for video generation
 */
interface GenerateVideoRequest {
  imageUrl: string;
  prompt: string;
  model?: KieModel;
  aspectRatio?: AspectRatio;
  skipQualityCheck?: boolean;
}

/**
 * Response for video generation start
 */
interface GenerateVideoResponse {
  success: boolean;
  data?: {
    generationId: string;
    taskId: string;
    qualityCheck?: QualityCheckResult;
    estimatedTimeSeconds: number;
  };
  error?: string;
  qualityCheck?: QualityCheckResult;
}

/**
 * Check if shop has sufficient credits
 */
async function checkCreditBalance(shopId: string): Promise<{
  hasCredits: boolean;
  balance: number;
}> {
  const { data, error } = await supabaseAdmin
    .from("video_credits")
    .select("balance")
    .eq("shop_id", shopId)
    .single();

  if (error || !data) {
    // No credits record - shop needs to purchase credits
    return { hasCredits: false, balance: 0 };
  }

  return {
    hasCredits: data.balance > 0,
    balance: data.balance,
  };
}

/**
 * Deduct credit and create generation record
 */
async function createGenerationRecord(
  shopId: string,
  request: GenerateVideoRequest,
  qualityCheck: QualityCheckResult | null,
  taskId: string,
  model: KieModel,
): Promise<string> {
  // Start transaction: deduct credit and create record
  const { data: generationRecord, error: insertError } = await supabaseAdmin
    .from("video_generations")
    .insert({
      shop_id: shopId,
      source_image_url: request.imageUrl,
      prompt: request.prompt,
      model: model,
      aspect_ratio: request.aspectRatio || "16:9",
      generation_type: "360",
      kie_task_id: taskId,
      status: "processing",
      quality_check_passed: qualityCheck?.passed ?? null,
      quality_check_warnings: qualityCheck?.warnings ?? null,
      quality_check_skipped: request.skipQualityCheck ?? false,
      credits_used: 1,
      cost_usd: model === "veo3" ? 2.0 : 0.4,
    })
    .select("id")
    .single();

  if (insertError || !generationRecord) {
    logger.error("Failed to create generation record", insertError as Error, {
      component: "video-generate",
      shopId,
    });
    throw new Error("Failed to create generation record");
  }

  // Deduct credit using the database function
  const { data: deductResult, error: deductError } = await supabaseAdmin.rpc(
    "deduct_video_credit",
    {
      p_shop_id: shopId,
      p_video_generation_id: generationRecord.id,
      p_amount: 1,
    },
  );

  if (deductError || !deductResult) {
    // Rollback: delete the generation record
    await supabaseAdmin
      .from("video_generations")
      .delete()
      .eq("id", generationRecord.id);

    logger.error("Failed to deduct credit", deductError as Error, {
      component: "video-generate",
      shopId,
      generationId: generationRecord.id,
    });
    throw new Error("Failed to deduct credit");
  }

  return generationRecord.id;
}

export async function POST(
  request: NextRequest,
): Promise<NextResponse<GenerateVideoResponse>> {
  const startTime = Date.now();

  try {
    // 1. Authenticate
    const userId = await getUserId(request);
    if (!userId) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 },
      );
    }

    // 2. Parse request
    const body: GenerateVideoRequest = await request.json();

    if (!body.imageUrl || !body.prompt) {
      return NextResponse.json(
        {
          success: false,
          error: "Missing required fields: imageUrl and prompt",
        },
        { status: 400 },
      );
    }

    // Validate prompt length
    if (body.prompt.length > 2000) {
      return NextResponse.json(
        { success: false, error: "Prompt must be less than 2000 characters" },
        { status: 400 },
      );
    }

    const model: KieModel = body.model || "veo3_fast";

    // 3. Check credit balance
    const creditCheck = await checkCreditBalance(userId);
    if (!creditCheck.hasCredits) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Insufficient credits. Please purchase credits to generate videos.",
        },
        { status: 402 },
      );
    }

    // 4. Run quality pre-check (unless skipped)
    let qualityCheck: QualityCheckResult | null = null;
    if (!body.skipQualityCheck) {
      try {
        qualityCheck = await checkImageQuality(body.imageUrl);

        // If quality is too low and user didn't skip, warn them
        if (qualityCheck.recommendation === "stop") {
          return NextResponse.json(
            {
              success: false,
              error: "Image quality too low for video generation",
              qualityCheck,
            },
            { status: 422 },
          );
        }
      } catch (qualityError) {
        // Log but don't block - quality check is best-effort
        logger.warn("Quality check failed, proceeding anyway", {
          component: "video-generate",
          error: (qualityError as Error).message,
        });
      }
    }

    // 5. Start Kie.ai generation
    let taskId: string;
    try {
      taskId = await startVideoGeneration({
        prompt: body.prompt,
        imageUrls: [body.imageUrl],
        model,
        generationType: "REFERENCE_2_VIDEO",
        aspectRatio: body.aspectRatio || "16:9",
        enableTranslation: true,
      });
    } catch (kieError) {
      if (kieError instanceof KieApiError) {
        logger.error("Kie.ai generation failed", kieError, {
          component: "video-generate",
          kieCode: kieError.code,
          isContentPolicy: kieError.isContentPolicyViolation,
        });

        // Provide user-friendly message for content policy violations
        if (kieError.isContentPolicyViolation) {
          return NextResponse.json(
            {
              success: false,
              error: "CONTENT_POLICY_VIOLATION",
              message:
                "Your prompt was flagged by the AI content moderation system. " +
                "Please try a different prompt. Tips: Use specific, descriptive language " +
                "about camera movements and lighting. Avoid vague phrases like 'in use' or 'demonstrate'. " +
                "Focus on the product itself rather than implied human actions.",
            },
            { status: 400 },
          );
        }

        return NextResponse.json(
          {
            success: false,
            error: `Video generation failed: ${kieError.kieMessage}`,
          },
          { status: 502 },
        );
      }
      throw kieError;
    }

    // 6. Create generation record and deduct credit
    const generationId = await createGenerationRecord(
      userId,
      body,
      qualityCheck,
      taskId,
      model,
    );

    // Calculate estimated time
    const estimatedTimeSeconds = model === "veo3" ? 180 : 75;

    const duration = Date.now() - startTime;
    logger.info("Video generation started", {
      component: "video-generate",
      shopId: userId,
      generationId,
      taskId,
      model,
      durationMs: duration,
    });

    return NextResponse.json(
      {
        success: true,
        data: {
          generationId,
          taskId,
          qualityCheck: qualityCheck || undefined,
          estimatedTimeSeconds,
        },
      },
      { status: 202 },
    );
  } catch (error) {
    logger.error("Video generation error", error as Error, {
      component: "video-generate",
    });

    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 },
    );
  }
}
