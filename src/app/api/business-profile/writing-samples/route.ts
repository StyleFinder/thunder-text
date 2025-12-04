import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { requireAuth } from '@/lib/auth/ace-compat';
import { logger } from '@/lib/logger'

/**
 * Route segment config - file upload limits
 * - 10MB body size limit for file uploads
 * - 60s timeout for upload processing
 */
export const maxDuration = 60;
export const dynamic = 'force-dynamic';

const MAX_SAMPLES = 3;
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

const ALLOWED_TYPES = [
  'text/plain',
  'text/markdown',
  'text/csv',
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/rtf',
];

/**
 * GET /api/business-profile/writing-samples
 * List all writing samples for the shop
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

    // Get writing samples
    const { data: samples, error: samplesError } = await supabaseAdmin
      .from("writing_samples")
      .select("id, file_name, file_type, file_size, created_at")
      .eq("shop_id", shop.id)
      .order("created_at", { ascending: false });

    if (samplesError) {
      logger.error("Error fetching samples:", samplesError as Error, { component: 'writing-samples' });
      return NextResponse.json(
        { success: false, error: "Failed to fetch samples" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        samples: samples || [],
        maxSamples: MAX_SAMPLES,
        canUpload: (samples?.length || 0) < MAX_SAMPLES,
      }
    });
  } catch (error) {
    logger.error("Error fetching writing samples:", error as Error, { component: 'writing-samples' });
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
});

/**
 * POST /api/business-profile/writing-samples
 * Upload a new writing sample
 */
export const POST = requireAuth('user')(async (request: NextRequest) => {
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

    // Check current sample count
    const { count } = await supabaseAdmin
      .from("writing_samples")
      .select("*", { count: "exact", head: true })
      .eq("shop_id", shop.id);

    if ((count || 0) >= MAX_SAMPLES) {
      return NextResponse.json(
        { success: false, error: `Maximum ${MAX_SAMPLES} samples allowed. Delete one before uploading.` },
        { status: 400 }
      );
    }

    // Parse form data
    const formData = await request.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json(
        { success: false, error: "No file provided" },
        { status: 400 }
      );
    }

    // Validate file type
    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json(
        { success: false, error: "Invalid file type. Allowed: TXT, MD, CSV, PDF, DOC, DOCX, RTF" },
        { status: 400 }
      );
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { success: false, error: "File too large. Maximum 10MB allowed." },
        { status: 400 }
      );
    }

    // Get current business profile
    const { data: profile } = await supabaseAdmin
      .from("business_profiles")
      .select("id")
      .eq("store_id", shop.id)
      .eq("is_current", true)
      .single();

    // Generate storage path
    const timestamp = Date.now();
    const sanitizedFileName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
    const storagePath = `${shop.id}/${timestamp}_${sanitizedFileName}`;

    // Convert file to buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Upload to storage
    const { error: uploadError } = await supabaseAdmin.storage
      .from("writing-samples")
      .upload(storagePath, buffer, {
        contentType: file.type,
        upsert: false,
      });

    if (uploadError) {
      logger.error("Storage upload error:", uploadError as Error, { component: 'writing-samples' });
      return NextResponse.json(
        { success: false, error: "Failed to upload file" },
        { status: 500 }
      );
    }

    // Extract text for plain text files
    let extractedText: string | null = null;
    if (file.type === 'text/plain' || file.type === 'text/markdown' || file.type === 'text/csv') {
      extractedText = buffer.toString('utf-8').substring(0, 50000); // Limit to 50k chars
    }

    // Create database record
    const { data: sample, error: insertError } = await supabaseAdmin
      .from("writing_samples")
      .insert({
        shop_id: shop.id,
        business_profile_id: profile?.id || null,
        file_name: file.name,
        file_type: file.type,
        file_size: file.size,
        storage_path: storagePath,
        extracted_text: extractedText,
      })
      .select("id, file_name, file_type, file_size, created_at")
      .single();

    if (insertError) {
      logger.error("Database insert error:", insertError as Error, { component: 'writing-samples' });
      // Try to clean up uploaded file
      await supabaseAdmin.storage.from("writing-samples").remove([storagePath]);
      return NextResponse.json(
        { success: false, error: "Failed to save sample record" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: { sample }
    });
  } catch (error) {
    logger.error("Error uploading writing sample:", error as Error, { component: 'writing-samples' });
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
});
