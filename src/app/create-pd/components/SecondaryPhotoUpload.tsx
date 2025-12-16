"use client";
/* eslint-disable @next/next/no-img-element */
// Using native img for blob URL previews - Next.js Image doesn't support blob URLs well

import { useState } from "react";
import { Upload, AlertCircle } from "lucide-react";
import type { UploadedFile } from "../hooks/useColorDetection";

// Supported image formats - these are widely supported by AI vision APIs
const SUPPORTED_IMAGE_TYPES = [
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
  "image/gif",
];

const SUPPORTED_EXTENSIONS = ".jpg,.jpeg,.png,.webp,.gif";

interface SecondaryPhotoUploadProps {
  photos: UploadedFile[];
  onPhotosAdd: (files: File[]) => void;
  onPhotoRemove: (index: number) => void;
}

export function SecondaryPhotoUpload({
  photos,
  onPhotosAdd,
  onPhotoRemove,
}: SecondaryPhotoUploadProps) {
  const [formatError, setFormatError] = useState<string | null>(null);

  const handleClick = () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = SUPPORTED_EXTENSIONS;
    input.multiple = true;
    input.onchange = (e) => {
      const files = Array.from((e.target as HTMLInputElement).files || []);

      // Filter files by supported types
      const validFiles: File[] = [];
      const invalidFiles: string[] = [];

      files.forEach((file) => {
        if (SUPPORTED_IMAGE_TYPES.includes(file.type.toLowerCase())) {
          validFiles.push(file);
        } else {
          invalidFiles.push(file.name);
        }
      });

      // Show error for unsupported files
      if (invalidFiles.length > 0) {
        setFormatError(
          `Unsupported format: ${invalidFiles.join(", ")}. Please use JPG, PNG, WebP, or GIF.`,
        );
        // Clear error after 5 seconds
        setTimeout(() => setFormatError(null), 5000);
      } else {
        setFormatError(null);
      }

      // Only add valid files
      if (validFiles.length > 0) {
        onPhotosAdd(validFiles);
      }
    };
    input.click();
  };

  return (
    <div
      style={{
        background: "#ffffff",
        border: "1px solid #e5e7eb",
        borderRadius: "8px",
        boxShadow: "0 2px 8px rgba(0, 0, 0, 0.08)",
        maxWidth: "800px",
        margin: "0 auto 24px auto",
        width: "100%",
      }}
    >
      <div style={{ padding: "24px" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          <h2
            style={{
              fontSize: "20px",
              fontWeight: 700,
              color: "#003366",
              margin: "0 0 8px 0",
              fontFamily:
                'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
            }}
          >
            Step 3: Additional Photos (Multiple angles)
          </h2>
          <p
            style={{
              fontSize: "14px",
              color: "#6b7280",
              lineHeight: 1.6,
              margin: "0 0 24px 0",
              fontFamily:
                'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
            }}
          >
            Upload additional photos showing different angles of the same color
            variants. These will not be used for color detection.
          </p>

          <div
            className="border-2 border-dashed border-oxford-200 rounded-lg p-6 hover:border-smart-500 transition-colors cursor-pointer"
            onClick={handleClick}
          >
            {photos.length > 0 ? (
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "12px",
                }}
              >
                <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
                  {photos.map(({ file, preview }, index) => (
                    <div
                      key={index}
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        gap: "8px",
                      }}
                    >
                      <div
                        style={{
                          position: "relative",
                          width: "100px",
                          height: "100px",
                        }}
                      >
                        <img
                          src={preview}
                          alt={file.name}
                          style={{
                            width: "100px",
                            height: "100px",
                            objectFit: "cover",
                            borderRadius: "8px",
                            border: "1px solid #e5e7eb",
                          }}
                        />
                      </div>
                      <button
                        style={{
                          background: "transparent",
                          color: "#dc2626",
                          border: "1px solid #e5e7eb",
                          borderRadius: "6px",
                          padding: "8px 12px",
                          fontSize: "12px",
                          fontWeight: 600,
                          fontFamily:
                            'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
                          cursor: "pointer",
                          transition: "all 0.15s ease",
                        }}
                        onClick={(e) => {
                          e.stopPropagation();
                          onPhotoRemove(index);
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.background = "#fff5f5";
                          e.currentTarget.style.borderColor = "#dc2626";
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.background = "transparent";
                          e.currentTarget.style.borderColor = "#e5e7eb";
                        }}
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                </div>
                <p
                  style={{
                    fontSize: "14px",
                    color: "#6b7280",
                    margin: 0,
                    fontFamily:
                      'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
                  }}
                >
                  Drop more additional photos here, or click to browse
                </p>
              </div>
            ) : (
              <div style={{ textAlign: "center", padding: "32px 0" }}>
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: "8px",
                    alignItems: "center",
                  }}
                >
                  <Upload className="h-12 w-12" style={{ color: "#6b7280" }} />
                  <p
                    style={{
                      fontSize: "16px",
                      fontWeight: 600,
                      color: "#003366",
                      margin: 0,
                      fontFamily:
                        'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
                    }}
                  >
                    📷 Upload Additional Photos
                  </p>
                  <p
                    style={{
                      fontSize: "14px",
                      color: "#6b7280",
                      margin: 0,
                      fontFamily:
                        'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
                    }}
                  >
                    Optional: Multiple angles of the same color variants
                  </p>
                  <button
                    type="button"
                    style={{
                      background: "transparent",
                      color: "#003366",
                      border: "1px solid #e5e7eb",
                      borderRadius: "8px",
                      padding: "12px 24px",
                      fontSize: "14px",
                      fontWeight: 600,
                      fontFamily:
                        'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
                      cursor: "pointer",
                      marginTop: "8px",
                      transition: "all 0.15s ease",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = "#f9fafb";
                      e.currentTarget.style.borderColor = "#0066cc";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = "transparent";
                      e.currentTarget.style.borderColor = "#e5e7eb";
                    }}
                  >
                    Select Additional Photos
                  </button>
                </div>
              </div>
            )}
          </div>

          {formatError && (
            <div
              style={{
                background: "#fef2f2",
                border: "1px solid #fecaca",
                borderRadius: "8px",
                padding: "16px",
                marginTop: "16px",
                display: "flex",
                alignItems: "flex-start",
                gap: "12px",
              }}
            >
              <AlertCircle
                style={{
                  color: "#dc2626",
                  width: "20px",
                  height: "20px",
                  flexShrink: 0,
                  marginTop: "1px",
                }}
              />
              <p
                style={{
                  fontSize: "14px",
                  color: "#991b1b",
                  margin: 0,
                  fontFamily:
                    'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
                }}
              >
                {formatError}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
