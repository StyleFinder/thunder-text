/**
 * Gemini Vision Quality Check
 *
 * Pre-checks product images before video generation to:
 * 1. Detect low-quality inputs that would produce poor videos
 * 2. Warn users about potential issues
 * 3. Reduce wasted credits on bad inputs
 *
 * Uses Google Gemini Flash for fast, cheap image analysis (~$0.001 per check)
 */

import { logger } from "@/lib/logger";

const GEMINI_API_BASE = "https://generativelanguage.googleapis.com/v1beta";

/**
 * Quality check result
 */
export interface QualityCheckResult {
  passed: boolean;
  score: number; // 0-100
  warnings: QualityWarning[];
  recommendation: "proceed" | "caution" | "stop";
  details: {
    hasProduct: boolean;
    isBlurry: boolean;
    hasGoodLighting: boolean;
    hasCleanBackground: boolean;
    hasBadCropping: boolean;
    isLowResolution: boolean;
    hasWatermarks: boolean;
  };
}

/**
 * Individual quality warning
 */
export interface QualityWarning {
  type: QualityWarningType;
  severity: "low" | "medium" | "high";
  message: string;
}

export type QualityWarningType =
  | "blurry"
  | "poor_lighting"
  | "bad_cropping"
  | "no_product"
  | "low_resolution"
  | "busy_background"
  | "watermarks"
  | "occlusion";

/**
 * Get Gemini API key from environment
 */
function getGeminiApiKey(): string {
  const apiKey = process.env.GOOGLE_AI_API_KEY;
  if (!apiKey) {
    throw new Error("GOOGLE_AI_API_KEY environment variable is not configured");
  }
  return apiKey;
}

/**
 * Convert image URL to base64 for Gemini API
 */
async function imageUrlToBase64(imageUrl: string): Promise<{
  mimeType: string;
  data: string;
}> {
  const response = await fetch(imageUrl);
  if (!response.ok) {
    throw new Error(`Failed to fetch image: ${response.statusText}`);
  }

  const contentType = response.headers.get("content-type") || "image/jpeg";
  const arrayBuffer = await response.arrayBuffer();
  const base64 = Buffer.from(arrayBuffer).toString("base64");

  return {
    mimeType: contentType,
    data: base64,
  };
}

/**
 * The quality assessment prompt for Gemini
 */
const QUALITY_CHECK_PROMPT = `You are an expert image quality analyst for AI video generation. Analyze this product image and assess its suitability for creating an animated product video.

Evaluate these aspects and respond in EXACT JSON format:

{
  "score": <0-100 overall quality score>,
  "hasProduct": <boolean - is there a clear product visible?>,
  "isBlurry": <boolean - is the image noticeably blurry?>,
  "hasGoodLighting": <boolean - is lighting adequate and even?>,
  "hasCleanBackground": <boolean - is background simple/non-distracting?>,
  "hasBadCropping": <boolean - is the product cut off or poorly framed?>,
  "isLowResolution": <boolean - does it appear low resolution or pixelated?>,
  "hasWatermarks": <boolean - are there visible watermarks or overlays?>,
  "warnings": [
    {
      "type": "<blurry|poor_lighting|bad_cropping|no_product|low_resolution|busy_background|watermarks|occlusion>",
      "severity": "<low|medium|high>",
      "message": "<brief explanation>"
    }
  ]
}

Be strict but fair. Images scoring 60+ should produce acceptable videos.
Scores 40-60 may have issues. Below 40 will likely produce poor results.

Respond with ONLY the JSON object, no additional text.`;

/**
 * Check image quality before video generation
 *
 * @param imageUrl - URL of the image to check
 * @returns Quality check result with score and warnings
 */
export async function checkImageQuality(
  imageUrl: string,
): Promise<QualityCheckResult> {
  const startTime = Date.now();

  try {
    const apiKey = getGeminiApiKey();

    // Convert image to base64
    const imageData = await imageUrlToBase64(imageUrl);

    // Call Gemini Flash for fast analysis
    const response = await fetch(
      `${GEMINI_API_BASE}/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  inline_data: {
                    mime_type: imageData.mimeType,
                    data: imageData.data,
                  },
                },
                {
                  text: QUALITY_CHECK_PROMPT,
                },
              ],
            },
          ],
          generationConfig: {
            temperature: 0.1, // Low temperature for consistent analysis
            maxOutputTokens: 1024,
          },
        }),
      },
    );

    if (!response.ok) {
      const errorText = await response.text();
      logger.error("Gemini API error", undefined, {
        component: "gemini-vision-check",
        statusCode: response.status,
        error: errorText,
      });
      throw new Error(`Gemini API error: ${response.status}`);
    }

    const data = await response.json();
    const textContent = data.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!textContent) {
      throw new Error("No response from Gemini");
    }

    // Parse JSON response
    const analysisText = textContent.trim();
    // Handle potential markdown code blocks
    const jsonMatch = analysisText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error("Could not parse Gemini response as JSON");
    }

    const analysis = JSON.parse(jsonMatch[0]);

    // Determine recommendation based on score
    let recommendation: "proceed" | "caution" | "stop";
    if (analysis.score >= 60) {
      recommendation = "proceed";
    } else if (analysis.score >= 40) {
      recommendation = "caution";
    } else {
      recommendation = "stop";
    }

    const result: QualityCheckResult = {
      passed: analysis.score >= 50,
      score: analysis.score,
      warnings: analysis.warnings || [],
      recommendation,
      details: {
        hasProduct: analysis.hasProduct ?? true,
        isBlurry: analysis.isBlurry ?? false,
        hasGoodLighting: analysis.hasGoodLighting ?? true,
        hasCleanBackground: analysis.hasCleanBackground ?? true,
        hasBadCropping: analysis.hasBadCropping ?? false,
        isLowResolution: analysis.isLowResolution ?? false,
        hasWatermarks: analysis.hasWatermarks ?? false,
      },
    };

    const duration = Date.now() - startTime;
    logger.info("Gemini quality check completed", {
      component: "gemini-vision-check",
      score: result.score,
      passed: result.passed,
      recommendation: result.recommendation,
      warningCount: result.warnings.length,
      durationMs: duration,
    });

    return result;
  } catch (error) {
    const duration = Date.now() - startTime;
    logger.error("Gemini quality check failed", error as Error, {
      component: "gemini-vision-check",
      imageUrl,
      durationMs: duration,
    });

    // Return a permissive result on error (don't block generation due to check failure)
    return {
      passed: true,
      score: 70,
      warnings: [
        {
          type: "occlusion",
          severity: "low",
          message: "Quality check unavailable - proceeding with caution",
        },
      ],
      recommendation: "caution",
      details: {
        hasProduct: true,
        isBlurry: false,
        hasGoodLighting: true,
        hasCleanBackground: true,
        hasBadCropping: false,
        isLowResolution: false,
        hasWatermarks: false,
      },
    };
  }
}

/**
 * Get human-readable summary of quality check
 */
export function getQualitySummary(result: QualityCheckResult): string {
  if (result.score >= 80) {
    return "Excellent image quality - should produce great results!";
  } else if (result.score >= 60) {
    return "Good image quality - should work well for video generation.";
  } else if (result.score >= 40) {
    return "Fair image quality - video results may be inconsistent.";
  } else {
    return "Poor image quality - consider using a better image.";
  }
}

/**
 * Get estimated cost for quality check
 * Gemini Flash is very cheap: ~$0.00025 per image
 */
export function getQualityCheckCost(): number {
  return 0.001; // ~$0.001 per check with some margin
}
