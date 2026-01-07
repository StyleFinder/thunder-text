/**
 * OpenAI Sora 2 Video Generation Client
 *
 * Wrapper for OpenAI's Sora 2 video generation API.
 * Used for UGC-style video generation from product images.
 *
 * API: POST https://api.openai.com/v1/videos
 */

import { logger } from "@/lib/logger";
import { getOpenAIKey } from "@/lib/security/api-keys";
import {
  resizeImageForSora,
  SORA_DIMENSIONS,
} from "@/lib/utils/image-processing";

const OPENAI_API_BASE = "https://api.openai.com/v1";

/**
 * Video size options for Sora
 */
export type SoraVideoSize = "720x1280" | "1280x720" | "1080x1920" | "1920x1080";

/**
 * Sora model options
 */
export type SoraModel = "sora-2";

/**
 * Video generation request
 */
export interface SoraGenerateRequest {
  prompt: string;
  model?: SoraModel;
  seconds?: number; // 5-20 seconds
  size?: SoraVideoSize;
  inputReferenceImage?: string; // Base64 image data
}

/**
 * Response from video generation request
 */
export interface SoraGenerateResponse {
  id: string;
  status: "queued" | "processing" | "completed" | "failed";
  created_at: string;
}

/**
 * Video status response
 */
export interface SoraStatusResponse {
  id: string;
  status: "queued" | "processing" | "completed" | "failed";
  created_at: string;
  completed_at?: string;
  error?: {
    message: string;
    code?: string;
  };
}

/**
 * Video content response (after completion)
 */
export interface SoraVideoContent {
  url?: string;
  data?: string; // Base64 video data
}

/**
 * Sora API error
 */
export class SoraApiError extends Error {
  code: string;
  statusCode: number;
  isContentPolicyViolation: boolean;
  isRateLimited: boolean;

  constructor(message: string, code: string, statusCode: number) {
    super(`Sora API Error (${code}): ${message}`);
    this.name = "SoraApiError";
    this.code = code;
    this.statusCode = statusCode;
    this.isContentPolicyViolation =
      code === "content_policy_violation" ||
      message.toLowerCase().includes("content policy") ||
      message.toLowerCase().includes("flagged");
    this.isRateLimited = statusCode === 429 || code === "rate_limit_exceeded";
  }
}

/**
 * Make authenticated request to OpenAI Sora API
 */
async function soraRequest<T>(
  endpoint: string,
  options: RequestInit = {},
): Promise<T> {
  const apiKey = getOpenAIKey();

  const response = await fetch(`${OPENAI_API_BASE}${endpoint}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      ...options.headers,
    },
  });

  // Try to parse response as JSON, handling non-JSON responses gracefully

  let data: {
    error?: { message?: string; code?: string };
    message?: string;
    [key: string]: any;
  };
  const responseText = await response.text();

  try {
    data = JSON.parse(responseText);
  } catch {
    // Response isn't valid JSON
    logger.error("Sora API returned non-JSON response", undefined, {
      component: "sora-client",
      endpoint,
      statusCode: response.status,
      responsePreview: responseText.substring(0, 500),
    });
    throw new SoraApiError(
      `Invalid response from Sora API: ${responseText.substring(0, 200)}`,
      "invalid_response",
      response.status,
    );
  }

  if (!response.ok) {
    const errorMessage = data.error?.message || data.message || "Unknown error";
    const errorCode = data.error?.code || "unknown_error";

    logger.error("Sora API error", undefined, {
      component: "sora-client",
      endpoint,
      statusCode: response.status,
      errorCode,
      errorMessage,
    });

    throw new SoraApiError(
      errorMessage as string,
      errorCode as string,
      response.status,
    );
  }

  return data as T;
}

/**
 * Make multipart form request to OpenAI Sora API
 */
async function soraMultipartRequest<T>(
  endpoint: string,
  formData: FormData,
): Promise<T> {
  const apiKey = getOpenAIKey();

  const response = await fetch(`${OPENAI_API_BASE}${endpoint}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      // Don't set Content-Type for FormData - browser sets it with boundary
    },
    body: formData,
  });

  const data = await response.json();

  if (!response.ok) {
    const errorMessage = data.error?.message || data.message || "Unknown error";
    const errorCode = data.error?.code || "unknown_error";

    logger.error("Sora API multipart error", undefined, {
      component: "sora-client",
      endpoint,
      statusCode: response.status,
      errorCode,
      errorMessage,
    });

    throw new SoraApiError(errorMessage, errorCode, response.status);
  }

  return data as T;
}

