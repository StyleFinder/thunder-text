import { NextRequest, NextResponse } from "next/server";
import { openai } from "@/lib/openai";
import { logger } from '@/lib/logger'

interface ColorDetectionRequest {
  images: Array<{
    dataUrl: string;
    filename: string;
  }>;
}

interface ColorDetectionResult {
  colorName: string;
  standardizedColor: string;
  confidence: number;
  imageIndex: number;
  originalDetection: string;
}

interface ColorVariant {
  colorName: string;
  standardizedColor: string;
  confidence: number;
  imageIndices: number[];
  primaryImageIndex: number;
  originalDetections: string[];
  userOverride?: string;
}

export async function POST(request: NextRequest) {
  try {
    const body: ColorDetectionRequest = await request.json();
    const { images } = body;

    if (!images || images.length === 0) {
      return NextResponse.json(
        { error: "No images provided" },
        { status: 400 },
      );
    }

    console.log(
      `🎨 Starting color detection for ${images.length} primary images`,
    );

    // Process each image for color detection
    const colorResults: ColorDetectionResult[] = [];

    for (let i = 0; i < images.length; i++) {
      // Safe: i is loop counter, not user input
      // eslint-disable-next-line security/detect-object-injection
      const image = images[i];
      console.log(
        `🔍 Analyzing image ${i + 1}/${images.length}: ${image.filename}`,
      );

      try {
        const completion = await openai.chat.completions.create({
          model: "gpt-4o",
          messages: [
            {
              role: "user",
              content: [
                {
                  type: "text",
                  text: `Analyze this product image and identify the primary color. 

Instructions:
- Focus on the main product color, not background or accessories
- Provide a specific color name (e.g., "Navy Blue", "Forest Green", "Burgundy")
- Rate your confidence as high (90-100%), medium (70-89%), or low (50-69%)
- If multiple colors are prominent, choose the most dominant one
- For patterns or multi-color items, identify the primary/base color

CRITICAL: Respond with ONLY raw JSON, no code blocks or formatting:
{
  "primary_color": "Navy Blue",
  "confidence": "high",
  "reasoning": "The shirt is clearly navy blue with no other prominent colors"
}`,
                },
                {
                  type: "image_url",
                  image_url: {
                    url: image.dataUrl,
                  },
                },
              ],
            },
          ],
          max_tokens: 300,
        });

        const responseText = completion.choices[0]?.message?.content;
        if (!responseText) {
          throw new Error("No response from OpenAI");
        }

        // Parse the JSON response - handle cases where GPT-4o wraps JSON in code blocks
        let jsonText = responseText.trim();

        // Remove code block markers if present
        if (jsonText.startsWith("```json")) {
          jsonText = jsonText.replace(/^```json\s*/, "").replace(/\s*```$/, "");
        } else if (jsonText.startsWith("```")) {
          jsonText = jsonText.replace(/^```\s*/, "").replace(/\s*```$/, "");
        }

        const colorData = JSON.parse(jsonText);
        const confidenceLevel = colorData.confidence.toLowerCase();

        // Convert confidence to percentage
        let confidencePercentage: number;
        switch (confidenceLevel) {
          case "high":
            confidencePercentage = 95;
            break;
          case "medium":
            confidencePercentage = 80;
            break;
          case "low":
            confidencePercentage = 65;
            break;
          default:
            confidencePercentage = 50;
        }

        const detectedColor = colorData.primary_color;
        const standardizedColor = standardizeColor(detectedColor);

        colorResults.push({
          colorName: detectedColor,
          standardizedColor,
          confidence: confidencePercentage,
          imageIndex: i,
          originalDetection: detectedColor,
        });

        console.log(
          `✅ Image ${i + 1} detected: ${detectedColor} → ${standardizedColor} (${confidencePercentage}%)`,
        );
      } catch (error) {
        logger.error(`❌ Error analyzing image ${i + 1}:`, error as Error, { component: 'detect-colors' });

        // Add as unknown for failed detection
        colorResults.push({
          colorName: "Unknown",
          standardizedColor: "Unknown",
          confidence: 0,
          imageIndex: i,
          originalDetection: "Detection Failed",
        });
      }
    }

    // Group similar colors into variants
    const variants = groupColorsIntoVariants(colorResults);

    console.log(
      `🎯 Created ${variants.length} color variants from ${images.length} images`,
    );

    return NextResponse.json({
      success: true,
      variants,
      totalImages: images.length,
      detectionResults: colorResults,
    });
  } catch (error) {
    logger.error("Color detection API error:", error as Error, { component: 'detect-colors' });
    return NextResponse.json(
      {
        error: "Failed to detect colors",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}

// Standardize similar color names
function standardizeColor(detectedColor: string): string {
  const color = detectedColor.toLowerCase();

  const colorMappings: Record<string, string> = {
    // Blue family
    navy: "Navy",
    "navy blue": "Navy",
    "dark blue": "Navy",
    "midnight blue": "Navy",
    "royal blue": "Blue",
    "sky blue": "Light Blue",
    "light blue": "Light Blue",
    "powder blue": "Light Blue",

    // Red family
    burgundy: "Burgundy",
    wine: "Burgundy",
    maroon: "Burgundy",
    crimson: "Red",
    scarlet: "Red",
    "cherry red": "Red",

    // Purple family
    violet: "Purple",
    "deep purple": "Purple",
    "dark purple": "Purple",
    lavender: "Lavender",
    "light purple": "Lavender",

    // Green family
    "forest green": "Green",
    "dark green": "Green",
    emerald: "Green",
    "lime green": "Light Green",
    "mint green": "Light Green",

    // Neutral family
    charcoal: "Gray",
    "charcoal gray": "Gray",
    "slate gray": "Gray",
    "light gray": "Light Gray",
    "off white": "White",
    cream: "Cream",
    beige: "Beige",
    tan: "Tan",

    // Brown family
    chocolate: "Brown",
    "chocolate brown": "Brown",
    coffee: "Brown",
    chestnut: "Brown",
  };

  // Try exact match first - use hasOwnProperty to prevent prototype pollution
  if (Object.prototype.hasOwnProperty.call(colorMappings, color)) {
    // eslint-disable-next-line security/detect-object-injection
    return colorMappings[color];
  }

  // Try partial matches for compound colors
  for (const [key, value] of Object.entries(colorMappings)) {
    if (color.includes(key)) {
      return value;
    }
  }

  // Return capitalized version of original if no mapping found
  return detectedColor.charAt(0).toUpperCase() + detectedColor.slice(1);
}

// Group similar standardized colors into variants
function groupColorsIntoVariants(
  results: ColorDetectionResult[],
): ColorVariant[] {
  const groupsMap = new Map<string, ColorDetectionResult[]>();

  // Group by standardized color
  results.forEach((result) => {
    const key = result.standardizedColor;
    if (!groupsMap.has(key)) {
      groupsMap.set(key, []);
    }
    groupsMap.get(key)!.push(result);
  });

  // Convert groups to variants
  const variants: ColorVariant[] = [];

  groupsMap.forEach((group, standardizedColor) => {
    // Sort by confidence, then by image index (first uploaded = primary)
    group.sort((a, b) => {
      if (a.confidence !== b.confidence) {
        return b.confidence - a.confidence; // Higher confidence first
      }
      return a.imageIndex - b.imageIndex; // Earlier uploaded first
    });

    // Use highest confidence color name, or first uploaded if same confidence
    const primaryResult = group[0];

    // Calculate average confidence for the group
    const avgConfidence = Math.round(
      group.reduce((sum, r) => sum + r.confidence, 0) / group.length,
    );

    variants.push({
      colorName: primaryResult.colorName,
      standardizedColor,
      confidence: avgConfidence,
      imageIndices: group.map((r) => r.imageIndex),
      primaryImageIndex: group[0].imageIndex, // First in sorted order
      originalDetections: group.map((r) => r.originalDetection),
    });
  });

  // Sort variants by confidence and then by first image index
  variants.sort((a, b) => {
    if (a.confidence !== b.confidence) {
      return b.confidence - a.confidence;
    }
    return a.primaryImageIndex - b.primaryImageIndex;
  });

  return variants;
}
