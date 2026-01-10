"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { COACH_METADATA, CoachKey } from "@/types/ai-coaches";
import {
  MessageSquare,
  CheckCircle,
  AlertCircle,
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

interface CoachCardProps {
  coachKey: CoachKey;
  isRendered: boolean;
  conversationStarters: string[];
  lastConversationAt?: string | null;
  onClick: () => void;
  onQuickAction?: (starter: string) => void;
}

export function CoachCard({
  coachKey,
  isRendered,
  conversationStarters,
  lastConversationAt,
  onClick,
  onQuickAction,
}: CoachCardProps) {
  // eslint-disable-next-line security/detect-object-injection
  const metadata = COACH_METADATA[coachKey];

  const formatLastConversation = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return "Today";
    if (diffDays === 1) return "Yesterday";
    if (diffDays < 7) return `${diffDays} days ago`;
    return date.toLocaleDateString();
  };

  return (
    <Card
      className="cursor-pointer transition-all hover:shadow-md"
      style={{
        background: "#ffffff",
        border: isRendered ? "1px solid #e5e7eb" : "1px solid #fecaca",
        borderRadius: "8px",
        boxShadow: "0 2px 8px rgba(0, 0, 0, 0.08)",
      }}
      onClick={onClick}
    >
      <CardHeader style={{ padding: "24px", paddingBottom: "16px" }}>
        <div className="flex items-start justify-between">
          <div className="flex items-start" style={{ gap: "12px" }}>
            {(() => {
              const IconComponent = COACH_ICONS[metadata.icon];
              return IconComponent ? (
                <div
                  style={{
                    width: "40px",
                    height: "40px",
                    borderRadius: "10px",
                    background: "#e0f2fe",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                  }}
                >
                  <IconComponent
                    style={{ width: "20px", height: "20px", color: "#0066cc" }}
                  />
                </div>
              ) : null;
            })()}
            <div>
              <CardTitle
                style={{
                  fontSize: "18px",
                  fontWeight: 700,
                  color: "#003366",
                  fontFamily:
                    'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
                  marginBottom: "4px",
                }}
              >
                {metadata.name}
              </CardTitle>
              <CardDescription
                style={{
                  fontSize: "14px",
                  color: "#6b7280",
                  fontFamily:
                    'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
                }}
              >
                {metadata.description}
              </CardDescription>
            </div>
          </div>
          {isRendered ? (
            <Badge
              style={{
                background: "#dcfce7",
                color: "#166534",
                padding: "4px 8px",
                borderRadius: "6px",
                fontSize: "12px",
                fontWeight: 500,
              }}
            >
              <CheckCircle
                style={{ width: "12px", height: "12px", marginRight: "4px" }}
              />
              Ready
            </Badge>
          ) : (
            <Badge
              style={{
                background: "#fef2f2",
                color: "#991b1b",
                padding: "4px 8px",
                borderRadius: "6px",
                fontSize: "12px",
                fontWeight: 500,
              }}
            >
              <AlertCircle
                style={{ width: "12px", height: "12px", marginRight: "4px" }}
              />
              Setup Required
            </Badge>
          )}
        </div>
      </CardHeader>

      <CardContent style={{ padding: "0 24px 24px" }}>
        {lastConversationAt && (
          <p
            style={{
              fontSize: "12px",
              color: "#6b7280",
              fontFamily:
                'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
              marginBottom: "16px",
            }}
          >
            <MessageSquare
              style={{
                width: "12px",
                height: "12px",
                display: "inline",
                marginRight: "4px",
                verticalAlign: "middle",
              }}
            />
            Last conversation: {formatLastConversation(lastConversationAt)}
          </p>
        )}

        {isRendered && conversationStarters.length > 0 && (
          <div style={{ marginTop: "12px" }}>
            <p
              style={{
                fontSize: "12px",
                fontWeight: 600,
                color: "#6b7280",
                fontFamily:
                  'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
                marginBottom: "8px",
                textTransform: "uppercase",
                letterSpacing: "0.05em",
              }}
            >
              Quick Actions
            </p>
            <div
              style={{ display: "flex", flexDirection: "column", gap: "8px" }}
            >
              {conversationStarters.slice(0, 2).map((starter, index) => (
                <Button
                  key={index}
                  variant="outline"
                  size="sm"
                  className="hover:bg-gray-100 hover:border-gray-300"
                  onClick={(e) => {
                    e.stopPropagation();
                    onQuickAction?.(starter);
                  }}
                  style={{
                    fontSize: "13px",
                    padding: "10px 16px",
                    borderRadius: "8px",
                    background: "#f9fafb",
                    border: "1px solid #e5e7eb",
                    color: "#374151",
                    fontFamily:
                      'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    width: "100%",
                    maxWidth: "100%",
                    fontWeight: 500,
                    transition: "all 0.15s ease",
                    textAlign: "left",
                    justifyContent: "flex-start",
                  }}
                >
                  {starter.length > 40
                    ? starter.substring(0, 40) + "..."
                    : starter}
                </Button>
              ))}
            </div>
          </div>
        )}

        {!isRendered && (
          <p
            style={{
              fontSize: "13px",
              color: "#991b1b",
              fontFamily:
                'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
              marginTop: "12px",
            }}
          >
            Complete your brand profile to unlock this coach.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
