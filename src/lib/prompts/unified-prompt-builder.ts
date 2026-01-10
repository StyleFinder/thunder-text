/**
 * Unified Prompt Builder
 *
 * Assembles the final prompt from all layers:
 * 1. Fixed standards (from code)
 * 2. Brand voice (from database or default)
 * 3. Category guidance (LEAN templates)
 * 4. Product context (runtime data)
 */

import { getFixedStandards } from "./fixed-standards";
import {
  getBrandVoiceForStore,
  formatBrandVoiceForPrompt,
  type BrandVoiceContext,
} from "./brand-voice-integration";
import { getLeanCategoryTemplate } from "./lean-category-templates";
import type { ProductCategory } from "@/lib/prompts-types";
import { logger } from "@/lib/logger";

/**
 * Product context passed at runtime
 */
export interface ProductContext {
  category: string;
  productType?: string;
  sizing?: string;
  fabricMaterial?: string;
  occasionUse?: string;
  targetAudience?: string;
  keyFeatures?: string;
  additionalNotes?: string;
}

/**
 * Result from building a unified prompt
 */
export interface UnifiedPromptResult {
  systemPrompt: string;
  usedBrandVoice: boolean;
  voiceProfileVersion: number | null;
  voiceProfileId: string | null;
}

/**
 * Build unified prompt for product description generation
 *
 * Combines all layers in order:
 * 1. Role definition
 * 2. Brand voice (custom or default)
 * 3. Category-specific guidance
 * 4. Product context
 * 5. Fixed quality standards
 *
 * @param storeId - Store ID for voice lookup
 * @param category - Product category for template
 * @param productContext - Runtime product details
 * @returns Assembled prompt with metadata
 */
export async function buildUnifiedPrompt(
  storeId: string,
  category: ProductCategory,
  productContext: ProductContext
): Promise<UnifiedPromptResult> {
  // 1. Get brand voice (shared with Content Center)
  const brandVoice = await getBrandVoiceForStore(storeId);

  // 2. Get LEAN category template
  const categoryGuidance = getLeanCategoryTemplate(category);

  // 3. Assemble the final prompt
  const systemPrompt = assemblePrompt({
    brandVoice,
    categoryGuidance,
    productContext,
  });

  logger.info("Built unified prompt", {
    component: "unified-prompt-builder",
    storeId,
    category,
    usedBrandVoice: brandVoice.hasVoice,
    voiceVersion: brandVoice.voiceMetadata?.profileVersion,
  });

  return {
    systemPrompt,
    usedBrandVoice: brandVoice.hasVoice,
    voiceProfileVersion: brandVoice.voiceMetadata?.profileVersion || null,
    voiceProfileId: brandVoice.voiceMetadata?.profileId || null,
  };
}

/**
 * Assemble the final prompt from all components
 */
function assemblePrompt(params: {
  brandVoice: BrandVoiceContext;
  categoryGuidance: string;
  productContext: ProductContext;
}): string {
  const { brandVoice, categoryGuidance, productContext } = params;

  // Format brand voice section
  const voiceSection = formatBrandVoiceForPrompt(brandVoice.voiceProfile);

  // Format product context section
  const contextSection = formatProductContext(productContext);

  // Get fixed standards
  const fixedStandards = getFixedStandards();

  return `You are ThunderText, an expert AI copywriting assistant specializing in e-commerce product descriptions.

Your job is to create compelling, conversion-focused product descriptions that:
- Sound authentic to the brand's voice
- Help customers understand and want the product
- Are optimized for both human readers and AI assistants
- Follow strict formatting and quality standards

${voiceSection}

=== CATEGORY GUIDANCE ===
${categoryGuidance}

${contextSection}

${fixedStandards}

Now analyze the product images provided and create the product content following ALL guidelines above.
`;
}

/**
 * Format product context into prompt section
 */
function formatProductContext(context: ProductContext): string {
  const lines: string[] = ["=== PRODUCT DETAILS ==="];

  if (context.category) {
    lines.push(`Category: ${context.category}`);
  }

  if (context.productType) {
    lines.push(`Product Type: ${context.productType}`);
    lines.push("");
    lines.push(`PRIMARY PRODUCT FOCUS: "${context.productType}"`);
    lines.push(
      "CRITICAL: If the image contains multiple items, focus ONLY on this product."
    );
    lines.push(
      "Other items in the image are styling suggestions, not the product being sold."
    );
  }

  if (context.sizing) {
    lines.push(`Available Sizes: ${context.sizing}`);
    lines.push(
      'IMPORTANT: Include these EXACT sizes in the "Available in:" line of your description.'
    );
  }

  if (context.fabricMaterial) {
    lines.push(`Materials/Fabric: ${context.fabricMaterial}`);
  }

  if (context.occasionUse) {
    lines.push(`Occasion/Use: ${context.occasionUse}`);
  }

  if (context.targetAudience) {
    lines.push(`Target Audience: ${context.targetAudience}`);
  }

  if (context.keyFeatures) {
    lines.push("");
    lines.push("KEY FEATURES (MUST INCLUDE PROMINENTLY):");
    lines.push(context.keyFeatures);
    lines.push("");
    lines.push(
      "CRITICAL: The above key features were specified by the merchant."
    );
    lines.push(
      "You MUST include this information clearly in the description."
    );
    lines.push("Do not paraphrase or dilute - incorporate it prominently.");
  }

  if (context.additionalNotes) {
    lines.push("");
    lines.push("Additional Notes from Merchant:");
    lines.push(context.additionalNotes);
  }

  return lines.join("\n");
}

/**
 * Build a lightweight prompt for quick generation (no voice lookup)
 * Used when you already have the voice profile
 */
export function buildPromptWithVoice(
  voiceProfile: string | null,
  category: ProductCategory,
  productContext: ProductContext
): string {
  const voiceSection = formatBrandVoiceForPrompt(voiceProfile);
  const categoryGuidance = getLeanCategoryTemplate(category);
  const contextSection = formatProductContext(productContext);
  const fixedStandards = getFixedStandards();

  return `You are ThunderText, an expert AI copywriting assistant specializing in e-commerce product descriptions.

${voiceSection}

=== CATEGORY GUIDANCE ===
${categoryGuidance}

${contextSection}

${fixedStandards}

Now analyze the product images provided and create the product content following ALL guidelines above.
`;
}
