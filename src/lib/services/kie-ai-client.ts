/**
 * Kie.ai API Client
 *
 * Wrapper for Kie.ai's Veo 3.1 video generation API.
 * Handles video generation, status polling, and error handling.
 *
 * API Documentation: https://docs.kie.ai/veo3-api/generate-veo-3-video
 */

import { logger } from "@/lib/logger";

const KIE_API_BASE = "https://api.kie.ai/api/v1";

/**
 * Available video generation models
 */
export type KieModel = "veo3" | "veo3_fast";

/**
 * Aspect ratio options
 */
export type AspectRatio = "16:9" | "9:16" | "Auto";

/**
 * Generation type modes
 */
export type GenerationType =
  | "TEXT_2_VIDEO"
  | "FIRST_AND_LAST_FRAMES_2_VIDEO"
  | "REFERENCE_2_VIDEO";

/**
 * Task status values
 */
export type TaskStatus =
  | "pending"
  | "processing"
  | "completed"
  | "failed"
  | "cancelled";

/**
 * Request payload for video generation
 */
export interface KieGenerateRequest {
  prompt: string;
  imageUrls?: string[];
  model?: KieModel;
  generationType?: GenerationType;
  aspectRatio?: AspectRatio;
  seeds?: number;
  callBackUrl?: string;
  enableTranslation?: boolean;
  watermark?: string;
}

/**
 * Response from video generation request
 */
export interface KieGenerateResponse {
  code: number;
  msg: string;
  data: {
    taskId: string;
  };
}

/**
 * Video result from completed generation
 */
export interface KieVideoResult {
  videoUrl: string;
  thumbnailUrl?: string;
  duration?: number;
}

/**
 * Actual Kie.ai API response structure for record-info
 */
export interface KieRecordInfoResponse {
  code: number;
  msg: string;
  data: {
    taskId: string;
    paramJson: string;
    response?: {
      taskId: string;
      resolution?: string;
      originUrls?: string[] | null;
      resultUrls?: string[];
      hasAudioList?: boolean[];
      seeds?: number[];
    };
    successFlag: number; // 1 = completed, 0 = processing, -1 = failed
    fallbackFlag: boolean;
    completeTime?: number;
    createTime?: number;
    errorCode?: string | null;
    errorMessage?: string | null;
  };
}

/**
 * Normalized task status response (for internal use)
 */
export interface KieTaskStatusResponse {
  code: number;
  msg: string;
  data: {
    taskId: string;
    status: TaskStatus;
    progress?: number;
    result?: KieVideoResult;
    error?: string;
    createdAt?: string;
    completedAt?: string;
  };
}

/**
 * Error response from Kie.ai
 */
export interface KieErrorResponse {
  code: number;
  msg: string;
  error?: string;
}

/**
 * Kie.ai API error
 */
export class KieApiError extends Error {
  code: number;
  kieMessage: string;
  isContentPolicyViolation: boolean;

  constructor(code: number, message: string) {
    super(`Kie.ai API Error (${code}): ${message}`);
    this.name = "KieApiError";
    this.code = code;
    this.kieMessage = message;
    // Detect content policy violations (code 400 with specific message patterns)
    this.isContentPolicyViolation =
      code === 400 &&
      (message.toLowerCase().includes("content polic") ||
        message.toLowerCase().includes("flagged") ||
        message.toLowerCase().includes("violat"));
  }
}

/**
 * Get the Kie.ai API key from environment
 */
function getApiKey(): string {
  const apiKey = process.env.KIE_AI_KEY;
  if (!apiKey) {
    throw new Error("KIE_AI_KEY environment variable is not configured");
  }
  return apiKey;
}

/**
 * Make authenticated request to Kie.ai API
 */
