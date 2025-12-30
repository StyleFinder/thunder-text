import { ResearcherAgent } from "./researcher/agent";
import { CreativeAgent } from "./creative/agent";
import { AnalystAgent } from "./analyst/agent";
import { AdLengthSelector } from "./utils/adLengthSelector";
import { analyzeImage } from "./image-analyzer";
import { logger } from "@/lib/logger";
import {
  AiePlatform,
  AieGoal,
  AdVariant,
  AdLengthMode,
  AdLengthInput,
  CampaignType,
  AudienceTemperature,
  ProductComplexity,
} from "../../types/aie";

export interface GenerationRequest {
  productInfo: string;
  platform: AiePlatform;
  goal: AieGoal;
  shopId?: string; // Optional for now
  targetAudience?: string; // Optional target audience description
  imageUrls?: string[]; // Optional product image URLs for vision analysis

  // Ad Length Selection inputs
  adLengthMode?: AdLengthMode; // AUTO (default), SHORT, MEDIUM, LONG
  campaignType?: CampaignType;
  audienceTemperature?: AudienceTemperature;
  productPrice?: number;
  productComplexity?: ProductComplexity;
  hasStrongStory?: boolean;
  isPremiumBrand?: boolean;
}

export interface GenerationResult {
  variants: Partial<AdVariant>[];
  researchSummary: {
    bestPracticeCount: number;
    exampleCount: number;
  };
}

export class AdIntelligenceEngine {
  private researcher: ResearcherAgent;
  private creative: CreativeAgent;
  private analyst: AnalystAgent;
  private lengthSelector: AdLengthSelector | null = null;

  constructor() {
    this.researcher = new ResearcherAgent();
    this.creative = new CreativeAgent();
    this.analyst = new AnalystAgent();
  }

  /**
   * Initialize AdLengthSelector lazily (requires env vars)
   */
  private async getLengthSelector(): Promise<AdLengthSelector> {
    if (!this.lengthSelector) {
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
      const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
      this.lengthSelector = new AdLengthSelector(supabaseUrl, supabaseKey);
      await this.lengthSelector.loadRules();
    }
    return this.lengthSelector;
  }

  /**
   * Map AieGoal to CampaignType
   */
  private mapGoalToCampaignType(goal: AieGoal): CampaignType {
    const mapping: Record<AieGoal, CampaignType> = {
      awareness: "AWARENESS",
      engagement: "SALES", // Default engagement to SALES
      conversion: "CONVERSIONS",
      traffic: "TRAFFIC",
      app_installs: "SALES", // Default app installs to SALES
    };
    // eslint-disable-next-line security/detect-object-injection
    return mapping[goal];
  }

