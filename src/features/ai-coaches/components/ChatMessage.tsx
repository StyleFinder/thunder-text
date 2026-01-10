"use client";

import { ChatDisplayMessage, ToolEvent } from "@/types/ai-coaches";
import { RefreshCw, Wrench } from "lucide-react";

interface ChatMessageProps {
  message: ChatDisplayMessage;
  showToolEvents?: boolean;
}

export function ChatMessage({
  message,
  showToolEvents = false,
}: ChatMessageProps) {
  const isUser = message.role === "user";
  const isStreaming = message.isStreaming;

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  const renderToolEvent = (event: ToolEvent, index: number) => (
    <div
      key={index}
      style={{
        background: "#f0f9ff",
        border: "1px solid #bae6fd",
        borderRadius: "6px",
        padding: "8px 12px",
        marginTop: "8px",
        fontSize: "12px",
        fontFamily: "monospace",
      }}
    >
      <div
        className="flex items-center"
        style={{ gap: "6px", marginBottom: "4px" }}
      >
        <Wrench className="h-3 w-3" style={{ color: "#0284c7" }} />
        <span style={{ fontWeight: 600, color: "#0369a1" }}>
          {event.tool_name}
        </span>
      </div>
      {Object.keys(event.result).length > 0 && (
        <pre
          style={{
            margin: 0,
            color: "#475569",
            fontSize: "11px",
            whiteSpace: "pre-wrap",
            wordBreak: "break-word",
          }}
        >
          {JSON.stringify(event.result, null, 2).substring(0, 200)}
          {JSON.stringify(event.result).length > 200 && "..."}
        </pre>
      )}
    </div>
  );

  return (
    <div
      className="flex"
      style={{
        justifyContent: isUser ? "flex-end" : "flex-start",
        marginBottom: "16px",
      }}
    >
      <div
        style={{
          maxWidth: "85%",
          borderRadius: "12px",
          padding: "12px 16px",
          background: isUser ? "#0066cc" : "#f3f4f6",
          color: isUser ? "#ffffff" : "#001429",
        }}
      >
        <div
          style={{
            fontSize: "14px",
            fontFamily:
              'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
            lineHeight: 1.6,
            whiteSpace: "pre-wrap",
          }}
        >
          {message.content}
          {isStreaming && (
            <span
              className="inline-block animate-pulse"
              style={{ marginLeft: "4px" }}
            >
              |
            </span>
          )}
        </div>

        {showToolEvents &&
          message.toolEvents &&
          message.toolEvents.length > 0 && (
            <div style={{ marginTop: "12px" }}>
              {message.toolEvents.map((event, index) =>
                renderToolEvent(event, index),
              )}
            </div>
          )}

        <div
          className="flex items-center"
          style={{
            marginTop: "8px",
            gap: "8px",
            opacity: 0.7,
          }}
        >
          {isStreaming && (
            <RefreshCw
              className="h-3 w-3 animate-spin"
              style={{ color: isUser ? "#ffffff" : "#6b7280" }}
            />
          )}
          <span
            style={{
              fontSize: "11px",
              fontFamily:
                'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
            }}
          >
            {formatTime(message.timestamp)}
          </span>
        </div>
      </div>
    </div>
  );
}
