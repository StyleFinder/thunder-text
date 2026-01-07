import { callChatCompletion } from "@/lib/services/openai-client";
import {
  ResearchContext,
  AdVariant,
  AieVariantType,
  AiePlatform,
  AieGoal,
  BrandVoiceContext,
  AdLengthOption,
} from "../../../types/aie";
import { logger } from "@/lib/logger";
import {
  getPlatformConstraints,
  formatConstraintsForPrompt,
} from "../utils/platformConstraints";

export class CreativeAgent {
  /**
   * Generate 3 ad variants based on research context and product info
   */
  async generateVariants(
    productInfo: string,
    context: ResearchContext,
    platform: AiePlatform,
    goal: AieGoal,
    selectedLength: AdLengthOption = "MEDIUM", // Default to MEDIUM if not specified
    targetAudience?: string, // Optional target audience override
    imageAnalysis?: {
      category: string;
      mood: string[];
      scene_context: string[];
      keywords: string[];
    }, // Optional image analysis
  ): Promise<Partial<AdVariant>[]> {
    // 1. Construct the prompt with rich context
    const systemPrompt = this.buildSystemPrompt(
      platform,
      goal,
      context.brandVoice,
      selectedLength,
      targetAudience,
      imageAnalysis,
    );
    const userPrompt = this.buildUserPrompt(
      productInfo,
      context,
      platform,
      imageAnalysis,
    );

    // 2. Call OpenAI to generate the creative content
    const response = await callChatCompletion(
      [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      {
        model: "gpt-4o-mini", // Cost-effective model for text generation
        temperature: 0.8, // Higher temperature for creativity
        maxTokens: 2000,
      },
    );

    // 3. Parse the JSON response
    try {
      const variants = this.parseResponse(response, selectedLength);
      return variants;
    } catch (error) {
      logger.error("Failed to parse Creative Agent response:", error as Error, {
        component: "agent",
      });
      throw new Error("Creative Agent failed to generate valid ad variants.");
    }
  }

  /**
   * Get character limits based on selected ad length and platform
   * Uses platform-specific constraints from platformConstraints.ts
   */
  private getCharacterLimits(
    length: AdLengthOption,
    platform: AiePlatform,
  ): {
    ideal: number;
    max: number;
    words: string;
    sentences: string;
    headlineMax: number;
    descriptionMax: number;
  } {
    const constraints = getPlatformConstraints(platform);
    const platformMax = constraints.primaryText.max;

    // Calculate ideal length based on ad length mode
    // Scale relative to platform max (SHORT = 64%, MEDIUM = 80%, LONG = 96%)
    const lengthMultipliers = {
      SHORT: 0.64,
      MEDIUM: 0.8,
      LONG: 0.96,
    };

    // eslint-disable-next-line security/detect-object-injection
    const ideal = Math.round(platformMax * lengthMultipliers[length]);

    const wordCounts = {
      SHORT: "10-15 words",
      MEDIUM: "15-20 words",
      LONG: "18-25 words",
    };

    const sentenceCounts = {
      SHORT: "1-2 sentences",
      MEDIUM: "2-3 sentences",
      LONG: "2-3 sentences",
    };

    return {
      ideal,
      max: platformMax,
      // eslint-disable-next-line security/detect-object-injection
      words: wordCounts[length],
      // eslint-disable-next-line security/detect-object-injection
      sentences: sentenceCounts[length],
      headlineMax: constraints.headline.max,
      descriptionMax: constraints.description.max,
    };
  }

  private buildSystemPrompt(
    platform: AiePlatform,
    goal: AieGoal,
    brandVoice?: BrandVoiceContext,
    selectedLength: AdLengthOption = "MEDIUM",
    targetAudience?: string,
    imageAnalysis?: {
      category: string;
      mood: string[];
      scene_context: string[];
      keywords: string[];
    },
  ): string {
    let brandVoiceSection = "";

    if (brandVoice) {
      const parts: string[] = [];

      // Voice characteristics
      if (brandVoice.tone || brandVoice.style || brandVoice.personality) {
        parts.push(
          "═══════════════════════════════════════════════════════════════",
        );
        parts.push("BRAND VOICE (CRITICAL - MATCH THIS EXACTLY)");
        parts.push(
          "═══════════════════════════════════════════════════════════════",
        );
        if (brandVoice.tone) parts.push(`Tone: ${brandVoice.tone}`);
        if (brandVoice.style) parts.push(`Style: ${brandVoice.style}`);
        if (brandVoice.personality)
          parts.push(`Personality: ${brandVoice.personality}`);
      }

      // Vocabulary guidelines
      if (
        brandVoice.preferredTerms.length > 0 ||
        brandVoice.avoidedTerms.length > 0
      ) {
        parts.push("");
        parts.push("Language Guidelines:");
        if (brandVoice.preferredTerms.length > 0) {
          parts.push(
            `✅ USE these words/phrases: ${brandVoice.preferredTerms.join(", ")}`,
          );
        }
        if (brandVoice.avoidedTerms.length > 0) {
          parts.push(
            `❌ AVOID these words/phrases: ${brandVoice.avoidedTerms.join(", ")}`,
          );
        }
        if (brandVoice.signaturePhrases.length > 0) {
          parts.push(
            `🔑 Signature phrases: ${brandVoice.signaturePhrases.join(", ")}`,
          );
        }
      }

      // Brand values
      if (brandVoice.coreValues.length > 0 || brandVoice.desiredReputation) {
        parts.push("");
        parts.push("Brand Identity:");
        if (brandVoice.coreValues.length > 0) {
          parts.push(`Core Values: ${brandVoice.coreValues.join(", ")}`);
        }
        if (brandVoice.desiredReputation) {
          parts.push(`Desired Reputation: ${brandVoice.desiredReputation}`);
        }
      }

      // AI engine instructions (pre-generated guidance)
      if (brandVoice.aiEngineInstructions) {
        parts.push("");
        parts.push("AI Content Guidelines:");
        parts.push(brandVoice.aiEngineInstructions);
      }

      brandVoiceSection = parts.join("\n");
    }

    let targetAudienceSection = "";
    // Build target audience section from explicit input OR brand voice
    const hasExplicitAudience =
      targetAudience && targetAudience.trim().length > 0;
    const hasBrandVoiceAudience =
      brandVoice?.idealCustomerDescription ||
      (brandVoice?.customerPainPoints?.length ?? 0) > 0;

    if (hasExplicitAudience || hasBrandVoiceAudience) {
      const audienceParts: string[] = [];
      audienceParts.push("");
      audienceParts.push(
        "═══════════════════════════════════════════════════════════════",
      );
      audienceParts.push("TARGET AUDIENCE");
      audienceParts.push(
        "═══════════════════════════════════════════════════════════════",
      );

      // Explicit target audience takes priority
      if (hasExplicitAudience) {
        audienceParts.push(`Target Audience: ${targetAudience}`);
      }

      // Add brand voice audience data if available (supplements explicit audience)
      if (brandVoice?.idealCustomerDescription && !hasExplicitAudience) {
        audienceParts.push(
          `Ideal Customer: ${brandVoice.idealCustomerDescription}`,
        );
      }
      if (
        brandVoice?.customerPainPoints &&
        brandVoice.customerPainPoints.length > 0
      ) {
        audienceParts.push(
          `Pain Points to Address: ${brandVoice.customerPainPoints.join("; ")}`,
        );
      }
      if (
        brandVoice?.customerDesiredOutcomes &&
        brandVoice.customerDesiredOutcomes.length > 0
      ) {
        audienceParts.push(
          `Desired Outcomes: ${brandVoice.customerDesiredOutcomes.join("; ")}`,
        );
      }
      targetAudienceSection = audienceParts.join("\n");
    }

    // Build image analysis section if available
    let imageAnalysisSection = "";
    if (imageAnalysis) {
      const imageParts: string[] = [];
      imageParts.push("");
      imageParts.push(
        "═══════════════════════════════════════════════════════════════",
      );
      imageParts.push("PRODUCT IMAGE ANALYSIS (from AI Vision)");
      imageParts.push(
        "═══════════════════════════════════════════════════════════════",
      );
      imageParts.push(`Category: ${imageAnalysis.category}`);
      if (imageAnalysis.mood.length > 0) {
        imageParts.push(`Mood/Tone: ${imageAnalysis.mood.join(", ")}`);
      }
      if (imageAnalysis.scene_context.length > 0) {
        imageParts.push(
          `Scene Context: ${imageAnalysis.scene_context.join(", ")}`,
        );
      }
      if (imageAnalysis.keywords.length > 0) {
        imageParts.push(
          `Key Themes: ${imageAnalysis.keywords.slice(0, 8).join(", ")}`,
        );
      }
      imageParts.push("");
      imageParts.push(
        "⚠️ IMPORTANT: Your ad copy MUST align with the visual mood and context above.",
      );
      imageParts.push(
        "   The copy and image should tell ONE coherent story together.",
      );
      imageAnalysisSection = imageParts.join("\n");
    }

    // Build goal-specific CTA guidance
    const ctaGuidance = this.buildCTAGuidance(goal);

    // Build icon/emoji guidelines
    const iconGuidelines = this.buildIconGuidelines(platform);

    // Build mobile-first and visual alignment guidelines
    const mobileFirstGuidelines = this.buildMobileFirstGuidelines();

    // Get character limits for selected ad length AND platform
    const limits = this.getCharacterLimits(selectedLength, platform);
    const platformConstraints = getPlatformConstraints(platform);

    return `
You are the Creative Agent for the Ad Intelligence Engine (AIE).
Your job is to write high-converting ad copy for ${platformConstraints.displayName} with the goal of ${goal}.

${brandVoiceSection}
${targetAudienceSection}
${imageAnalysisSection}

═══════════════════════════════════════════════════════════════
YOUR TASK
═══════════════════════════════════════════════════════════════
Generate exactly 3 distinct variants:
1. Emotional Angle: Focuses on how the product makes the user feel.
2. Benefit Angle: Focuses on the concrete problems the product solves.
3. UGC/Social Angle: Written in a casual, peer-to-peer tone (like a review or testimonial).

Selected Ad Length: ${selectedLength}

${formatConstraintsForPrompt(platform)}

Additional Constraints:
- Primary Text (Ad Copy):
  * ⚠️ HARD LIMIT: ${limits.max} CHARACTERS MAXIMUM - THIS IS MANDATORY, NO EXCEPTIONS
  * TARGET LENGTH: ${limits.ideal} characters (${limits.words}, ${limits.sentences})
  * Count every character including spaces, punctuation, and emojis
  * If your ad copy exceeds ${limits.max} characters, you MUST shorten it
  * MOBILE-FIRST: Front-load value in first sentence to prevent truncation
  * Each sentence = 1 clear idea
  * ${selectedLength === "SHORT" ? "Keep it punchy and direct - no extra words" : ""}
  * ${selectedLength === "MEDIUM" ? "Balance detail with brevity - tell the story concisely" : ""}
  * ${selectedLength === "LONG" ? "Maximize impact within the character limit" : ""}
- Headline:
  * ⚠️ HARD LIMIT: ${limits.headlineMax} CHARACTERS MAXIMUM - THIS IS MANDATORY
  * Target ${Math.round(limits.headlineMax * 0.7)}-${Math.round(limits.headlineMax * 0.9)} characters for best mobile display
  * Shorter is stronger - make every word count
- Description: ${limits.descriptionMax > 50 ? "Up to " + limits.descriptionMax : "20-30"} characters (optional: price, shipping, guarantee)
- Tone: ${brandVoice?.tone || "Authentic, punchy, and direct. No fluff."}
- Formatting: Return ONLY valid JSON.
${brandVoice ? "\nIMPORTANT: All copy MUST match the brand voice guidelines above." : ""}

${mobileFirstGuidelines}

${ctaGuidance}

${iconGuidelines}
    `.trim();
  }

  /**
   * Build goal-specific CTA guidance
   */
  private buildCTAGuidance(goal: AieGoal): string {
    const ctaMap: Record<AieGoal, string[]> = {
      conversion: [
        "Shop Now",
        "Buy Now",
        "Get Yours Today",
        "Add to Cart",
        "Shop the Collection",
        "Order Now",
        "Claim Yours",
      ],
      awareness: [
        "Learn More",
        "Discover Why",
        "See How",
        "Find Out More",
        "Explore",
        "Read More",
      ],
      engagement: [
        "Join the Conversation",
        "Tag Someone",
        "Share Your Story",
        "Comment Below",
        "Tell Us",
        "Vote Now",
      ],
      traffic: [
        "Visit Our Site",
        "See the Full Collection",
        "Browse Now",
        "Check It Out",
        "View All",
        "Explore More",
      ],
      app_installs: [
        "Download Now",
        "Get the App",
        "Install Today",
        "Try It Free",
        "Start Now",
        "Join Free",
      ],
    };

    // eslint-disable-next-line security/detect-object-injection
    const examples = ctaMap[goal];

    return `
═══════════════════════════════════════════════════════════════
CALL TO ACTION REQUIREMENTS
═══════════════════════════════════════════════════════════════
Goal: ${goal}

Your ad MUST end with a strong, actionable CTA. Make it the final sentence.

Recommended CTAs for ${goal}:
${examples.map((cta) => `- "${cta}"`).join("\n")}

Guidelines:
- Use action verbs (Shop, Get, Discover, Join, etc.)
- Create urgency when appropriate ("Today", "Now", "Limited Time")
- Be specific and direct
- Match the variant angle (emotional CTAs for emotional variants, etc.)
- The CTA should flow naturally from the copy, not feel forced

Examples:
  Emotional: "Feel the difference. Shop Now →"
  Benefit: "Solve your problem today. Get Yours →"
  UGC: "Join 10K+ happy customers. Order Now →"
        `.trim();
  }

  /**
   * Build icon/emoji usage guidelines
   */
  private buildIconGuidelines(_platform: AiePlatform): string {
    return `
═══════════════════════════════════════════════════════════════
ICON & EMOJI USAGE (Tasteful Enhancement)
═══════════════════════════════════════════════════════════════
Use icons/emojis SPARINGLY to highlight key attributes. Quality over quantity.

Rules:
✅ DO:
  - Use 1-3 emojis maximum per ad
  - Place strategically to emphasize key points
  - Choose emojis that enhance meaning (not decoration)
  - Use platform-appropriate emojis (Meta loves: ✨💪🔥⚡👑💎🎯)
  - Align with brand personality

❌ DON'T:
  - Over-use (looks unprofessional and spammy)
  - Use random/irrelevant emojis
  - Put emojis in both headline AND primary text (choose one)
  - Use outdated or cringe emojis

Placement Options:
1. Headline only: "✨ Feel Unstoppable Today"
2. Primary text highlights: "Premium quality 💎 Unbeatable comfort 🔥"
3. Before CTA: "Shop Now →"

Examples by Variant:
  Emotional: ✨ (sparkles), 💫 (magic), ❤️ (love), 🌟 (star)
  Benefit: 💪 (strength), 🎯 (target), ⚡ (speed), 🔥 (hot)
  UGC: 👏 (applause), 🙌 (celebration), 🔥 (fire), ⭐ (star)
        `.trim();
  }

  /**
   * Build mobile-first and visual-copy alignment guidelines
   */
  private buildMobileFirstGuidelines(): string {
    return `
═══════════════════════════════════════════════════════════════
MOBILE-FIRST OPTIMIZATION (CRITICAL)
═══════════════════════════════════════════════════════════════
90% of Facebook users view ads on mobile. Optimize for small screens.

Mobile Rules:
✅ DO:
  - Keep primary text UNDER 125 characters (HARD LIMIT)
  - Front-load the most important message in the FIRST sentence
  - Use short, punchy sentences (10-15 words each)
  - Ensure CTA is visible without expanding text
  - Test readability at a glance (3-second rule)

❌ DON'T:
  - Exceed 125 characters in ad copy - this is non-negotiable
  - Bury the hook after the first sentence
  - Write long paragraphs that require expansion
  - Put important info at the end (may get cut off)
  - Use complex sentence structures

Visual-Copy Alignment:
✅ Your copy MUST directly reference or complement the product image/visual
  - If image shows product in use → describe the experience
  - If image shows product features → highlight those specific features
  - If image shows lifestyle → match that lifestyle in copy tone
  - Create synergy: copy + visual should tell ONE coherent story

Example:
  Image: Black t-shirt on model looking confident
  Copy: "✨ Feel unstoppable. Premium comfort meets bold style. Get Yours Today →"
  ✅ Aligned: "feel unstoppable" matches confident pose

  Image: Product flat lay with details visible
  Copy: "Crafted from premium cotton 💎 Designed to last. Shop Now →"
  ✅ Aligned: mentions materials visible in image
        `.trim();
  }

  private buildUserPrompt(
    productInfo: string,
    context: ResearchContext,
    platform: AiePlatform,
    imageAnalysis?: {
      category: string;
      mood: string[];
      scene_context: string[];
      keywords: string[];
    },
  ): string {
    const constraints = getPlatformConstraints(platform);
    const bestPracticesList = context.bestPractices
      .map((bp) => `- ${bp.title}: ${bp.description}`)
      .join("\n");

    const examplesList = context.adExamples
      .map(
        (ex) =>
          `- "${ex.headline}" (Hook: ${ex.primary_text?.substring(0, 50)}...)`,
      )
      .join("\n");

    // Build image context for the user prompt
    const imageContext = imageAnalysis
      ? `\nProduct Visual Context:\n- Category: ${imageAnalysis.category}\n- Mood: ${imageAnalysis.mood.join(", ")}\n- Setting: ${imageAnalysis.scene_context.join(", ")}`
      : "";

    return `
Product Info:
${productInfo}
${imageContext}

Research Context (Use these insights):
${bestPracticesList}

Successful Ad Examples (For inspiration):
${examplesList}

Output Format (JSON Array):
[
  {
    "variant_type": "emotional",
    "headline": "... (MAX ${constraints.headline.max} CHARACTERS)",
    "primary_text": "... (MAX ${constraints.primaryText.max} CHARACTERS - include compelling copy with CTA at end)",
    "call_to_action": "Shop Now", // Strong action verb CTA
    "description": "..." // OPTIONAL: ${constraints.description.max > 50 ? "Up to " + constraints.description.max : "20-30"} chars for price/shipping/guarantee
  },
  {
    "variant_type": "benefit",
    "headline": "... (MAX ${constraints.headline.max} CHARACTERS)",
    "primary_text": "... (MAX ${constraints.primaryText.max} CHARACTERS - include compelling copy with CTA at end)",
    "call_to_action": "Get Yours",
    "description": "..."
  },
  {
    "variant_type": "ugc",
    "headline": "... (MAX ${constraints.headline.max} CHARACTERS)",
    "primary_text": "... (MAX ${constraints.primaryText.max} CHARACTERS - include compelling copy with CTA at end)",
    "call_to_action": "Buy Now",
    "description": "..."
  }
]

CRITICAL CHARACTER LIMITS FOR ${constraints.displayName.toUpperCase()} - COUNT CAREFULLY:
- headline: MAX ${constraints.headline.max} characters
- primary_text: MAX ${constraints.primaryText.max} characters
    `.trim();
  }

  private parseResponse(
    response: string,
    selectedLength: AdLengthOption,
  ): Partial<AdVariant>[] {
    // Clean up markdown code blocks if present
    const cleanJson = response
      .replace(/```json/g, "")
      .replace(/```/g, "")
      .trim();
    const parsed = JSON.parse(cleanJson);

    if (!Array.isArray(parsed) || parsed.length !== 3) {
      throw new Error("Invalid response format: Expected array of 3 variants");
    }

    return parsed.map(
      (v: {
        variant_type: string;
        headline: string;
        primary_text: string;
        call_to_action?: string;
        description?: string;
      }) => ({
        variant_type: v.variant_type as AieVariantType,
        headline: v.headline,
        primary_text: v.primary_text,
        call_to_action: v.call_to_action || "Shop Now",
        description: v.description || undefined, // Optional field
        selected_length: selectedLength, // Tag each variant with the selected length
        is_selected: false,
      }),
    );
  }
}
