"use client";

import { Loader2 } from "lucide-react";
import type { PrePopulatedProductData } from "@/lib/shopify/product-prepopulation";

interface ProductDataBannerProps {
  dataLoading: boolean;
  dataLoadError: string | null;
  prePopulatedData: PrePopulatedProductData | null;
}

export function ProductDataBanner({
  dataLoading,
  dataLoadError,
  prePopulatedData,
}: ProductDataBannerProps) {
  if (!dataLoading && !dataLoadError && !prePopulatedData) {
    return null;
  }

  return (
    <section
      style={{
        maxWidth: "800px",
        margin: "0 auto",
        width: "100%",
        marginBottom: "24px",
      }}
    >
      <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
        {/* Product Data Loading State */}
        {dataLoading && (
          <div
            style={{
              background: "#eff6ff",
              border: "1px solid #bfdbfe",
              borderRadius: "8px",
              padding: "16px",
              display: "flex",
              alignItems: "center",
              gap: "12px",
            }}
          >
            <Loader2
              className="h-5 w-5 animate-spin"
              style={{ color: "#0066cc", flexShrink: 0 }}
            />
            <p
              style={{
                fontSize: "14px",
                color: "#003366",
                margin: 0,
                fontFamily:
                  'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
              }}
            >
              Loading product data from Shopify...
            </p>
          </div>
        )}

        {/* Product Data Load Error */}
        {dataLoadError && (
          <div
            style={{
              background: "#fffbeb",
              border: "1px solid #fcd34d",
              borderRadius: "8px",
              padding: "16px",
            }}
          >
            <div
              style={{ display: "flex", flexDirection: "column", gap: "8px" }}
            >
              <h3
                style={{
                  fontSize: "16px",
                  fontWeight: 600,
                  color: "#92400e",
                  margin: 0,
                  fontFamily:
                    'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
                }}
              >
                Product Data Load Error
              </h3>
              <p
                style={{
                  fontSize: "14px",
                  color: "#78350f",
                  margin: 0,
                  fontFamily:
                    'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
                }}
              >
                {dataLoadError}
              </p>
              <p
                style={{
                  fontSize: "14px",
                  color: "#78350f",
                  margin: 0,
                  fontFamily:
                    'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
                }}
              >
                You can still create a product manually by uploading images and
                filling in the details below.
              </p>
            </div>
          </div>
        )}

        {/* Pre-populated Data Success */}
        {prePopulatedData && !dataLoading && (
          <div
            style={{
              background: "#f0fdf4",
              border: "1px solid #bbf7d0",
              borderRadius: "8px",
              padding: "16px",
            }}
          >
            <div
              style={{ display: "flex", flexDirection: "column", gap: "8px" }}
            >
              <h3
                style={{
                  fontSize: "16px",
                  fontWeight: 600,
                  color: "#15803d",
                  margin: 0,
                  fontFamily:
                    'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
                }}
              >
                ✅ Product Data Loaded from Shopify
              </h3>
              <p
                style={{
                  fontSize: "14px",
                  color: "#166534",
                  margin: 0,
                  fontFamily:
                    'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
                }}
              >
                Successfully loaded data for:{" "}
                <strong>{prePopulatedData.title}</strong>
              </p>
              <div
                style={{ display: "flex", flexDirection: "column", gap: "4px" }}
              >
                <p
                  style={{
                    fontSize: "14px",
                    color: "#166534",
                    margin: 0,
                    fontFamily:
                      'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
                  }}
                >
                  • {prePopulatedData.images.length} images available
                </p>
                <p
                  style={{
                    fontSize: "14px",
                    color: "#166534",
                    margin: 0,
                    fontFamily:
                      'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
                  }}
                >
                  • Category: {prePopulatedData.category.primary}
                </p>
                <p
                  style={{
                    fontSize: "14px",
                    color: "#166534",
                    margin: 0,
                    fontFamily:
                      'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
                  }}
                >
                  • {prePopulatedData.variants.length} variant(s)
                </p>
                {prePopulatedData.materials.fabric && (
                  <p
                    style={{
                      fontSize: "14px",
                      color: "#166534",
                      margin: 0,
                      fontFamily:
                        'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
                    }}
                  >
                    • Material: {prePopulatedData.materials.fabric}
                  </p>
                )}
              </div>
              <p
                style={{
                  fontSize: "14px",
                  color: "#16a34a",
                  margin: 0,
                  fontFamily:
                    'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
                }}
              >
                Form fields have been pre-populated. You can upload additional
                images or modify the details below, then generate your
                description.
              </p>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
