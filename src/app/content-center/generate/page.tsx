"use client";

import { useState } from "react";
import {
  ContentTypeSelector,
  GenerationControls,
  GenerationResultView,
} from "@/features/content-center";
import type { GenerationParams } from "@/features/content-center/components/GenerationControls";
import { ContentLoader } from "@/components/ui/loading/ContentLoader";
import { _Button } from "@/components/ui/button";
import { ArrowLeft, _Sparkles } from "lucide-react";
import { ContentType, GeneratedContent } from "@/types/content-center";
import { useShopifyAuth } from "@/app/components/UnifiedShopifyAuth";
import { logger } from "@/lib/logger";

type GenerationStep = "select-type" | "configure" | "result";

export default function GeneratePage() {
  const {
    shop: shopDomain,
    isAuthenticated,
    isLoading: authLoading,
  } = useShopifyAuth();
  const [currentStep, setCurrentStep] = useState<GenerationStep>("select-type");
  const [selectedType, setSelectedType] = useState<ContentType | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationResult, setGenerationResult] = useState<{
    content: GeneratedContent;
    generationTimeMs: number;
    costEstimate: number;
  } | null>(null);

  const handleSelectType = (type: ContentType) => {
    setSelectedType(type);
    setCurrentStep("configure");
  };

  const handleGenerate = async (params: GenerationParams) => {
    if (!selectedType) return;

    if (!shopDomain) {
      alert(
        "Shop authentication required. Please access this page from your Shopify admin.",
      );
      return;
    }

    setIsGenerating(true);

    try {
      const response = await fetch("/api/content-center/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${shopDomain}`,
        },
        body: JSON.stringify({
          content_type: selectedType,
          topic: params.topic,
          word_count: params.wordCount,
          tone_intensity: params.toneIntensity,
          cta_type: params.ctaType,
          custom_cta: params.customCTA,
          additional_context: params.additionalContext,
          save: false,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Generation failed");
      }

      const data = await response.json();

      if (data.success) {
        setGenerationResult({
          content: data.data.content,
          generationTimeMs: data.data.generation_time_ms,
          costEstimate: data.data.cost_estimate,
        });
        setCurrentStep("result");
      } else {
        throw new Error(data.error || "Generation failed");
      }
    } catch (error) {
      logger.error("Error generating content:", error as Error, {
        component: "generate",
      });
      alert(
        `Failed to generate content: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSave = async (content: GeneratedContent) => {
    if (!shopDomain) {
      alert("Shop authentication required.");
      return;
    }

    try {
      const response = await fetch(
        `/api/content-center/content/${content.id}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${shopDomain}`,
          },
          body: JSON.stringify({
            generated_text: content.generated_text,
            is_saved: true,
          }),
        },
      );

      if (!response.ok) {
        throw new Error("Save failed");
      }

      alert("Content saved successfully!");
    } catch (error) {
      logger.error("Error saving content:", error as Error, {
        component: "generate",
      });
      alert("Failed to save content. Please try again.");
    }
  };

  const handleRegenerate = () => {
    setCurrentStep("configure");
    setGenerationResult(null);
  };

  const handleExport = (format: "txt" | "html" | "md") => {
    if (!generationResult) return;

    const content = generationResult.content.generated_text;
    let blob: Blob;
    let filename: string;

    switch (format) {
      case "txt":
        // Strip HTML tags for plain text
        const text = content.replace(/<[^>]*>/g, "");
        blob = new Blob([text], { type: "text/plain" });
        filename = `content-${generationResult.content.id}.txt`;
        break;
      case "html":
        blob = new Blob([content], { type: "text/html" });
        filename = `content-${generationResult.content.id}.html`;
        break;
      case "md":
        // Simple HTML to Markdown conversion
        const markdown = content
          .replace(/<h1>/g, "# ")
          .replace(/<h2>/g, "## ")
          .replace(/<h3>/g, "### ")
          .replace(/<\/h[1-6]>/g, "\n\n")
          .replace(/<strong>/g, "**")
          .replace(/<\/strong>/g, "**")
          .replace(/<em>/g, "*")
          .replace(/<\/em>/g, "*")
          .replace(/<p>/g, "")
          .replace(/<\/p>/g, "\n\n")
          .replace(/<br\s*\/?>/g, "\n");
        blob = new Blob([markdown], { type: "text/markdown" });
        filename = `content-${generationResult.content.id}.md`;
        break;
    }

    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleBackToTypeSelection = () => {
    setCurrentStep("select-type");
    setSelectedType(null);
    setGenerationResult(null);
  };

  // Show loading state while auth is initializing
  if (authLoading) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        <div
          className="flex flex-col items-center justify-center"
          style={{ padding: "80px 0", gap: "24px" }}
        >
          <ContentLoader message="Loading..." size="lg" variant="pulse" />
        </div>
      </div>
    );
  }

  // Show error if not authenticated
  if (!isAuthenticated || !shopDomain) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        <div
          className="flex flex-col items-center justify-center"
          style={{ padding: "80px 0", gap: "24px" }}
        >
          <div style={{ textAlign: "center" }}>
            <p
              style={{
                fontSize: "18px",
                fontWeight: 600,
                color: "#003366",
                marginBottom: "8px",
                fontFamily:
                  'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
              }}
            >
              Authentication Required
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
              Please access this page from your Shopify admin.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      {/* Header */}
      <div style={{ marginBottom: "32px" }}>
        {currentStep !== "select-type" && (
          <button
            onClick={
              currentStep === "configure"
                ? handleBackToTypeSelection
                : handleRegenerate
            }
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              padding: "8px 12px",
              background: "transparent",
              color: "#0066cc",
              border: "none",
              borderRadius: "8px",
              fontSize: "14px",
              fontWeight: 600,
              fontFamily:
                'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
              cursor: "pointer",
              transition: "all 0.15s ease",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "#f0f7ff";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "transparent";
            }}
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </button>
        )}
      </div>

      {/* Progress Indicator */}
      <div
        style={{
          marginBottom: "32px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: "8px",
        }}
      >
        <div className="flex items-center gap-2">
          <div
            style={{
              height: "8px",
              width: "8px",
              borderRadius: "50%",
              background: currentStep === "select-type" ? "#0066cc" : "#e5e7eb",
            }}
          />
          <span
            style={{
              fontSize: "14px",
              fontWeight: currentStep === "select-type" ? 600 : 400,
              color: currentStep === "select-type" ? "#003366" : "#6b7280",
              fontFamily:
                'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
            }}
          >
            Select Type
          </span>
        </div>

        <div style={{ height: "1px", width: "48px", background: "#e5e7eb" }} />

        <div className="flex items-center gap-2">
          <div
            style={{
              height: "8px",
              width: "8px",
              borderRadius: "50%",
              background: currentStep === "configure" ? "#0066cc" : "#e5e7eb",
            }}
          />
          <span
            style={{
              fontSize: "14px",
              fontWeight: currentStep === "configure" ? 600 : 400,
              color: currentStep === "configure" ? "#003366" : "#6b7280",
              fontFamily:
                'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
            }}
          >
            Configure
          </span>
        </div>

        <div style={{ height: "1px", width: "48px", background: "#e5e7eb" }} />

        <div className="flex items-center gap-2">
          <div
            style={{
              height: "8px",
              width: "8px",
              borderRadius: "50%",
              background: currentStep === "result" ? "#0066cc" : "#e5e7eb",
            }}
          />
          <span
            style={{
              fontSize: "14px",
              fontWeight: currentStep === "result" ? 600 : 400,
              color: currentStep === "result" ? "#003366" : "#6b7280",
              fontFamily:
                'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
            }}
          >
            Review
          </span>
        </div>
      </div>

      {/* Content */}
      <div className="mb-8">
        {currentStep === "select-type" && (
          <ContentTypeSelector
            selectedType={selectedType}
            onSelectType={handleSelectType}
          />
        )}

        {currentStep === "configure" && selectedType && !isGenerating && (
          <GenerationControls
            contentType={selectedType}
            onGenerate={handleGenerate}
            isGenerating={isGenerating}
          />
        )}

        {isGenerating && (
          <div
            className="flex flex-col items-center justify-center"
            style={{ padding: "80px 0", gap: "24px" }}
          >
            <ContentLoader
              message="Generating your content..."
              size="lg"
              variant="pulse"
            />
            <div style={{ textAlign: "center" }}>
              <p
                style={{
                  fontSize: "18px",
                  fontWeight: 600,
                  color: "#003366",
                  marginBottom: "8px",
                  fontFamily:
                    'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
                }}
              >
                Creating amazing content
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
                This usually takes 15-30 seconds
              </p>
            </div>
          </div>
        )}

        {currentStep === "result" && generationResult && (
          <GenerationResultView
            result={generationResult.content}
            generationTimeMs={generationResult.generationTimeMs}
            costEstimate={generationResult.costEstimate}
            onSave={handleSave}
            onRegenerate={handleRegenerate}
            onExport={handleExport}
          />
        )}
      </div>
    </div>
  );
}
