/* eslint-disable security/detect-object-injection -- Dynamic object access with validated keys is safe here */
import { createClient } from "@supabase/supabase-js";
import type {
  AdLengthOption,
  AdLengthMode,
  AdLengthInput,
  AdLengthRules,
  CampaignType,
  AudienceTemperature,
  ProductComplexity,
} from "@/types/aie";

/**
 * AdLengthSelector - Determines optimal ad length based on scoring system
 *
 * Implements the ACE Ad Length Selection Engine:
 * - Loads JSON rules from Supabase
 * - Applies scoring logic across 6 categories
 * - Returns SHORT, MEDIUM, or LONG format recommendation
 */
export class AdLengthSelector {
  private supabase;
  private rules: AdLengthRules | null = null;

  constructor(supabaseUrl: string, supabaseKey: string) {
    this.supabase = createClient(supabaseUrl, supabaseKey);
  }

  /**
   * Load active ad length rules from Supabase
   */
  async loadRules(): Promise<void> {
    const { data, error } = await this.supabase
      .from("ad_length_rules")
      .select("rules")
      .eq("is_active", true)
      .order("version", { ascending: false })
      .limit(1)
      .single();

    if (error) {
      throw new Error(`Failed to load ad length rules: ${error.message}`);
    }

    if (!data) {
      throw new Error("No active ad length rules found");
    }

    this.rules = data.rules as AdLengthRules;
  }

  /**
   * Step 0: Check for manual override
   */
  private handleManualOverride(mode: AdLengthMode): AdLengthOption | null {
    if (mode === "SHORT" || mode === "MEDIUM" || mode === "LONG") {
      return mode as AdLengthOption;
    }
    return null;
  }

  /**
   * Step 1: Collect inputs with defaults
   */
  private applyDefaults(input: Partial<AdLengthInput>): AdLengthInput {
    if (!this.rules) throw new Error("Rules not loaded");

    return {
      campaign_type: input.campaign_type || this.rules.defaults.campaign_type,
      audience_temperature:
        input.audience_temperature || this.rules.defaults.audience_temperature,
      price: input.price,
      product_complexity:
        input.product_complexity || this.rules.defaults.product_complexity,
      has_strong_story:
        input.has_strong_story ?? this.rules.defaults.has_strong_story,
      is_premium_brand:
        input.is_premium_brand ?? this.rules.defaults.is_premium_brand,
    };
  }

  /**
   * Step 2: Initialize scoring
   */
  private initializeScores(): Record<AdLengthOption, number> {
    return {
      SHORT: 0,
      MEDIUM: 0,
      LONG: 0,
    };
  }

  /**
   * Step 3: Apply campaign type rules
   */
  private applyCampaignTypeRules(
    scores: Record<AdLengthOption, number>,
    campaignType: CampaignType,
  ): void {
    if (!this.rules) return;

    const rule = this.rules.scoring.campaign_type.find((r) =>
      r.match.includes(campaignType),
    );

    if (rule) {
      scores.SHORT += rule.weights.SHORT;
      scores.MEDIUM += rule.weights.MEDIUM;
      scores.LONG += rule.weights.LONG;
    }
  }

  /**
   * Step 4: Apply audience temperature rules
   */
  private applyAudienceTemperatureRules(
    scores: Record<AdLengthOption, number>,
    audienceTemp: AudienceTemperature,
  ): void {
    if (!this.rules) return;

    const rule = this.rules.scoring.audience_temperature.find((r) =>
      r.match.includes(audienceTemp),
    );

    if (rule) {
      scores.SHORT += rule.weights.SHORT;
      scores.MEDIUM += rule.weights.MEDIUM;
      scores.LONG += rule.weights.LONG;
    }
  }

  /**
   * Step 5: Apply price rules
   */
  private applyPriceRules(
    scores: Record<AdLengthOption, number>,
    price?: number,
  ): void {
    if (!this.rules || price === undefined) return;

    const rule = this.rules.scoring.price.rules.find((r) => {
      const meetsMin = price >= r.min;
      const meetsMax = r.max === null || price <= r.max;
      return meetsMin && meetsMax;
    });

    if (rule) {
      scores.SHORT += rule.weights.SHORT;
      scores.MEDIUM += rule.weights.MEDIUM;
      scores.LONG += rule.weights.LONG;
    }
  }

