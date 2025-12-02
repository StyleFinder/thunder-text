import { NextRequest, NextResponse } from "next/server";
import { openai } from "@/lib/openai";
import { getCombinedPrompt, type ProductCategory } from "@/lib/prompts";
import { logger } from '@/lib/logger'

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
      logger.error("❌ No auth token provided for generate/create API", undefined, { component: 'create' });
      return NextResponse.json(
        { success: false, error: "Authentication required" },
        { status: 401 },
      );
    }


    // Get shop domain from X-Shop-Domain header or decode from token
    let shopDomain: string | null = request.headers.get("x-shop-domain");

    // If no header, try to decode token
    if (!shopDomain) {
      // Check if it's a dev token (for development/testing with authenticated=true)
      if (authToken === "dev-token") {
        // Dev token - shop domain must be in header
        // Continue - shop domain will be validated below
      }
      // Check if it's an OAuth token (starts with shpat_) or JWT session token
      else if (authToken.startsWith("shpat_")) {
        // OAuth token - shop domain must be in header
        logger.error("❌ OAuth token provided but no X-Shop-Domain header", undefined, { component: 'create' });
        return NextResponse.json(
          { success: false, error: "Shop domain required for OAuth authentication" },
          { status: 401 },
        );
      } else {
        // Try to decode as JWT session token
        try {
          const parts = authToken.split(".");
          if (parts.length === 3) {
            const payload = JSON.parse(Buffer.from(parts[1], "base64").toString());
            const shopMatch = payload.dest?.match(/https:\/\/([^\/]+)/);
            shopDomain = shopMatch ? shopMatch[1] : null;
          }
        } catch (error) {
          logger.error("❌ Failed to decode session token:", error as Error, { component: 'create' });
          return NextResponse.json(
            { success: false, error: "Invalid authentication token" },
            { status: 401 },
          );
        }
      }
    }

    if (!shopDomain) {
      logger.error("❌ No shop domain found in token or headers", undefined, { component: 'create' });
      return NextResponse.json(
        { success: false, error: "Shop domain required" },
        { status: 401 },
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

    // Frontend already sends the correct backend category key (e.g. 'womens_clothing')
    // No mapping needed - use the template value directly
    const productCategory = (template as ProductCategory) || "general";

    // Get custom prompts for the store and category
    let customPrompts = null;
    let systemPrompt = "";

    try {
      customPrompts = await getCombinedPrompt(storeId, productCategory);

      if (customPrompts?.combined) {
        // Add primary product focus if productType is specified
        const primaryProductGuidance = productType
          ? `

🎯 PRIMARY PRODUCT FOCUS: "${productType}"

CRITICAL INSTRUCTIONS FOR MULTI-ITEM IMAGES:
- The product being sold is: "${productType}"
- Images may show this product styled with other items (e.g., jacket with shirt underneath, shoes with pants, watch with sleeve visible)
- Your description must focus ONLY on the "${productType}"
- IGNORE any secondary/styling items visible in the images
- DO NOT mention or describe items that are only shown for styling context
- Focus all feature descriptions, measurements, and details on the "${productType}" only

EXAMPLES OF WHAT TO IGNORE:
- If selling "Jacket" → ignore any shirt/top worn underneath
- If selling "Shoes" → ignore pants, socks, or other clothing items
- If selling "Watch" → ignore shirt sleeves or other clothing visible
- If selling "Handbag" → ignore the model's clothing/outfit
`
          : '';

        systemPrompt = `${customPrompts.combined}

=== TASK INSTRUCTIONS ===
${primaryProductGuidance}

Analyze the provided product images and generate compelling content based on the custom guidelines above.

PRODUCT DETAILS:
- Category: ${category}
${productType ? `- Product Type: ${productType}` : ""}
- Available Sizing: ${sizing || "Not specified"}
- Template Style: ${template}
${fabricMaterial ? `- Materials: ${fabricMaterial}` : ""}
${occasionUse ? `- Occasion/Use: ${occasionUse}` : ""}
${targetAudience ? `- Target Audience: ${targetAudience}` : ""}
${keyFeatures ? `- Key Features: ${keyFeatures}` : ""}
${additionalNotes ? `- Additional Notes: ${additionalNotes}` : ""}

OUTPUT FORMAT - Return a JSON object with these exact fields:
{
  "title": "Product title (max 70 characters)",
  "description": "Detailed product description following the custom prompt guidelines above (200-400 words)",
  "bulletPoints": ["Array of 5-7 key benefit bullet points"],
  "metaDescription": "SEO meta description (max 160 characters)", 
  "keywords": ["Array of 8-12 relevant SEO keywords"],
  "suggestedPrice": "Suggested price range based on category and features",
  "tags": ["Array of product tags for organization"]
}

CRITICAL: The "description" field must EXACTLY follow the section structure from the category template above. This is non-negotiable.

MANDATORY SECTION STRUCTURE:
You MUST use the EXACT section headers specified in the category template above. For Women's Clothing, use:
1. Opening paragraph (NO HEADER - start directly with compelling content)
2. <b>Product Details</b> - NOT "Product Details Section" or any variation
3. <b>Styling Tips</b> - NOT "Styling" or "Perfect For" or any variation
4. <b>Care and Sizing</b> - NOT "Materials & Details" or any variation
5. <b>Why You'll Love It</b> - NOT "Why Choose This" or any variation

FORMATTING REQUIREMENTS:
- The "description" field in your JSON response MUST contain HTML tags
- Use HTML formatting for the description, not Markdown
- ONLY section headers should be bold using <b>Header Name</b> tags
- Body text and paragraphs must be plain text (NOT bold, no HTML tags)
- Never use **markdown bold** or asterisks for formatting
- Use <br><br> for line breaks between sections (these HTML tags must be in the JSON string)
- Do NOT wrap paragraphs in <p> tags or any other HTML tags
- NEVER use "Opening Hook" as a section label - start directly with engaging content
- Include ALL required sections: Product Details, Styling Tips, Care and Sizing, Why You'll Love It
- IMPORTANT: The <b> and <br> tags are part of the description text and must be included in the JSON

EXAMPLE FORMAT:
Opening paragraph goes here as plain text without any tags.

<b>Product Details</b>
This section has plain text describing product details. No bold tags on this text.

<b>Styling Tips</b>
More plain text here describing styling suggestions.

<b>Care and Sizing</b>
Care instructions and sizing information in plain text. Available in: XS, S, M, L, XL, XXL.

<b>Why You'll Love It</b>
Closing content in plain text highlighting key benefits.`;
      } else {
        throw new Error("No custom prompts available");
      }
    } catch (error) {
      logger.error("❌ Failed to load custom prompts, using fallback:", error, undefined, { component: 'create' });

      // Add primary product focus for fallback prompt too
      const primaryProductGuidance = productType
        ? `

🎯 PRIMARY PRODUCT FOCUS: "${productType}"

CRITICAL INSTRUCTIONS:
- The product being sold is: "${productType}"
- Images may show this product with other styling items
- Focus ONLY on the "${productType}" in your description
- Ignore secondary items visible for styling purposes
`
        : '';

      // Fallback to basic prompt if custom prompts fail
      systemPrompt = `You are a professional e-commerce copywriter tasked with creating compelling product descriptions for a new product.

REQUIREMENTS:
- Create engaging, SEO-optimized content that converts browsers to buyers
- Use the provided product details and images to generate accurate descriptions
- Match the specified template style and target the right audience
- Include relevant keywords naturally throughout the content
- Generate content that's appropriate for the product category: ${category}
${primaryProductGuidance}

PRODUCT DETAILS:
- Category: ${category}
${productType ? `- Product Type: ${productType}` : ""}
- Available Sizing: ${sizing || "Not specified"}
- Template Style: ${template}
${fabricMaterial ? `- Materials: ${fabricMaterial}` : ""}
${occasionUse ? `- Occasion/Use: ${occasionUse}` : ""}
${targetAudience ? `- Target Audience: ${targetAudience}` : ""}
${keyFeatures ? `- Key Features: ${keyFeatures}` : ""}
${additionalNotes ? `- Additional Notes: ${additionalNotes}` : ""}

OUTPUT FORMAT - Return a JSON object with these exact fields:
{
  "title": "Product title (max 70 characters)",
  "description": "Detailed product description (200-400 words)",
  "bulletPoints": ["Array of 5-7 key benefit bullet points"],
  "metaDescription": "SEO meta description (max 160 characters)",
  "keywords": ["Array of 8-12 relevant SEO keywords"],
  "suggestedPrice": "Suggested price range based on category and features",
  "tags": ["Array of product tags for organization"]
}

MANDATORY SECTION STRUCTURE FOR DESCRIPTION (General Products):
Use these EXACT section headers in order:
1. Opening paragraph (NO HEADER - start directly with compelling content)
2. <b>Key Features</b>
3. <b>Usage and Applications</b>
4. <b>Specifications and Care</b>
5. <b>Value Proposition</b>

FORMATTING REQUIREMENTS:
- The "description" field in your JSON response MUST contain HTML tags
- Use HTML formatting for the description, not Markdown
- ONLY section headers should be bold using <b>Header Name</b> tags
- Body text and paragraphs must be plain text (NOT bold, no HTML tags)
- Never use **markdown bold** or asterisks for formatting
- Use <br><br> for line breaks between sections (these HTML tags must be in the JSON string)
- Do NOT wrap paragraphs in <p> tags or any other HTML tags
- Include ALL required sections: Key Features, Usage and Applications, Specifications and Care, Value Proposition
- IMPORTANT: The <b> and <br> tags are part of the description text and must be included in the JSON

EXAMPLE FORMAT:
Opening paragraph goes here as plain text without any tags.

<b>Key Features</b>
This section has plain text describing key features and specifications.

<b>Usage and Applications</b>
More plain text here describing how to use the product.

<b>Specifications and Care</b>
Technical details and care instructions in plain text.

<b>Value Proposition</b>
Closing content in plain text explaining why to purchase.`;
    }

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
      max_tokens: 1500,
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
      logger.error("Failed to parse OpenAI response:", parseError as Error, { component: 'create' });
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
     
    const missingFields = requiredFields.filter(
      (field) => !parsedContent[field],
    );

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

    // TODO: Track usage in database
    const usage = {
      current: 0, // Would fetch from database
      limit: 25,
      remaining: 25, // Would calculate from database
    };

    return NextResponse.json({
      success: true,
      data: {
        generatedContent: {
          title: parsedContent.title,
          description: parsedContent.description,
          bulletPoints: parsedContent.bulletPoints || [],
          metaDescription: parsedContent.metaDescription,
          keywords: parsedContent.keywords || [],
          suggestedPrice: parsedContent.suggestedPrice || null,
          tags: parsedContent.tags || [],
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
    logger.error("Create product generation error:", error as Error, { component: 'create' });
    return NextResponse.json(
      {
        success: false,
        error: "Internal server error occurred while generating content",
      },
      { status: 500 },
    );
  }
}
