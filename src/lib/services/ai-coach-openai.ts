/**
 * AI Coach OpenAI Service
 *
 * Handles chat interactions with AI coaches using OpenAI's API.
 * Uses the Chat Completions API with tool calling for coach-specific functionality.
 *
 * Key Features:
 * - Personalized system prompts per store
 * - Tool calling for store context retrieval
 * - Conversation history management
 * - Token tracking and usage limits
 */

import OpenAI from "openai";
import { logger } from "@/lib/logger";
import {
  CoachKey,
  AICoachMessage,
  ToolEvent,
  ChatResponse,
  FileAttachment,
} from "@/types/ai-coaches";
import {
  requireCoachInstance,
  requireConversation,
  createConversation,
  addMessage,
  getConversationMessages,
  updateConversationTitle,
  getConversationSummary,
  updateConversationSummary,
  StoredFileMetadata,
} from "./ai-coach-service";

// ============================================================================
// Conversation History Configuration
// ============================================================================

/**
 * Hybrid conversation history limits
 * - Keep last N messages in full for immediate context
 * - Summarize older messages (up to M total) for long-term context
 * - Drop anything older than M messages
 */
const MAX_RECENT_MESSAGES = 10; // Full messages to keep
const MAX_SUMMARIZE_MESSAGES = 50; // Max messages to include in summary
const SUMMARY_SYSTEM_PROMPT = `You are a conversation summarizer. Create a concise summary of the conversation history that captures:
1. Key topics discussed
2. Important decisions or recommendations made
3. Any ongoing issues or concerns
4. Relevant context for future conversations

Keep the summary under 500 words. Focus on information that would help continue the conversation naturally.`;

// ============================================================================
// OpenAI Client
// ============================================================================

const getOpenAIApiKey = (): string => {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY environment variable is required");
  }
  return apiKey;
};

const openai = new OpenAI({
  apiKey: getOpenAIApiKey(),
});

// ============================================================================
// Tool Definitions
// ============================================================================

/**
 * Tool definitions for AI coaches
 * These allow the coach to request additional context about the store
 */
