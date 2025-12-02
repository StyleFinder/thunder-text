/**
 * AIE Variant Scorer
 * Scores generated ad variants based on multiple quality factors
 */

import type {
  AIEAdVariantDraft,
  AIEPlatform,
  AIEGoal,
  AIEBrandVoice,
} from './types';
import { calculateQualityScore } from './utils';

export interface VariantScore {
  predicted_score: number; // 0-1
  score_breakdown: {
    brand_fit: number;
    context_relevance: number;
    platform_compliance: number;
    hook_strength: number;
    cta_clarity: number;
  };
  strengths: string[];
  improvements: string[];
}

/**
 * Score an ad variant
 */
export function scoreAdVariant(params: {
  variant: AIEAdVariantDraft;
  platform: AIEPlatform;
  goal: AIEGoal;
  brandVoice?: AIEBrandVoice;
  description: string;
}): VariantScore {
  const scores = {
    brand_fit: scoreBrandFit(params.variant, params.brandVoice),
    context_relevance: scoreContextRelevance(params.variant, params.description),
    platform_compliance: scorePlatformCompliance(params.variant, params.platform),
    hook_strength: scoreHookStrength(params.variant),
    cta_clarity: scoreCTAClarity(params.variant, params.goal),
  };

  const predicted_score = calculateQualityScore({
    hookStrength: scores.hook_strength,
    ctaClarity: scores.cta_clarity,
    brandFit: scores.brand_fit,
    contextRelevance: scores.context_relevance,
    platformCompliance: scores.platform_compliance,
  });

  const { strengths, improvements } = analyzeVariant({
    variant: params.variant,
    scores,
    platform: params.platform,
  });

  return {
    predicted_score,
    score_breakdown: scores,
    strengths,
    improvements,
  };
}

/**
 * Score brand fit (0-1)
 */
function scoreBrandFit(
  variant: AIEAdVariantDraft,
  brandVoice?: AIEBrandVoice
): number {
  if (!brandVoice) return 0.8; // Neutral score if no brand voice provided

  let score = 1.0;
  const fullText = `${variant.headline} ${variant.primary_text} ${variant.description || ''}`.toLowerCase();

  // Check forbidden words
  if (brandVoice.forbidden_words && brandVoice.forbidden_words.length > 0) {
    const forbiddenUsed = brandVoice.forbidden_words.filter((word) =>
      fullText.includes(word.toLowerCase())
    );
    score -= forbiddenUsed.length * 0.2; // -0.2 per forbidden word
  }

  // Check tone alignment
  const toneArray = typeof brandVoice.tone === 'string' ? [brandVoice.tone] : brandVoice.tone;
  if (toneArray && toneArray.length > 0) {
    const hasExpectedTone = toneArray.some((expectedTone: string) => {
      const toneIndicators: Record<string, string[]> = {
        professional: ['proven', 'trusted', 'expert', 'quality'],
        casual: ['hey', 'you', 'your', 'just'],
        playful: ['fun', '!', 'wow', 'amazing'],
        urgent: ['now', 'today', 'limited', 'hurry'],
        empathetic: ['understand', 'know', 'feel', 'help'],
      };

      const indicators = toneIndicators[expectedTone.toLowerCase()] || [];
      return indicators.some((ind) => fullText.includes(ind));
    });

    if (!hasExpectedTone) score -= 0.15;
  }

  return Math.max(0, Math.min(1, score));
}

/**
 * Score context relevance (0-1)
 */
function scoreContextRelevance(
  variant: AIEAdVariantDraft,
  description: string
): number {
  let score = 0.5; // Base score

  const descriptionWords = description.toLowerCase().split(/\s+/);
  const variantText =
    `${variant.headline} ${variant.primary_text}`.toLowerCase();

  // Check if key concepts from description appear in ad copy
  const keyConceptsUsed = descriptionWords.filter(
    (word) => word.length > 4 && variantText.includes(word)
  );

  // Score based on concept overlap
  const conceptOverlap = keyConceptsUsed.length / Math.max(descriptionWords.length, 1);
  score += conceptOverlap * 0.5;

  return Math.min(1, score);
}

/**
 * Score platform compliance (0-1)
 */
