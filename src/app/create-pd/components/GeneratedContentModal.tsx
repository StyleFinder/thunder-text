"use client";

import dynamicImport from "next/dynamic";
import "react-quill-new/dist/quill.snow.css";
import { Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

// Dynamically import ReactQuill to avoid SSR issues
const ReactQuill = dynamicImport(() => import("react-quill-new"), {
  ssr: false,
});

interface GeneratedContent {
  title?: string;
  description?: string;
  metaDescription?: string;
  bulletPoints?: string[];
  keywords?: string[];
  [key: string]: unknown;
}

interface GeneratedContentModalProps {
  content: GeneratedContent | null;
  onContentChange: (content: GeneratedContent | null) => void;
  onClose: () => void;
  onRegenerate: () => void;
  onCreateInShopify: () => void;
  creatingProduct: boolean;
}

export function GeneratedContentModal({
  content,
  onContentChange,
  onClose,
  onRegenerate,
  onCreateInShopify,
  creatingProduct,
}: GeneratedContentModalProps) {
  if (!content) return null;

  const updateField = (field: string, value: unknown) => {
    onContentChange({ ...content, [field]: value });
  };

  return (
    <Dialog open={!!content} onOpenChange={() => onClose()}>
      {content && (
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
        className="max-w-3xl max-h-[80vh] overflow-y-auto"
        style={{
          maxWidth: "800px",
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
            Generated Product Description
          </DialogTitle>
        </DialogHeader>

        <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            <Label
              htmlFor="generated-title"
              style={{
                fontSize: "14px",
                fontWeight: 600,
                color: "#003366",
                fontFamily:
                  'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
              }}
            >
              Product Title
            </Label>
            <Input
              id="generated-title"
              value={content.title || ""}
              onChange={(e) => updateField("title", e.target.value)}
              style={{ backgroundColor: "#ffffff", borderColor: "#e5e7eb" }}
            />
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            <Label
              htmlFor="generated-description"
              style={{
                fontSize: "14px",
                fontWeight: 600,
                color: "#003366",
                fontFamily:
                  'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
              }}
            >
              Description
            </Label>
            <ReactQuill
              theme="snow"
              value={(content.description || "") as string}
              onChange={(value) => updateField("description", value)}
              modules={{
                toolbar: [
                  ["bold", "italic", "underline"],
                  [{ list: "ordered" }, { list: "bullet" }],
                  ["link"],
                  ["clean"],
                ],
              }}
              formats={["bold", "italic", "underline", "list", "link"]}
              style={{
                backgroundColor: "#ffffff",
                borderRadius: "6px",
                minHeight: "250px",
              }}
            />
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            <Label
              htmlFor="meta-description"
              style={{
                fontSize: "14px",
                fontWeight: 600,
                color: "#003366",
                fontFamily:
                  'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
              }}
            >
              Meta Description
            </Label>
            <Textarea
              id="meta-description"
              value={content.metaDescription || ""}
              onChange={(e) => updateField("metaDescription", e.target.value)}
              rows={2}
              style={{ backgroundColor: "#ffffff", borderColor: "#e5e7eb" }}
            />
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            <Label
              htmlFor="key-features"
              style={{
                fontSize: "14px",
                fontWeight: 600,
                color: "#003366",
                fontFamily:
                  'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
              }}
            >
              Key Features
            </Label>
            <Textarea
              id="key-features"
              value={
                Array.isArray(content.bulletPoints)
                  ? content.bulletPoints.join("\n")
                  : ""
              }
              onChange={(e) =>
                updateField(
                  "bulletPoints",
                  e.target.value.split("\n").filter((line) => line.trim()),
                )
              }
              rows={5}
              placeholder="Enter each feature on a new line"
              style={{ backgroundColor: "#ffffff", borderColor: "#e5e7eb" }}
            />
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            <Label
              htmlFor="seo-keywords"
              style={{
                fontSize: "14px",
                fontWeight: 600,
                color: "#003366",
                fontFamily:
                  'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
              }}
            >
              SEO Keywords
            </Label>
            <Textarea
              id="seo-keywords"
              value={
                Array.isArray(content.keywords)
                  ? content.keywords.join(", ")
                  : ""
              }
              onChange={(e) =>
                updateField(
                  "keywords",
                  e.target.value
                    .split(",")
                    .map((k) => k.trim())
                    .filter((k) => k),
                )
              }
              rows={3}
              placeholder="Enter keywords separated by commas"
              style={{ backgroundColor: "#ffffff", borderColor: "#e5e7eb" }}
            />
          </div>
        </div>

        <DialogFooter style={{ marginTop: "32px", gap: "8px" }}>
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
              padding: "10px 20px",
              borderRadius: "6px",
            }}
          >
            Close
          </Button>
          <Button
            variant="outline"
            onClick={onRegenerate}
            style={{
              backgroundColor: "#ffffff",
              borderColor: "#e5e7eb",
              color: "#003366",
              fontFamily:
                'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
              fontSize: "14px",
              fontWeight: 500,
              padding: "10px 20px",
              borderRadius: "6px",
            }}
          >
            Generate Again
          </Button>
          <Button
            onClick={onCreateInShopify}
            disabled={creatingProduct}
            style={{
              backgroundColor: "#0066cc",
              borderColor: "#0066cc",
              color: "#ffffff",
              fontFamily:
                'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
              fontSize: "14px",
              fontWeight: 500,
              padding: "10px 20px",
              borderRadius: "6px",
            }}
          >
            {creatingProduct ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Creating Product...
              </>
            ) : (
              "Create Product in Shopify"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
