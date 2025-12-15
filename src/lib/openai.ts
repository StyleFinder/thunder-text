import OpenAI from "openai";
import { getCombinedPrompt, type ProductCategory } from "./prompts";
import { logger } from "@/lib/logger";

// Master OpenAI client with centralized API key
// SECURITY: No fallback - fail fast if API key is missing
const getOpenAIApiKey = (): string => {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY environment variable is required");
  }
  return apiKey;
};

const openai = new OpenAI({
  apiKey: getOpenAIApiKey(),
});

export interface ProductDescriptionRequest {
  images: string[];
  productTitle?: string;
  category?: string;
  brandVoice?: string;
  targetLength?: "short" | "medium" | "long";
  keywords?: string[];
  storeId: string;
}

export interface ProductDescriptionResponse {
  title: string;
  description: string;
  bulletPoints: string[];
  metaDescription: string;
  keywords: string[];
  confidence: number;
  processingTime: number;
  tokenUsage: {
    prompt: number;
    completion: number;
    total: number;
  };
}

export interface ProductEnhancementResponse {
  title?: string;
  description?: string;
  seoTitle?: string;
  metaDescription?: string;
  promotionalCopy?: string;
  confidence?: number;
  processingTime: number;
  tokenUsage: {
    prompt: number;
    completion: number;
    total: number;
  };
  [key: string]: unknown; // Allow additional properties from OpenAI
}

export class AIDescriptionGenerator {
  private storeUsage: Map<string, number> = new Map();

