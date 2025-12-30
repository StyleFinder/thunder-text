"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ChatMessage } from "./ChatMessage";
import { FileUpload, FileList } from "./FileUpload";
import {
  ChatDisplayMessage,
  ChatResponse,
  CoachKey,
  COACH_METADATA,
  UploadedFile,
  FileAttachment,
} from "@/types/ai-coaches";
import {
  Send,
  RefreshCw,
  ArrowLeft,
  Briefcase,
  Target,
  Package,
  MessageCircle,
  ClipboardList,
  type LucideIcon,
} from "lucide-react";

// Map icon names to Lucide components
const COACH_ICONS: Record<string, LucideIcon> = {
  Briefcase,
  Target,
  Package,
  MessageCircle,
  ClipboardList,
};

interface ChatInterfaceProps {
  coachKey: CoachKey;
  shopDomain: string;
  conversationId?: string | null;
  initialStarters?: string[];
  onBack?: () => void;
  onConversationCreated?: (conversationId: string) => void;
}

export function ChatInterface({
  coachKey,
  shopDomain,
  conversationId: initialConversationId,
  initialStarters = [],
  onBack,
  onConversationCreated,
}: ChatInterfaceProps) {
  const [messages, setMessages] = useState<ChatDisplayMessage[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [conversationId, setConversationId] = useState<string | null>(
    initialConversationId ?? null,
  );
  const [attachedFiles, setAttachedFiles] = useState<UploadedFile[]>([]);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // eslint-disable-next-line security/detect-object-injection
  const metadata = COACH_METADATA[coachKey];

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Focus textarea on mount
  useEffect(() => {
    textareaRef.current?.focus();
  }, []);

  const sendMessage = useCallback(
    async (messageText: string, files?: UploadedFile[]) => {
      // Check if we have message text OR files to send
      const hasMessage = messageText.trim().length > 0;
      const hasFiles =
        files && files.length > 0 && files.some((f) => f.status === "ready");

      if ((!hasMessage && !hasFiles) || isLoading) return;

      // Get ready file attachments
      const readyAttachments: FileAttachment[] =
        files
          ?.filter((f) => f.status === "ready" && f.attachment)
          .map((f) => f.attachment!) || [];

      const userMessage: ChatDisplayMessage = {
        id: Date.now().toString(),
        role: "user",
        content: messageText.trim(),
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, userMessage]);
      setInput("");
      setAttachedFiles([]); // Clear files after sending
      setIsLoading(true);
      setError(null);

      // Add placeholder assistant message for streaming effect
      const assistantPlaceholderId = (Date.now() + 1).toString();
      setMessages((prev) => [
        ...prev,
        {
          id: assistantPlaceholderId,
          role: "assistant",
          content: "",
          timestamp: new Date(),
          isStreaming: true,
        },
      ]);

      try {
        const response = await fetch(`/api/ai-coaches/${coachKey}/chat`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${shopDomain}`,
          },
          body: JSON.stringify({
            conversationId: conversationId,
            message: messageText.trim(),
            attachments:
              readyAttachments.length > 0 ? readyAttachments : undefined,
            metadata: {
              uiMode: "chat",
              source: "web",
            },
          }),
        });

        const data = await response.json();

        if (!response.ok || !data.success) {
          throw new Error(data.error || "Failed to send message");
        }

        const chatResponse: ChatResponse = data.data;

        // Update conversation ID if new
        if (!conversationId && chatResponse.conversationId) {
          setConversationId(chatResponse.conversationId);
          onConversationCreated?.(chatResponse.conversationId);
        }

        // Replace placeholder with actual response
        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === assistantPlaceholderId
              ? {
                  ...msg,
                  content: chatResponse.assistantMessage,
                  isStreaming: false,
                  toolEvents: chatResponse.toolEvents,
                }
              : msg,
          ),
        );
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "An error occurred";
        setError(errorMessage);

        // Remove placeholder on error
        setMessages((prev) =>
          prev.filter((msg) => msg.id !== assistantPlaceholderId),
        );
      } finally {
        setIsLoading(false);
      }
    },
    [coachKey, shopDomain, conversationId, isLoading, onConversationCreated],
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sendMessage(input, attachedFiles);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input, attachedFiles);
    }
  };

  const handleQuickAction = (starter: string) => {
    sendMessage(starter);
  };

  return (
    <div className="flex flex-col h-full" style={{ minHeight: "600px" }}>
      {/* Header */}
      <div
        className="flex items-center"
        style={{
          padding: "16px 24px",
          borderBottom: "1px solid #e5e7eb",
          background: "#ffffff",
          gap: "16px",
        }}
      >
        {onBack && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onBack}
            style={{ padding: "8px" }}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
        )}
        {(() => {
          const IconComponent = COACH_ICONS[metadata.icon];
          return IconComponent ? (
            <div
              style={{
                width: "48px",
                height: "48px",
                borderRadius: "12px",
                background: "#e0f2fe",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <IconComponent
                style={{ width: "24px", height: "24px", color: "#0066cc" }}
              />
            </div>
          ) : null;
        })()}
        <div>
          <h2
            style={{
              fontSize: "18px",
              fontWeight: 700,
              color: "#003366",
              fontFamily:
                'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
              margin: 0,
            }}
          >
            {metadata.name}
          </h2>
          <p
            style={{
              fontSize: "13px",
              color: "#6b7280",
              fontFamily:
                'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
              margin: 0,
            }}
          >
            {metadata.description}
          </p>
        </div>
      </div>

      {/* Messages Area */}
      <div
        className="flex-1 overflow-y-auto"
        style={{
          padding: "24px",
          background: "#fafaf9",
        }}
      >
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full">
            <div
              style={{
                textAlign: "center",
                maxWidth: "400px",
              }}
            >
              {(() => {
                const IconComponent = COACH_ICONS[metadata.icon];
                return IconComponent ? (
                  <div
                    style={{
                      width: "72px",
                      height: "72px",
                      borderRadius: "16px",
                      background: "#e0f2fe",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      margin: "0 auto 16px",
                    }}
                  >
                    <IconComponent
                      style={{
                        width: "36px",
                        height: "36px",
                        color: "#0066cc",
                      }}
                    />
                  </div>
                ) : null;
              })()}
              <h3
                style={{
                  fontSize: "20px",
                  fontWeight: 600,
                  color: "#003366",
                  fontFamily:
                    'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
                  marginBottom: "8px",
                }}
              >
                Start a conversation
              </h3>
              <p
                style={{
                  fontSize: "14px",
                  color: "#6b7280",
                  fontFamily:
                    'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
                  marginBottom: "24px",
                }}
              >
                Ask me anything or try one of these quick actions:
              </p>

              {initialStarters.length > 0 && (
                <div
                  className="flex flex-wrap justify-center"
                  style={{ gap: "8px" }}
                >
                  {initialStarters.map((starter, index) => (
                    <Button
                      key={index}
                      variant="outline"
                      size="sm"
                      onClick={() => handleQuickAction(starter)}
                      disabled={isLoading}
                      style={{
                        fontSize: "13px",
                        padding: "8px 16px",
                        borderRadius: "8px",
                        background: "#ffffff",
                        border: "1px solid #e5e7eb",
                        color: "#374151",
                        fontFamily:
                          'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
                        maxWidth: "280px",
                        textAlign: "left",
                        whiteSpace: "normal",
                        height: "auto",
                        lineHeight: 1.4,
                      }}
                    >
                      {starter}
                    </Button>
                  ))}
                </div>
              )}
            </div>
          </div>
        ) : (
          <div>
            {messages.map((message) => (
              <ChatMessage
                key={message.id}
                message={message}
                showToolEvents={false}
              />
            ))}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Error Display */}
      {error && (
        <div
          style={{
            padding: "12px 24px",
            background: "#fef2f2",
            borderTop: "1px solid #fecaca",
            color: "#991b1b",
            fontSize: "14px",
            fontFamily:
              'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
          }}
        >
          {error}
        </div>
      )}

      {/* Input Area */}
      <Card
        style={{
          margin: "0",
          borderRadius: "0",
          border: "none",
          borderTop: "1px solid #e5e7eb",
          boxShadow: "0 -2px 8px rgba(0, 0, 0, 0.04)",
        }}
      >
        <CardContent style={{ padding: "16px 24px" }}>
          {/* File list above input */}
          <FileList
            files={attachedFiles}
            onRemove={(fileId) =>
              setAttachedFiles((files) => files.filter((f) => f.id !== fileId))
            }
          />

          <form
            onSubmit={handleSubmit}
            className="flex items-end"
            style={{ gap: "12px" }}
          >
            {/* File upload button */}
            <FileUpload
              files={attachedFiles}
              onFilesChange={setAttachedFiles}
              disabled={isLoading}
              shopDomain={shopDomain}
            />

            <div className="flex-1">
              <Textarea
                ref={textareaRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Type your message or attach files..."
                disabled={isLoading}
                rows={2}
                style={{
                  resize: "none",
                  fontSize: "14px",
                  fontFamily:
                    'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
                  border: "1px solid #e5e7eb",
                  borderRadius: "8px",
                  padding: "12px",
                  background: "#ffffff",
                }}
              />
            </div>
            <Button
              type="submit"
              disabled={
                isLoading ||
                (!input.trim() &&
                  !attachedFiles.some((f) => f.status === "ready"))
              }
              style={{
                background:
                  isLoading ||
                  (!input.trim() &&
                    !attachedFiles.some((f) => f.status === "ready"))
                    ? "#e5e7eb"
                    : "#0066cc",
                color: "#ffffff",
                borderRadius: "8px",
                padding: "12px 20px",
                fontSize: "14px",
                fontWeight: 600,
                fontFamily:
                  'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
                border: "none",
                cursor:
                  isLoading ||
                  (!input.trim() &&
                    !attachedFiles.some((f) => f.status === "ready"))
                    ? "not-allowed"
                    : "pointer",
                height: "48px",
                minWidth: "100px",
              }}
            >
              {isLoading ? (
                <RefreshCw className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  <Send className="h-4 w-4 mr-2" />
                  Send
                </>
              )}
            </Button>
          </form>
          <p
            style={{
              fontSize: "12px",
              color: "#9ca3af",
              fontFamily:
                'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
              marginTop: "8px",
              textAlign: "center",
            }}
          >
            Press Enter to send, Shift+Enter for new line
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
