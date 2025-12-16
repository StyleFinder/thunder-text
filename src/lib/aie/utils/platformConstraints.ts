/**
 * Platform-specific character constraints for ad copy
 * Based on official platform specifications as of 2024
 */

import { AiePlatform } from "@/types/aie";

export interface PlatformConstraints {
  platform: AiePlatform;
  displayName: string;
  primaryText: {
    max: number;
    recommended: number;
    description: string;
  };
  headline: {
    max: number;
    recommended: number;
    description: string;
  };
  description: {
    max: number;
    recommended: number;
    description: string;
  };
  cta: {
    options: string[];
    customAllowed: boolean;
  };
  notes: string[];
}

/**
 * Platform-specific constraints for ad copy
 * Sources:
 * - Meta: https://www.facebook.com/business/help/1695754927158071
 * - Google: https://support.google.com/google-ads/answer/1704389
 * - TikTok: https://ads.tiktok.com/help/article/ad-specs
 * - Pinterest: https://help.pinterest.com/en/business/article/promoted-pin-specs
 */
export const PLATFORM_CONSTRAINTS: Record<AiePlatform, PlatformConstraints> = {
  meta: {
    platform: "meta",
    displayName: "Meta (Facebook)",
    primaryText: {
      max: 125,
      recommended: 125,
      description: "Primary text shown above the ad creative",
    },
    headline: {
      max: 40,
      recommended: 27,
      description: "Headline shown below the ad creative",
    },
    description: {
      max: 30,
      recommended: 27,
      description: "Link description (optional)",
    },
    cta: {
      options: [
        "Shop Now",
        "Learn More",
        "Sign Up",
        "Book Now",
        "Contact Us",
        "Download",
        "Get Offer",
        "Get Quote",
        "Subscribe",
        "Apply Now",
        "Order Now",
        "See Menu",
        "Watch More",
      ],
      customAllowed: false,
    },
    notes: [
      "Text over 125 chars may be truncated with '...see more'",
      "Headlines over 40 chars will be truncated",
      "Avoid ALL CAPS - reduces engagement",
    ],
  },
  instagram: {
    platform: "instagram",
    displayName: "Instagram",
    primaryText: {
      max: 125,
      recommended: 125,
      description: "Caption text for the ad",
    },
    headline: {
      max: 40,
      recommended: 27,
      description: "Headline for feed/story ads",
    },
    description: {
      max: 30,
      recommended: 27,
      description: "Additional description text",
    },
    cta: {
      options: [
        "Shop Now",
        "Learn More",
        "Sign Up",
        "Book Now",
        "Contact Us",
        "Download",
        "Get Offer",
        "Subscribe",
        "Watch More",
        "Send Message",
      ],
      customAllowed: false,
    },
    notes: [
      "Instagram uses same specs as Meta Ads Manager",
      "Stories have different engagement patterns - keep copy shorter",
      "Hashtags can be included but don't count toward ad limits",
    ],
  },
  google: {
    platform: "google",
    displayName: "Google Ads",
    primaryText: {
      max: 90,
      recommended: 90,
      description: "Description lines (up to 4 lines, 90 chars each)",
    },
    headline: {
      max: 30,
      recommended: 30,
      description: "Headlines (up to 15 headlines, 30 chars each)",
    },
    description: {
      max: 90,
      recommended: 90,
      description: "Description line",
    },
    cta: {
      options: [
        "Apply Now",
        "Book Now",
        "Contact Us",
        "Download",
        "Learn More",
        "Get Quote",
        "Shop Now",
        "Sign Up",
        "Subscribe",
        "Visit Site",
      ],
      customAllowed: true,
    },
    notes: [
      "Responsive Search Ads: Up to 15 headlines (30 chars) + 4 descriptions (90 chars)",
      "Display Ads: Different specs apply",
      "Avoid excessive punctuation or symbols",
      "Include keywords in headlines for better Quality Score",
    ],
  },
  tiktok: {
    platform: "tiktok",
    displayName: "TikTok",
    primaryText: {
      max: 100,
      recommended: 80,
      description: "Ad text shown with video",
    },
    headline: {
      max: 34,
      recommended: 34,
      description: "Display name / brand headline",
    },
    description: {
      max: 100,
      recommended: 80,
      description: "Supporting description",
    },
    cta: {
      options: [
        "Shop Now",
        "Learn More",
        "Sign Up",
        "Download",
        "Contact Us",
        "Apply Now",
        "Book Now",
        "Subscribe",
        "Watch Now",
        "Play Game",
      ],
      customAllowed: false,
    },
    notes: [
      "Keep copy short and punchy - TikTok users scroll fast",
      "Use casual, authentic language",
      "Emojis perform well on TikTok",
      "Sound-on ads need text to complement audio",
    ],
  },
  pinterest: {
    platform: "pinterest",
    displayName: "Pinterest",
    primaryText: {
      max: 500,
      recommended: 100,
      description: "Pin description",
    },
    headline: {
      max: 100,
      recommended: 40,
      description: "Pin title",
    },
    description: {
      max: 500,
      recommended: 100,
      description: "Extended description",
    },
    cta: {
      options: [
        "Shop",
        "Learn More",
        "Sign Up",
        "Visit",
        "Install",
        "Get",
        "Apply",
        "Book",
        "Download",
      ],
      customAllowed: false,
    },
    notes: [
      "Pinterest allows longer copy but shorter performs better",
      "Include keywords for search discoverability",
      "Lifestyle-focused copy resonates on Pinterest",
      "First 50-60 chars are most visible in feed",
    ],
  },
};