  async generateProductDescription(
    request: ProductDescriptionRequest,
  ): Promise<ProductDescriptionResponse> {
    const startTime = Date.now();

    try {
      // Validate and filter images
      const validImages = request.images.filter((img) => {
        if (!img || typeof img !== "string" || img.length === 0) {
          console.warn("⚠️ Skipping invalid image:", img);
          return false;
        }
        if (
          !img.startsWith("http") &&
          !img.startsWith("data:") &&
          !img.startsWith("//")
        ) {
          console.warn("⚠️ Skipping non-URL image:", img);
          return false;
        }
        return true;
      });

      console.log("🎨 OpenAI API - Processing images:", {
        originalCount: request.images.length,
        validCount: validImages.length,
        firstImage: validImages[0]?.substring(0, 100),
      });

      // Ensure we have at least one image
      if (validImages.length === 0) {
        console.log("🔴 No valid images provided, using placeholder");
        validImages.push(
          "https://via.placeholder.com/400x400/cccccc/969696?text=No+Image",
        );
      }

      // Build the prompt based on request parameters and custom prompts
      const prompt = await this.buildPrompt(request);

      // Analyze images using GPT-4o with vision
      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "user",
            content: [
              {
                type: "text",
                text: prompt,
              },
              ...validImages.map((image) => ({
                type: "image_url" as const,
                image_url: {
                  url: image,
                  detail: "high" as const,
                },
              })),
            ],
          },
        ],
        max_tokens: 1000,
        temperature: 0.7,
      });

      const content = response.choices[0]?.message?.content;
      if (!content) {
        throw new Error("No content generated from OpenAI");
      }

      // Parse the structured response
      const parsed = this.parseResponse(content);

      // Track usage for billing
      this.trackUsage(request.storeId, response.usage?.total_tokens || 0);

      const processingTime = Date.now() - startTime;

      return {
        ...parsed,
        processingTime,
        tokenUsage: {
          prompt: response.usage?.prompt_tokens || 0,
          completion: response.usage?.completion_tokens || 0,
          total: response.usage?.total_tokens || 0,
        },
      };
    } catch (error) {
      logger.error("AI generation error:", error as Error, {
        component: "openai",
      });
      throw new Error(
        `Failed to generate product description: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }
  }

  private async buildPrompt(
    request: ProductDescriptionRequest,
  ): Promise<string> {
    const lengthGuide = {
      short: "50-100 words",
      medium: "100-200 words",
      long: "200-400 words",
    };

    // Get the custom prompts for this store and category
    const category = (request.category || "general") as ProductCategory;
    let customPrompts = null;

    try {
      customPrompts = await getCombinedPrompt(request.storeId, category);
    } catch (error) {
      logger.error(
        "❌ Failed to load custom prompts, falling back to default",
        error as Error,
        { component: "openai" },
      );
    }

    // Use custom prompts if available, otherwise fall back to basic instructions
    const coreInstructions =
      customPrompts?.combined ||
      `
You are an expert e-commerce copywriter. Create compelling product descriptions that convert browsers into buyers.

CORE PRINCIPLES:
- Write in second person ("you") to create connection with the customer
- Use sensory, descriptive language appropriate to the product type
- Balance emotional appeal with practical information
- Include all relevant product specifications provided in the context
- Format with clear section headers (no special characters like *, #, or -)

FORMATTING RULES:
- Section headers should be in bold TypeCase
- No markdown formatting or special characters
- Keep paragraphs concise (3-5 sentences max)
- Use line breaks between sections for clarity
`.trim();

    return `
${coreInstructions}

=== TASK INSTRUCTIONS ===

Analyze the provided product images and generate compelling content based on the guidelines above.

Product Context:
${request.productTitle ? `- Title: ${request.productTitle}` : ""}
${request.category ? `- Category: ${request.category}` : ""}
${request.brandVoice ? `- Brand Voice: ${request.brandVoice}` : ""}
- Target Length: ${lengthGuide[request.targetLength || "medium"]}
${request.keywords?.length ? `- Target Keywords: ${request.keywords.join(", ")}` : ""}

Please provide a JSON response with the following structure:
{
  "title": "Compelling product title based on images",
  "description": "SEO-optimized product description following the custom guidelines above",
  "bulletPoints": ["Key feature 1", "Key feature 2", "Key feature 3", "Key feature 4", "Key feature 5"],
  "metaDescription": "Search engine meta description (150-160 characters)",
  "keywords": ["keyword1", "keyword2", "keyword3", "keyword4", "keyword5"],
  "confidence": 0.95
}

CRITICAL: The "description" field must strictly follow the custom prompt guidelines above, especially the formatting rules and section structure provided in the category template.
`.trim();
  }

  private parseResponse(
    content: string,
  ): Omit<ProductDescriptionResponse, "processingTime" | "tokenUsage"> {
    try {
      // Try to extract JSON from the response
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        return {
          title: parsed.title || "Generated Product Title",
          description: parsed.description || "Generated product description",
          bulletPoints: Array.isArray(parsed.bulletPoints)
            ? parsed.bulletPoints
            : [],
          metaDescription: parsed.metaDescription || "",
          keywords: Array.isArray(parsed.keywords) ? parsed.keywords : [],
          confidence:
            typeof parsed.confidence === "number" ? parsed.confidence : 0.8,
        };
      }
    } catch (error) {
      logger.error("Failed to parse JSON response:", error as Error, {
        component: "openai",
      });
    }

    // Fallback parsing if JSON extraction fails
    return {
      title: "Generated Product Title",
      description: content.substring(0, 400),
      bulletPoints: [],
      metaDescription: content.substring(0, 160),
      keywords: [],
      confidence: 0.5,
    };
  }

  private trackUsage(storeId: string, tokens: number): void {
    const currentUsage = this.storeUsage.get(storeId) || 0;
    this.storeUsage.set(storeId, currentUsage + tokens);
  }

  getStoreUsage(storeId: string): number {
    return this.storeUsage.get(storeId) || 0;
  }

  // Cost calculation based on GPT-4 Vision pricing
  calculateCost(tokens: number): number {
    // GPT-4 Vision pricing (approximate)
    const costPerToken = 0.00003; // $0.03 per 1K tokens
    const result = tokens * costPerToken;
    return parseFloat(result.toFixed(6));
  }

  // Enhanced product description for existing products
  async enhanceProductDescription(request: {
    productId: string;
    images: string[];
    template: string;
    productDetails: {
      parentCategory: string;
      availableSizing: string;
      fabricMaterial: string;
      occasionUse: string;
      targetAudience: string;
      keyFeatures: string;
      additionalNotes: string;
    };
    enhancementOptions: {
      generateTitle: boolean;
      enhanceDescription: boolean;
      generateSEO: boolean;
      createPromo: boolean;
    };
    storeId: string;
  }): Promise<ProductEnhancementResponse> {
    const startTime = Date.now();

    try {
      // Get custom prompts for detailed template format (matching create workflow)
      const category = (request.template || "general") as ProductCategory;
      let customPrompts = null;

      try {
        customPrompts = await getCombinedPrompt(request.storeId, category);
      } catch (error) {
        logger.error(
          "❌ Failed to load custom prompts for enhancement, falling back to default",
          error as Error,
          { component: "openai" },
        );
      }

      // Use the same detailed template instructions as create workflow
      const templateInstructions =
        customPrompts?.combined ||
        `
You are an expert e-commerce copywriter. Create compelling product descriptions that convert browsers into buyers.

CORE PRINCIPLES:
- Write in second person ("you") to create connection with the customer
- Use sensory, descriptive language appropriate to the product type
- Balance emotional appeal with practical information
- Include all relevant product specifications provided in the context
- Format with clear section headers (no special characters like *, #, or -)

FORMATTING RULES:
- Section headers should be in bold TypeCase
- No markdown formatting or special characters
- Keep paragraphs concise (3-5 sentences max)
- Use line breaks between sections for clarity

REQUIRED SECTIONS:
- Opening paragraph (engaging hook, no section label)
- Product Details (specifications and features)
- Perfect For (occasions and use cases)
- Styling Tips (how to wear/use)
- Materials & Details (fabric, construction, care)
- FAQ (common customer questions)
- Care and Sizing (practical information)
- Why You'll Love It (compelling close)
`.trim();

      // Build enhancement prompt with detailed template requirements
      const outputFields = [];
      if (request.enhancementOptions.generateTitle) {
        outputFields.push('"title": "New compelling product title"');
      }
      if (request.enhancementOptions.enhanceDescription) {
        outputFields.push(
          '"description": "Complete detailed product description with ALL template sections (Product Details, Perfect For, Styling Tips, Materials & Details, FAQ, Care and Sizing, Why You will Love It) - 200-400 words using HTML formatting"',
        );
      }
      if (request.enhancementOptions.generateSEO) {
        outputFields.push('"seoTitle": "SEO-optimized title (60 chars max)"');
        outputFields.push(
          '"metaDescription": "SEO meta description (160 chars max)"',
        );
      }
      if (request.enhancementOptions.createPromo) {
        outputFields.push(
          '"promotionalCopy": "Short promotional copy for marketing"',
        );
      }
      outputFields.push('"confidence": 0.95');

      const prompt = `${templateInstructions}

=== ENHANCEMENT TASK ===

You are enhancing an EXISTING product. Analyze the provided product images and details to create a COMPLETE, DETAILED description following the template structure above.

PRODUCT DETAILS:
- Category: ${request.productDetails.parentCategory}
- Template Type: ${request.template}
- Fabric/Material: ${request.productDetails.fabricMaterial || "Not specified"}
- Occasion/Use: ${request.productDetails.occasionUse || "Not specified"}
- Target Audience: ${request.productDetails.targetAudience || "General"}
- Available Sizing: ${request.productDetails.availableSizing || "Not specified"}
- Key Features: ${request.productDetails.keyFeatures || "To be determined from images"}
- Additional Notes: ${request.productDetails.additionalNotes || "None"}

ENHANCEMENT OPTIONS:
${request.enhancementOptions.generateTitle ? "- Generate a compelling product title" : ""}
${request.enhancementOptions.enhanceDescription ? "- Create a DETAILED product description with ALL template sections (200-400 words)" : ""}
${request.enhancementOptions.generateSEO ? "- Generate SEO title and meta description" : ""}
${request.enhancementOptions.createPromo ? "- Create promotional copy for marketing" : ""}

**CRITICAL:** The enhanced description MUST use the DETAILED TEMPLATE FORMAT with all required sections (Product Details, Perfect For, Styling Tips, Materials & Details, FAQ, Care and Sizing, Why You'll Love It), NOT a short bullet-point format.

OUTPUT FORMAT - Return JSON with this exact structure:
{
  ${outputFields.join(",\n  ")}
}

FORMATTING REQUIREMENTS:
- Use HTML formatting for the description, not Markdown
- ONLY section headers should be bold using <b>Header Name</b> tags
- Body text and paragraphs must be plain text (NOT bold, no HTML tags)
- Never use **markdown bold** or asterisks for formatting
- Use <br><br> for line breaks between sections
- Do NOT wrap paragraphs in <p> tags or any other HTML tags
- NEVER use "Opening Hook" as a section label - start directly with engaging content
- Include ALL required sections: Product Details, Perfect For, Styling Tips, Materials & Details, FAQ, Care and Sizing, Why You'll Love It

EXAMPLE FORMAT:
Opening paragraph goes here as plain text without any tags.

<b>Product Details</b>
This section has plain text describing product details. No bold tags on this text.

<b>Perfect For</b>
More plain text here describing what it's perfect for.`;

      // Call GPT-4 Vision with images
      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "user",
            content: [
              {
                type: "text",
                text: prompt,
              },
              ...request.images.slice(0, 5).map((image) => ({
                type: "image_url" as const,
                image_url: {
                  url: image,
                  detail: "high" as const,
                },
              })),
            ],
          },
        ],
        max_tokens: 1500,
        temperature: 0.7,
        response_format: { type: "json_object" },
      });

      const content = response.choices[0]?.message?.content;
      if (!content) {
        throw new Error("No content generated from OpenAI");
      }

      // Parse the response
      let parsed;
      try {
        // Extract JSON from the response
        const jsonMatch = content.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          parsed = JSON.parse(jsonMatch[0]);
        } else {
          parsed = JSON.parse(content);
        }
      } catch (e) {
        logger.error("Failed to parse enhanced content:", e as Error, {
          component: "openai",
        });
        // Fallback structure
        parsed = {
          description: content,
          confidence: 0.7,
        };
      }

      const processingTime = Date.now() - startTime;

      return {
        ...parsed,
        processingTime,
        tokenUsage: {
          prompt: response.usage?.prompt_tokens || 0,
          completion: response.usage?.completion_tokens || 0,
          total: response.usage?.total_tokens || 0,
        },
      };
    } catch (error) {
      logger.error("AI enhancement error:", error as Error, {
        component: "openai",
      });
      throw new Error(
        `Failed to enhance product description: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }
  }
}

// Singleton instance for the application
export const aiGenerator = new AIDescriptionGenerator();

// Export the OpenAI client for direct use
export { openai };