const COACH_TOOLS: OpenAI.Chat.Completions.ChatCompletionTool[] = [
  {
    type: "function",
    function: {
      name: "get_store_context",
      description:
        "Get additional context about the boutique including recent performance, inventory status, and customer trends. Use this when you need more information to give specific advice.",
      parameters: {
        type: "object",
        properties: {
          context_type: {
            type: "string",
            enum: ["performance", "inventory", "customers", "recent_activity"],
            description: "The type of context to retrieve",
          },
          time_period: {
            type: "string",
            enum: ["today", "this_week", "this_month", "last_30_days"],
            description: "The time period for the data",
          },
        },
        required: ["context_type"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_policy_details",
      description:
        "Get detailed policy information for the store. Use this when you need to provide accurate policy information in customer service responses.",
      parameters: {
        type: "object",
        properties: {
          policy_type: {
            type: "string",
            enum: ["return", "shipping", "exchange", "warranty"],
            description: "The type of policy to retrieve",
          },
        },
        required: ["policy_type"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "suggest_action",
      description:
        "Suggest a specific action for the owner to take. Use this to create actionable recommendations that can be tracked.",
      parameters: {
        type: "object",
        properties: {
          action_type: {
            type: "string",
            enum: [
              "create_promo",
              "update_inventory",
              "respond_customer",
              "schedule_task",
              "review_metrics",
            ],
            description: "The type of action to suggest",
          },
          priority: {
            type: "string",
            enum: ["high", "medium", "low"],
            description: "Priority level of the action",
          },
          description: {
            type: "string",
            description: "Brief description of the action to take",
          },
          estimated_time: {
            type: "string",
            description:
              "Estimated time to complete (e.g., '10 minutes', '1 hour')",
          },
        },
        required: ["action_type", "description"],
      },
    },
  },
];

// ============================================================================
// Tool Handlers
// ============================================================================

/**
 * Handle tool calls from the AI coach
 * Returns mock/placeholder data for now - can be extended to pull real data
 */
async function handleToolCall(
  storeId: string,
  toolName: string,
  toolArgs: Record<string, unknown>,
): Promise<Record<string, unknown>> {
  logger.debug("Handling tool call", {
    component: "ai-coach-openai",
    storeId,
    toolName,
    toolArgs,
  });

  switch (toolName) {
    case "get_store_context": {
      // Placeholder - in production, this would query actual store data
      return {
        success: true,
        context_type: toolArgs.context_type,
        time_period: toolArgs.time_period || "this_week",
        data: {
          summary:
            "Store context retrieval is a planned feature. For now, please share any specific metrics or data you'd like me to help analyze.",
          note: "This feature will integrate with your store analytics in a future update.",
        },
      };
    }

    case "get_policy_details": {
      // Placeholder - would pull from business_profiles or policy tables
      return {
        success: true,
        policy_type: toolArgs.policy_type,
        data: {
          summary:
            "Please refer to the policy summaries provided in my system context. If you need to update these, visit your brand profile settings.",
        },
      };
    }

    case "suggest_action": {
      // Log the suggestion for potential tracking
      return {
        success: true,
        action_recorded: true,
        action: {
          type: toolArgs.action_type,
          priority: toolArgs.priority || "medium",
          description: toolArgs.description,
          estimated_time: toolArgs.estimated_time,
        },
        message:
          "Action suggestion recorded. Would you like me to help you get started?",
      };
    }

    default:
      return {
        success: false,
        error: `Unknown tool: ${toolName}`,
      };
  }
}

// ============================================================================
// Conversation History Management
// ============================================================================

/**
 * Build optimized message history using hybrid approach:
 * - Last N messages in full
 * - Summary of older messages (if any) - cached when possible
 * - Drop anything beyond M messages
 */
async function buildOptimizedHistory(
  messages: AICoachMessage[],
  conversationId: string,
): Promise<{
  recentMessages: AICoachMessage[];
  contextSummary: string | null;
}> {
  // Filter to only user and assistant messages (skip tool messages for history)
  const chatMessages = messages.filter(
    (m) => m.role === "user" || m.role === "assistant",
  );

  // If we have few enough messages, no optimization needed
  if (chatMessages.length <= MAX_RECENT_MESSAGES) {
    return {
      recentMessages: chatMessages,
      contextSummary: null,
    };
  }

  // Split messages: recent (full) and older (to summarize)
  const recentMessages = chatMessages.slice(-MAX_RECENT_MESSAGES);
  const olderMessagesCount = Math.min(
    chatMessages.length - MAX_RECENT_MESSAGES,
    MAX_SUMMARIZE_MESSAGES - MAX_RECENT_MESSAGES,
  );
  const olderMessages = chatMessages.slice(
    Math.max(0, chatMessages.length - MAX_SUMMARIZE_MESSAGES),
    chatMessages.length - MAX_RECENT_MESSAGES,
  );

  // Check for cached summary
  let contextSummary: string | null = null;
  if (olderMessages.length > 0) {
    // Try to use cached summary if it covers the same message count
    const cached = await getConversationSummary(conversationId);

    if (cached.summary && cached.messageCount === olderMessagesCount) {
      // Cache hit - use existing summary
      contextSummary = cached.summary;
      logger.debug("Using cached conversation summary", {
        component: "ai-coach-openai",
        conversationId,
        cachedMessageCount: cached.messageCount,
      });
    } else {
      // Cache miss or stale - regenerate summary
      contextSummary = await summarizeMessages(olderMessages);

      // Cache the new summary (async, don't await)
      if (contextSummary) {
        updateConversationSummary(
          conversationId,
          contextSummary,
          olderMessagesCount,
        ).catch((err) => {
          logger.warn("Failed to cache conversation summary", {
            component: "ai-coach-openai",
            conversationId,
            error: (err as Error).message,
          });
        });
      }

      logger.debug("Generated new conversation summary", {
        component: "ai-coach-openai",
        conversationId,
        olderMessageCount: olderMessages.length,
        summaryLength: contextSummary?.length || 0,
        previousCachedCount: cached.messageCount,
      });
    }
  }

  return {
    recentMessages,
    contextSummary,
  };
}

/**
 * Generate a summary of older messages to preserve context
 */
async function summarizeMessages(messages: AICoachMessage[]): Promise<string> {
  // Format messages for summarization
  const conversationText = messages
    .map((m) => `${m.role === "user" ? "User" : "Assistant"}: ${m.content}`)
    .join("\n\n");

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: SUMMARY_SYSTEM_PROMPT,
        },
        {
          role: "user",
          content: `Please summarize this conversation:\n\n${conversationText}`,
        },
      ],
      max_tokens: 500,
      temperature: 0.3, // Lower temperature for more consistent summaries
    });

    return response.choices[0]?.message?.content?.trim() || "";
  } catch (error) {
    logger.warn("Failed to generate conversation summary", {
      component: "ai-coach-openai",
      error: (error as Error).message,
    });
    // Return empty string on failure - we'll still have recent messages
    return "";
  }
}

