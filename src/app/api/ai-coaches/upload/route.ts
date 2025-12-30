/**
 * AI Coaches API - File Upload
 *
 * POST /api/ai-coaches/upload
 * Upload files for coach chat context (inventory reports, SOPs, etc.)
 */

import { NextRequest, NextResponse } from "next/server";
import { getUserId } from "@/lib/auth/content-center-auth";
import { logger } from "@/lib/logger";
import { supabaseAdmin } from "@/lib/supabase/admin";
import {
  SUPPORTED_FILE_TYPES,
  MAX_FILE_SIZE,
  type SupportedMimeType,
  type FileAttachment,
  type FileCategory,
} from "@/types/ai-coaches";

export const maxDuration = 60;
export const dynamic = "force-dynamic";

// Helper to extract text from different file types
async function extractFileContent(
  buffer: Buffer,
  mimeType: string,
  fileName: string,
): Promise<string | undefined> {
  try {
    // Text files - direct extraction
    if (mimeType === "text/plain" || mimeType === "text/markdown") {
      return buffer.toString("utf-8");
    }

    // CSV files - extract as text
    if (mimeType === "text/csv") {
      return buffer.toString("utf-8");
    }

    // For other file types (PDF, Word, Excel), we'll store the file
    // and let the AI describe what it sees when processing the message
    // More advanced extraction would require additional libraries

    return undefined;
  } catch (error) {
    logger.warn("Failed to extract file content", {
      component: "ai-coaches-upload",
      fileName,
      mimeType,
      error: error instanceof Error ? error.message : "Unknown error",
    });
    return undefined;
  }
}

/**
 * POST /api/ai-coaches/upload
 * Upload a file for coach chat context
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const userId = await getUserId(request);

    if (!userId) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 },
      );
    }

    // Parse multipart form data
    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json(
        { success: false, error: "No file provided" },
        { status: 400 },
      );
    }

    // Validate file type
    const fileTypeInfo = SUPPORTED_FILE_TYPES[file.type as SupportedMimeType];
    if (!fileTypeInfo) {
      return NextResponse.json(
        {
          success: false,
          error: `Unsupported file type: ${file.type}. Supported: PDF, Word, CSV, Excel, Images, Text`,
        },
        { status: 400 },
      );
    }

    // Validate file size
    if (file.size > fileTypeInfo.maxSize) {
      return NextResponse.json(
        {
          success: false,
          error: `File too large. Maximum size for ${fileTypeInfo.extension} is ${Math.round(fileTypeInfo.maxSize / 1024 / 1024)}MB`,
        },
        { status: 400 },
      );
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        {
          success: false,
          error: `File too large. Maximum size is ${Math.round(MAX_FILE_SIZE / 1024 / 1024)}MB`,
        },
        { status: 400 },
      );
    }

    // Generate unique file path
    const fileId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const extension = fileTypeInfo.extension;
    const storagePath = `coach-uploads/${userId}/${fileId}${extension}`;

    // Read file buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Upload to Supabase Storage
    const { error: uploadError } = await supabaseAdmin.storage
      .from("coach-files")
      .upload(storagePath, buffer, {
        contentType: file.type,
        upsert: false,
      });

    if (uploadError) {
      logger.error("Failed to upload file to storage", uploadError, {
        component: "ai-coaches-upload",
        storeId: userId,
        fileName: file.name,
      });

      // Check if bucket doesn't exist
      if (uploadError.message.includes("Bucket not found")) {
        return NextResponse.json(
          {
            success: false,
            error: "File storage not configured. Please contact support.",
          },
          { status: 500 },
        );
      }

      return NextResponse.json(
        { success: false, error: "Failed to upload file" },
        { status: 500 },
      );
    }

    // Get public URL (or signed URL for private buckets)
    const { data: urlData } = supabaseAdmin.storage
      .from("coach-files")
      .getPublicUrl(storagePath);

    // Try to extract text content for text-based files
    const extractedText = await extractFileContent(
      buffer,
      file.type,
      file.name,
    );

    // Build attachment response
    const attachment: FileAttachment = {
      id: fileId,
      name: file.name,
      size: file.size,
      mimeType: file.type as SupportedMimeType,
      category: fileTypeInfo.category as FileCategory,
      url: urlData.publicUrl,
      extractedText,
    };

    // For images, include a preview URL
    if (fileTypeInfo.category === "image") {
      attachment.previewUrl = urlData.publicUrl;
    }

    logger.info("File uploaded successfully", {
      component: "ai-coaches-upload",
      storeId: userId,
      fileId,
      fileName: file.name,
      fileSize: file.size,
      mimeType: file.type,
      category: fileTypeInfo.category,
      hasExtractedText: !!extractedText,
    });

    return NextResponse.json({
      success: true,
      data: {
        attachment,
      },
    });
  } catch (error) {
    logger.error("Error uploading file", error as Error, {
      component: "ai-coaches-upload",
    });
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 },
    );
  }
}
