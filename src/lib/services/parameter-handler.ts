/* eslint-disable security/detect-object-injection -- Dynamic object access with validated keys is safe here */
/**
 * Parameter Handler
 * Manages and transforms content generation parameters
 */

import type { ContentType, CTAType } from "./content-prompts";

export interface ParameterPreset {
  name: string;
  description: string;
  contentType: ContentType;
  wordCount: number;
  toneIntensity: number;
  ctaType: CTAType;
  customCTA?: string;
}

/**
 * Common parameter presets for quick content generation
 */
export const PARAMETER_PRESETS: Record<string, ParameterPreset> = {
  blog_detailed: {
    name: "Detailed Blog Post",
    description: "Comprehensive blog post with depth",
    contentType: "blog",
    wordCount: 1500,
    toneIntensity: 3,
    ctaType: "learn_more",
  },
  blog_quick: {
    name: "Quick Blog Post",
    description: "Concise, scannable blog post",
    contentType: "blog",
    wordCount: 800,
    toneIntensity: 3,
    ctaType: "learn_more",
  },
  ad_short: {
    name: "Short Ad Copy",
    description: "Punchy ad copy for quick impact",
    contentType: "ad",
    wordCount: 150,
    toneIntensity: 4,
    ctaType: "shop_now",
  },
  ad_long: {
    name: "Long-Form Ad",
    description: "Story-driven ad with detail",
    contentType: "ad",
    wordCount: 500,
    toneIntensity: 4,
    ctaType: "shop_now",
  },
  store_landing: {
    name: "Landing Page Copy",
    description: "Comprehensive store landing page",
    contentType: "store_copy",
    wordCount: 800,
    toneIntensity: 3,
    ctaType: "shop_now",
  },
  store_about: {
    name: "About Us Copy",
    description: "Brand story and mission",
    contentType: "store_copy",
    wordCount: 600,
    toneIntensity: 3,
    ctaType: "learn_more",
  },
  facebook_standard: {
    name: "Facebook Post",
    description: "Engaging Facebook content",
    contentType: "social_facebook",
    wordCount: 200,
    toneIntensity: 4,
    ctaType: "learn_more",
  },
  instagram_caption: {
    name: "Instagram Caption",
    description: "Visual-first Instagram content",
    contentType: "social_instagram",
    wordCount: 150,
    toneIntensity: 4,
    ctaType: "shop_now",
  },
  tiktok_script: {
    name: "TikTok Script",
    description: "Casual TikTok content",
    contentType: "social_tiktok",
    wordCount: 100,
    toneIntensity: 5,
    ctaType: "visit_website",
  },
};

/**
 * Word count ranges by content type
 */
export const WORD_COUNT_RANGES: Record<
  ContentType,
  { min: number; max: number; recommended: number }
> = {
  blog: { min: 500, max: 2000, recommended: 1200 },
  ad: { min: 50, max: 800, recommended: 300 },
  store_copy: { min: 200, max: 1500, recommended: 600 },
  social_facebook: { min: 50, max: 500, recommended: 200 },
  social_instagram: { min: 50, max: 300, recommended: 150 },
  social_tiktok: { min: 50, max: 200, recommended: 100 },
};

/**
 * Get recommended word count for content type
 */
export function getRecommendedWordCount(contentType: ContentType): number {
  return WORD_COUNT_RANGES[contentType].recommended;
}

/**
 * Validate word count for content type
 */
export function validateWordCountForType(
  contentType: ContentType,
  wordCount: number,
): {
  valid: boolean;
  message?: string;
} {
  const range = WORD_COUNT_RANGES[contentType];

  if (wordCount < range.min) {
    return {
      valid: false,
      message: `Word count too low for ${contentType}. Minimum: ${range.min} words`,
    };
  }

  if (wordCount > range.max) {
    return {
      valid: false,
      message: `Word count too high for ${contentType}. Maximum: ${range.max} words`,
    };
  }

  return { valid: true };
}

/**
 * Adjust parameters based on content type constraints
 */
