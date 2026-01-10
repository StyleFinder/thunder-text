"use client";

import { useState } from "react";
import {
  FileText,
  Megaphone,
  ShoppingBag,
  Facebook,
  Instagram,
  Music,
  Check,
} from "lucide-react";
import { ContentType } from "@/types/content-center";

interface ContentTypeOption {
  type: ContentType;
  label: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  platforms?: string[];
  wordCountRange: string;
  examples: string[];
}

const CONTENT_TYPES: ContentTypeOption[] = [
  {
    type: "blog",
    label: "Blog Post",
    description: "Long-form content for your blog or website",
    icon: FileText,
    wordCountRange: "500-2000 words",
    examples: [
      "Product guides",
      "Style tips",
      "Brand stories",
      "How-to articles",
    ],
  },
  {
    type: "ad",
    label: "Ad Copy",
    description: "Compelling copy for digital advertising",
    icon: Megaphone,
    wordCountRange: "50-800 words",
    examples: [
      "Facebook ads",
      "Google ads",
      "Email campaigns",
      "Promotional copy",
    ],
  },
  {
    type: "store_copy",
    label: "Store Copy",
    description: "Product descriptions and store content",
    icon: ShoppingBag,
    wordCountRange: "200-1500 words",
    examples: [
      "Product descriptions",
      "Collection pages",
      "About page",
      "Policies",
    ],
  },
  {
    type: "social_facebook",
    label: "Facebook Post",
    description: "Engaging posts for Facebook",
    icon: Facebook,
    platforms: ["Facebook"],
    wordCountRange: "50-500 words",
    examples: [
      "Product launches",
      "Community updates",
      "Behind-the-scenes",
      "Promotions",
    ],
  },
  {
    type: "social_instagram",
    label: "Instagram Caption",
    description: "Captivating captions for Instagram",
    icon: Instagram,
    platforms: ["Instagram"],
    wordCountRange: "50-300 words",
    examples: [
      "Product photos",
      "Lifestyle shots",
      "Stories",
      "Reels descriptions",
    ],
  },
  {
    type: "social_tiktok",
    label: "TikTok Caption",
    description: "Trendy captions for TikTok videos",
    icon: Music,
    platforms: ["TikTok"],
    wordCountRange: "50-200 words",
    examples: [
      "Video descriptions",
      "Trend participation",
      "Product demos",
      "Tips & tricks",
    ],
  },
];

interface ContentTypeSelectorProps {
  selectedType: ContentType | null;
  onSelectType: (type: ContentType) => void;
  className?: string;
}

export function ContentTypeSelector({
  selectedType,
  onSelectType,
  className = "",
}: ContentTypeSelectorProps) {
  const [hoveredType, setHoveredType] = useState<ContentType | null>(null);

  return (
    <div
      className={className}
      style={{ display: "flex", flexDirection: "column", gap: "24px" }}
    >
      <div>
        <h2
          style={{
            fontSize: "24px",
            fontWeight: 700,
            color: "#003366",
            marginBottom: "8px",
            fontFamily:
              'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
          }}
        >
          Choose Content Type
        </h2>
        <p
          style={{
            fontSize: "14px",
            color: "#6b7280",
            margin: 0,
            fontFamily:
              'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
          }}
        >
          Select the type of content you want to create. Each type is optimized
          for its specific use case.
        </p>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(3, 1fr)",
          gap: "16px",
        }}
      >
        {CONTENT_TYPES.map((option) => {
          const Icon = option.icon;
          const isSelected = selectedType === option.type;
          const isHovered = hoveredType === option.type;

          return (
            <div
              key={option.type}
              onClick={() => onSelectType(option.type)}
              onMouseEnter={() => setHoveredType(option.type)}
              onMouseLeave={() => setHoveredType(null)}
              style={{
                background: "#ffffff",
                border: isSelected ? "2px solid #0066cc" : "1px solid #e5e7eb",
                borderRadius: "8px",
                boxShadow: isSelected
                  ? "0 4px 12px rgba(0, 102, 204, 0.15)"
                  : isHovered
                    ? "0 4px 8px rgba(0, 0, 0, 0.12)"
                    : "0 2px 8px rgba(0, 0, 0, 0.08)",
                cursor: "pointer",
                transition: "all 0.15s ease",
                transform:
                  isHovered && !isSelected ? "translateY(-2px)" : "none",
                minWidth: 0,
              }}
            >
              <div style={{ padding: "24px 24px 12px 24px" }}>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div
                      style={{
                        padding: "8px",
                        borderRadius: "8px",
                        background: isSelected ? "#0066cc" : "#f0f7ff",
                        color: isSelected ? "#ffffff" : "#0066cc",
                      }}
                    >
                      <Icon className="h-5 w-5" />
                    </div>
                    <div>
                      <h3
                        style={{
                          fontSize: "16px",
                          fontWeight: 600,
                          color: "#003366",
                          margin: 0,
                          fontFamily:
                            'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
                        }}
                      >
                        {option.label}
                      </h3>
                      {option.platforms && (
                        <div
                          className="flex gap-1"
                          style={{ marginTop: "4px" }}
                        >
                          {option.platforms.map((platform) => (
                            <span
                              key={platform}
                              style={{
                                background: "#f3f4f6",
                                color: "#6b7280",
                                fontSize: "11px",
                                padding: "2px 8px",
                                borderRadius: "4px",
                                fontFamily:
                                  'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
                              }}
                            >
                              {platform}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                  {isSelected && (
                    <div
                      style={{
                        background: "#0066cc",
                        color: "#ffffff",
                        borderRadius: "50%",
                        padding: "4px",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <Check className="h-4 w-4" />
                    </div>
                  )}
                </div>
                <p
                  style={{
                    fontSize: "14px",
                    color: "#6b7280",
                    marginTop: "8px",
                    fontFamily:
                      'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
                  }}
                >
                  {option.description}
                </p>
              </div>

              <div
                style={{
                  padding: "0 24px 24px 24px",
                  display: "flex",
                  flexDirection: "column",
                  gap: "12px",
                }}
              >
                <div
                  className="flex items-center gap-2"
                  style={{
                    fontSize: "14px",
                    color: "#6b7280",
                    fontFamily:
                      'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
                  }}
                >
                  <FileText className="h-4 w-4" />
                  <span>{option.wordCountRange}</span>
                </div>

                <div>
                  <p
                    style={{
                      fontSize: "12px",
                      fontWeight: 600,
                      color: "#6b7280",
                      marginBottom: "4px",
                      fontFamily:
                        'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
                    }}
                  >
                    Examples:
                  </p>
                  <ul
                    style={{
                      fontSize: "12px",
                      color: "#6b7280",
                      margin: 0,
                      padding: 0,
                      listStyle: "none",
                      fontFamily:
                        'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
                    }}
                  >
                    {option.examples.slice(0, 3).map((example, idx) => (
                      <li key={idx} style={{ marginBottom: "2px" }}>
                        • {example}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {selectedType && (
        <div className="flex justify-end">
          <button
            onClick={() => onSelectType(selectedType)}
            style={{
              background: "#0066cc",
              color: "#ffffff",
              border: "none",
              borderRadius: "8px",
              padding: "12px 24px",
              fontSize: "14px",
              fontWeight: 600,
              fontFamily:
                'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
              cursor: "pointer",
              transition: "all 0.15s ease",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "#0052a3";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "#0066cc";
            }}
          >
            Continue with{" "}
            {CONTENT_TYPES.find((t) => t.type === selectedType)?.label}
          </button>
        </div>
      )}
    </div>
  );
}
