import OpenAI from "openai";
import { type EnhancementProductData } from "./shopify/product-enhancement";
import { logger } from '@/lib/logger'

// Use the existing OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || "placeholder-api-key",
});

export interface EnhancementRequest {
  originalProduct: EnhancementProductData;
  enhancementInputs: {
    targetAudience?: string;
    brandVoice?: "professional" | "casual" | "luxury" | "playful" | "technical";
    keyFeatures?: string[];
    fabricMaterial?: string;
    style?: string;
    occasion?: string;
    seasonality?: string;
    competitiveAdvantages?: string[];
    customInstructions?: string;
  };
  template?: string;
  preserveElements?: string[];
  enhancementGoals?: {
    improveSeo?: boolean;
    increaseLength?: boolean;
    addEmotionalAppeals?: boolean;
    enhanceFeatures?: boolean;
    improveReadability?: boolean;
  };
}

export interface EnhancementResponse {
  title: string;
  description: string;
  metaDescription: string;
  keywords: string[];
  bulletPoints: string[];
  improvements: {
    original_length: number;
    enhanced_length: number;
    seo_score_improvement: string;
    readability_improvement: string;
    added_elements: string[];
  };
  comparison: {
    before: string;
    after: string;
    changes: string[];
  };
  confidence: number;
  processingTime: number;
  tokenUsage: {
    prompt: number;
    completion: number;
    total: number;
  };
}