  /**
   * Step 6: Apply product complexity rules
   */
  private applyProductComplexityRules(
    scores: Record<AdLengthOption, number>,
    complexity: ProductComplexity,
  ): void {
    if (!this.rules) return;

    const rule = this.rules.scoring.product_complexity.find((r) =>
      r.match.includes(complexity),
    );

    if (rule) {
      scores.SHORT += rule.weights.SHORT;
      scores.MEDIUM += rule.weights.MEDIUM;
      scores.LONG += rule.weights.LONG;
    }
  }

  /**
   * Step 7: Apply story/brand rules
   */
  private applyStoryAndBrandRules(
    scores: Record<AdLengthOption, number>,
    hasStrongStory: boolean,
    isPremiumBrand: boolean,
  ): void {
    if (!this.rules) return;

    // Apply story rule
    const storyWeights = hasStrongStory
      ? this.rules.scoring.has_strong_story.true
      : this.rules.scoring.has_strong_story.false;

    scores.SHORT += storyWeights.SHORT;
    scores.MEDIUM += storyWeights.MEDIUM;
    scores.LONG += storyWeights.LONG;

    // Apply premium brand rule
    const brandWeights = isPremiumBrand
      ? this.rules.scoring.is_premium_brand.true
      : this.rules.scoring.is_premium_brand.false;

    scores.SHORT += brandWeights.SHORT;
    scores.MEDIUM += brandWeights.MEDIUM;
    scores.LONG += brandWeights.LONG;
  }

  /**
   * Step 8: Determine winner with tie-breaking
   */
  private determineWinner(
    scores: Record<AdLengthOption, number>,
    audienceTemp: AudienceTemperature,
  ): AdLengthOption {
    if (!this.rules) throw new Error("Rules not loaded");

    const maxScore = Math.max(scores.SHORT, scores.MEDIUM, scores.LONG);
    const winners = (Object.keys(scores) as AdLengthOption[]).filter(
      (key) => scores[key] === maxScore,
    );

    // No tie - clear winner
    if (winners.length === 1) {
      return winners[0];
    }

    // Tie-breaking logic
    // 1. Prefer MEDIUM if it's in the tie
    if (winners.includes(this.rules.tie_breaker.primary_preference)) {
      return this.rules.tie_breaker.primary_preference;
    }

    // 2. Use audience-based preference
    const preferenceOrder =
      audienceTemp === "COLD"
        ? this.rules.tie_breaker.cold_audience_preference_order
        : this.rules.tie_breaker.hot_audience_preference_order;

    for (const option of preferenceOrder) {
      if (winners.includes(option)) {
        return option;
      }
    }

    // Fallback (should never reach here with proper config)
    return "MEDIUM";
  }

  /**
   * Main method: Select ad length based on inputs
   *
   * @param mode - User selection (AUTO, SHORT, MEDIUM, LONG)
   * @param input - Campaign and product context
   * @returns Selected ad length
   */
  async selectAdLength(
    mode: AdLengthMode,
    input: Partial<AdLengthInput>,
  ): Promise<AdLengthOption> {
    // Load rules if not already loaded
    if (!this.rules) {
      await this.loadRules();
    }

    // Step 0: Check manual override
    const manualOverride = this.handleManualOverride(mode);
    if (manualOverride) {
      return manualOverride;
    }

    // Step 1: Collect inputs with defaults
    const fullInput = this.applyDefaults(input);

    // Step 2: Initialize scoring
    const scores = this.initializeScores();

    // Step 3-7: Apply all scoring rules
    this.applyCampaignTypeRules(scores, fullInput.campaign_type);
    this.applyAudienceTemperatureRules(scores, fullInput.audience_temperature);
    this.applyPriceRules(scores, fullInput.price);
    this.applyProductComplexityRules(scores, fullInput.product_complexity);
    this.applyStoryAndBrandRules(
      scores,
      fullInput.has_strong_story,
      fullInput.is_premium_brand,
    );

    // Step 8: Determine winner
    return this.determineWinner(scores, fullInput.audience_temperature);
  }

  /**
   * Get character length guidelines for a selected ad length
   */
  getCharacterLimits(length: AdLengthOption): {
    ideal: number;
    max: number;
    sentences: string;
  } {
    switch (length) {
      case "SHORT":
        return {
          ideal: 90,
          max: 90,
          sentences: "1-2 sentences",
        };
      case "MEDIUM":
        return {
          ideal: 140,
          max: 180,
          sentences: "2-3 sentences",
        };
      case "LONG":
        return {
          ideal: 275,
          max: 350,
          sentences: "3-5 sentences",
        };
    }
  }
}
