import { NextRequest, NextResponse } from "next/server";
import { openai } from "@/lib/openai";
import type { ProductCategory } from "@/lib/prompts-types";
import {
  buildUnifiedPrompt,
  type ProductContext,
} from "@/lib/prompts/unified-prompt-builder";
import { logger } from "@/lib/logger";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { canGenerateProductDescriptionByDomain } from "@/lib/usage/limits";
import { generateFAQHTML } from "@/lib/templates/faq-template";

interface CreateProductRequest {
  images: string[]; // base64 encoded images
  category: string;
  sizing: string;
  template: string;
  productType?: string;
  fabricMaterial: string;
  occasionUse: string;
  targetAudience: string;
  keyFeatures: string;
  additionalNotes: string;
}

export async function POST(request: NextRequest) {
  try {
    // Check for authentication token in Authorization header
    const authHeader = request.headers.get("authorization");
    const authToken = authHeader?.startsWith("Bearer ")
      ? authHeader.substring(7)
      : undefined;

    if (!authToken) {
      logger.error(
        "❌ No auth token provided for generate/create API",
        undefined,
        { component: "create" },
      );
      return NextResponse.json(
        { success: false, error: "Authentication required" },
        { status: 401 },
      );
    }

    // Get shop domain from X-Shop-Domain header or decode from token
    let shopDomain: string | null = request.headers.get("x-shop-domain");

    // If no header, try to decode token
    if (!shopDomain) {
      // SECURITY: dev-token bypass removed - all authentication must go through proper channels
      // Check if token is the shop domain itself (standalone SaaS authentication)
      // This is used when shop domain is passed as the auth token for non-embedded apps
      if (
        authToken.includes(".myshopify.com") ||
        authToken.includes("zunosai")
      ) {
        // Shop domain was passed as token - this is valid for standalone apps
        shopDomain = authToken;
        logger.debug("Using shop domain from auth token", {
          component: "create",
          shop: shopDomain,
        });
      }
      // Check if it's an OAuth token (starts with shpat_) or JWT session token
      else if (authToken.startsWith("shpat_")) {
        // OAuth token - shop domain must be in header
        logger.error(
          "❌ OAuth token provided but no X-Shop-Domain header",
          undefined,
          { component: "create" },
        );
        return NextResponse.json(
          {
            success: false,
            error: "Shop domain required for OAuth authentication",
          },
          { status: 401 },
        );
      } else {
        // Try to decode as JWT session token
        try {
          const parts = authToken.split(".");
          if (parts.length === 3) {
            const payload = JSON.parse(
              Buffer.from(parts[1], "base64").toString(),
            );
            const shopMatch = payload.dest?.match(/https:\/\/([^\/]+)/);
            shopDomain = shopMatch ? shopMatch[1] : null;
          }
        } catch (error) {
          logger.error("❌ Failed to decode session token:", error as Error, {
            component: "create",
          });
          return NextResponse.json(
            { success: false, error: "Invalid authentication token" },
            { status: 401 },
          );
        }
      }
    }

    if (!shopDomain) {
      logger.error("❌ No shop domain found in token or headers", undefined, {
        component: "create",
      });
      return NextResponse.json(
        { success: false, error: "Shop domain required" },
        { status: 401 },
      );
    }

    // Check usage limits before processing
    const usageCheck = await canGenerateProductDescriptionByDomain(shopDomain);
    if (!usageCheck.allowed) {
      logger.info("[Generate Create] Usage limit reached", {
        component: "create",
        shopDomain,
        plan: usageCheck.plan,
        used: usageCheck.used,
        limit: usageCheck.limit,
      });
      return NextResponse.json(
        {
          success: false,
          error: usageCheck.error || "Monthly usage limit reached",
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

    const body: CreateProductRequest = await request.json();

    const {
      images,
      category,
      sizing,
      template,
      productType,
      fabricMaterial,
      occasionUse,
      targetAudience,
      keyFeatures,
      additionalNotes,
    } = body;

    if (!images || images.length === 0) {
      return NextResponse.json(
        { success: false, error: "At least one image is required" },
        { status: 400 },
      );
    }

    if (!category) {
      return NextResponse.json(
        { success: false, error: "Product category is required" },
        { status: 400 },
      );
    }

    // Get store ID from shop domain
    const storeId = shopDomain;

    // Frontend already sends the correct backend category key (e.g. 'clothing')
    // No mapping needed - use the template value directly
    const productCategory = (template as ProductCategory) || "general";

    // Build unified prompt using the new layered architecture
    const productContext: ProductContext = {
      category,
      productType,
      sizing,
      fabricMaterial,
      occasionUse,
      targetAudience,
      keyFeatures,
      additionalNotes,
    };

    const {
      systemPrompt,
      usedBrandVoice,
      voiceProfileVersion,
      voiceProfileId,
    } = await buildUnifiedPrompt(storeId, productCategory, productContext);

    logger.info("[Generate Create] Built unified prompt", {
      component: "create",
      storeId,
      category: productCategory,
      usedBrandVoice,
      voiceProfileVersion,
    });

    const userPrompt = `Analyze these product images and create compelling e-commerce content. Focus on what makes this product unique and valuable to customers.

${additionalNotes ? `Special Instructions: ${additionalNotes}` : ""}`;

    // Prepare image content for OpenAI
    const imageContent = images.map((image) => ({
      type: "image_url" as const,
      image_url: {
        url: image,
        detail: "high" as const,
      },
    }));

    const messages = [
      {
        role: "system" as const,
        content: systemPrompt,
      },
      {
        role: "user" as const,
        content: [
          {
            type: "text" as const,
            text: userPrompt,
          },
          ...imageContent,
        ],
      },
    ];

    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      messages,
      max_tokens: 2500, // Increased to accommodate FAQ generation
      temperature: 0.7,
      response_format: { type: "json_object" },
    });

    const generatedContent = completion.choices[0]?.message?.content;

    if (!generatedContent) {
      return NextResponse.json(
        { success: false, error: "Failed to generate content" },
        { status: 500 },
      );
    }

    let parsedContent;
    try {
      parsedContent = JSON.parse(generatedContent);
    } catch (parseError) {
      logger.error("Failed to parse OpenAI response:", parseError as Error, {
        component: "create",
      });
      return NextResponse.json(
        { success: false, error: "Generated content format error" },
        { status: 500 },
      );
    }

    // Validate required fields
    const requiredFields = [
      "title",
      "description",
      "bulletPoints",
      "metaDescription",
      "keywords",
    ] as const;
    // Safe: requiredFields is a const array we control, not user input
    /* eslint-disable security/detect-object-injection */
    const missingFields = requiredFields.filter(
      (field) => !parsedContent[field],
    );
    /* eslint-enable security/detect-object-injection */

    if (missingFields.length > 0) {
      return NextResponse.json(
        {
          success: false,
          error: `Missing fields: ${missingFields.join(", ")}`,
        },
        { status: 500 },
      );
    }

    const tokenUsage = {
      total: completion.usage?.total_tokens || 0,
      prompt: completion.usage?.prompt_tokens || 0,
      completion: completion.usage?.completion_tokens || 0,
    };

    // Track usage in database - save the generated content
    try {
      // First, get the shop ID from shop domain
      const { data: shop } = await supabaseAdmin
        .from("shops")
        .select("id")
        .eq("shop_domain", shopDomain)
        .single();

      if (shop?.id) {
        // Save to generated_content table for stats tracking
        await supabaseAdmin.from("generated_content").insert({
          store_id: shop.id,
          content_type: "product_description",
          topic: parsedContent.title || category,
          generated_text: parsedContent.description || "",
          word_count: (parsedContent.description || "").split(/\s+/).length,
          generation_params: {
            category,
            template,
            sizing,
            fabricMaterial,
            occasionUse,
            targetAudience,
            keyFeatures,
          },
          generation_metadata: {
            model: "gpt-4o",
            tokens_used: tokenUsage.total,
            prompt_tokens: tokenUsage.prompt,
            completion_tokens: tokenUsage.completion,
            used_brand_voice: usedBrandVoice,
            voice_profile_id: voiceProfileId,
            voice_profile_version: voiceProfileVersion,
          },
          is_saved: false,
        });

        logger.info("[Generate Create] Tracked content generation", {
          component: "create",
          shopId: shop.id,
          contentType: "product_description",
        });
      }
    } catch (trackingError) {
      // Don't fail the request if tracking fails
      logger.warn("[Generate Create] Failed to track usage", {
        component: "create",
        error: (trackingError as Error).message,
      });
    }

    // Use real usage data from the check (account for the generation we just made)
    const usage = {
      current: usageCheck.used + 1,
      limit: usageCheck.limit,
      remaining: Math.max(0, usageCheck.remaining - 1),
      plan: usageCheck.plan,
    };

    // Generate FAQ section and append to description
    const faqSection = generateFAQHTML(parsedContent.faqs || []);
    const descriptionWithFaqs = parsedContent.description + faqSection;

    return NextResponse.json({
      success: true,
      data: {
        generatedContent: {
          title: parsedContent.title,
          description: descriptionWithFaqs,
          bulletPoints: parsedContent.bulletPoints || [],
          metaDescription: parsedContent.metaDescription,
          keywords: parsedContent.keywords || [],
          suggestedPrice: parsedContent.suggestedPrice || null,
          tags: parsedContent.tags || [],
          faqs: parsedContent.faqs || [], // Customer FAQs for AI discoverability
        },
        tokenUsage,
        productData: {
          category,
          sizing,
          template,
          fabricMaterial,
          occasionUse,
          targetAudience,
          keyFeatures,
          additionalNotes,
        },
      },
      usage,
    });
  } catch (error) {
    logger.error("Create product generation error:", error as Error, {
      component: "create",
    });
    return NextResponse.json(
      {
        success: false,
        error: "Internal server error occurred while generating content",
      },
      { status: 500 },
    );
  }
}
