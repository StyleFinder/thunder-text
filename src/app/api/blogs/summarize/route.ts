import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/auth-options";
import { callChatCompletion } from "@/lib/services/openai-client";
import { withRateLimit, RATE_LIMITS } from "@/lib/middleware/rate-limit";
import { logger } from "@/lib/logger";
import type { SummarizeBlogResponse } from "@/types/blog-linking";

/**
 * System prompt for blog summarization
 * Focused on creating engaging 3-4 sentence summaries for product pages
 */
const SUMMARIZE_SYSTEM_PROMPT = `You are an expert content summarizer for e-commerce product pages.

Your task is to create a compelling 3-4 sentence summary of a blog post that will appear in a "Discover More" section on a product page.

Guidelines:
- Keep the summary between 3-4 sentences (40-70 words)
- Highlight the most valuable insights or tips from the blog
- Create curiosity that encourages clicking "Read more"
- Use engaging, benefit-focused language
- Match the tone of the original content
- Do not include promotional language or calls to action
- Focus on what the reader will learn or gain

Output only the summary text, no quotes or additional formatting.`;

/**
 * POST /api/blogs/summarize
 * Generate an AI summary (3-4 sentences) from blog content
 *
 * Request body:
 * - blogContent: string (required) - The full blog post HTML/text
 * - maxSentences: number (optional, default: 4) - Maximum sentences in summary
 */
export async function POST(
  request: NextRequest
): Promise<NextResponse<{ success: boolean; data?: SummarizeBlogResponse; error?: string }>> {
  try {
    // Authenticate user
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const userId = session.user.id;

    // Rate limiting - use WRITE since this consumes AI resources
    const rateLimitCheck = await withRateLimit(RATE_LIMITS.WRITE)(request, userId);
    if (rateLimitCheck) {
      return rateLimitCheck as NextResponse<{ success: boolean; data?: SummarizeBlogResponse; error?: string }>;
    }

    // Parse request body
    const body = await request.json();
    const { blogContent, maxSentences = 4 } = body;

    // Validate input
    if (!blogContent || typeof blogContent !== "string") {
      return NextResponse.json(
        { success: false, error: "blogContent is required" },
        { status: 400 }
      );
    }

    if (blogContent.length < 100) {
      return NextResponse.json(
        { success: false, error: "Blog content is too short to summarize (minimum 100 characters)" },
        { status: 400 }
      );
    }

    if (blogContent.length > 50000) {
      return NextResponse.json(
        { success: false, error: "Blog content is too long (maximum 50,000 characters)" },
        { status: 400 }
      );
    }

    // Strip HTML tags for cleaner summarization
    const plainTextContent = stripHtmlTags(blogContent);

    // Build the user prompt
    const userPrompt = `Please summarize the following blog post in ${maxSentences} sentences or fewer:

---
${plainTextContent}
---

Provide a concise, engaging summary that will make readers want to click "Read more".`;

    logger.debug("Generating blog summary", {
      component: "blogs-summarize",
      contentLength: plainTextContent.length,
      maxSentences,
    });

    // Call OpenAI for summarization
    const summary = await callChatCompletion(
      [
        { role: "system", content: SUMMARIZE_SYSTEM_PROMPT },
        { role: "user", content: userPrompt },
      ],
      {
        model: "gpt-4o-mini", // Cost-effective for summarization
        temperature: 0.5, // Lower temperature for more consistent summaries
        maxTokens: 200, // Summary should be short
        shopId: userId,
        operationType: "content_generation",
      }
    );

    // Clean up the summary
    const cleanSummary = summary.trim().replace(/^["']|["']$/g, "");

    // Count words
    const wordCount = cleanSummary.split(/\s+/).filter(Boolean).length;

    logger.info("Blog summary generated", {
      component: "blogs-summarize",
      wordCount,
      summaryLength: cleanSummary.length,
    });

    return NextResponse.json({
      success: true,
      data: {
        summary: cleanSummary,
        wordCount,
      },
    });
  } catch (error) {
    logger.error("Error in POST /api/blogs/summarize:", error as Error, {
      component: "blogs-summarize",
    });

    // Check for circuit breaker errors
    if (error instanceof Error && error.message.includes("circuit breaker")) {
      return NextResponse.json(
        { success: false, error: "AI service temporarily unavailable. Please try again later." },
        { status: 503 }
      );
    }

    return NextResponse.json(
      { success: false, error: "Failed to generate summary" },
      { status: 500 }
    );
  }
}

/**
 * Strip HTML tags from content for cleaner AI processing
 */
function stripHtmlTags(html: string): string {
  return html
    // Remove script and style tags with content (using non-greedy matching)
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
    // Remove HTML tags
    .replace(/<[^>]+>/g, " ")
    // Decode common HTML entities
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    // Clean up whitespace
    .replace(/\s+/g, " ")
    .trim();
}
