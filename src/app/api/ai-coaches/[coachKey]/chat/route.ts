/**
 * AI Coaches API - Chat
 *
 * POST /api/ai-coaches/[coachKey]/chat
 * Send a message to a coach and receive a response
 */

import { NextRequest, NextResponse } from "next/server";
import { getUserId } from "@/lib/auth/content-center-auth";
import { logger } from "@/lib/logger";
import { hasPremiumAccess } from "@/lib/services/ai-coach-service";
import { chat } from "@/lib/services/ai-coach-openai";
import { COACH_KEYS, CoachKey } from "@/types/ai-coaches";
import type {
  ApiResponse,
  ChatRequest,
  ChatResponse,
  FileAttachment,
} from "@/types/ai-coaches";

export const maxDuration = 60; // Chat may take longer
export const dynamic = "force-dynamic";

/**
 * POST /api/ai-coaches/[coachKey]/chat
 * Send a message to a coach
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ coachKey: string }> },
): Promise<NextResponse<ApiResponse<ChatResponse>>> {
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
          error: "AI Coaches require a Professional or Enterprise plan",
        },
        { status: 403 },
      );
    }

    const { coachKey } = await params;

    // Validate coach key
    if (!COACH_KEYS.includes(coachKey as CoachKey)) {
      return NextResponse.json(
        { success: false, error: `Invalid coach key: ${coachKey}` },
        { status: 400 },
      );
    }

    // Parse request body
    const body: ChatRequest & { attachments?: FileAttachment[] } =
      await request.json();

    // Allow empty message if there are attachments
    const hasAttachments = body.attachments && body.attachments.length > 0;
    const hasMessage =
      body.message &&
      typeof body.message === "string" &&
      body.message.trim().length > 0;

    if (!hasMessage && !hasAttachments) {
      return NextResponse.json(
        { success: false, error: "Message or attachments required" },
        { status: 400 },
      );
    }

    // Trim and validate message length
    const message = body.message?.trim() || "";

    if (message.length > 10000) {
      return NextResponse.json(
        { success: false, error: "Message too long (max 10000 characters)" },
        { status: 400 },
      );
    }

    // Call the chat service with message and attachments separately
    // The chat service handles:
    // - Sending full file content to OpenAI for the current turn
    // - Storing only file metadata (not content) in the database
    const chatResponse = await chat(
      userId,
      coachKey as CoachKey,
      message,
      body.conversationId,
      hasAttachments ? body.attachments : undefined,
    );

    logger.info("Chat completed", {
      component: "ai-coaches",
      storeId: userId,
      coachKey,
      conversationId: chatResponse.conversationId,
      toolCalls: chatResponse.toolEvents.length,
      inputTokens: chatResponse.usage.input_tokens,
      outputTokens: chatResponse.usage.output_tokens,
      attachmentCount: body.attachments?.length || 0,
    });

    return NextResponse.json({
      success: true,
      data: chatResponse,
    });
  } catch (error) {
    const err = error as Error;

    // Handle specific error types
    if (err.message?.includes("Profile incomplete")) {
      return NextResponse.json(
        {
          success: false,
          error: err.message,
          code: "PROFILE_INCOMPLETE",
        },
        { status: 400 },
      );
    }

    if (err.message?.includes("Conversation not found")) {
      return NextResponse.json(
        { success: false, error: err.message, code: "CONVERSATION_NOT_FOUND" },
        { status: 404 },
      );
    }

    logger.error("Chat error", err, {
      component: "ai-coaches",
    });
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 },
    );
  }
}
