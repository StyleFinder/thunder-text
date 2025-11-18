import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

// TypeScript interface for brand voice profile
export interface BrandVoiceProfile {
  // Tone sliders (0-10)
  tone_playful_serious?: number;
  tone_casual_elevated?: number;
  tone_trendy_classic?: number;
  tone_friendly_professional?: number;
  tone_simple_detailed?: number;
  tone_bold_soft?: number;

  // Brand linguistics
  voice_vocabulary?: {
    words_love?: string[];
    words_avoid?: string[];
  };
  customer_term?: string;
  signature_sentence?: string;

  // Customer-centric
  value_pillars?: string[];
  audience_description?: string;

  // Writing samples (Step 5)
  writing_samples?: string;

  // Legacy fields (preserve compatibility)
  voice_tone?: string;
  voice_style?: string;
  voice_personality?: string;
  ai_engine_instructions?: string;

  // Wizard status
  wizard_completed?: boolean;
}

/**
 * GET /api/brand-voice
 * Retrieve the brand voice profile for a store
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const shop = searchParams.get("shop");

    if (!shop) {
      return NextResponse.json(
        { error: "Shop parameter is required" },
        { status: 400 }
      );
    }

    console.log("🔍 Fetching brand voice profile for shop:", shop);

    // Get store ID from shop domain
    const { data: shopData, error: shopError } = await supabaseAdmin
      .from("shops")
      .select("id")
      .eq("shop_domain", shop)
      .single();

    if (shopError || !shopData) {
      console.error("❌ Shop not found:", shopError);
      return NextResponse.json(
        { error: "Shop not found" },
        { status: 404 }
      );
    }

    // Get brand voice profile with all wizard fields
    const { data: profile, error: profileError } = await supabaseAdmin
      .from("business_profiles")
      .select(`
        tone_playful_serious,
        tone_casual_elevated,
        tone_trendy_classic,
        tone_friendly_professional,
        tone_simple_detailed,
        tone_bold_soft,
        voice_vocabulary,
        customer_term,
        signature_sentence,
        value_pillars,
        audience_description,
        writing_samples,
        voice_tone,
        voice_style,
        voice_personality,
        ai_engine_instructions,
        wizard_completed,
        wizard_completed_at,
        updated_at
      `)
      .eq("store_id", shopData.id)
      .eq("is_current", true)
      .single();

    if (profileError) {
      // If no profile exists, return empty profile with defaults
      if (profileError.code === "PGRST116") {
        console.log("⚠️ No brand voice profile found, returning defaults");
        return NextResponse.json({
          exists: false,
          profile: {
            tone_playful_serious: 5,
            tone_casual_elevated: 5,
            tone_trendy_classic: 5,
            tone_friendly_professional: 5,
            tone_simple_detailed: 5,
            tone_bold_soft: 5,
            voice_vocabulary: { words_love: [], words_avoid: [] },
            value_pillars: [],
            wizard_completed: false,
          },
        });
      }

      console.error("❌ Error fetching profile:", profileError);
      return NextResponse.json(
        { error: "Failed to fetch brand voice profile" },
        { status: 500 }
      );
    }

    console.log("✅ Brand voice profile retrieved");
    return NextResponse.json({
      exists: true,
      profile,
    });
  } catch (error) {
    console.error("❌ Brand voice GET error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/brand-voice
 * Create or update brand voice profile for a store
 */
export async function POST(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const shop = searchParams.get("shop");

    if (!shop) {
      return NextResponse.json(
        { error: "Shop parameter is required" },
        { status: 400 }
      );
    }

    const body = await request.json();
    const profileData: BrandVoiceProfile = body;

    console.log("💾 Saving brand voice profile for shop:", shop);

    // Get store ID from shop domain
    const { data: shopData, error: shopError } = await supabaseAdmin
      .from("shops")
      .select("id")
      .eq("shop_domain", shop)
      .single();

    if (shopError || !shopData) {
      console.error("❌ Shop not found:", shopError);
      return NextResponse.json(
        { error: "Shop not found" },
        { status: 404 }
      );
    }

    // Prepare update data
    const updateData: Record<string, any> = {
      updated_at: new Date().toISOString(),
    };

    // Tone sliders
    if (profileData.tone_playful_serious !== undefined)
      updateData.tone_playful_serious = profileData.tone_playful_serious;
    if (profileData.tone_casual_elevated !== undefined)
      updateData.tone_casual_elevated = profileData.tone_casual_elevated;
    if (profileData.tone_trendy_classic !== undefined)
      updateData.tone_trendy_classic = profileData.tone_trendy_classic;
    if (profileData.tone_friendly_professional !== undefined)
      updateData.tone_friendly_professional = profileData.tone_friendly_professional;
    if (profileData.tone_simple_detailed !== undefined)
      updateData.tone_simple_detailed = profileData.tone_simple_detailed;
    if (profileData.tone_bold_soft !== undefined)
      updateData.tone_bold_soft = profileData.tone_bold_soft;

    // Brand linguistics
    if (profileData.voice_vocabulary !== undefined)
      updateData.voice_vocabulary = profileData.voice_vocabulary;
    if (profileData.customer_term !== undefined)
      updateData.customer_term = profileData.customer_term;
    if (profileData.signature_sentence !== undefined)
      updateData.signature_sentence = profileData.signature_sentence;

    // Customer-centric
    if (profileData.value_pillars !== undefined)
      updateData.value_pillars = profileData.value_pillars;
    if (profileData.audience_description !== undefined)
      updateData.audience_description = profileData.audience_description;

    // Writing samples (Step 5)
    if (profileData.writing_samples !== undefined)
      updateData.writing_samples = profileData.writing_samples;

    // Legacy fields (preserve compatibility)
    if (profileData.voice_tone !== undefined)
      updateData.voice_tone = profileData.voice_tone;
    if (profileData.voice_style !== undefined)
      updateData.voice_style = profileData.voice_style;
    if (profileData.voice_personality !== undefined)
      updateData.voice_personality = profileData.voice_personality;
    if (profileData.ai_engine_instructions !== undefined)
      updateData.ai_engine_instructions = profileData.ai_engine_instructions;

    // Wizard completion
    if (profileData.wizard_completed !== undefined) {
      updateData.wizard_completed = profileData.wizard_completed;
      if (profileData.wizard_completed) {
        updateData.wizard_completed_at = new Date().toISOString();
      }
    }

    // Check if profile exists first
    const { data: existingProfile } = await supabaseAdmin
      .from("business_profiles")
      .select("id")
      .eq("store_id", shopData.id)
      .eq("is_current", true)
      .single();

    let data, error;

    if (existingProfile) {
      // Update existing profile
      const result = await supabaseAdmin
        .from("business_profiles")
        .update(updateData)
        .eq("id", existingProfile.id)
        .select()
        .single();
      data = result.data;
      error = result.error;
    } else {
      // Insert new profile
      const result = await supabaseAdmin
        .from("business_profiles")
        .insert({
          store_id: shopData.id,
          is_current: true,
          ...updateData,
        })
        .select()
        .single();
      data = result.data;
      error = result.error;
    }

    if (error) {
      console.error("❌ Error saving profile:", error);
      return NextResponse.json(
        { error: "Failed to save brand voice profile" },
        { status: 500 }
      );
    }

    console.log("✅ Brand voice profile saved successfully");
    return NextResponse.json({
      success: true,
      profile: data,
    });
  } catch (error) {
    console.error("❌ Brand voice POST error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
