/**
 * AI Coaches API - Policy URL Summarizer
 *
 * POST /api/ai-coaches/summarize-policy
 * Fetches a policy page from a URL and summarizes it using AI
 *
 * This allows users to paste their shipping/return policy URLs
 * and automatically extract a concise summary for AI coaches.
 */

import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { getUserId } from "@/lib/auth/content-center-auth";
import { logger } from "@/lib/logger";
import { hasPremiumAccess } from "@/lib/services/ai-coach-service";
import type { ApiResponse } from "@/types/ai-coaches";

export const maxDuration = 60; // Allow more time for fetching external URLs
export const dynamic = "force-dynamic";

interface SummarizePolicyRequest {
  url: string;
  policy_type: "shipping" | "return";
}

interface SummarizePolicyData {
  summary: string;
  source_url: string;
  policy_type: "shipping" | "return";
  fetched_at: string;
}

// Initialize OpenAI client
const getOpenAI = () => {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY environment variable is required");
  }
  return new OpenAI({ apiKey });
};

/**
 * Extract text content from HTML
 * Simple extraction that handles common policy page structures
 */
function extractTextFromHtml(html: string): string {
  // Remove script and style tags
  let text = html.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "");
  text = text.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "");
  text = text.replace(/<noscript[^>]*>[\s\S]*?<\/noscript>/gi, "");

  // Remove HTML comments
  text = text.replace(/<!--[\s\S]*?-->/g, "");

  // Convert common block elements to line breaks
  text = text.replace(/<(br|p|div|h[1-6]|li|tr)[^>]*>/gi, "\n");

  // Remove all remaining HTML tags
  text = text.replace(/<[^>]+>/g, " ");

  // Decode common HTML entities
  text = text.replace(/&nbsp;/g, " ");
  text = text.replace(/&amp;/g, "&");
  text = text.replace(/&lt;/g, "<");
  text = text.replace(/&gt;/g, ">");
  text = text.replace(/&quot;/g, '"');
  text = text.replace(/&#39;/g, "'");
  text = text.replace(/&rdquo;/g, '"');
  text = text.replace(/&ldquo;/g, '"');
  text = text.replace(/&rsquo;/g, "'");
  text = text.replace(/&lsquo;/g, "'");
  text = text.replace(/&mdash;/g, "—");
  text = text.replace(/&ndash;/g, "–");
  text = text.replace(/&#\d+;/g, " ");

  // Clean up whitespace
  text = text.replace(/\s+/g, " ");
  text = text.replace(/\n\s+/g, "\n");
  text = text.replace(/\n+/g, "\n");

  return text.trim();
}

/**
 * Fetch and extract content from a policy URL
 */
async function fetchPolicyContent(url: string): Promise<string> {
  // Validate URL
  let parsedUrl: URL;
  try {
    parsedUrl = new URL(url);
  } catch {
    throw new Error("Invalid URL format");
  }

  // Only allow http/https
  if (!["http:", "https:"].includes(parsedUrl.protocol)) {
    throw new Error("Only HTTP and HTTPS URLs are supported");
  }

  // Fetch the page
  const response = await fetch(url, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (compatible; ThunderText/1.0; +https://thundertext.com)",
      Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      "Accept-Language": "en-US,en;q=0.5",
    },
    redirect: "follow",
  });

  if (!response.ok) {
    throw new Error(
      `Failed to fetch URL: ${response.status} ${response.statusText}`,
    );
  }

  const contentType = response.headers.get("content-type") || "";
  if (
    !contentType.includes("text/html") &&
    !contentType.includes("text/plain")
  ) {
    throw new Error("URL must return HTML or plain text content");
  }

  const html = await response.text();
  const text = extractTextFromHtml(html);

  // Limit content length for API processing (about 10k characters)
  if (text.length > 10000) {
    return text.substring(0, 10000) + "...";
  }

  return text;
}

/**
 * Summarize policy content using OpenAI
 */
