import { NextRequest, NextResponse } from "next/server";
import {
  ApiResponse,
  GenerateContentRequest,
  GenerateContentResponse,
  VoiceProfileNotFoundError,
} from "@/types/content-center";
import { getUserId } from "@/lib/auth/content-center-auth";
import { supabaseAdmin } from "@/lib/supabase";
import { withRateLimit, RATE_LIMITS } from "@/lib/middleware/rate-limit";
import { generateContent } from "@/lib/services/content-generator";
import { postProcessContent } from "@/lib/services/content-post-processor";
import { validateWordCountForType } from "@/lib/services/parameter-handler";

/**
 * POST /api/content-center/generate
 * Generate content using user's brand voice profile
 */
export async function POST(
  request: NextRequest,
): Promise<NextResponse<ApiResponse<GenerateContentResponse>>> {
  const startTime = Date.now();

  try {
    const userId = await getUserId(request);

    if (!userId) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 },
      );
    }

    // Rate limiting for content generation
    const rateLimitCheck = await withRateLimit(RATE_LIMITS.GENERATION)(
      request,
      userId,
    );
    if (rateLimitCheck)
      return rateLimitCheck as NextResponse<
        ApiResponse<GenerateContentResponse>
      >;

    const body: GenerateContentRequest = await request.json();

    // Validation
    if (!body.content_type || !body.topic) {
      return NextResponse.json(
        {
          success: false,
          error: "Missing required fields: content_type and topic",
        },
        { status: 400 },
      );
    }

    // Validate word count for content type
    const wordCountValidation = validateWordCountForType(
      body.content_type,
      body.word_count,
    );
    if (!wordCountValidation.valid) {
      return NextResponse.json(
        { success: false, error: wordCountValidation.message },
        { status: 400 },
      );
    }

    if (body.tone_intensity < 1 || body.tone_intensity > 5) {
      return NextResponse.json(
        { success: false, error: "Tone intensity must be between 1 and 5" },
        { status: 400 },
      );
    }

    // Get current voice profile
    const { data: profile, error: profileError } = await supabaseAdmin
      .from("brand_voice_profiles")
      .select("*")
      .eq("store_id", userId)
      .eq("is_current", true)
      .single();

    if (profileError || !profile) {
      throw new VoiceProfileNotFoundError();
    }

    // Generate content using OpenAI
    const generationResult = await generateContent(profile, {
      contentType: body.content_type,
      topic: body.topic,
      wordCount: body.word_count,
      toneIntensity: body.tone_intensity,
      ctaType: body.cta_type,
      customCTA: body.custom_cta,
      platform: body.platform,
      additionalContext: body.additional_context,
    });

    // Post-process content
    const postProcessed = postProcessContent(
      generationResult.content,
      body.content_type,
      {
        removeAIArtifacts: true,
        formatMarkdown: true,
        addMetadata: true,
      },
    );

    const finalContent = postProcessed.content;
    const wordCount = postProcessed.finalWordCount;

    // Store generated content
    // NOTE: generation_metadata field exists in DB but PostgREST schema cache hasn't refreshed yet
    // Will automatically work once Supabase refreshes the cache (typically within 24 hours)
    // Column was added via migration but PostgREST NOTIFY commands insufficient for hosted instances
    const { data: generatedContent, error: contentError } = await supabaseAdmin
      .from("generated_content")
      .insert({
        store_id: userId,
        content_type: body.content_type,
        platform: body.platform || null,
        topic: body.topic,
        generated_text: finalContent,
        word_count: wordCount,
        generation_params: {
          word_count: body.word_count,
          tone_intensity: body.tone_intensity,
          cta_type: body.cta_type,
          custom_cta: body.custom_cta,
        },
        // generation_metadata: {
        //   tokensUsed: generationResult.tokensUsed,
        //   generationTimeMs: generationResult.generationTimeMs,
        //   voiceProfileVersion: generationResult.metadata.voiceProfileVersion,
        //   postProcessing: postProcessed.modifications,
        // },
        product_images: body.product_images || null,
        is_saved: body.save || false,
      })
      .select()
      .single();

    if (contentError) {
      console.error("Error storing generated content:", contentError);
      return NextResponse.json(
        { success: false, error: "Failed to store generated content" },
        { status: 500 },
      );
    }

    const generationTime = Date.now() - startTime;

    // Calculate cost estimate (GPT-4 pricing: $0.03/1K input, $0.06/1K output)
    const inputCost = ((generationResult.tokensUsed * 0.5) / 1000) * 0.03;
    const outputCost = ((generationResult.tokensUsed * 0.5) / 1000) * 0.06;
    const costEstimate = inputCost + outputCost;

    return NextResponse.json(
      {
        success: true,
        data: {
          content: generatedContent,
          generation_time_ms: generationTime,
          cost_estimate: costEstimate,
        },
      },
      { status: 201 },
    );
  } catch (error) {
    console.error("Error in POST /api/content-center/generate:", error);

    if (error instanceof VoiceProfileNotFoundError) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: error.statusCode },
      );
    }

    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 },
    );
  }
}
