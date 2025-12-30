import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { createClient } from "@supabase/supabase-js";
import { logger } from "@/lib/logger";
import { lookupShopWithFallback } from "@/lib/shop-lookup";
import { canGenerateAdByDomain } from "@/lib/usage/limits";
import { startRequestTracker } from "@/lib/monitoring/api-logger";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!,
);

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

/**
 * POST - Generate Facebook ad title and copy from product data using AI
 */
export async function POST(request: NextRequest) {
  const tracker = startRequestTracker();
  let shopId: string | null = null;

  try {
    const body = await request.json();
    const { shop, productTitle, productDescription } = body;

    if (!shop || !productTitle) {
      return NextResponse.json(
        { success: false, error: "Shop and product title are required" },
        { status: 400 },
      );
    }

    // Get shop data to verify it exists (with fallback for standalone users)
    const { data: shopData, error: shopError } = await lookupShopWithFallback<{
      id: string;
      shop_domain: string;
    }>(supabase, shop, "id, shop_domain", "generate-ad-content");

    if (shopError || !shopData) {
      return NextResponse.json(
        { success: false, error: "Shop not found" },
        { status: 404 },
      );
    }

    shopId = shopData.id;

    // Check usage limits before generating
    const usageCheck = await canGenerateAdByDomain(shop);
    if (!usageCheck.allowed) {
      logger.info("[Facebook Generate] Usage limit reached", {
        component: "facebook-generate-ad-content",
        shop,
        plan: usageCheck.plan,
        used: usageCheck.used,
        limit: usageCheck.limit,
      });

      // Log rate limited request
      await tracker.log({
        shopId,
        operationType: 'ad_generation',
        endpoint: '/api/facebook/generate-ad-content',
        model: 'gpt-4o-mini',
        status: 'rate_limited',
        metadata: { plan: usageCheck.plan, used: usageCheck.used, limit: usageCheck.limit },
      });

      return NextResponse.json(
        {
          success: false,
          error: usageCheck.error || "Monthly ad limit reached",
          usage: {
            current: usageCheck.used,
            limit: usageCheck.limit,
            remaining: usageCheck.remaining,
            plan: usageCheck.plan,
          },
        },
        { status: 403 },
      );
    }

    // Generate ad content using OpenAI
    const prompt = `You are a Facebook ad copywriter. Generate a compelling ad title and ad copy for this product.

Product Title: ${productTitle}
Product Description: ${productDescription || "No description provided"}

Requirements:
- Ad Title: Maximum 125 characters, attention-grabbing, includes key benefit
- Ad Copy: Maximum 125 characters, compelling call-to-action, creates urgency
- Use persuasive language that drives clicks
- Focus on benefits, not just features
- Make it conversion-focused

Return ONLY valid JSON in this exact format (no markdown, no code blocks):
{
  "title": "your ad title here",
  "copy": "your ad copy here"
}`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content:
            "You are an expert Facebook ad copywriter. Always return valid JSON without any markdown formatting or code blocks.",
        },
        {
          role: "user",
          content: prompt,
        },
      ],
      temperature: 0.7,
      max_tokens: 500,
    });

    const responseText = completion.choices[0]?.message?.content?.trim();

    if (!responseText) {
      throw new Error("No response from OpenAI");
    }

    // Parse the JSON response
    let adContent;
    try {
      adContent = JSON.parse(responseText);
    } catch {
      logger.error(
        `Failed to parse OpenAI response: ${responseText}`,
        undefined,
        { component: "generate-ad-content" },
      );
      throw new Error("Invalid response format from AI");
    }

    // Validate and truncate if needed
    const title = (adContent.title || "").substring(0, 125);
    const copy = (adContent.copy || "").substring(0, 125);

    if (!title || !copy) {
      throw new Error("AI generated invalid content");
    }

    // Log successful API request
    await tracker.log({
      shopId,
      operationType: 'ad_generation',
      endpoint: '/api/facebook/generate-ad-content',
      model: 'gpt-4o-mini',
      inputTokens: completion.usage?.prompt_tokens || 0,
      outputTokens: completion.usage?.completion_tokens || 0,
      status: 'success',
      metadata: { productTitle },
    });

    return NextResponse.json({
      success: true,
      data: {
        title,
        copy,
      },
    });
  } catch (error) {
    logger.error("Error generating ad content:", error as Error, {
      component: "generate-ad-content",
    });

    // Log failed API request
    await tracker.logError({
      shopId,
      operationType: 'ad_generation',
      endpoint: '/api/facebook/generate-ad-content',
      model: 'gpt-4o-mini',
      errorType: 'api_error',
      errorMessage: error instanceof Error ? error.message : 'Unknown error',
    });

    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to generate ad content",
      },
      { status: 500 },
    );
  }
}
