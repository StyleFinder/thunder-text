/**
 * UGC Video Generation API Route
 *
 * POST /api/video/generate-ugc
 * Generates UGC-style videos using OpenAI Sora 2
 *
 * Flow:
 * 1. Authenticate request
 * 2. Check credit balance
 * 3. Generate creator persona with Gemini
 * 4. Generate UGC scripts with Gemini
 * 5. Start Sora video generation
 * 6. Return task ID for polling
 */

import { NextRequest, NextResponse } from "next/server";
import { getUserId } from "@/lib/auth/content-center-auth";
import { supabaseAdmin } from "@/lib/supabase";
import { logger } from "@/lib/logger";
import {
  startUGCVideoGeneration,
  SoraApiError,
  getEstimatedTime,
} from "@/lib/services/openai-sora-client";
import {
  generateUGCVideoPrompts,
  UGCGenerationResult,
} from "@/lib/services/ugc-prompt-generator";

/**
 * Route segment config
 * - 180s timeout for persona + script generation + Sora API call
 */
export const maxDuration = 180;
export const dynamic = "force-dynamic";

/**
 * Request body for UGC video generation
 */
interface GenerateUGCRequest {
  imageBase64: string;
  productName: string;
  scriptIndex?: number; // Which of the 3 generated scripts to use (0, 1, or 2)
}

/**
 * Response for UGC video generation
 */
interface GenerateUGCResponse {
  success: boolean;
  data?: {
    generationId: string;
    videoId: string;
    persona: UGCGenerationResult["persona"];
    selectedScript: UGCGenerationResult["scripts"][number];
    allScripts: UGCGenerationResult["scripts"];
    estimatedTimeSeconds: number;
  };
  error?: string;
  message?: string;
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
    return { hasCredits: false, balance: 0 };
  }

  return {
    hasCredits: data.balance > 0,
    balance: data.balance,
  };
}

/**
 * Create generation record and deduct credit
 */
async function createGenerationRecord(
  shopId: string,
  request: GenerateUGCRequest,
  ugcResult: UGCGenerationResult,
  scriptIndex: number,
  videoId: string,
): Promise<string> {
  // eslint-disable-next-line security/detect-object-injection
  const selectedScript = ugcResult.scripts[scriptIndex];
  // eslint-disable-next-line security/detect-object-injection
  const prompt = ugcResult.rawPrompts[scriptIndex];

  // Create generation record
  const { data: generationRecord, error: insertError } = await supabaseAdmin
    .from("video_generations")
    .insert({
      shop_id: shopId,
      source_image_url: `data:image/png;base64,${request.imageBase64.substring(0, 100)}...`, // Store truncated reference
      prompt: prompt.substring(0, 2000), // Truncate if too long
      model: "sora-2",
      aspect_ratio: "9:16",
      generation_type: "ugc", // UGC video type
      sora_video_id: videoId, // Sora video ID for polling
      status: "processing",
      credits_used: 2, // UGC videos cost 2 credits
      cost_usd: 1.0, // Approximate cost for 12-second Sora video
      ugc_persona: ugcResult.persona, // Store persona for reference
      ugc_script: selectedScript, // Store selected script
      ugc_product_name: request.productName,
      metadata: {
        allScripts: ugcResult.scripts,
        scriptIndex,
      },
    })
    .select("id")
    .single();

  if (insertError || !generationRecord) {
    logger.error(
      "Failed to create UGC generation record",
      insertError as Error,
      {
        component: "ugc-generate",
        shopId,
      },
    );
    throw new Error("Failed to create generation record");
  }

  // Deduct credits (2 for UGC video)
  const { data: deductResult, error: deductError } = await supabaseAdmin.rpc(
    "deduct_video_credit",
    {
      p_shop_id: shopId,
      p_video_generation_id: generationRecord.id,
      p_amount: 2,
    },
  );

  if (deductError || !deductResult) {
    // Rollback: delete the generation record
    await supabaseAdmin
      .from("video_generations")
      .delete()
      .eq("id", generationRecord.id);

    logger.error("Failed to deduct credit for UGC", deductError as Error, {
      component: "ugc-generate",
      shopId,
      generationId: generationRecord.id,
    });
    throw new Error("Failed to deduct credits");
  }

  return generationRecord.id;
}

