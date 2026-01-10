/**
 * AIE Ad Generator Types
 * Shared type definitions for the ACE Engine components
 */

export interface Campaign {
  id: string;
  name: string;
  status: string;
  objective: string;
}

export interface AdAccount {
  id: string;
  name: string;
  account_id: string;
  currency: string;
}

export interface ShopifyProduct {
  id: string;
  title: string;
  description: string;
  images: Array<{ url: string; altText?: string }>;
  handle: string;
}

export interface GeneratedVariant {
  id: string;
  variantNumber: number;
  variantType: string;
  headline: string;
  headlineAlternatives: string[];
  primaryText: string;
  description?: string;
  cta: string;
  ctaRationale?: string;
  hookTechnique: string;
  tone: string;
  predictedScore: number;
  scoreBreakdown: {
    brand_fit: number;
    context_relevance: number;
    platform_compliance: number;
    hook_strength: number;
    cta_clarity: number;
  };
  generationReasoning?: string;
}

export interface EditableVariant extends GeneratedVariant {
  editedHeadline?: string;
  editedPrimaryText?: string;
  editedDescription?: string;
}

export interface GenerationResult {
  adRequestId: string;
  variants: GeneratedVariant[];
  metadata: {
    generationTimeMs: number;
    aiCost: number;
  };
}

export interface PlatformOption {
  label: string;
  value: string;
  available: boolean;
}

export interface GoalOption {
  label: string;
  value: string;
}
