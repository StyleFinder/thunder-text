"use client";
/* eslint-disable @next/next/no-img-element */
// Using native img for blob URL previews - Next.js Image doesn't support blob URLs well

import { Upload, Loader2 } from "lucide-react";
import type { UploadedFile, ColorVariant } from "../hooks/useColorDetection";

interface PrimaryPhotoUploadProps {
  photos: UploadedFile[];
  productType: string;
  detectedVariants: ColorVariant[];
  colorDetectionLoading: boolean;
  onPhotosAdd: (files: File[]) => void;
  onPhotoRemove: (index: number) => void;
  onVariantOverride: (standardizedColor: string, override: string) => void;
}

export function PrimaryPhotoUpload({
  photos,
  productType,
  detectedVariants,
  colorDetectionLoading,
  onPhotosAdd,
  onPhotoRemove,
  onVariantOverride,
}: PrimaryPhotoUploadProps) {
  const handleClick = () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";
    input.multiple = true;
    input.onchange = (e) => {
      const files = Array.from((e.target as HTMLInputElement).files || []);
      onPhotosAdd(files);
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
            Step 2: Primary Photos (One per color variant)
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
            Upload one photo for each color variant of your product. These will
            be used for automatic color detection.
          </p>

          {!productType && (
            <div
              style={{
                background: "#fffbeb",
                border: "1px solid #fcd34d",
                borderRadius: "8px",
                padding: "16px",
              }}
            >
              <p
                style={{
                  fontSize: "14px",
                  color: "#78350f",
                  margin: 0,
                  fontFamily:
                    'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
                }}
              >
                Please specify the product type in Step 1 before uploading
                images.
              </p>
            </div>
          )}

          <div
            className="border-2 border-dashed border-oxford-200 rounded-lg p-6 hover:border-smart-500 transition-colors cursor-pointer"
            onClick={handleClick}
          >
            {photos.length > 0 ? (
              <div className="flex flex-col gap-3">
                <div className="flex gap-3 flex-wrap">
                  {photos.map(({ file, preview }, index) => {
                    const detectionResult = detectedVariants.find((variant) =>
                      variant.imageIndices.includes(index),
                    );

                    return (
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
                          {detectionResult && (
                            <div
                              style={{
                                position: "absolute",
                                top: "4px",
                                right: "4px",
                                padding: "4px 8px",
                                borderRadius: "4px",
                                background:
                                  detectionResult.confidence > 50
                                    ? "#16a34a"
                                    : "#dc2626",
                                color: "#ffffff",
                                fontSize: "11px",
                                fontWeight: 700,
                                maxWidth: "92px",
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                                whiteSpace: "nowrap",
                              }}
                            >
                              {detectionResult.userOverride ||
                                detectionResult.standardizedColor}
                            </div>
                          )}
                          {colorDetectionLoading && !detectionResult && (
                            <div
                              style={{
                                position: "absolute",
                                top: "4px",
                                right: "4px",
                                background: "#6b7280",
                                color: "#ffffff",
                                padding: "4px 8px",
                                borderRadius: "4px",
                                fontSize: "11px",
                              }}
                            >
                              ...
                            </div>
                          )}
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
                    );
                  })}
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
                  Drop more primary photos here, or click to browse
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
                    📷 Upload Primary Photos
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
                    One photo per color variant for automatic detection
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
                    Select Primary Photos
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Color Detection Results - Integrated */}
          {(colorDetectionLoading || detectedVariants.length > 0) && (
            <div
              style={{
                marginTop: "24px",
                paddingTop: "24px",
                borderTop: "1px solid #e5e7eb",
              }}
            >
              <h3
                style={{
                  fontSize: "18px",
                  fontWeight: 700,
                  color: "#003366",
                  margin: "0 0 16px 0",
                  fontFamily:
                    'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
                }}
              >
                Detected Color Variants
              </h3>

              {colorDetectionLoading ? (
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: "8px",
                    alignItems: "center",
                    padding: "24px 0",
                  }}
                >
                  <Loader2
                    className="h-6 w-6 animate-spin"
                    style={{ color: "#0066cc" }}
                  />
                  <p
                    style={{
                      fontSize: "14px",
                      color: "#6b7280",
                      margin: 0,
                      fontFamily:
                        'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
                    }}
                  >
                    Detecting colors from your primary photos...
                  </p>
                </div>
              ) : (
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: "12px",
                  }}
                >
                  {detectedVariants.map((variant) => (
                    <div
                      key={variant.standardizedColor}
                      style={{
                        background: "#f9fafb",
                        border: "1px solid #e5e7eb",
                        borderRadius: "8px",
                        padding: "16px",
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          flexDirection: "column",
                          gap: "12px",
                        }}
                      >
                        <div
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                          }}
                        >
                          <h4
                            style={{
                              fontSize: "16px",
                              fontWeight: 600,
                              color: "#003366",
                              margin: 0,
                              fontFamily:
                                'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
                            }}
                          >
                            {variant.userOverride || variant.standardizedColor}
                          </h4>
                          <p
                            style={{
                              fontSize: "14px",
                              color: "#6b7280",
                              margin: 0,
                              fontFamily:
                                'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
                            }}
                          >
                            {variant.confidence}% confidence
                          </p>
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
                          {variant.imageIndices.length} image(s) • Original
                          detection: {variant.colorName}
                        </p>
                        <div
                          style={{
                            display: "flex",
                            flexDirection: "column",
                            gap: "8px",
                          }}
                        >
                          <label
                            htmlFor={`override-${variant.standardizedColor}`}
                            style={{
                              fontSize: "14px",
                              fontWeight: 600,
                              color: "#003366",
                              fontFamily:
                                'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
                            }}
                          >
                            Override color name (optional)
                          </label>
                          <input
                            id={`override-${variant.standardizedColor}`}
                            type="text"
                            value={variant.userOverride || ""}
                            onChange={(e) =>
                              onVariantOverride(
                                variant.standardizedColor,
                                e.target.value,
                              )
                            }
                            placeholder={`Leave blank to use "${variant.standardizedColor}"`}
                            style={{
                              padding: "12px",
                              fontSize: "14px",
                              fontFamily:
                                'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
                              border: "1px solid #e5e7eb",
                              borderRadius: "8px",
                              outline: "none",
                              transition: "border-color 0.15s ease",
                            }}
                            onFocus={(e) => {
                              e.currentTarget.style.borderColor = "#0066cc";
                            }}
                            onBlur={(e) => {
                              e.currentTarget.style.borderColor = "#e5e7eb";
                            }}
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