async function kieRequest<T>(
  endpoint: string,
  options: RequestInit = {},
): Promise<T> {
  const apiKey = getApiKey();

  const response = await fetch(`${KIE_API_BASE}${endpoint}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      ...options.headers,
    },
  });

  const data = await response.json();

  if (!response.ok || data.code !== 200) {
    logger.error("Kie.ai API error", undefined, {
      component: "kie-ai-client",
      endpoint,
      statusCode: response.status,
      kieCode: data.code,
      kieMessage: data.msg,
    });
    throw new KieApiError(
      data.code || response.status,
      data.msg || "Unknown error",
    );
  }

  return data as T;
}

/**
 * Start a video generation task
 *
 * @param request - Generation request parameters
 * @returns Task ID for polling status
 */
export async function startVideoGeneration(
  request: KieGenerateRequest,
): Promise<string> {
  logger.info("Starting Kie.ai video generation", {
    component: "kie-ai-client",
    model: request.model || "veo3_fast",
    hasImages: !!request.imageUrls?.length,
    generationType: request.generationType,
  });

  const payload: KieGenerateRequest = {
    ...request,
    model: request.model || "veo3_fast",
    generationType: request.generationType || "REFERENCE_2_VIDEO",
    aspectRatio: request.aspectRatio || "16:9",
    enableTranslation: request.enableTranslation ?? true,
  };

  const response = await kieRequest<KieGenerateResponse>("/veo/generate", {
    method: "POST",
    body: JSON.stringify(payload),
  });

  logger.info("Kie.ai video generation started", {
    component: "kie-ai-client",
    taskId: response.data.taskId,
  });

  return response.data.taskId;
}

/**
 * Check the status of a video generation task
 *
 * @param taskId - Task ID from startVideoGeneration
 * @returns Normalized task status and result if completed
 */
export async function getTaskStatus(
  taskId: string,
): Promise<KieTaskStatusResponse["data"]> {
  const response = await kieRequest<KieRecordInfoResponse>(
    `/veo/record-info?taskId=${encodeURIComponent(taskId)}`,
    { method: "GET" },
  );

  const raw = response.data;

  // Normalize Kie.ai response to our internal format
  // successFlag: 1 = completed, 0 = processing, -1 = failed
  let status: TaskStatus;
  if (raw.successFlag === 1) {
    status = "completed";
  } else if (raw.successFlag === -1) {
    status = "failed";
  } else {
    status = "processing";
  }

  // Build normalized response
  const normalized: KieTaskStatusResponse["data"] = {
    taskId: raw.taskId,
    status,
    createdAt: raw.createTime
      ? new Date(raw.createTime).toISOString()
      : undefined,
    completedAt: raw.completeTime
      ? new Date(raw.completeTime).toISOString()
      : undefined,
    error: raw.errorMessage || undefined,
  };

  // If completed, extract video URL from response
  if (status === "completed" && raw.response?.resultUrls?.length) {
    normalized.result = {
      videoUrl: raw.response.resultUrls[0],
      // Kie.ai doesn't provide thumbnail or duration in the response
    };
  }

  logger.debug("Kie.ai task status normalized", {
    component: "kie-ai-client",
    taskId,
    rawSuccessFlag: raw.successFlag,
    normalizedStatus: status,
    hasResult: !!normalized.result,
  });

  return normalized;
}

/**
 * Poll for task completion with exponential backoff
 *
 * @param taskId - Task ID to poll
 * @param options - Polling options
 * @returns Completed task result
 */
export async function pollForCompletion(
  taskId: string,
  options: {
    maxAttempts?: number;
    initialDelayMs?: number;
    maxDelayMs?: number;
    onProgress?: (status: KieTaskStatusResponse["data"]) => void;
  } = {},
): Promise<KieVideoResult> {
  const {
    maxAttempts = 60, // ~5 minutes with default delays
    initialDelayMs = 5000, // 5 seconds
    maxDelayMs = 15000, // 15 seconds max
    onProgress,
  } = options;

  let attempts = 0;
  let delay = initialDelayMs;

  while (attempts < maxAttempts) {
    attempts++;

    const status = await getTaskStatus(taskId);

    if (onProgress) {
      onProgress(status);
    }

    logger.debug("Kie.ai task status poll", {
      component: "kie-ai-client",
      taskId,
      status: status.status,
      progress: status.progress,
      attempt: attempts,
    });

    if (status.status === "completed" && status.result) {
      logger.info("Kie.ai video generation completed", {
        component: "kie-ai-client",
        taskId,
        videoUrl: status.result.videoUrl,
        duration: status.result.duration,
      });
      return status.result;
    }

    if (status.status === "failed") {
      logger.error("Kie.ai video generation failed", undefined, {
        component: "kie-ai-client",
        taskId,
        error: status.error,
      });
      throw new KieApiError(500, status.error || "Video generation failed");
    }

    if (status.status === "cancelled") {
      throw new KieApiError(499, "Video generation was cancelled");
    }

    // Wait before next poll with exponential backoff
    await new Promise((resolve) => setTimeout(resolve, delay));
    delay = Math.min(delay * 1.5, maxDelayMs);
  }

  throw new KieApiError(
    408,
    `Video generation timed out after ${maxAttempts} attempts`,
  );
}

/**
 * Generate a video from a product image
 *
 * This is a convenience function that handles the full workflow:
 * 1. Start generation
 * 2. Poll for completion
 * 3. Return the video URL
 *
 * @param imageUrl - URL of the product image
 * @param prompt - Description of desired animation/video
 * @param options - Generation options
 * @returns Video result with URL
 */
export async function generateProductVideo(
  imageUrl: string,
  prompt: string,
  options: {
    model?: KieModel;
    aspectRatio?: AspectRatio;
    callbackUrl?: string;
    onProgress?: (status: KieTaskStatusResponse["data"]) => void;
  } = {},
): Promise<{ taskId: string; result: KieVideoResult }> {
  const taskId = await startVideoGeneration({
    prompt,
    imageUrls: [imageUrl],
    model: options.model || "veo3_fast",
    generationType: "REFERENCE_2_VIDEO",
    aspectRatio: options.aspectRatio || "16:9",
    callBackUrl: options.callbackUrl,
    enableTranslation: true,
  });

  const result = await pollForCompletion(taskId, {
    onProgress: options.onProgress,
  });

  return { taskId, result };
}

/**
 * Get estimated cost for a video generation
 *
 * Pricing based on Kie.ai rates:
 * - veo3_fast: ~$0.30-0.40 per 8s video
 * - veo3 (quality): ~$2.00 per 8s video
 */
export function getEstimatedCost(model: KieModel = "veo3_fast"): number {
  return model === "veo3" ? 2.0 : 0.4;
}

/**
 * Get estimated generation time
 *
 * Based on typical generation times:
 * - veo3_fast: 60-90 seconds
 * - veo3 (quality): 2-4 minutes
 */
export function getEstimatedTime(model: KieModel = "veo3_fast"): {
  minSeconds: number;
  maxSeconds: number;
} {
  return model === "veo3"
    ? { minSeconds: 120, maxSeconds: 240 }
    : { minSeconds: 60, maxSeconds: 90 };
}