export async function POST(
  request: NextRequest,
): Promise<NextResponse<GenerateUGCResponse>> {
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
    const body: GenerateUGCRequest = await request.json();

    if (!body.imageBase64 || !body.productName) {
      return NextResponse.json(
        {
          success: false,
          error: "Missing required fields: imageBase64 and productName",
        },
        { status: 400 },
      );
    }

    // Validate product name
    if (body.productName.length > 200) {
      return NextResponse.json(
        {
          success: false,
          error: "Product name must be less than 200 characters",
        },
        { status: 400 },
      );
    }

    const scriptIndex = body.scriptIndex ?? 0; // Default to first script
    if (scriptIndex < 0 || scriptIndex > 2) {
      return NextResponse.json(
        { success: false, error: "scriptIndex must be 0, 1, or 2" },
        { status: 400 },
      );
    }

    // 3. Check credit balance (UGC costs 2 credits)
    const creditCheck = await checkCreditBalance(userId);
    if (creditCheck.balance < 2) {
      return NextResponse.json(
        {
          success: false,
          error: "Insufficient credits. UGC videos require 2 credits.",
        },
        { status: 402 },
      );
    }

    // 4. Generate persona and scripts with Gemini
    logger.info("Starting UGC prompt generation", {
      component: "ugc-generate",
      shopId: userId,
      productName: body.productName,
    });

    let ugcResult: UGCGenerationResult;
    try {
      ugcResult = await generateUGCVideoPrompts(
        body.imageBase64,
        body.productName,
      );
    } catch (geminiError) {
      logger.error("UGC prompt generation failed", geminiError as Error, {
        component: "ugc-generate",
        shopId: userId,
      });
      return NextResponse.json(
        {
          success: false,
          error: "Failed to generate UGC scripts. Please try again.",
        },
        { status: 500 },
      );
    }

    // 5. Start Sora video generation
    let videoId: string;
    try {
      // eslint-disable-next-line security/detect-object-injection
      const selectedPrompt = ugcResult.rawPrompts[scriptIndex];

      videoId = await startUGCVideoGeneration({
        prompt: selectedPrompt,
        model: "sora-2",
        seconds: 12,
        size: "720x1280",
        inputReferenceImage: body.imageBase64,
      });
    } catch (soraError) {
      if (soraError instanceof SoraApiError) {
        logger.error("Sora generation failed", soraError, {
          component: "ugc-generate",
          errorCode: soraError.code,
          isContentPolicy: soraError.isContentPolicyViolation,
        });

        if (soraError.isContentPolicyViolation) {
          return NextResponse.json(
            {
              success: false,
              error: "CONTENT_POLICY_VIOLATION",
              message:
                "Your product or generated script was flagged by content moderation. " +
                "Try a different product image or name.",
            },
            { status: 400 },
          );
        }

        if (soraError.isRateLimited) {
          return NextResponse.json(
            {
              success: false,
              error: "Rate limited. Please try again in a few minutes.",
            },
            { status: 429 },
          );
        }

        return NextResponse.json(
          {
            success: false,
            error: `Video generation failed: ${soraError.message}`,
          },
          { status: 502 },
        );
      }
      throw soraError;
    }

    // 6. Create generation record and deduct credits
    const generationId = await createGenerationRecord(
      userId,
      body,
      ugcResult,
      scriptIndex,
      videoId,
    );

    // Calculate estimated time
    const estimatedTime = getEstimatedTime(12);

    const duration = Date.now() - startTime;
    logger.info("UGC video generation started", {
      component: "ugc-generate",
      shopId: userId,
      generationId,
      videoId,
      personaName: ugcResult.persona.name,
      scriptIndex,
      durationMs: duration,
    });

    return NextResponse.json(
      {
        success: true,
        data: {
          generationId,
          videoId,
          persona: ugcResult.persona,
          // eslint-disable-next-line security/detect-object-injection
          selectedScript: ugcResult.scripts[scriptIndex],
          allScripts: ugcResult.scripts,
          estimatedTimeSeconds: estimatedTime.maxSeconds,
        },
      },
      { status: 202 },
    );
  } catch (error) {
    logger.error("UGC video generation error", error as Error, {
      component: "ugc-generate",
    });

    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 },
    );
  }
}