/**
 * Get constraints for a specific platform
 */
export function getPlatformConstraints(
  platform: AiePlatform,
): PlatformConstraints {
  // eslint-disable-next-line security/detect-object-injection
  return PLATFORM_CONSTRAINTS[platform];
}

/**
 * Get character limits summary for a platform
 */
export function getCharacterLimits(platform: AiePlatform): {
  primaryText: { max: number; recommended: number };
  headline: { max: number; recommended: number };
  description: { max: number; recommended: number };
} {
  // eslint-disable-next-line security/detect-object-injection
  const constraints = PLATFORM_CONSTRAINTS[platform];
  return {
    primaryText: {
      max: constraints.primaryText.max,
      recommended: constraints.primaryText.recommended,
    },
    headline: {
      max: constraints.headline.max,
      recommended: constraints.headline.recommended,
    },
    description: {
      max: constraints.description.max,
      recommended: constraints.description.recommended,
    },
  };
}

/**
 * Get available CTA options for a platform
 */
export function getPlatformCTAs(platform: AiePlatform): string[] {
  // eslint-disable-next-line security/detect-object-injection
  return PLATFORM_CONSTRAINTS[platform].cta.options;
}

/**
 * Validate ad copy against platform constraints
 */
export function validateAdCopy(
  platform: AiePlatform,
  copy: {
    primaryText?: string;
    headline?: string;
    description?: string;
  },
): {
  valid: boolean;
  errors: string[];
  warnings: string[];
} {
  // eslint-disable-next-line security/detect-object-injection
  const constraints = PLATFORM_CONSTRAINTS[platform];
  const errors: string[] = [];
  const warnings: string[] = [];

  if (copy.primaryText) {
    if (copy.primaryText.length > constraints.primaryText.max) {
      errors.push(
        `Primary text exceeds ${constraints.primaryText.max} character limit (${copy.primaryText.length} chars)`,
      );
    } else if (copy.primaryText.length > constraints.primaryText.recommended) {
      warnings.push(
        `Primary text exceeds recommended ${constraints.primaryText.recommended} characters`,
      );
    }
  }

  if (copy.headline) {
    if (copy.headline.length > constraints.headline.max) {
      errors.push(
        `Headline exceeds ${constraints.headline.max} character limit (${copy.headline.length} chars)`,
      );
    } else if (copy.headline.length > constraints.headline.recommended) {
      warnings.push(
        `Headline exceeds recommended ${constraints.headline.recommended} characters`,
      );
    }
  }

  if (copy.description) {
    if (copy.description.length > constraints.description.max) {
      errors.push(
        `Description exceeds ${constraints.description.max} character limit (${copy.description.length} chars)`,
      );
    } else if (copy.description.length > constraints.description.recommended) {
      warnings.push(
        `Description exceeds recommended ${constraints.description.recommended} characters`,
      );
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Format constraints for AI prompt injection
 */
export function formatConstraintsForPrompt(platform: AiePlatform): string {
  // eslint-disable-next-line security/detect-object-injection
  const c = PLATFORM_CONSTRAINTS[platform];
  return `
PLATFORM: ${c.displayName}

CHARACTER LIMITS (STRICT):
- Primary Text: ${c.primaryText.max} characters maximum (recommended: ${c.primaryText.recommended})
- Headline: ${c.headline.max} characters maximum (recommended: ${c.headline.recommended})
- Description: ${c.description.max} characters maximum (recommended: ${c.description.recommended})

AVAILABLE CTAs: ${c.cta.options.join(", ")}

PLATFORM NOTES:
${c.notes.map((n) => `- ${n}`).join("\n")}
`.trim();
}