async function summarizePolicyContent(
  content: string,
  policyType: "shipping" | "return",
): Promise<string> {
  const openai = getOpenAI();

  const policyTypeLabel =
    policyType === "shipping" ? "Shipping Policy" : "Return/Refund Policy";

  const response = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      {
        role: "system",
        content: `You are a policy summarizer for e-commerce stores. Your job is to extract the key points from a ${policyTypeLabel} page and create a concise summary that a customer service AI can use to answer customer questions accurately.

Extract and summarize:
${
  policyType === "shipping"
    ? `
- Shipping methods and carriers
- Delivery timeframes (standard, express, etc.)
- Free shipping thresholds
- Shipping costs/rates
- Geographic restrictions
- Processing times
- Order tracking information
- International shipping details (if any)`
    : `
- Return window (e.g., 30 days)
- Condition requirements (unworn, tags attached, etc.)
- Refund method (original payment, store credit)
- Exchange options
- Items that cannot be returned
- Restocking fees (if any)
- Who pays return shipping
- Process for initiating returns`
}

Output format: A concise paragraph (2-4 sentences max) that captures the essential policy details a customer service rep needs to know. Do not include generic statements or marketing language. Focus on specific numbers, timeframes, and conditions.

If the content doesn't appear to be a ${policyTypeLabel}, or if key information is missing, indicate what's missing in the summary.`,
      },
      {
        role: "user",
        content: `Please summarize this ${policyTypeLabel} content:\n\n${content}`,
      },
    ],
    max_tokens: 300,
    temperature: 0.3, // Lower temperature for more consistent summaries
  });

  const summary = response.choices[0]?.message?.content?.trim();

  if (!summary) {
    throw new Error("Failed to generate summary");
  }

  return summary;
}

/**
 * POST /api/ai-coaches/summarize-policy
 * Fetch a policy URL and return an AI-generated summary
 */
export async function POST(
  request: NextRequest,
): Promise<NextResponse<ApiResponse<SummarizePolicyData>>> {
  try {
    const userId = await getUserId(request);

    if (!userId) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 },
      );
    }

    // Check premium access
    const isPremium = await hasPremiumAccess(userId);
    if (!isPremium) {
      return NextResponse.json(
        {
          success: false,
          error: "AI Coaches require a Pro plan",
        },
        { status: 403 },
      );
    }

    // Parse request body
    const body: SummarizePolicyRequest = await request.json();

    // Validate required fields
    if (!body.url) {
      return NextResponse.json(
        { success: false, error: "URL is required" },
        { status: 400 },
      );
    }

    if (
      !body.policy_type ||
      !["shipping", "return"].includes(body.policy_type)
    ) {
      return NextResponse.json(
        { success: false, error: "policy_type must be 'shipping' or 'return'" },
        { status: 400 },
      );
    }

    logger.info("Fetching policy URL for summarization", {
      component: "ai-coaches",
      storeId: userId,
      url: body.url,
      policyType: body.policy_type,
    });

    // Fetch the policy page content
    let content: string;
    try {
      content = await fetchPolicyContent(body.url);
    } catch (fetchError) {
      const errorMessage =
        fetchError instanceof Error
          ? fetchError.message
          : "Failed to fetch URL";
      logger.warn("Failed to fetch policy URL", {
        component: "ai-coaches",
        storeId: userId,
        url: body.url,
        error: errorMessage,
      });
      return NextResponse.json(
        { success: false, error: `Could not fetch URL: ${errorMessage}` },
        { status: 400 },
      );
    }

    // Check if we got meaningful content
    if (content.length < 100) {
      return NextResponse.json(
        {
          success: false,
          error: "The URL did not return enough content to summarize",
        },
        { status: 400 },
      );
    }

    // Summarize the content
    let summary: string;
    try {
      summary = await summarizePolicyContent(content, body.policy_type);
    } catch (aiError) {
      const errorMessage =
        aiError instanceof Error ? aiError.message : "Failed to summarize";
      logger.error("Failed to summarize policy content", aiError as Error, {
        component: "ai-coaches",
        storeId: userId,
      });
      return NextResponse.json(
        {
          success: false,
          error: `Could not summarize content: ${errorMessage}`,
        },
        { status: 500 },
      );
    }

    logger.info("Successfully summarized policy", {
      component: "ai-coaches",
      storeId: userId,
      policyType: body.policy_type,
      summaryLength: summary.length,
    });

    return NextResponse.json({
      success: true,
      data: {
        summary,
        source_url: body.url,
        policy_type: body.policy_type,
        fetched_at: new Date().toISOString(),
      },
    });
  } catch (error) {
    logger.error("Error in summarize-policy endpoint", error as Error, {
      component: "ai-coaches",
    });
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 },
    );
  }
}
