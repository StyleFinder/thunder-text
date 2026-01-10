/**
 * Image Processing Utilities
 *
 * Server-side image manipulation using Sharp.
 * Used for resizing images to match Sora API requirements.
 */

import sharp from "sharp";
import { logger } from "@/lib/logger";

/**
 * Target dimensions for video generation
 */
export interface ImageDimensions {
  width: number;
  height: number;
}

/**
 * Standard video dimensions for Sora
 */
export const SORA_DIMENSIONS = {
  // Vertical (portrait) - UGC style
  "720x1280": { width: 720, height: 1280 },
  // Horizontal (landscape)
  "1280x720": { width: 1280, height: 720 },
  // Full HD vertical
  "1080x1920": { width: 1080, height: 1920 },
  // Full HD horizontal
  "1920x1080": { width: 1920, height: 1080 },
} as const;

/**
 * Result of image resize operation
 */
export interface ResizeResult {
  base64: string;
  width: number;
  height: number;
  originalWidth: number;
  originalHeight: number;
}

/**
 * Resize and pad an image to match exact target dimensions.
 *
 * The image is:
 * 1. Resized to fit within the target dimensions (maintaining aspect ratio)
 * 2. Centered on a background that matches the target dimensions
 *
 * @param base64Input - Base64 encoded input image (with or without data URL prefix)
 * @param targetSize - Target size string (e.g., "720x1280")
 * @returns Base64 encoded resized image
 */
export async function resizeImageForSora(
  base64Input: string,
  targetSize: keyof typeof SORA_DIMENSIONS = "720x1280",
): Promise<ResizeResult> {
  // eslint-disable-next-line security/detect-object-injection
  const dimensions = SORA_DIMENSIONS[targetSize];

  // Remove data URL prefix if present
  const base64Data = base64Input.replace(/^data:[^;]+;base64,/, "");

  // Convert base64 to buffer
  const inputBuffer = Buffer.from(base64Data, "base64");

  // Get original image metadata
  const metadata = await sharp(inputBuffer).metadata();
  const originalWidth = metadata.width || 0;
  const originalHeight = metadata.height || 0;

  logger.info("Resizing image for Sora", {
    component: "image-processing",
    originalWidth,
    originalHeight,
    targetWidth: dimensions.width,
    targetHeight: dimensions.height,
  });

  // Calculate the resize dimensions to fit within target while maintaining aspect ratio
  const { fitWidth, fitHeight } = calculateFitDimensions(
    originalWidth,
    originalHeight,
    dimensions.width,
    dimensions.height,
  );

  // Resize and center on background
  const resizedBuffer = await sharp(inputBuffer)
    .resize(fitWidth, fitHeight, {
      fit: "inside",
      withoutEnlargement: false, // Allow upscaling if needed
    })
    .extend({
      top: Math.floor((dimensions.height - fitHeight) / 2),
      bottom: Math.ceil((dimensions.height - fitHeight) / 2),
      left: Math.floor((dimensions.width - fitWidth) / 2),
      right: Math.ceil((dimensions.width - fitWidth) / 2),
      background: { r: 0, g: 0, b: 0, alpha: 1 }, // Black background
    })
    .png() // Output as PNG for best quality
    .toBuffer();

  // Convert back to base64
  const outputBase64 = resizedBuffer.toString("base64");

  logger.info("Image resized successfully", {
    component: "image-processing",
    fitWidth,
    fitHeight,
    outputSize: outputBase64.length,
  });

  return {
    base64: outputBase64,
    width: dimensions.width,
    height: dimensions.height,
    originalWidth,
    originalHeight,
  };
}

/**
 * Calculate dimensions to fit source into target while maintaining aspect ratio
 */
function calculateFitDimensions(
  sourceWidth: number,
  sourceHeight: number,
  targetWidth: number,
  targetHeight: number,
): { fitWidth: number; fitHeight: number } {
  const sourceRatio = sourceWidth / sourceHeight;
  const targetRatio = targetWidth / targetHeight;

  let fitWidth: number;
  let fitHeight: number;

  if (sourceRatio > targetRatio) {
    // Source is wider than target - fit to width
    fitWidth = targetWidth;
    fitHeight = Math.round(targetWidth / sourceRatio);
  } else {
    // Source is taller than target - fit to height
    fitHeight = targetHeight;
    fitWidth = Math.round(targetHeight * sourceRatio);
  }

  return { fitWidth, fitHeight };
}

/**
 * Check if an image needs resizing for Sora
 *
 * @param base64Input - Base64 encoded input image
 * @param targetSize - Target size string
 * @returns true if image dimensions don't match target
 */
export async function needsResizing(
  base64Input: string,
  targetSize: keyof typeof SORA_DIMENSIONS = "720x1280",
): Promise<boolean> {
  // eslint-disable-next-line security/detect-object-injection
  const dimensions = SORA_DIMENSIONS[targetSize];

  // Remove data URL prefix if present
  const base64Data = base64Input.replace(/^data:[^;]+;base64,/, "");
  const inputBuffer = Buffer.from(base64Data, "base64");

  const metadata = await sharp(inputBuffer).metadata();

  return (
    metadata.width !== dimensions.width || metadata.height !== dimensions.height
  );
}

/**
 * Get image dimensions from base64 data
 */
export async function getImageDimensions(
  base64Input: string,
): Promise<ImageDimensions> {
  const base64Data = base64Input.replace(/^data:[^;]+;base64,/, "");
  const inputBuffer = Buffer.from(base64Data, "base64");

  const metadata = await sharp(inputBuffer).metadata();

  return {
    width: metadata.width || 0,
    height: metadata.height || 0,
  };
}