/**
 * Start a UGC video generation task
 *
 * @param request - Generation request parameters
 * @returns Video generation ID for polling status
 */
export async function startUGCVideoGeneration(
  request: SoraGenerateRequest,
): Promise<string> {
  const targetSize = (request.size ||
    "720x1280") as keyof typeof SORA_DIMENSIONS;

  logger.info("Starting Sora UGC video generation", {
    component: "sora-client",
    model: request.model || "sora-2",
    seconds: request.seconds || 12,
    size: targetSize,
    hasInputImage: !!request.inputReferenceImage,
  });

  // Build form data for multipart request
  const formData = new FormData();
  formData.append("prompt", request.prompt);
  formData.append("model", request.model || "sora-2");
  formData.append("seconds", String(request.seconds || 12));
  formData.append("size", targetSize);

  // Add input reference image if provided (resize to match video dimensions)
  if (request.inputReferenceImage) {
    // Resize image to match Sora's required dimensions
    const resized = await resizeImageForSora(
      request.inputReferenceImage,
      targetSize,
    );

    logger.info("Image resized for Sora", {
      component: "sora-client",
      originalWidth: resized.originalWidth,
      originalHeight: resized.originalHeight,
      targetWidth: resized.width,
      targetHeight: resized.height,
    });

    // Convert resized base64 to blob
    const imageBlob = base64ToBlob(resized.base64, "image/png");
    formData.append("input_reference", imageBlob, "reference.png");
  }

  const response = await soraMultipartRequest<SoraGenerateResponse>(
    "/videos",
    formData,
  );

  logger.info("Sora video generation started", {
    component: "sora-client",
    videoId: response.id,
    status: response.status,
  });

  return response.id;
}

/**
 * Check the status of a video generation task
 *
 * @param videoId - Video ID from startUGCVideoGeneration
 * @returns Current status of the video generation
 */
export async function getVideoStatus(
  videoId: string,
): Promise<SoraStatusResponse> {
  const response = await soraRequest<SoraStatusResponse>(
    `/videos/${encodeURIComponent(videoId)}`,
    { method: "GET" },
  );

  logger.debug("Sora video status", {
    component: "sora-client",
    videoId,
    status: response.status,
  });

  return response;
}

/**
 * Get the video content after generation completes
 *
 * The Sora API returns the video as binary MP4 data directly,
 * not as JSON with a URL. We fetch it as a blob and convert to base64.
 *
 * @param videoId - Video ID
 * @returns Video data as base64 data URL
 */
export async function getVideoContent(
  videoId: string,
): Promise<SoraVideoContent> {
  const apiKey = getOpenAIKey();

  const response = await fetch(
    `${OPENAI_API_BASE}/videos/${encodeURIComponent(videoId)}/content`,
    {
      method: "GET",
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
    },
  );

  if (!response.ok) {
    // Try to get error details from response
    let errorMessage = "Failed to fetch video content";
    let errorCode = "content_fetch_failed";

    try {
      const errorData = await response.json();
      errorMessage = errorData.error?.message || errorMessage;
      errorCode = errorData.error?.code || errorCode;
    } catch {
      // Response wasn't JSON, use status text
      errorMessage = `${response.status} ${response.statusText}`;
    }

    logger.error("Sora video content fetch failed", undefined, {
      component: "sora-client",
      videoId,
      statusCode: response.status,
      errorCode,
      errorMessage,
    });

    throw new SoraApiError(errorMessage, errorCode, response.status);
  }

  // Get the content type to verify it's video
  const contentType = response.headers.get("content-type");

  if (!contentType?.includes("video/")) {
    logger.warn("Sora returned unexpected content type", {
      component: "sora-client",
      videoId,
      contentType,
    });
  }

  // Fetch as blob and convert to base64
  const blob = await response.blob();

  if (blob.size === 0) {
    throw new SoraApiError("Video content is empty", "empty_content", 500);
  }

  logger.info("Sora video content fetched", {
    component: "sora-client",
    videoId,
    contentType,
    sizeBytes: blob.size,
  });

  // Convert blob to base64 data URL
  const arrayBuffer = await blob.arrayBuffer();
  const base64 = Buffer.from(arrayBuffer).toString("base64");
  const dataUrl = `data:${contentType || "video/mp4"};base64,${base64}`;

  return {
    data: dataUrl,
  };
}