// ============================================================================
// Chat Function
// ============================================================================

/**
 * Chat with an AI coach
 *
 * @param storeId - The store ID (shops.id)
 * @param coachKey - Which coach to chat with
 * @param userMessage - The user's text message (without file content)
 * @param conversationId - Optional existing conversation ID
 * @param fileAttachments - Optional file attachments with extracted content
 * @returns Chat response with assistant message and any tool events
 */
export async function chat(
  storeId: string,
  coachKey: CoachKey,
  userMessage: string,
  conversationId?: string,
  fileAttachments?: FileAttachment[],
): Promise<ChatResponse> {
  logger.info("Starting coach chat", {
    component: "ai-coach-openai",
    storeId,
    coachKey,
    hasConversationId: !!conversationId,
  });

  // Get the rendered coach instance
  const coachInstance = await requireCoachInstance(storeId, coachKey);

  // Get or create conversation
  let conversation;
  let messages: AICoachMessage[] = [];

  if (conversationId) {
    conversation = await requireConversation(storeId, conversationId);
    messages = await getConversationMessages(conversationId);
  } else {
    conversation = await createConversation(storeId, coachKey);
  }

  // Build optimized message history (hybrid approach)
  const { recentMessages, contextSummary } = await buildOptimizedHistory(
    messages,
    conversation.id,
  );

  // Build message array for OpenAI
  const openaiMessages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
    {
      role: "system",
      content: coachInstance.rendered_system_prompt,
    },
  ];

  // Add context summary if we have older messages summarized
  if (contextSummary) {
    openaiMessages.push({
      role: "system",
      content: `[Previous Conversation Context]\n${contextSummary}\n\n[Recent Messages Follow]`,
    });
    logger.debug("Added conversation context summary", {
      component: "ai-coach-openai",
      conversationId: conversation.id,
      totalMessages: messages.length,
      recentMessages: recentMessages.length,
    });
  }

  // Add recent conversation history (last N messages in full)
  // For user messages with file attachments, add a note about attached files
  for (const msg of recentMessages) {
    if (msg.role === "user") {
      // Check if message has file attachments (stored as metadata)
      const fileAttachmentsMeta = msg.file_attachments as
        | StoredFileMetadata[]
        | null;
      let messageContent = msg.content;

      // Add file reference notation for historical messages (no full content)
      if (fileAttachmentsMeta && fileAttachmentsMeta.length > 0) {
        const fileList = fileAttachmentsMeta
          .map((f) => `${f.name} (${f.category})`)
          .join(", ");
        const fileNote = `\n\n[Previously attached files: ${fileList}]`;
        messageContent = messageContent
          ? messageContent + fileNote
          : `[Files attached: ${fileList}]`;
      }

      openaiMessages.push({
        role: "user",
        content: messageContent,
      });
    } else if (msg.role === "assistant") {
      openaiMessages.push({
        role: "assistant",
        content: msg.content,
      });
    }
  }

  // Build message content for OpenAI (includes full file content for current turn)
  let messageContentForOpenAI = userMessage;
  if (fileAttachments && fileAttachments.length > 0) {
    const fileContexts = fileAttachments.map((att) => {
      let context = `[Attached file: ${att.name} (${att.category})]`;

      // Include extracted text content for text-based files
      if (att.extractedText) {
        const truncatedText =
          att.extractedText.length > 5000
            ? att.extractedText.substring(0, 5000) + "... (truncated)"
            : att.extractedText;
        context += `\n\nFile contents:\n\`\`\`\n${truncatedText}\n\`\`\``;
      }

      return context;
    });

    const fileContext = fileContexts.join("\n\n");
    messageContentForOpenAI = userMessage
      ? `${userMessage}\n\n---\n${fileContext}`
      : `Please review the following attached file(s):\n\n${fileContext}`;
  }

  // Add the new user message to OpenAI (with full file content)
  openaiMessages.push({
    role: "user",
    content: messageContentForOpenAI,
  });

  // Save user message to database (text only, with file metadata)
  // The file content is NOT stored - only metadata for reference
  const storedFileMetadata: StoredFileMetadata[] | undefined =
    fileAttachments?.map((att) => ({
      id: att.id,
      name: att.name,
      category: att.category,
      size: att.size,
      url: att.url,
    }));

  await addMessage(conversation.id, "user", userMessage, {
    fileAttachments: storedFileMetadata,
  });

  // Call OpenAI
  const toolEvents: ToolEvent[] = [];
  let assistantMessage = "";
  let totalInputTokens = 0;
  let totalOutputTokens = 0;

  try {
    // Initial completion request
    let response = await openai.chat.completions.create({
      model: "gpt-4o-mini", // Cost-effective for chat
      messages: openaiMessages,
      tools: COACH_TOOLS,
      tool_choice: "auto",
      max_tokens: 1000,
      temperature: 0.7,
    });

    totalInputTokens += response.usage?.prompt_tokens || 0;
    totalOutputTokens += response.usage?.completion_tokens || 0;

    // Handle tool calls in a loop (max 3 iterations for safety)
    let iterations = 0;
    const maxIterations = 3;

    while (iterations < maxIterations) {
      iterations++;
      const choice = response.choices[0];

      if (choice.finish_reason === "tool_calls" && choice.message.tool_calls) {
        // Process tool calls
        const toolCallMessages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] =
          [];

        // Add assistant message with tool calls
        toolCallMessages.push({
          role: "assistant",
          content: choice.message.content,
          tool_calls: choice.message.tool_calls,
        });

        // Process each tool call
        for (const toolCall of choice.message.tool_calls) {
          // Handle both v4 and v5 OpenAI SDK formats
          const functionData =
            "function" in toolCall
              ? toolCall.function
              : {
                  name: (toolCall as { name?: string }).name || "",
                  arguments: "{}",
                };

          const toolArgs = JSON.parse(functionData.arguments || "{}");
          const toolName = functionData.name || "";

          const toolResult = await handleToolCall(storeId, toolName, toolArgs);

          toolEvents.push({
            tool_name: toolName,
            payload: toolArgs,
            result: toolResult,
          });

          // Add tool result message
          toolCallMessages.push({
            role: "tool",
            tool_call_id: toolCall.id,
            content: JSON.stringify(toolResult),
          });

          // Save tool call to database
          await addMessage(
            conversation.id,
            "tool",
            JSON.stringify(toolResult),
            {
              toolName: toolName,
              toolPayload: toolArgs,
            },
          );
        }

        // Continue conversation with tool results
        response = await openai.chat.completions.create({
          model: "gpt-4o-mini",
          messages: [...openaiMessages, ...toolCallMessages],
          tools: COACH_TOOLS,
          tool_choice: "auto",
          max_tokens: 1000,
          temperature: 0.7,
        });

        totalInputTokens += response.usage?.prompt_tokens || 0;
        totalOutputTokens += response.usage?.completion_tokens || 0;
      } else {
        // No more tool calls, get final message
        assistantMessage = choice.message.content || "";
        break;
      }
    }

    // Save assistant message to database
    await addMessage(conversation.id, "assistant", assistantMessage, {
      tokensUsed: totalInputTokens + totalOutputTokens,
    });

    // Auto-generate conversation title from first exchange
    if (messages.length === 0 && assistantMessage) {
      const title = await generateConversationTitle(
        userMessage,
        assistantMessage,
      );
      await updateConversationTitle(storeId, conversation.id, title);
    }

    logger.info("Completed coach chat", {
      component: "ai-coach-openai",
      storeId,
      coachKey,
      conversationId: conversation.id,
      toolCalls: toolEvents.length,
      inputTokens: totalInputTokens,
      outputTokens: totalOutputTokens,
      totalMessages: messages.length,
      recentMessagesUsed: recentMessages.length,
      hasSummary: !!contextSummary,
    });

    return {
      conversationId: conversation.id,
      assistantMessage,
      toolEvents,
      usage: {
        input_tokens: totalInputTokens,
        output_tokens: totalOutputTokens,
      },
    };
  } catch (error) {
    logger.error("Chat error", error as Error, {
      component: "ai-coach-openai",
      storeId,
      coachKey,
    });

    // Save error message to conversation
    await addMessage(
      conversation.id,
      "assistant",
      "I apologize, but I encountered an error processing your request. Please try again.",
    );

    throw error;
  }
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Generate a short title for a conversation based on the first exchange
 */