function scorePlatformCompliance(
  variant: AIEAdVariantDraft,
  platform: AIEPlatform
): number {
  let score = 1.0;

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

  const limit = limits[platform];

  // Check headline length
  if (variant.headline.length > limit.headline) {
    const overage = (variant.headline.length - limit.headline) / limit.headline;
    score -= overage * 0.5;
  }

  // Check primary text length
  if (variant.primary_text.length > limit.primaryText) {
    const overage =
      (variant.primary_text.length - limit.primaryText) / limit.primaryText;
    score -= overage * 0.5;
  }

  // Check description length (if applicable)
  if (
    limit.description &&
    variant.description &&
    variant.description.length > limit.description
  ) {
    const overage =
      (variant.description.length - limit.description) / limit.description;
    score -= overage * 0.3;
  }

  // Platform-specific bonuses
  if (platform === 'meta' || platform === 'instagram') {
    // Check for emoji usage (2-3 is optimal)
    // Use safer emoji detection pattern
    const emojiPattern = /(?:[\u2700-\u27bf]|(?:\ud83c[\udde6-\uddff]){2}|[\ud800-\udbff][\udc00-\udfff]|[\u0023-\u0039]\ufe0f?\u20e3|\u3299|\u3297|\u303d|\u3030|\u24c2|\ud83c[\udd70-\udd71]|\ud83c[\udd7e-\udd7f]|\ud83c\udd8e|\ud83c[\udd91-\udd9a]|\ud83c[\udde6-\uddff]|[\ud83c[\ude01-\ude02]|\ud83c\ude1a|\ud83c\ude2f|[\ud83c[\ude32-\ude3a]|[\ud83c[\ude50-\ude51]|\u203c|\u2049|[\u25aa-\u25ab]|\u25b6|\u25c0|[\u25fb-\u25fe]|\u00a9|\u00ae|\u2122|\u2139|\ud83c\udc04|[\u2600-\u26FF]|\u2b05|\u2b06|\u2b07|\u2b1b|\u2b1c|\u2b50|\u2b55|\u231a|\u231b|\u2328|\u23cf|[\u23e9-\u23f3]|[\u23f8-\u23fa]|\ud83c\udccf|\u2934|\u2935|[\u2190-\u21ff])/g;
    const emojiCount = (variant.primary_text.match(emojiPattern) || []).length;
    if (emojiCount >= 2 && emojiCount <= 3) {
      score += 0.05;
    }
  }

  return Math.max(0, Math.min(1, score));
}

/**
 * Score hook strength (0-1)
 */
function scoreHookStrength(variant: AIEAdVariantDraft): number {
  let score = 0.5; // Base score

  const firstSentence = variant.primary_text.split(/[.!?]/)[0];

  // Strong hook indicators
  const hookPatterns = {
    question: /\?/,
    number: /\d+/,
    urgency: /(now|today|limited|ending|hurry)/i,
    social_proof: /(customers?|people|users?|\d+[k|m]?\+)/i,
    benefit: /(save|get|achieve|transform|discover)/i,
    pain_point: /(struggling|tired|frustrated|problem)/i,
  };

  // Award points for hook patterns
  Object.values(hookPatterns).forEach((pattern) => {
    if (pattern.test(firstSentence)) {
      score += 0.1;
    }
  });

  // Bonus for short, punchy first sentence (under 80 chars)
  if (firstSentence.length < 80) {
    score += 0.1;
  }

  return Math.min(1, score);
}

/**
 * Score CTA clarity (0-1)
 */
function scoreCTAClarity(variant: AIEAdVariantDraft, goal: AIEGoal): number {
  let score = 0.5; // Base score

  if (!variant.cta) return 0.3; // Penalty for missing CTA

  const cta = variant.cta.toLowerCase();

  // Goal-aligned CTAs
  const goalCTAMap: Record<AIEGoal, string[]> = {
    conversion: ['shop', 'buy', 'order', 'get', 'start', 'sign up'],
    awareness: ['learn', 'discover', 'explore', 'see', 'watch'],
    engagement: ['join', 'comment', 'share', 'follow', 'subscribe'],
    traffic: ['visit', 'browse', 'check', 'view', 'see more'],
    app_installs: ['download', 'install', 'get app', 'try'],
  };

  const alignedCTAs = goalCTAMap[goal] || [];
  const isAligned = alignedCTAs.some((aligned) => cta.includes(aligned));

  if (isAligned) {
    score += 0.4;
  } else {
    score -= 0.2;
  }

  // Clear, actionable CTA (short and direct)
  if (variant.cta.split(/\s+/).length <= 3) {
    score += 0.1;
  }

  return Math.max(0, Math.min(1, score));
}

/**
 * Analyze variant to identify strengths and improvements
 */
function analyzeVariant(params: {
  variant: AIEAdVariantDraft;
  scores: {
    brand_fit: number;
    context_relevance: number;
    platform_compliance: number;
    hook_strength: number;
    cta_clarity: number;
  };
  platform: AIEPlatform;
}): { strengths: string[]; improvements: string[] } {
  const strengths: string[] = [];
  const improvements: string[] = [];

  // Hook strength analysis
  if (params.scores.hook_strength >= 0.8) {
    strengths.push('Strong opening hook that grabs attention');
  } else if (params.scores.hook_strength < 0.6) {
    improvements.push('Strengthen opening hook with question, stat, or benefit');
  }

  // CTA analysis
  if (params.scores.cta_clarity >= 0.8) {
    strengths.push('Clear, action-oriented CTA aligned with campaign goal');
  } else if (params.scores.cta_clarity < 0.6) {
    improvements.push('Make CTA more specific and aligned with campaign goal');
  }

  // Platform compliance analysis
  if (params.scores.platform_compliance >= 0.9) {
    strengths.push('Perfectly optimized for platform requirements');
  } else if (params.scores.platform_compliance < 0.7) {
    improvements.push('Reduce copy length to meet platform character limits');
  }

  // Brand fit analysis
  if (params.scores.brand_fit >= 0.9) {
    strengths.push('Excellent brand voice alignment');
  } else if (params.scores.brand_fit < 0.7) {
    improvements.push('Better align tone and messaging with brand voice');
  }

  // Context relevance analysis
  if (params.scores.context_relevance >= 0.8) {
    strengths.push('Highly relevant to product description');
  } else if (params.scores.context_relevance < 0.6) {
    improvements.push('Incorporate more specific product features and benefits');
  }

  return { strengths, improvements };
}

/**
 * Rank variants by score
 */
export function rankVariants(
  variants: Array<AIEAdVariantDraft & { score: VariantScore }>
): Array<AIEAdVariantDraft & { score: VariantScore; rank: number }> {
  const ranked = [...variants].sort(
    (a, b) => b.score.predicted_score - a.score.predicted_score
  );

  return ranked.map((variant, index) => ({
    ...variant,
    rank: index + 1,
  }));
}