/**
 * Poll for video completion with exponential backoff
 *
 * @param videoId - Video ID to poll
 * @param options - Polling options
 * @returns Video URL when completed
 */
export async function pollForCompletion(
  videoId: string,
  options: {
    maxAttempts?: number;
    initialDelayMs?: number;
    maxDelayMs?: number;
    onProgress?: (status: SoraStatusResponse) => void;
  } = {},
): Promise<string> {
  const {
    maxAttempts = 120, // ~10 minutes with default delays
    initialDelayMs = 5000, // 5 seconds
    maxDelayMs = 15000, // 15 seconds max
    onProgress,
  } = options;

  let attempts = 0;
  let delay = initialDelayMs;

  while (attempts < maxAttempts) {
    attempts++;

    const status = await getVideoStatus(videoId);

    if (onProgress) {
      onProgress(status);
    }

    logger.debug("Sora video poll", {
      component: "sora-client",
      videoId,
      status: status.status,
      attempt: attempts,
    });

    if (status.status === "completed") {
      // Get the video content (returns base64 data URL)
      const content = await getVideoContent(videoId);

      if (content.data) {
        logger.info("Sora video generation completed", {
          component: "sora-client",
          videoId,
          hasData: true,
        });
        return content.data;
      }

      if (content.url) {
        logger.info("Sora video generation completed", {
          component: "sora-client",
          videoId,
          hasUrl: true,
        });
        return content.url;
      }

      throw new SoraApiError(
        "Video completed but no content available",
        "no_content",
        500,
      );
    }

    if (status.status === "failed") {
      logger.error("Sora video generation failed", undefined, {
        component: "sora-client",
        videoId,
        error: status.error?.message,
      });
      throw new SoraApiError(
        status.error?.message || "Video generation failed",
        status.error?.code || "generation_failed",
        500,
      );
    }

    // Wait before next poll with exponential backoff
    await new Promise((resolve) => setTimeout(resolve, delay));
    delay = Math.min(delay * 1.2, maxDelayMs);
  }

  throw new SoraApiError(
    `Video generation timed out after ${maxAttempts} attempts`,
    "timeout",
    408,
  );
}

/**
 * Convert base64 string to Blob
 */
function base64ToBlob(base64: string, mimeType: string): Blob {
  // Remove data URL prefix if present
  const base64Data = base64.replace(/^data:[^;]+;base64,/, "");

  const byteCharacters = atob(base64Data);
  const byteNumbers = new Array(byteCharacters.length);

  for (let i = 0; i < byteCharacters.length; i++) {
    // eslint-disable-next-line security/detect-object-injection
    byteNumbers[i] = byteCharacters.charCodeAt(i);
  }

  const byteArray = new Uint8Array(byteNumbers);
  return new Blob([byteArray], { type: mimeType });
}

/**
 * Get estimated generation time for Sora
 *
 * Sora 2 typically takes 3-5 minutes for 12-second videos
 */
export function getEstimatedTime(seconds: number = 12): {
  minSeconds: number;
  maxSeconds: number;
} {
  // Roughly 15-30 seconds of generation time per second of video
  return {
    minSeconds: seconds * 15,
    maxSeconds: seconds * 30,
  };
}

/**
 * Get estimated cost for a Sora video generation
 *
 * Pricing based on OpenAI rates (as of 2025):
 * - Approximately $0.05-0.10 per second of video
 */
export function getEstimatedCost(seconds: number = 12): number {
  return seconds * 0.08; // ~$0.96 for 12-second video
}