async function generateConversationTitle(
  userMessage: string,
  assistantMessage: string,
): Promise<string> {
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content:
            "Generate a very short title (3-6 words) for this conversation. No quotes or punctuation. Just the title.",
        },
        {
          role: "user",
          content: `User: ${userMessage.substring(0, 200)}\n\nAssistant: ${assistantMessage.substring(0, 200)}`,
        },
      ],
      max_tokens: 20,
      temperature: 0.7,
    });

    return response.choices[0]?.message?.content?.trim() || "New Conversation";
  } catch (error) {
    logger.warn("Failed to generate conversation title", {
      component: "ai-coach-openai",
      error: (error as Error).message,
    });
    return "New Conversation";
  }
}

/**
 * Get conversation summary for display (brief text description)
 */
export async function getConversationDisplaySummary(
  conversationId: string,
): Promise<string> {
  const messages = await getConversationMessages(conversationId);

  if (messages.length === 0) {
    return "No messages yet";
  }

  // Get last user message as summary
  const lastUserMessage = messages.filter((m) => m.role === "user").pop();

  if (lastUserMessage) {
    return lastUserMessage.content.length > 100
      ? lastUserMessage.content.substring(0, 100) + "..."
      : lastUserMessage.content;
  }

  return "Conversation started";
}

/**
 * Estimate token count for a message (rough approximation)
 * Uses ~4 characters per token as a simple heuristic
 */
export function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

/**
 * Calculate cost for a chat interaction
 * Based on GPT-4o-mini pricing: $0.15/1M input, $0.60/1M output
 */
export function calculateChatCost(
  inputTokens: number,
  outputTokens: number,
): number {
  const inputCost = inputTokens * 0.00000015;
  const outputCost = outputTokens * 0.0000006;
  return parseFloat((inputCost + outputCost).toFixed(8));
}
