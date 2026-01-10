/**
 * Unified Prompt System
 *
 * This module provides a layered prompt architecture:
 * 1. Fixed Standards - Non-negotiable quality requirements
 * 2. Brand Voice - Per-store customizable voice from samples
 * 3. Category Templates - LEAN content guidance per category
 * 4. Unified Builder - Assembles all layers into final prompt
 */

// Fixed Standards (non-negotiable)
export {
  OUTPUT_FORMAT_STANDARDS,
  HTML_FORMATTING_RULES,
  AI_DISCOVERABILITY_REQUIREMENTS,
  SEO_REQUIREMENTS,
  FAQ_REQUIREMENTS,
  QUALITY_CHECKLIST,
  getFixedStandards,
} from "./fixed-standards";

// Brand Voice Integration (shared across all generation)
export {
  getBrandVoiceForStore,
  formatBrandVoiceForPrompt,
  storeHasBrandVoice,
  getDefaultBrandVoice,
  type BrandVoiceContext,
} from "./brand-voice-integration";

// LEAN Category Templates (content guidance only)
export {
  getLeanCategoryTemplate,
  getAvailableCategories,
} from "./lean-category-templates";

// Unified Prompt Builder (main entry point)
export {
  buildUnifiedPrompt,
  buildPromptWithVoice,
  type ProductContext,
  type UnifiedPromptResult,
} from "./unified-prompt-builder";
