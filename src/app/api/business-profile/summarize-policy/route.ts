import { NextRequest, NextResponse } from "next/server";
import { getUserId } from "@/lib/auth/content-center-auth";
import { logger } from "@/lib/logger";
import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

interface SummarizeRequest {
  url: string;
  type: "return" | "shipping";
}

interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

/**
 * Fetch and extract text content from a URL
 */
async function fetchPageContent(url: string): Promise<string> {
  const response = await fetch(url, {
    headers: {
      "User-Agent": "Mozilla/5.0 (compatible; ThunderText/1.0; +https://thundertext.com)",
      "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    },
    signal: AbortSignal.timeout(10000), // 10 second timeout
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch page: ${response.status} ${response.statusText}`);
  }

  const html = await response.text();

  // Extract text content from HTML (basic extraction)
  // Remove script and style tags
  let text = html
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
    .replace(/<nav[^>]*>[\s\S]*?<\/nav>/gi, "")
    .replace(/<header[^>]*>[\s\S]*?<\/header>/gi, "")
    .replace(/<footer[^>]*>[\s\S]*?<\/footer>/gi, "");

  // Remove HTML tags but keep text
  text = text.replace(/<[^>]+>/g, " ");

  // Clean up whitespace
  text = text
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, " ")
    .trim();

  // Limit text length for API call
  if (text.length > 15000) {
    text = text.substring(0, 15000) + "...";
  }

  return text;
}

/**
 * POST /api/business-profile/summarize-policy
 * Fetch a policy URL and summarize it using AI
 */
export async function POST(
  request: NextRequest
): Promise<NextResponse<ApiResponse<{ summary: string }>>> {
  try {
    const userId = await getUserId(request);

    if (!userId) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const body: SummarizeRequest = await request.json();
    const { url, type } = body;

    if (!url || !type) {
      return NextResponse.json(
        { success: false, error: "URL and type are required" },
        { status: 400 }
      );
    }

    // Validate URL
    try {
      new URL(url);
    } catch {
      return NextResponse.json(
        { success: false, error: "Invalid URL format" },
        { status: 400 }
      );
    }

    logger.info("Fetching policy page for summarization", {
      component: "summarize-policy",
      url,
      type,
    });

    // Fetch the page content
    let pageContent: string;
    try {
      pageContent = await fetchPageContent(url);
    } catch (error) {
      logger.error("Failed to fetch policy page:", error as Error, {
        component: "summarize-policy",
        url,
      });
      return NextResponse.json(
        {
          success: false,
          error: "Could not fetch the policy page. Please check the URL and try again, or enter your policy details manually.",
        },
        { status: 400 }
      );
    }

    if (pageContent.length < 50) {
      return NextResponse.json(
        {
          success: false,
          error: "The page appears to have very little content. Please enter your policy details manually.",
        },
        { status: 400 }
      );
    }

    // Use OpenAI to summarize the policy
    const policyType = type === "return" ? "return/refund" : "shipping";
    const systemPrompt = `You are a helpful assistant that summarizes e-commerce store policies.
Extract and summarize the key points of this ${policyType} policy in 2-4 sentences.
Focus on the most important details customers would need to know:
${type === "return" ? "- Return window (how many days)\n- Conditions for returns (unworn, tags attached, etc.)\n- Refund method (original payment, store credit)\n- Any exceptions or final sale items" : "- Shipping costs (free shipping threshold, flat rate, etc.)\n- Processing time\n- Delivery timeframes\n- Any shipping restrictions or notes"}

Be concise but complete. Write in a natural, readable style.`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: systemPrompt },
        {
          role: "user",
          content: `Please summarize this ${policyType} policy:\n\n${pageContent}`,
        },
      ],
      temperature: 0.3,
      max_tokens: 300,
    });

    const summary = completion.choices[0]?.message?.content?.trim();

    if (!summary) {
      return NextResponse.json(
        {
          success: false,
          error: "Could not generate a summary. Please enter your policy details manually.",
        },
        { status: 500 }
      );
    }

    logger.info("Successfully summarized policy", {
      component: "summarize-policy",
      type,
      summaryLength: summary.length,
    });

    return NextResponse.json({
      success: true,
      data: { summary },
    });
  } catch (error) {
    logger.error("Error in POST /api/business-profile/summarize-policy:", error as Error, {
      component: "summarize-policy",
    });
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
