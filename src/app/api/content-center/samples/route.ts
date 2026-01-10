import { NextRequest, NextResponse } from "next/server";
import { CreateSampleRequest, ContentSample } from "@/types/content-center";
import { supabaseAdmin } from "@/lib/supabase";
import {
  createCorsHeaders,
  handleCorsPreflightRequest,
} from "@/lib/middleware/cors";
import { sanitizeAndValidateSample } from "@/lib/security/input-sanitization";
import { authenticateRequest } from "@/lib/auth/content-center-auth";
import { logger } from "@/lib/logger";

// Helper function to calculate word count
function calculateWordCount(text: string): number {
  return text
    .trim()
    .split(/\s+/)
    .filter((word) => word.length > 0).length;
}

/**
 * GET /api/content-center/samples
 * List all samples for the authenticated shop
 *
 * M2 SECURITY FIX: Replaced legacy shop-domain-as-token auth with proper
 * Shopify session token validation via authenticateRequest()
 */
export async function GET(request: NextRequest) {
  const corsHeaders = createCorsHeaders(request);

  try {
    // M2: Use proper authentication instead of shop-domain-as-token
    const authResult = await authenticateRequest(request);

    if (!authResult.authenticated || !authResult.userId) {
      return NextResponse.json(
        {
          success: false,
          error: authResult.error || "Authentication required",
        },
        { status: 401, headers: corsHeaders },
      );
    }

    const storeId = authResult.userId;

    // Fetch all samples for authenticated shop
    const { data: samples, error } = await supabaseAdmin
      .from("content_samples")
      .select("*")
      .eq("store_id", storeId)
      .order("created_at", { ascending: false });

    if (error) {
      logger.error("Error fetching samples:", error as Error, {
        component: "samples",
      });
      return NextResponse.json(
        { success: false, error: "Failed to fetch samples" },
        { status: 500, headers: corsHeaders },
      );
    }

    const activeSamples = samples?.filter((s) => s.is_active) || [];

    return NextResponse.json(
      {
        success: true,
        data: {
          samples: samples as ContentSample[],
          active_count: activeSamples.length,
          total_count: samples?.length || 0,
        },
      },
      { headers: corsHeaders },
    );
  } catch (error) {
    logger.error("Error in GET /api/content-center/samples:", error as Error, {
      component: "samples",
    });
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500, headers: corsHeaders },
    );
  }
}

/**
 * POST /api/content-center/samples
 * Upload a new content sample
 *
 * M2 SECURITY FIX: Replaced legacy shop-domain-as-token auth with proper
 * Shopify session token validation via authenticateRequest()
 */
export async function POST(request: NextRequest) {
  const corsHeaders = createCorsHeaders(request);

  try {
    // M2: Use proper authentication instead of shop-domain-as-token
    const authResult = await authenticateRequest(request);

    if (!authResult.authenticated || !authResult.userId) {
      return NextResponse.json(
        {
          success: false,
          error: authResult.error || "Authentication required",
        },
        { status: 401, headers: corsHeaders },
      );
    }

    const storeId = authResult.userId;

    const body: CreateSampleRequest = await request.json();
    const { sample_text, sample_type } = body;

    if (!sample_text || !sample_type) {
      return NextResponse.json(
        {
          success: false,
          error: "Missing required fields: sample_text, sample_type",
        },
        { status: 400, headers: corsHeaders },
      );
    }

    // Sanitize and validate input
    const validation = sanitizeAndValidateSample({ sample_text, sample_type });
    if (!validation.valid) {
      return NextResponse.json(
        { success: false, error: validation.error },
        { status: 400, headers: corsHeaders },
      );
    }

    const sanitizedText = validation.sanitized!.sample_text;
    const sanitizedType = validation.sanitized!.sample_type;
    const wordCount = calculateWordCount(sanitizedText);

    // Check sample limit
    const { data: existingSamples } = await supabaseAdmin
      .from("content_samples")
      .select("id")
      .eq("store_id", storeId);

    if (existingSamples && existingSamples.length >= 10) {
      return NextResponse.json(
        { success: false, error: "Maximum of 10 samples allowed" },
        { status: 400, headers: corsHeaders },
      );
    }

    // Insert sample
    const { data: sample, error } = await supabaseAdmin
      .from("content_samples")
      .insert({
        store_id: storeId,
        sample_text: sanitizedText,
        sample_type: sanitizedType,
        word_count: wordCount,
        is_active: true,
      })
      .select()
      .single();

    if (error) {
      logger.error("Error creating sample:", error as Error, {
        component: "samples",
      });
      return NextResponse.json(
        { success: false, error: "Failed to create sample" },
        { status: 500, headers: corsHeaders },
      );
    }

    return NextResponse.json(
      {
        success: true,
        data: {
          sample: sample as ContentSample,
          word_count: wordCount,
        },
      },
      { status: 201, headers: corsHeaders },
    );
  } catch (error) {
    logger.error("Error in POST /api/content-center/samples:", error as Error, {
      component: "samples",
    });
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500, headers: corsHeaders },
    );
  }
}

export async function OPTIONS(request: NextRequest) {
  return handleCorsPreflightRequest(request);
}
