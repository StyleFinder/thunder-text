/* eslint-disable security/detect-object-injection -- Dynamic object access with validated keys is safe here */
/**
 * AIE Utility Functions
 * Helper functions for the AIE module
 */

import type {
  AIEPlatform,
  AIEGoal,
  AIEVariantType,
  AIEHookTechnique,
  AIETone,
} from "./types";

/**
 * Validate platform value
 */
export function isValidPlatform(platform: string): platform is AIEPlatform {
  return ["meta", "instagram", "google", "tiktok", "pinterest"].includes(
    platform,
  );
}

/**
 * Validate goal value
 */
export function isValidGoal(goal: string): goal is AIEGoal {
  return [
    "awareness",
    "engagement",
    "conversion",
    "traffic",
    "app_installs",
  ].includes(goal);
}

/**
 * Determine variant type based on platform and goal
 */
export function determineVariantTypes(
  platform: AIEPlatform,
  goal: AIEGoal,
): AIEVariantType[] {
  // Always generate 3 variants with different approaches
  const variantTypes: AIEVariantType[] = [];

  // Strategy 1: Choose primary variant type based on goal
  if (goal === "conversion") {
    variantTypes.push("benefit"); // Lead with clear benefits
  } else if (goal === "engagement") {
    variantTypes.push("emotional"); // Emotional connection
  } else if (goal === "awareness") {
    variantTypes.push("storytelling"); // Brand narrative
  } else {
    variantTypes.push("benefit"); // Default to benefit-driven
  }

  // Strategy 2: Platform-specific best performer
  if (platform === "meta" || platform === "instagram") {
    variantTypes.push("ugc"); // UGC performs well on Meta/IG
  } else if (platform === "google") {
    variantTypes.push("urgency"); // Urgency works well for search intent
  } else {
    variantTypes.push("social_proof"); // Social proof is universal
  }

  // Strategy 3: Alternative approach for testing
  const remainingTypes: AIEVariantType[] = [
    "emotional",
    "benefit",
    "ugc",
    "storytelling",
    "urgency",
    "social_proof",
  ];
  const available = remainingTypes.filter((t) => !variantTypes.includes(t));
  variantTypes.push(available[0] || "emotional");

  return variantTypes.slice(0, 3);
}

/**
 * Select hook technique based on variant type
 */
export function selectHookTechnique(
  variantType: AIEVariantType,
): AIEHookTechnique {
  const hookMap: Record<AIEVariantType, AIEHookTechnique> = {
    emotional: "pain_point",
    benefit: "benefit",
    ugc: "testimonial",
    storytelling: "question",
    urgency: "urgency",
    social_proof: "social_proof",
  };

  return hookMap[variantType];
}

/**
 * Select tone based on variant type and platform
 */
export function selectTone(
  variantType: AIEVariantType,
  platform: AIEPlatform,
): AIETone {
  // Platform-specific tone preferences
  if (platform === "instagram") {
    return variantType === "ugc" ? "casual" : "playful";
  }

  if (platform === "google") {
    return "professional";
  }

  // Variant-specific tones
  const toneMap: Record<AIEVariantType, AIETone> = {
    emotional: "empathetic",
    benefit: "authoritative",
    ugc: "casual",
    storytelling: "casual",
    urgency: "urgent",
    social_proof: "professional",
  };

  return toneMap[variantType];
}

/**
 * Extract category from image analysis or product description
 */
export function extractCategory(
  imageCategory?: string,
  productDescription?: string,
): string {
  if (imageCategory) {
    return imageCategory.toLowerCase();
  }

  // Attempt to infer from description
  const categoryKeywords: Record<string, string[]> = {
    apparel: [
      "clothing",
      "shirt",
      "dress",
      "pants",
      "jacket",
      "fashion",
      "wear",
    ],
    beauty: ["skincare", "makeup", "beauty", "cosmetic", "serum", "cream"],
    electronics: ["phone", "laptop", "headphones", "gadget", "device", "tech"],
    home: ["furniture", "decor", "kitchen", "bedroom", "home"],
    fitness: ["workout", "fitness", "yoga", "exercise", "gym"],
    food: ["food", "snack", "meal", "recipe", "organic"],
  };

  const desc = (productDescription || "").toLowerCase();

  for (const [category, keywords] of Object.entries(categoryKeywords)) {
    if (keywords.some((keyword) => desc.includes(keyword))) {
      return category;
    }
  }

  return "general";
}

/**
 * Calculate quality score for ad variant
 * Based on multiple factors: hook strength, CTA clarity, brand fit, etc.
 */
export function calculateQualityScore(params: {
  hookStrength: number;
  ctaClarity: number;
  brandFit: number;
  contextRelevance: number;
  platformCompliance: number;
}): number {
  const weights = {
    hookStrength: 0.25,
    ctaClarity: 0.2,
    brandFit: 0.2,
    contextRelevance: 0.2,
    platformCompliance: 0.15,
  };

  return (
    params.hookStrength * weights.hookStrength +
    params.ctaClarity * weights.ctaClarity +
    params.brandFit * weights.brandFit +
    params.contextRelevance * weights.contextRelevance +
    params.platformCompliance * weights.platformCompliance
  );
}

/**
 * Format currency for display
 */
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

/**
 * Format percentage for display
 */
export function formatPercentage(value: number, decimals = 2): string {
  return `${(value * 100).toFixed(decimals)}%`;
}

/**
 * Truncate text to specified length
 */
export function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength - 3) + "...";
}

/**
 * Validate character limits for platform
 */
export function validateCharacterLimits(params: {
  platform: AIEPlatform;
  headline: string;
  primaryText: string;
  description?: string;
}): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  // Platform-specific limits
  const limits: Record<
    AIEPlatform,
    { headline: number; primaryText: number; description?: number }
  > = {
    meta: { headline: 40, primaryText: 125, description: 30 },
    instagram: { headline: 40, primaryText: 125 },
    google: { headline: 30, primaryText: 90, description: 90 },
    tiktok: { headline: 100, primaryText: 100 },
    pinterest: { headline: 100, primaryText: 500 },
  };

  const limit = limits[params.platform];

  if (params.headline.length > limit.headline) {
    errors.push(
      `Headline exceeds ${limit.headline} characters (${params.headline.length})`,
    );
  }

  if (params.primaryText.length > limit.primaryText) {
    errors.push(
      `Primary text exceeds ${limit.primaryText} characters (${params.primaryText.length})`,
    );
  }

  if (
    limit.description &&
    params.description &&
    params.description.length > limit.description
  ) {
    errors.push(
      `Description exceeds ${limit.description} characters (${params.description.length})`,
    );
  }

  return { valid: errors.length === 0, errors };
}

/**
 * Calculate estimated AI cost for operation
 */
export function calculateAICost(operations: {
  imageAnalysis?: number;
  embeddings?: number;
  adGeneration?: number;
}): number {
  const costs = {
    imageAnalysis: 0.01, // GPT-4 Vision per image
    embeddings: 0.0001, // ada-002 per 1K tokens (avg 100 tokens per embedding)
    adGeneration: 0.03, // GPT-4 per generation (3 variants)
  };

  return (
    (operations.imageAnalysis || 0) * costs.imageAnalysis +
    (operations.embeddings || 0) * costs.embeddings +
    (operations.adGeneration || 0) * costs.adGeneration
  );
}
