import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth/auth-options";
import { logger } from "@/lib/logger";

/**
 * POST /api/detect-category
 * Detect product category from image using OpenAI Vision
 *
 * SECURITY: Requires session authentication to prevent API abuse.
 * OpenAI Vision API calls are expensive and must be protected.
 */
export async function POST(request: NextRequest) {
  // Check if we're in a build environment without proper configuration
  if (
    !process.env.NEXT_PUBLIC_SUPABASE_URL ||
    process.env.NEXT_PUBLIC_SUPABASE_URL === "https://placeholder.supabase.co"
  ) {
    return NextResponse.json(
      { error: "Application not properly configured" },
      { status: 503 },
    );
  }

  try {
    // SECURITY: Require session authentication
    // This prevents unauthorized API abuse (financial DoS via OpenAI costs)
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 },
      );
    }

    const body = await request.json();
    const { imageUrl, imageData } = body;

    if (!imageUrl && !imageData) {
      return NextResponse.json(
        { error: "Image URL or image data is required" },
        { status: 400 },
      );
    }

    // Use OpenAI Vision API to analyze the image and detect clothing category
    const { openai } = await import("@/lib/openai");

    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: `Analyze this clothing/apparel image and determine which specific category it belongs to from this list:

**EXACT CATEGORIES** (respond with ONLY the exact category name):
- Tops
- Sweaters  
- Jackets
- Jeans
- Jewelry
- Dresses
- Pants
- Shoes
- Accessories

Look at the image and respond with ONLY ONE of these exact category names. No explanation, just the category name.`,
            },
            {
              type: "image_url",
              image_url: {
                url: imageUrl || imageData,
                detail: "low",
              },
            },
          ],
        },
      ],
      max_tokens: 10,
      temperature: 0.1,
    });

    const detectedCategory = completion.choices[0]?.message?.content?.trim();

    if (!detectedCategory) {
      return NextResponse.json(
        { error: "Could not detect category from image" },
        { status: 400 },
      );
    }

    // Validate that the detected category is one of our valid categories
    const validCategories = [
      "Tops",
      "Sweaters",
      "Jackets",
      "Jeans",
      "Jewelry",
      "Dresses",
      "Pants",
      "Shoes",
      "Accessories",
    ];

    const normalizedCategory = validCategories.find(
      (cat) => cat.toLowerCase() === detectedCategory.toLowerCase(),
    );

    if (!normalizedCategory) {
      // Default to "Tops" if we can't match the detected category
      console.warn(
        `Detected category "${detectedCategory}" not in valid list, defaulting to "Tops"`,
      );
      return NextResponse.json({
        success: true,
        data: {
          parentCategory: "Clothing",
          subCategory: "Tops",
          confidence: "medium",
          detectedText: detectedCategory,
        },
      });
    }

    return NextResponse.json({
      success: true,
      data: {
        parentCategory: "Clothing",
        subCategory: normalizedCategory,
        confidence: "high",
        detectedText: detectedCategory,
      },
    });
  } catch (error) {
    logger.error("Category detection error:", error as Error, {
      component: "detect-category",
    });

    // If OpenAI fails, default to basic clothing category
    return NextResponse.json({
      success: true,
      data: {
        parentCategory: "Clothing",
        subCategory: "Tops",
        confidence: "low",
        error: "Detection failed, using default category",
      },
    });
  }
}
