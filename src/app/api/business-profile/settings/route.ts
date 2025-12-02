import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { requireAuth } from '@/lib/auth/ace-compat';
import { logger } from '@/lib/logger'

/**
 * GET /api/business-profile/settings
 * Get current brand voice settings for the shop
 */
export const GET = requireAuth('user')(async (request: NextRequest) => {
  try {
    const authHeader = request.headers.get("Authorization");
    const shopDomain = authHeader?.replace("Bearer ", "");

    if (!shopDomain) {
      return NextResponse.json(
        { success: false, error: "Authorization required" },
        { status: 401 }
      );
    }

    // Get shop
    const { data: shop, error: shopError } = await supabaseAdmin
      .from("shops")
      .select("id")
      .eq("shop_domain", shopDomain)
      .single();

    if (shopError || !shop) {
      return NextResponse.json(
        { success: false, error: "Shop not found" },
        { status: 404 }
      );
    }

    // Get profile with settings fields AND master profile for fallback data
    const { data: profile, error: profileError } = await supabaseAdmin
      .from("business_profiles")
      .select(`
        id,
        voice_tone,
        voice_style,
        voice_vocabulary,
        voice_personality,
        tone_playful_serious,
        tone_casual_elevated,
        tone_trendy_classic,
        tone_friendly_professional,
        tone_simple_detailed,
        tone_bold_soft,
        customer_term,
        signature_sentence,
        value_pillars,
        audience_description,
        writing_samples,
        master_profile_text,
        ideal_customer_avatar,
        mission_vision_values
      `)
      .eq("store_id", shop.id)
      .eq("is_current", true)
      .single();

    if (profileError || !profile) {
      return NextResponse.json(
        { success: false, error: "Profile not found" },
        { status: 404 }
      );
    }

    // Parse master profile to extract defaults if settings fields are empty
    const extractedData = {
      audienceDescription: "",
      valuePillars: [] as string[],
      voiceTone: "",
      voicePersonality: "",
    };

    // Try to extract from master_profile_text JSON
    if (profile.master_profile_text) {
      try {
        const masterProfile = JSON.parse(profile.master_profile_text);

        // Extract audience description from idealCustomerAvatar section
        if (masterProfile.idealCustomerAvatar) {
          const ica = masterProfile.idealCustomerAvatar;

          // Look for Demographics section
          const demoMatch = ica.match(/\*\*Demographics[:\*]*\*?\*?\n([\s\S]*?)(?=\n\*\*[A-Z]|\n---|\n\n\*\*\d)/i);
          if (demoMatch) {
            extractedData.audienceDescription = demoMatch[1]
              .replace(/\*\*/g, '')
              .replace(/- /g, '')
              .trim()
              .substring(0, 500);
          } else {
            // Fallback: Look for "Our ideal customer" or first meaningful paragraph
            const idealMatch = ica.match(/(?:ideal customer|target audience)[^.]*\.([^.]+\.)/i);
            if (idealMatch) {
              extractedData.audienceDescription = idealMatch[0].replace(/\*\*/g, '').trim();
            } else {
              // Use the intro paragraph after the title
              const sections = ica.split(/\n\n+/);
              for (const section of sections) {
                if (section.length > 100 && !section.startsWith('**') && !section.startsWith('#')) {
                  extractedData.audienceDescription = section.replace(/\*\*/g, '').trim().substring(0, 500);
                  break;
                }
              }
            }
          }
        }

        // Extract value pillars from missionVisionValues section
        if (masterProfile.missionVisionValues) {
          const mvv = masterProfile.missionVisionValues;

          // Look for "Core Values" section with bullet points
          const valuesSection = mvv.match(/\*\*(?:Core Values|Brand Values)[^*]*\*\*[:\s]*([\s\S]*?)(?=\n\n\*\*[A-Z]|\n---|\n\*\*\d\.|$)/i);
          if (valuesSection) {
            // Extract values from bullet points like "- **Empowerment:** ..."
            const valueMatches = valuesSection[1].matchAll(/[-•]\s*\*?\*?([^:*\n]+)/g);
            extractedData.valuePillars = Array.from(valueMatches)
              .map(m => m[1].trim())
              .filter(v => v.length > 2 && v.length < 50)
              .slice(0, 6);
          }

          // If no bullet points found, try to extract from numbered list
          if (extractedData.valuePillars.length === 0) {
            const numberedValues = mvv.matchAll(/\d+\.\s*\*?\*?([^:*\n]+)/g);
            extractedData.valuePillars = Array.from(numberedValues)
              .map(m => m[1].trim())
              .filter(v => v.length > 2 && v.length < 50)
              .slice(0, 6);
          }
        }

        // Extract voice/personality from aiEngineInstructions
        if (masterProfile.aiEngineInstructions) {
          const instructions = masterProfile.aiEngineInstructions;

          // Look for tone/voice descriptions - improved regex to capture the actual description
          const toneMatch = instructions.match(/(?:Use a |Tone and Style[:\s]+Use a )([^.]+tone[^.]*)/i);
          if (toneMatch) {
            extractedData.voiceTone = toneMatch[1].replace(/\*\*/g, '').trim().substring(0, 150);
          } else {
            // Fallback: look for descriptive phrases
            const styleMatch = instructions.match(/(?:friendly|professional|warm|approachable|casual|formal|humorous)[^.]+(?:tone|voice|style)?[^.]*/i);
            if (styleMatch) {
              extractedData.voiceTone = styleMatch[0].replace(/\*\*/g, '').trim().substring(0, 150);
            }
          }

          // Look for personality traits
          const personalityMatch = instructions.match(/(?:personality traits|brand personality)[:\s]*([\s\S]*?)(?=\n\n|\n\*\*|$)/i);
          if (personalityMatch) {
            extractedData.voicePersonality = personalityMatch[1].replace(/\*\*/g, '').replace(/[-•]/g, '').trim().substring(0, 200);
          }
        }

        // Clean up value pillars - remove incomplete entries
        extractedData.valuePillars = extractedData.valuePillars.filter(v =>
          !v.includes('.') && !v.includes(':') && v.length > 2
        );
      } catch (e) {
        console.log("Could not parse master_profile_text:", e);
      }
    }

    // Use stored fields if available, otherwise use extracted data
    return NextResponse.json({
      success: true,
      data: {
        settings: {
          // Voice attributes
          voiceTone: profile.voice_tone || extractedData.voiceTone || "",
          voiceStyle: profile.voice_style || "",
          voicePersonality: profile.voice_personality || extractedData.voicePersonality || "",
          voiceVocabulary: profile.voice_vocabulary || { preferred: [], avoided: [] },

          // Tone sliders (1-5 scale)
          toneSliders: {
            playfulSerious: profile.tone_playful_serious || 3,
            casualElevated: profile.tone_casual_elevated || 3,
            trendyClassic: profile.tone_trendy_classic || 3,
            friendlyProfessional: profile.tone_friendly_professional || 3,
            simpleDetailed: profile.tone_simple_detailed || 3,
            boldSoft: profile.tone_bold_soft || 3,
          },

          // Brand identity - use extracted data as fallback
          customerTerm: profile.customer_term || "",
          signatureSentence: profile.signature_sentence || "",
          valuePillars: (profile.value_pillars && profile.value_pillars.length > 0)
            ? profile.value_pillars
            : extractedData.valuePillars,
          audienceDescription: profile.audience_description || extractedData.audienceDescription || profile.ideal_customer_avatar?.substring(0, 500) || "",
          writingSamples: profile.writing_samples || "",
        }
      }
    });
  } catch (error) {
    logger.error("Error fetching settings:", error as Error, { component: 'settings' });
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
});

/**
 * PUT /api/business-profile/settings
 * Update brand voice settings
 */
export const PUT = requireAuth('user')(async (request: NextRequest) => {
  try {
    const authHeader = request.headers.get("Authorization");
    const shopDomain = authHeader?.replace("Bearer ", "");

    if (!shopDomain) {
      return NextResponse.json(
        { success: false, error: "Authorization required" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { settings } = body;

    if (!settings) {
      return NextResponse.json(
        { success: false, error: "Settings required" },
        { status: 400 }
      );
    }

    // Get shop
    const { data: shop, error: shopError } = await supabaseAdmin
      .from("shops")
      .select("id")
      .eq("shop_domain", shopDomain)
      .single();

    if (shopError || !shop) {
      return NextResponse.json(
        { success: false, error: "Shop not found" },
        { status: 404 }
      );
    }

    // Get current profile
    const { data: profile, error: profileError } = await supabaseAdmin
      .from("business_profiles")
      .select("id")
      .eq("store_id", shop.id)
      .eq("is_current", true)
      .single();

    if (profileError || !profile) {
      return NextResponse.json(
        { success: false, error: "Profile not found" },
        { status: 404 }
      );
    }

    // Build update object
    const updateData: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
      last_edited_at: new Date().toISOString(),
    };

    // Voice attributes
    if (settings.voiceTone !== undefined) updateData.voice_tone = settings.voiceTone;
    if (settings.voiceStyle !== undefined) updateData.voice_style = settings.voiceStyle;
    if (settings.voicePersonality !== undefined) updateData.voice_personality = settings.voicePersonality;
    if (settings.voiceVocabulary !== undefined) updateData.voice_vocabulary = settings.voiceVocabulary;

    // Tone sliders
    if (settings.toneSliders) {
      const { toneSliders } = settings;
      if (toneSliders.playfulSerious !== undefined) updateData.tone_playful_serious = toneSliders.playfulSerious;
      if (toneSliders.casualElevated !== undefined) updateData.tone_casual_elevated = toneSliders.casualElevated;
      if (toneSliders.trendyClassic !== undefined) updateData.tone_trendy_classic = toneSliders.trendyClassic;
      if (toneSliders.friendlyProfessional !== undefined) updateData.tone_friendly_professional = toneSliders.friendlyProfessional;
      if (toneSliders.simpleDetailed !== undefined) updateData.tone_simple_detailed = toneSliders.simpleDetailed;
      if (toneSliders.boldSoft !== undefined) updateData.tone_bold_soft = toneSliders.boldSoft;
    }

    // Brand identity
    if (settings.customerTerm !== undefined) updateData.customer_term = settings.customerTerm;
    if (settings.signatureSentence !== undefined) updateData.signature_sentence = settings.signatureSentence;
    if (settings.valuePillars !== undefined) updateData.value_pillars = settings.valuePillars;
    if (settings.audienceDescription !== undefined) updateData.audience_description = settings.audienceDescription;
    if (settings.writingSamples !== undefined) updateData.writing_samples = settings.writingSamples;

    // Update profile
    const { error: updateError } = await supabaseAdmin
      .from("business_profiles")
      .update(updateData)
      .eq("id", profile.id);

    if (updateError) {
      logger.error("Error updating settings:", updateError as Error, { component: 'settings' });
      return NextResponse.json(
        { success: false, error: "Failed to update settings" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Settings updated successfully"
    });
  } catch (error) {
    logger.error("Error updating settings:", error as Error, { component: 'settings' });
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
});