  /**
   * Orchestrate the entire ad generation process
   */
  async generateAds(request: GenerationRequest): Promise<GenerationResult> {
    let selectedLength: import("@/types/aie").AdLengthOption = "MEDIUM";

    // 0. Ad Length Selection Phase
    logger.info("📏 Phase 0: Determining optimal ad length...", {
      component: "aie-engine",
    });
    try {
      const lengthSelector = await this.getLengthSelector();

      const adLengthInput: Partial<AdLengthInput> = {
        campaign_type:
          request.campaignType || this.mapGoalToCampaignType(request.goal),
        audience_temperature: request.audienceTemperature,
        price: request.productPrice,
        product_complexity: request.productComplexity,
        has_strong_story: request.hasStrongStory,
        is_premium_brand: request.isPremiumBrand,
      };

      selectedLength = await lengthSelector.selectAdLength(
        request.adLengthMode || "AUTO",
        adLengthInput,
      );

      const limits = lengthSelector.getCharacterLimits(selectedLength);
      logger.info(
        `   Phase 0 complete: Selected ${selectedLength} (${limits.ideal} chars ideal, ${limits.max} max)`,
        { component: "aie-engine" },
      );
    } catch (phase0Error) {
      logger.error(
        "Phase 0 error (ad length selection):",
        phase0Error as Error,
        { component: "aie-engine" },
      );
      // Default to MEDIUM and continue - don't fail the entire generation
      logger.info("   Defaulting to MEDIUM ad length", {
        component: "aie-engine",
      });
    }

    // 0.5 Image Analysis Phase (optional, runs in parallel with research)
    let imageAnalysis:
      | {
          category: string;
          mood: string[];
          scene_context: string[];
          keywords: string[];
        }
      | undefined;
    if (request.imageUrls && request.imageUrls.length > 0) {
      logger.info("🖼️ Phase 0.5: Analyzing product image...", {
        component: "aie-engine",
      });
      try {
        // Analyze the first image (primary product image)
        const analysis = await analyzeImage(request.imageUrls[0]);
        imageAnalysis = {
          category: analysis.category,
          mood: analysis.mood,
          scene_context: analysis.scene_context,
          keywords: analysis.keywords,
        };
        logger.info(
          `   Image analysis complete: ${analysis.category} - ${analysis.mood.join(", ")}`,
          { component: "aie-engine" },
        );
      } catch (imageError) {
        logger.error("Image analysis error (non-fatal):", imageError as Error, {
          component: "aie-engine",
        });
        // Continue without image analysis - it's optional
      }
    }

    // 1. Research Phase
    logger.info("🔬 Phase 1: Researching best practices and examples...", {
      component: "aie-engine",
    });
    let context;
    try {
      context = await this.researcher.compileContext(
        request.productInfo,
        request.platform,
        request.goal,
        request.shopId,
      );
      logger.info(
        `   Phase 1 complete: Found ${context.bestPractices.length} best practices and ${context.adExamples.length} examples.`,
        { component: "aie-engine" },
      );
      if (context.brandVoice) {
        logger.info("   Brand voice context loaded", {
          component: "aie-engine",
        });
      }
    } catch (phase1Error) {
      logger.error("Phase 1 error (research):", phase1Error as Error, {
        component: "aie-engine",
      });
      throw new Error(
        `Research phase failed: ${phase1Error instanceof Error ? phase1Error.message : "Unknown error"}`,
      );
    }

    // 2. Creative Phase
    logger.info("🎨 Phase 2: Generating creative variants...", {
      component: "aie-engine",
    });
    let drafts;
    try {
      drafts = await this.creative.generateVariants(
        request.productInfo,
        context,
        request.platform,
        request.goal,
        selectedLength, // Pass selected length to creative agent
        request.targetAudience, // Pass target audience
        imageAnalysis, // Pass image analysis results
      );
      logger.info(`   Phase 2 complete: Generated ${drafts.length} drafts.`, {
        component: "aie-engine",
      });
    } catch (phase2Error) {
      logger.error("Phase 2 error (creative):", phase2Error as Error, {
        component: "aie-engine",
      });
      throw new Error(
        `Creative phase failed: ${phase2Error instanceof Error ? phase2Error.message : "Unknown error"}`,
      );
    }

    // 3. Analysis Phase
    logger.info("🧐 Phase 3: Analyzing and scoring variants...", {
      component: "aie-engine",
    });
    let scoredVariants;
    try {
      scoredVariants = await this.analyst.scoreVariants(
        drafts,
        context,
        request.platform,
        request.goal,
      );

      // Sort by score descending
      scoredVariants.sort(
        (a, b) => (b.predicted_score || 0) - (a.predicted_score || 0),
      );
      logger.info("   Phase 3 complete: Scoring complete.", {
        component: "aie-engine",
      });
    } catch (phase3Error) {
      logger.error("Phase 3 error (analysis):", phase3Error as Error, {
        component: "aie-engine",
      });
      throw new Error(
        `Analysis phase failed: ${phase3Error instanceof Error ? phase3Error.message : "Unknown error"}`,
      );
    }

    // NOTE: Auto-save removed per user request.
    // We now only save specific variants when the user clicks "Save" in the UI.

    return {
      variants: scoredVariants,
      researchSummary: {
        bestPracticeCount: context.bestPractices.length,
        exampleCount: context.adExamples.length,
      },
    };
  }

  /**
   * Save a specific selected variant to the database
   */
  async saveSelectedVariant(
    request: GenerationRequest,
    variant: Partial<AdVariant>,
  ) {
    const { supabaseAdmin } = await import("@/lib/supabase/admin");

    // 1. Create (or find) Ad Request
    // For now, we create a new request record for each saved action to keep it simple,
    // or we could pass a requestID if we wanted to group them.
    // Let's create a new one to ensure clean lineage.
    const { data: adRequest, error: requestError } = await supabaseAdmin
      .from("aie_ad_requests")
      .insert({
        shop_id: request.shopId,
        platform: request.platform,
        goal: request.goal,
        description: request.productInfo,
        status: "approved", // It's approved since the user saved it
      })
      .select()
      .single();

    if (requestError) {
      logger.error("Error saving ad request:", requestError as Error, {
        component: "engine",
      });
      throw new Error(`Failed to save request: ${requestError.message}`);
    }

    // 2. Create Ad Variant
    const { error: variantError } = await supabaseAdmin
      .from("aie_ad_variants")
      .insert({
        ad_request_id: adRequest.id,
        variant_type: variant.variant_type,
        headline: variant.headline,
        primary_text: variant.primary_text,
        predicted_score: variant.predicted_score,
        is_selected: true, // User selected this one
      });

    if (variantError) {
      logger.error("Error saving ad variant:", variantError as Error, {
        component: "engine",
      });
      throw new Error(`Failed to save variant: ${variantError.message}`);
    }

    return { success: true, requestId: adRequest.id };
  }
}

// Export a singleton instance for easy use
export const aieEngine = new AdIntelligenceEngine();
