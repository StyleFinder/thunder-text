/**
 * Brand Voice Integration
 *
 * Shared brand voice retrieval for BOTH Product Descriptions AND Content Center.
 * This ensures consistent voice across all generated content.
 */

import { supabaseAdmin } from "@/lib/supabase/admin";
import type { BrandVoiceProfile } from "@/types/content-center";
import { logger } from "@/lib/logger";

/**
 * Brand voice context returned from voice retrieval
 */
export interface BrandVoiceContext {
  hasVoice: boolean;
  voiceProfile: string | null;
  voiceMetadata: {
    profileId: string;
    profileVersion: number;
    sampleCount: number;
    generatedAt: string;
    userEdited: boolean;
  } | null;
}

/**
 * Default brand voice when no custom profile exists
 */
const DEFAULT_BRAND_VOICE = `
TONE CHARACTERISTICS:
- Friendly and approachable, like a trusted boutique stylist
- Professional without being stiff or corporate
- Warm and conversational, as if speaking directly to a customer
- Confident but not pushy

WRITING STYLE:
- Write in second person ("you", "your") to create direct connection
- Use active voice for energy and clarity
- Keep sentences varied - mix short punchy statements with longer descriptive ones
- Front-load the most compelling information

VOCABULARY PATTERNS:
- Use sensory language (soft, cozy, lightweight, structured)
- Avoid generic superlatives (amazing, incredible, must-have)
- Include specific details over vague claims
- Match vocabulary to the product category

BRAND PERSONALITY:
- Aspirational yet accessible - luxury feel without being pretentious
- Helpful and informative, like a knowledgeable friend
- Honest about product qualities - builds trust
- Enthusiastic without being over-the-top
`;

/**
 * Get brand voice profile for a store
 * Used by BOTH product descriptions AND content center
 *
 * @param storeId - The store ID (shop domain or UUID)
 * @returns Brand voice context with profile and metadata
 */
export async function getBrandVoiceForStore(
  storeId: string
): Promise<BrandVoiceContext> {
  try {
    // First try to find by store_id directly
    let query = supabaseAdmin
      .from("brand_voice_profiles")
      .select("*")
      .eq("is_current", true);

    // Try exact match first
    const { data: profile, error } = await query
      .eq("store_id", storeId)
      .single();

    if (error || !profile) {
      // If storeId looks like a domain, try looking up in shops table
      if (storeId.includes(".myshopify.com") || storeId.includes(".")) {
        const { data: shop } = await supabaseAdmin
          .from("shops")
          .select("id")
          .eq("shop_domain", storeId)
          .single();

        if (shop) {
          const { data: profileByShop } = await supabaseAdmin
            .from("brand_voice_profiles")
            .select("*")
            .eq("store_id", shop.id)
            .eq("is_current", true)
            .single();

          if (profileByShop) {
            return formatVoiceContext(profileByShop);
          }
        }
      }

      // No voice profile found - return default
      logger.info("No brand voice profile found, using default", {
        component: "brand-voice-integration",
        storeId,
      });

      return {
        hasVoice: false,
        voiceProfile: null,
        voiceMetadata: null,
      };
    }

    return formatVoiceContext(profile);
  } catch (error) {
    logger.error("Error fetching brand voice profile", error as Error, {
      component: "brand-voice-integration",
      storeId,
    });

    return {
      hasVoice: false,
      voiceProfile: null,
      voiceMetadata: null,
    };
  }
}

/**
 * Format database profile into voice context
 */
function formatVoiceContext(profile: BrandVoiceProfile): BrandVoiceContext {
  return {
    hasVoice: true,
    voiceProfile: profile.profile_text,
    voiceMetadata: {
      profileId: profile.id,
      profileVersion: profile.profile_version,
      sampleCount: profile.sample_ids?.length || 0,
      generatedAt: profile.generated_at,
      userEdited: profile.user_edited,
    },
  };
}

/**
 * Format brand voice for prompt injection
 * Returns formatted voice section to include in prompts
 *
 * @param voiceProfile - The voice profile text (or null for default)
 * @returns Formatted string for prompt injection
 */
export function formatBrandVoiceForPrompt(voiceProfile: string | null): string {
  if (!voiceProfile) {
    return `
## BRAND VOICE (DEFAULT)

${DEFAULT_BRAND_VOICE}

NOTE: This store hasn't created a custom brand voice yet.
Apply the default voice characteristics above consistently.
`;
  }

  return `
## YOUR BRAND VOICE (EXTRACTED FROM MERCHANT'S WRITING SAMPLES)

Apply this exact brand voice to ALL content. This voice was analyzed from
the merchant's own writing samples - it represents how THEY communicate:

${voiceProfile}

CRITICAL: Every sentence should sound like it was written by the brand described above.
Match their tone, vocabulary, and personality exactly.
`;
}

/**
 * Check if a store has a brand voice profile
 * Lightweight check without fetching full profile
 */
export async function storeHasBrandVoice(storeId: string): Promise<boolean> {
  try {
    const { count, error } = await supabaseAdmin
      .from("brand_voice_profiles")
      .select("id", { count: "exact", head: true })
      .eq("store_id", storeId)
      .eq("is_current", true);

    if (error) {
      return false;
    }

    return (count || 0) > 0;
  } catch {
    return false;
  }
}

/**
 * Get the default brand voice (for display in UI or prompts)
 */
export function getDefaultBrandVoice(): string {
  return DEFAULT_BRAND_VOICE;
}
