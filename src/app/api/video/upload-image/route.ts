/**
 * Video Source Image Upload API
 *
 * POST /api/video/upload-image
 * Upload an image to Supabase Storage for video generation
 * Returns a public URL that can be passed to Kie.ai
 */

import { NextRequest, NextResponse } from "next/server";
import { getUserId } from "@/lib/auth/content-center-auth";
import { supabaseAdmin } from "@/lib/supabase";
import { logger } from "@/lib/logger";

export const dynamic = "force-dynamic";

// Supported image types for video generation
const SUPPORTED_MIME_TYPES = [
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/gif",
] as const;

// Magic byte signatures for image validation
const IMAGE_MAGIC_BYTES: Record<string, readonly number[]> = {
  "image/png": [0x89, 0x50, 0x4e, 0x47],
  "image/jpeg": [0xff, 0xd8, 0xff],
  "image/gif": [0x47, 0x49, 0x46],
  "image/webp": [0x52, 0x49, 0x46, 0x46],
};

// Max file size: 10MB
const MAX_FILE_SIZE = 10 * 1024 * 1024;

/**
 * Validate file content matches declared MIME type using magic bytes
 */
function validateMagicBytes(buffer: Buffer, mimeType: string): boolean {
  // eslint-disable-next-line security/detect-object-injection
  const signature = IMAGE_MAGIC_BYTES[mimeType];
  if (!signature) return false;
  if (buffer.length < signature.length) return false;
  return signature.every((byte, idx) => buffer.readUInt8(idx) === byte);
}

interface UploadResponse {
  success: boolean;
  data?: {
    url: string;
    path: string;
  };
  error?: string;
}

export async function POST(
  request: NextRequest,
): Promise<NextResponse<UploadResponse>> {
  try {
    // 1. Authenticate
    const userId = await getUserId(request);
    if (!userId) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 },
      );
    }

    // 2. Parse form data
    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json(
        { success: false, error: "No file provided" },
        { status: 400 },
      );
    }

    // 3. Validate MIME type
    if (
      !SUPPORTED_MIME_TYPES.includes(
        file.type as (typeof SUPPORTED_MIME_TYPES)[number],
      )
    ) {
      return NextResponse.json(
        {
          success: false,
          error: `Unsupported file type: ${file.type}. Supported: PNG, JPEG, WebP, GIF`,
        },
        { status: 400 },
      );
    }

    // 4. Validate file size
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        {
          success: false,
          error: `File too large. Maximum size is 10MB`,
        },
        { status: 400 },
      );
    }

    // 5. Read and validate file content
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    if (!validateMagicBytes(buffer, file.type)) {
      logger.warn("Image magic bytes mismatch", {
        component: "video-upload-image",
        shopId: userId,
        fileName: file.name,
        declaredType: file.type,
      });
      return NextResponse.json(
        {
          success: false,
          error: "File content does not match declared type",
        },
        { status: 400 },
      );
    }

    // 6. Generate unique file path
    const fileId = `${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
    const extension =
      file.type.split("/")[1] === "jpeg" ? "jpg" : file.type.split("/")[1];
    const storagePath = `video-sources/${userId}/${fileId}.${extension}`;

    // 7. Upload to Supabase Storage
    const { error: uploadError } = await supabaseAdmin.storage
      .from("video-source-images")
      .upload(storagePath, buffer, {
        contentType: file.type,
        upsert: false,
      });

    if (uploadError) {
      logger.error("Failed to upload video source image", uploadError, {
        component: "video-upload-image",
        shopId: userId,
        fileName: file.name,
      });

      if (uploadError.message.includes("Bucket not found")) {
        return NextResponse.json(
          {
            success: false,
            error: "Storage not configured. Please contact support.",
          },
          { status: 500 },
        );
      }

      return NextResponse.json(
        { success: false, error: "Failed to upload image" },
        { status: 500 },
      );
    }

    // 8. Get public URL
    const { data: urlData } = supabaseAdmin.storage
      .from("video-source-images")
      .getPublicUrl(storagePath);

    logger.info("Video source image uploaded", {
      component: "video-upload-image",
      shopId: userId,
      fileId,
      fileName: file.name,
      fileSize: file.size,
      mimeType: file.type,
      publicUrl: urlData.publicUrl,
    });

    return NextResponse.json({
      success: true,
      data: {
        url: urlData.publicUrl,
        path: storagePath,
      },
    });
  } catch (error) {
    logger.error("Video source image upload error", error as Error, {
      component: "video-upload-image",
    });

    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 },
    );
  }
}