export class ProductEnhancementGenerator {
  async generateEnhancedDescription(
    request: EnhancementRequest,
  ): Promise<EnhancementResponse> {
    const startTime = Date.now();

    try {

      // Build enhancement-specific prompt
      const prompt = await this.buildEnhancementPrompt(request);

      // Call OpenAI API
      const completion = await openai.chat.completions.create({
        model: "gpt-4o", // Use GPT-4 Omni for better results
        messages: [
          {
            role: "system",
            content:
              "You are an expert e-commerce copywriter specializing in product description enhancement. Your goal is to improve existing product descriptions while maintaining brand voice and adding compelling elements that drive conversions.",
          },
          {
            role: "user",
            content: prompt,
          },
        ],
        temperature: 0.7,
        max_tokens: 2000,
        response_format: { type: "json_object" },
      });

      const response = completion.choices[0]?.message?.content;
      if (!response) {
        throw new Error("No response from OpenAI");
      }

      // Parse the JSON response
      const enhancedContent = JSON.parse(response);

      // Calculate improvements
      const originalLength = request.originalProduct.originalDescription.length;
      const enhancedLength = enhancedContent.description.length;

      const result: EnhancementResponse = {
        title: enhancedContent.title || request.originalProduct.title,
        description: enhancedContent.description,
        metaDescription: enhancedContent.metaDescription || "",
        keywords: enhancedContent.keywords || [],
        bulletPoints: enhancedContent.bulletPoints || [],
        improvements: {
          original_length: originalLength,
          enhanced_length: enhancedLength,
          seo_score_improvement: this.calculateSeoImprovement(
            request.originalProduct,
            enhancedContent,
          ),
          readability_improvement: this.calculateReadabilityImprovement(
            request.originalProduct.originalDescription,
            enhancedContent.description,
          ),
          added_elements: this.identifyAddedElements(request, enhancedContent),
        },
        comparison: {
          before: request.originalProduct.originalDescription,
          after: enhancedContent.description,
          changes: enhancedContent.key_changes || [],
        },
        confidence: enhancedContent.confidence || 0.85,
        processingTime: Date.now() - startTime,
        tokenUsage: {
          prompt: completion.usage?.prompt_tokens || 0,
          completion: completion.usage?.completion_tokens || 0,
          total: completion.usage?.total_tokens || 0,
        },
      };

      return result;
    } catch (error) {
      logger.error("❌ Error generating enhanced description:", error as Error, { component: 'openai-enhancement' });
      throw new Error(
        `Enhancement generation failed: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }
  }

  private async buildEnhancementPrompt(
    request: EnhancementRequest,
  ): Promise<string> {
    const {
      originalProduct,
      enhancementInputs,
      enhancementGoals = {},
    } = request;

    // Get custom prompts for detailed template format (matching create workflow)
    const { getCombinedPrompt } = await import("./prompts");
    let customPrompts = null;

    try {
      // Use the store ID from originalProduct to fetch custom prompts
      const storeId = originalProduct.id.split("/")[0] || "default";
      const category = originalProduct.category.primary || "general";
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      customPrompts = await getCombinedPrompt(storeId, category as any);
    } catch (error) {
      logger.error("Failed to load custom prompts for enhancement:", error as Error, { component: 'openai-enhancement' });
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

    const prompt = `
${templateInstructions}

=== ENHANCEMENT TASK ===

You are enhancing an EXISTING product description. Use the product information below to create a COMPLETE, DETAILED description following the template structure above.

## Original Product Information
**Title:** ${originalProduct.title}
**Current Description:** ${originalProduct.originalDescription}
**Product Type:** ${originalProduct.productType}
**Vendor:** ${originalProduct.vendor}
**Tags:** ${originalProduct.tags.join(", ")}

## Product Details
**Materials:** ${JSON.stringify(originalProduct.materials)}
**Variants:** ${originalProduct.variants.length} options available
**Images:** ${originalProduct.images.length} product images
**Category:** ${originalProduct.category.primary || "General"}

## Enhancement Requirements
${enhancementInputs.targetAudience ? `**Target Audience:** ${enhancementInputs.targetAudience}` : ""}
${enhancementInputs.brandVoice ? `**Brand Voice:** ${enhancementInputs.brandVoice}` : ""}
${enhancementInputs.keyFeatures ? `**Key Features to Highlight:** ${enhancementInputs.keyFeatures.join(", ")}` : ""}
${enhancementInputs.fabricMaterial ? `**Material Focus:** ${enhancementInputs.fabricMaterial}` : ""}
${enhancementInputs.style ? `**Style:** ${enhancementInputs.style}` : ""}
${enhancementInputs.occasion ? `**Occasion:** ${enhancementInputs.occasion}` : ""}
${enhancementInputs.competitiveAdvantages ? `**Competitive Advantages:** ${enhancementInputs.competitiveAdvantages.join(", ")}` : ""}
${enhancementInputs.customInstructions ? `**Custom Instructions:** ${enhancementInputs.customInstructions}` : ""}

## Enhancement Goals
${enhancementGoals.improveSeo ? "- Improve SEO with relevant keywords" : ""}
${enhancementGoals.increaseLength ? "- Increase description length with detailed sections" : ""}
${enhancementGoals.addEmotionalAppeals ? "- Add emotional appeals and lifestyle benefits" : ""}
${enhancementGoals.enhanceFeatures ? "- Better highlight product features in Product Details section" : ""}
${enhancementGoals.improveReadability ? "- Improve readability with clear section structure" : ""}

## Current SEO Analysis
- Title Length: ${originalProduct.title.length} characters
- Description Length: ${originalProduct.originalDescription.length} characters
- Missing Alt Texts: ${originalProduct.seoAnalysis?.missingAltTexts || 0} images
- Keyword Density: ${Object.keys(originalProduct.seoAnalysis?.keywordDensity || {}).length} unique keywords

## Task Instructions
Create an enhanced version of this product description that:
1. **USES THE DETAILED TEMPLATE FORMAT** with all required sections (Product Details, Perfect For, Styling Tips, Materials & Details, FAQ, Care and Sizing, Why You'll Love It)
2. Maintains the core product information and authenticity from the original
3. Incorporates the specified enhancement requirements
4. Optimizes for SEO and conversion with 200-400 word detailed description
5. Addresses the specific enhancement goals listed above

**CRITICAL:** The enhanced description MUST match the detailed template format used for new products, NOT a short bullet-point format.

**OUTPUT FORMAT - Return JSON with this exact structure:**
{
  "title": "Enhanced product title (optional, only if improvement needed)",
  "description": "Complete detailed product description with ALL template sections (Product Details, Perfect For, Styling Tips, Materials & Details, FAQ, Care and Sizing, Why You'll Love It) - 200-400 words",
  "metaDescription": "SEO-optimized meta description (150-160 characters)",
  "keywords": ["keyword1", "keyword2", "keyword3", "keyword4", "keyword5"],
  "bulletPoints": ["Key benefit 1", "Key benefit 2", "Key benefit 3", "Key benefit 4"],
  "key_changes": ["List of major changes made", "Another change", "Third change"],
  "confidence": 0.95
}

**FORMATTING REQUIREMENTS:**
- Use HTML formatting for the description, not Markdown
- Section headers should be bold using <b>Header Name</b> tags
- Never use **markdown bold** or asterisks for formatting
- Use <br> for line breaks between sections
- Keep paragraphs as plain text without HTML paragraph tags
- NEVER use "Opening Hook" as a section label - start directly with engaging content
- Include ALL required sections: Product Details, Perfect For, Styling Tips, Materials & Details, FAQ, Care and Sizing, Why You'll Love It
`;

    return prompt.trim();
  }

  private calculateSeoImprovement(
    original: EnhancementProductData,
    enhanced: {
      keywords?: string[];
      metaDescription?: string;
      description: string;
      bulletPoints?: string[];
    },
  ): string {
    let improvements = 0;

    // Check for keyword improvements
    const originalKeywords = Object.keys(
      original.seoAnalysis?.keywordDensity || {},
    ).length;
    const enhancedKeywords = enhanced.keywords?.length || 0;
    if (enhancedKeywords > originalKeywords) improvements += 20;

    // Check for meta description
    if (enhanced.metaDescription && enhanced.metaDescription.length >= 150)
      improvements += 25;

    // Check for length improvement
    if (enhanced.description.length > original.originalDescription.length)
      improvements += 15;

    // Check for structure improvement (bullet points)
    if (enhanced.bulletPoints && enhanced.bulletPoints.length > 0)
      improvements += 20;

    return `+${Math.min(improvements, 100)}%`;
  }

  private calculateReadabilityImprovement(
    original: string,
    enhanced: string,
  ): string {
    // Simple readability metrics
    const originalSentences = original.split(/[.!?]+/).length;
    const enhancedSentences = enhanced.split(/[.!?]+/).length;

    const originalWords = original.split(/\s+/).length;
    const enhancedWords = enhanced.split(/\s+/).length;

    // Check for improved sentence structure
    const originalAvgWordsPerSentence = originalWords / originalSentences;
    const enhancedAvgWordsPerSentence = enhancedWords / enhancedSentences;

    let improvement = 0;

    // Prefer shorter, clearer sentences
    if (
      enhancedAvgWordsPerSentence < originalAvgWordsPerSentence &&
      enhancedAvgWordsPerSentence > 10
    ) {
      improvement += 15;
    }

    // Check for structure words (and, but, however, etc.)
    const structureWords = [
      "and",
      "but",
      "however",
      "moreover",
      "furthermore",
      "therefore",
    ];
    const enhancedStructureCount = structureWords.reduce(
      (count, word) => count + (enhanced.toLowerCase().split(word).length - 1),
      0,
    );

    if (enhancedStructureCount > 0) improvement += 10;

    return `+${improvement}%`;
  }

  private identifyAddedElements(
    request: EnhancementRequest,
    enhanced: {
      metaDescription?: string;
      keywords?: string[];
      bulletPoints?: string[];
    },
  ): string[] {
    const addedElements: string[] = [];

    if (enhanced.metaDescription && enhanced.metaDescription.length > 0) {
      addedElements.push("SEO meta description");
    }

    if (enhanced.keywords && enhanced.keywords.length > 0) {
      addedElements.push("Target keywords");
    }

    if (enhanced.bulletPoints && enhanced.bulletPoints.length > 0) {
      addedElements.push("Key benefit points");
    }

    if (request.enhancementInputs.targetAudience) {
      addedElements.push("Target audience focus");
    }

    if (request.enhancementInputs.fabricMaterial) {
      addedElements.push("Material details");
    }

    if (request.enhancementInputs.competitiveAdvantages?.length) {
      addedElements.push("Competitive advantages");
    }

    return addedElements;
  }
}

// Export singleton instance
export const enhancementGenerator = new ProductEnhancementGenerator();