export function normalizeParametersForType(
  contentType: ContentType,
  wordCount: number,
  toneIntensity: number,
): { wordCount: number; toneIntensity: number } {
  const range = WORD_COUNT_RANGES[contentType];

  // Clamp word count to valid range
  const normalizedWordCount = Math.max(
    range.min,
    Math.min(range.max, wordCount),
  );

  // Clamp tone intensity to 1-5
  const normalizedToneIntensity = Math.max(1, Math.min(5, toneIntensity));

  return {
    wordCount: normalizedWordCount,
    toneIntensity: normalizedToneIntensity,
  };
}

/**
 * Get content type label
 */
export function getContentTypeLabel(contentType: ContentType): string {
  const labels: Record<ContentType, string> = {
    blog: "Blog Post",
    ad: "Advertisement",
    store_copy: "Store/Website Copy",
    social_facebook: "Facebook Post",
    social_instagram: "Instagram Caption",
    social_tiktok: "TikTok Content",
  };
  return labels[contentType];
}

/**
 * Get CTA type label
 */
export function getCTATypeLabel(ctaType: CTAType): string {
  const labels: Record<CTAType, string> = {
    shop_now: "Shop Now",
    learn_more: "Learn More",
    visit_website: "Visit Website",
    contact_us: "Contact Us",
    custom: "Custom CTA",
  };
  return labels[ctaType];
}

/**
 * Get tone intensity label
 */
export function getToneIntensityLabel(intensity: number): string {
  const labels: Record<number, string> = {
    1: "Very Subtle",
    2: "Gentle",
    3: "Moderate",
    4: "Strong",
    5: "Maximum",
  };
  return labels[intensity] || "Moderate";
}

/**
 * Get tone intensity description
 */
export function getToneIntensityDescription(intensity: number): string {
  const descriptions: Record<number, string> = {
    1: "Minimal personality - Very professional and understated",
    2: "Light touch - Subtle personality while staying professional",
    3: "Balanced - Noticeable personality without being overwhelming",
    4: "Bold - Strong personality that clearly comes through",
    5: "Full force - Maximum personality and brand voice expression",
  };
  return descriptions[intensity] || descriptions[3];
}

/**
 * Calculate estimated generation time based on parameters
 */
export function estimateGenerationTime(
  contentType: ContentType,
  wordCount: number,
): number {
  // Base time by content type (in seconds)
  const baseTimes: Record<ContentType, number> = {
    blog: 15,
    ad: 10,
    store_copy: 12,
    social_facebook: 8,
    social_instagram: 7,
    social_tiktok: 6,
  };

  const baseTime = baseTimes[contentType];

  // Add time based on word count (0.01s per word)
  const wordCountTime = wordCount * 0.01;

  return Math.round(baseTime + wordCountTime);
}

/**
 * Calculate estimated cost based on parameters
 */
export function estimateCost(
  contentType: ContentType,
  wordCount: number,
): number {
  // Rough token estimates
  const promptTokens = 1500; // Voice profile + instructions
  const completionTokens = wordCount * 1.3; // Words to tokens ratio

  // GPT-4o-mini pricing (as of 2024): $0.15/1M input, $0.60/1M output
  const inputCostPer1kTokens = 0.00015; // $0.15 per 1M = $0.00015 per 1K
  const outputCostPer1kTokens = 0.0006; // $0.60 per 1M = $0.0006 per 1K

  const inputCost = (promptTokens / 1000) * inputCostPer1kTokens;
  const outputCost = (completionTokens / 1000) * outputCostPer1kTokens;

  return Math.round((inputCost + outputCost) * 10000) / 10000; // Round to 4 decimals for accuracy
}

/**
 * Parse saved parameters from string
 */
export function parseParametersFromString(
  paramString: string,
): Partial<ParameterPreset> | null {
  try {
    return JSON.parse(paramString);
  } catch {
    return null;
  }
}

/**
 * Serialize parameters to string for saving
 */
export function serializeParameters(params: Partial<ParameterPreset>): string {
  return JSON.stringify(params);
}
