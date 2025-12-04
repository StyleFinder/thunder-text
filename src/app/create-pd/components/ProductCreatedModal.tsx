"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface ProductCreatedData {
  product?: {
    id?: string;
    title?: string;
  };
  shopifyUrl?: string;
  [key: string]: unknown;
}

interface ProductCreatedModalProps {
  data: ProductCreatedData | null;
  onClose: () => void;
}

export function ProductCreatedModal({
  data,
  onClose,
}: ProductCreatedModalProps) {
  if (!data) return null;

  const productTitle = data.product?.title || "N/A";
  const productId = data.product?.id || "N/A";
  const shopifyUrl = data.shopifyUrl;

  return (
    <Dialog open={!!data} onOpenChange={() => onClose()}>
      {data && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 50,
            backgroundColor: "rgba(0, 0, 0, 0.5)",
            pointerEvents: "none",
          }}
          aria-hidden="true"
        />
      )}
      <DialogContent
        className="max-w-2xl"
        style={{
          maxWidth: "700px",
          maxHeight: "85vh",
          overflowY: "auto",
          backgroundColor: "#ffffff",
          border: "1px solid #e5e7eb",
          borderRadius: "8px",
          zIndex: 51,
          padding: "32px",
        }}
      >
        <DialogHeader style={{ marginBottom: "24px" }}>
          <DialogTitle
            style={{
              fontSize: "24px",
              fontWeight: 700,
              color: "#003366",
              fontFamily:
                'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
            }}
          >
            🎉 Product Created Successfully!
          </DialogTitle>
        </DialogHeader>

        <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
          <div
            style={{
              padding: "16px",
              backgroundColor: "#ecfdf5",
              borderRadius: "8px",
              border: "1px solid #a7f3d0",
            }}
          >
            <p
              style={{
                fontSize: "14px",
                color: "#1f2937",
                fontFamily:
                  'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
                lineHeight: "1.5",
              }}
            >
              Your product has been successfully created in Shopify as a draft.
              You can now review and publish it from your Shopify admin.
            </p>
          </div>

          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "12px",
              padding: "24px",
              backgroundColor: "#f9fafb",
              borderRadius: "8px",
              border: "1px solid #e5e7eb",
            }}
          >
            <h3
              style={{
                fontSize: "16px",
                fontWeight: 600,
                color: "#003366",
                fontFamily:
                  'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
                marginBottom: "4px",
              }}
            >
              Product Details
            </h3>
            <div
              style={{ display: "flex", flexDirection: "column", gap: "8px" }}
            >
              <p
                style={{
                  fontSize: "14px",
                  color: "#1f2937",
                  fontFamily:
                    'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
                }}
              >
                <span style={{ fontWeight: 600 }}>Title:</span> {productTitle}
              </p>
              <p
                style={{
                  fontSize: "14px",
                  color: "#1f2937",
                  fontFamily:
                    'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
                }}
              >
                <span style={{ fontWeight: 600 }}>Status:</span> Draft (ready
                for review)
              </p>
              <p
                style={{
                  fontSize: "14px",
                  color: "#1f2937",
                  fontFamily:
                    'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
                }}
              >
                <span style={{ fontWeight: 600 }}>Product ID:</span> {productId}
              </p>
            </div>
          </div>

          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "12px",
              padding: "24px",
              backgroundColor: "#f9fafb",
              borderRadius: "8px",
              border: "1px solid #e5e7eb",
            }}
          >
            <h3
              style={{
                fontSize: "16px",
                fontWeight: 600,
                color: "#003366",
                fontFamily:
                  'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
                marginBottom: "4px",
              }}
            >
              Next Steps
            </h3>
            <div
              style={{ display: "flex", flexDirection: "column", gap: "8px" }}
            >
              <p
                style={{
                  fontSize: "14px",
                  color: "#1f2937",
                  fontFamily:
                    'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
                }}
              >
                • Review the product details in your Shopify admin
              </p>
              <p
                style={{
                  fontSize: "14px",
                  color: "#1f2937",
                  fontFamily:
                    'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
                }}
              >
                • Add product images if needed
              </p>
              <p
                style={{
                  fontSize: "14px",
                  color: "#1f2937",
                  fontFamily:
                    'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
                }}
              >
                • Set pricing and inventory
              </p>
              <p
                style={{
                  fontSize: "14px",
                  color: "#1f2937",
                  fontFamily:
                    'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
                }}
              >
                • Publish when ready to sell
              </p>
            </div>
          </div>
        </div>

        <div
          style={{
            marginTop: "32px",
            display: "flex",
            flexDirection: "column",
            gap: "12px",
          }}
        >
          {shopifyUrl && (
            <Button
              onClick={() => window.open(shopifyUrl, "_blank")}
              style={{
                backgroundColor: "#0066cc",
                borderColor: "#0066cc",
                color: "#ffffff",
                fontFamily:
                  'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
                fontSize: "14px",
                fontWeight: 500,
                padding: "12px 20px",
                borderRadius: "6px",
                width: "100%",
              }}
            >
              View in Shopify Admin
            </Button>
          )}
          <Button
            variant="outline"
            onClick={onClose}
            style={{
              backgroundColor: "#ffffff",
              borderColor: "#e5e7eb",
              color: "#003366",
              fontFamily:
                'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
              fontSize: "14px",
              fontWeight: 500,
              padding: "12px 20px",
              borderRadius: "6px",
              width: "100%",
            }}
          >
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
