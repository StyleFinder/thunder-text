"use client";

export const dynamic = "force-dynamic";

import { useState, useCallback, useEffect, Suspense, useRef } from "react";
import { useSearchParams } from "next/navigation";
import { Loader2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { logger } from "@/lib/logger";
import { authenticatedFetch } from "@/lib/shopify/api-client";
import { type ProductCategory } from "@/lib/prompts";

// Extracted components
import {
  PrimaryPhotoUpload,
  SecondaryPhotoUpload,
  ProductDataBanner,
  GenerationModal,
  GeneratedContentModal,
  ProductCreatedModal,
} from "./components";

// Extracted hooks
import {
  useProductData,
  useColorDetection,
  useFileUpload,
  useShopSizes,
} from "./hooks";

// Existing components
import { CategoryTemplateSelector } from "@/app/components/CategoryTemplateSelector";
import { ProductTypeSelector } from "@/app/components/ProductTypeSelector";

interface GeneratedContent {
  title?: string;
  description?: string;
  metaDescription?: string;
  bulletPoints?: string[];
  keywords?: string[];
  [key: string]: unknown;
}

function CreateProductContent() {
  const searchParams = useSearchParams();
  const shop = searchParams?.get("shop");
  const authenticated = searchParams?.get("authenticated");

  // Admin extension redirect parameters
  const productId = searchParams?.get("productId");
  const productTypeParam = searchParams?.get("productType");
  const vendor = searchParams?.get("vendor");
  const source = searchParams?.get("source");

  // Progress timer ref
  const progressTimer = useRef<NodeJS.Timeout | null>(null);

  // Custom hooks
  const { prePopulatedData, dataLoading, dataLoadError, initialFormValues } =
    useProductData({
      source,
      productId,
      shop,
      productTypeParam,
      vendor,
    });

  const {
    detectedVariants,
    colorDetectionLoading,
    detectColorsFromPhotos,
    updateVariantOverride,
  } = useColorDetection({ shop });

  const {
    primaryPhotos,
    secondaryPhotos,
    handlePrimaryPhotosDrop,
    handleSecondaryPhotosDrop,
    removePrimaryPhoto,
    removeSecondaryPhoto,
  } = useFileUpload();

  const { sizingOptions, defaultSizing } = useShopSizes({ shop });

  // Form state
  const [selectedTemplate, setSelectedTemplate] =
    useState<ProductCategory>("general");
  const [productType, setProductType] = useState("");
  const [availableSizing, setAvailableSizing] = useState("");
  // templatePreview state reserved for future template preview feature
  const [, setTemplatePreview] = useState<{
    id: string;
    name: string;
    category: string;
    content: string;
    is_default: boolean;
  } | null>(null);
  const [fabricMaterial, setFabricMaterial] = useState("");
  const [occasionUse, setOccasionUse] = useState("");
  const [targetAudience, setTargetAudience] = useState("");
  const [keyFeatures, setKeyFeatures] = useState("");
  const [additionalNotes, setAdditionalNotes] = useState("");
  // categoryDetected tracks whether auto-detection has run
  const [, setCategoryDetected] = useState(false);
  const [suggestedCategory, setSuggestedCategory] = useState<{
    category: string;
    confidence: number;
  } | null>(null);

  // Generation state
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [generatedContent, setGeneratedContent] =
    useState<GeneratedContent | null>(null);
  const [creatingProduct, setCreatingProduct] = useState(false);
  const [productCreated, setProductCreated] = useState<Record<
    string,
    unknown
  > | null>(null);
  const [progress, setProgress] = useState(0);

  // Apply initial form values from pre-populated data
  useEffect(() => {
    if (initialFormValues) {
      setSelectedTemplate(initialFormValues.selectedTemplate);
      setProductType(initialFormValues.productType);
      setTargetAudience(initialFormValues.targetAudience);
      setFabricMaterial(initialFormValues.fabricMaterial);
      setKeyFeatures(initialFormValues.keyFeatures);
      setAvailableSizing(initialFormValues.availableSizing);
      setAdditionalNotes(initialFormValues.additionalNotes);
      setCategoryDetected(true);
    }
  }, [initialFormValues]);

  // Set default sizing when loaded
  useEffect(() => {
    if (defaultSizing && !availableSizing) {
      setAvailableSizing(defaultSizing);
    }
  }, [defaultSizing, availableSizing]);

  // Cleanup progress timer on unmount
  useEffect(() => {
    return () => {
      if (progressTimer.current) {
        clearInterval(progressTimer.current);
      }
    };
  }, []);

  // Fetch global default template
  useEffect(() => {
    async function fetchGlobalDefaultTemplate() {
      if (!shop || !authenticated) return;

      try {
        const response = await fetch(
          `/api/prompts?store_id=${shop}&get_default=true`,
        );
        const data = await response.json();

        if (data.default_template && !initialFormValues) {
          setSelectedTemplate(data.default_template);
        }
      } catch (err) {
        logger.error("Error fetching global default template", err as Error, {
          component: "create-pd-page",
          operation: "fetchGlobalDefaultTemplate",
          storeId: shop,
        });
      }
    }

    fetchGlobalDefaultTemplate();
  }, [shop, authenticated, initialFormValues]);

  // Category detection from image - defined before handlePrimaryPhotosAdd which depends on it
  const detectCategoryFromImage = useCallback(
    async (file: File) => {
      try {
        const reader = new FileReader();
        const imageData = await new Promise<string>((resolve, reject) => {
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(file);
        });

        const response = await authenticatedFetch(
          "/api/detect-category",
          {
            method: "POST",
            body: JSON.stringify({ imageData }),
          },
          shop || undefined,
        );

        const result = await response.json();

        if (result.success && result.data) {
          const { subCategory, confidence } = result.data;

          if (
            confidence === "high" &&
            (!selectedTemplate || selectedTemplate === "general")
          ) {
            setSelectedTemplate(subCategory.toLowerCase() as ProductCategory);
            setCategoryDetected(true);
          }
        }
      } catch (error) {
        logger.error("Error detecting category from image", error as Error, {
          component: "create-pd-page",
          operation: "detectCategoryFromImage",
          shop,
        });
      }
    },
    [shop, selectedTemplate],
  );

  // Handle primary photos with color detection
  const handlePrimaryPhotosAdd = useCallback(
    (files: File[]) => {
      const updatedPhotos = handlePrimaryPhotosDrop(files);

      // Trigger color detection
      detectColorsFromPhotos(updatedPhotos);

      // Also trigger category detection from first image
      if (primaryPhotos.length === 0 && files.length > 0) {
        setCategoryDetected(true);
        detectCategoryFromImage(files[0]);
      }
    },
    [
      handlePrimaryPhotosDrop,
      detectColorsFromPhotos,
      primaryPhotos.length,
      detectCategoryFromImage,
    ],
  );

  // Handle primary photo removal with re-detection
  const handlePrimaryPhotoRemove = useCallback(
    (index: number) => {
      const remainingPhotos = removePrimaryPhoto(index);
      detectColorsFromPhotos(remainingPhotos);
    },
    [removePrimaryPhoto, detectColorsFromPhotos],
  );

  // Template change handler
  const handleTemplateChange = useCallback(
    (category: string, categoryType?: ProductCategory) => {
      setSelectedTemplate(categoryType || "general");
    },
    [],
  );

  // Category suggestion from content
  const suggestCategoryFromContent = async (content: GeneratedContent) => {
    try {
      const response = await authenticatedFetch(
        "/api/categories/suggest",
        {
          method: "POST",
          body: JSON.stringify({
            title: content.title,
            description: content.description,
            keywords: content.keywords,
          }),
        },
        shop || undefined,
      );

      const data = await response.json();

      if (data.success && data.suggestion) {
        const { category, confidence, shouldAutoAssign } = data.suggestion;
        setSuggestedCategory({ category, confidence });

        if (shouldAutoAssign && confidence >= 0.6) {
          if (!selectedTemplate || selectedTemplate === "general") {
            setSelectedTemplate(category);
            setCategoryDetected(true);
          }
        }
      }
    } catch (err) {
      logger.error("Error getting category suggestion", err as Error, {
        component: "create-pd-page",
        operation: "suggestCategoryFromContent",
        shop,
      });
    }
  };

  // Generate description handler
  const handleGenerateDescription = async () => {
    if (primaryPhotos.length === 0) {
      setError("Please upload at least one primary photo");
      return;
    }

    if (!selectedTemplate) {
      setError("Please select a product category template");
      return;
    }

    if (!shop) {
      setError(
        "Shop parameter is required. Please include ?shop=your-store.myshopify.com in the URL.",
      );
      return;
    }

    setGenerating(true);
    setError(null);
    setProgress(0);
    setShowModal(true);

    // Start progress animation
    let currentProgress = 0;
    progressTimer.current = setInterval(() => {
      currentProgress += Math.random() * 8 + 2;
      if (currentProgress >= 90) {
        currentProgress = 90;
        if (progressTimer.current) {
          clearInterval(progressTimer.current);
        }
      }
      setProgress(Math.min(currentProgress, 90));
    }, 800);

    try {
      const allPhotos = [...primaryPhotos, ...secondaryPhotos];
      const imageData = await Promise.all(
        allPhotos.map(async ({ file }) => {
          return new Promise<string>((resolve) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result as string);
            reader.readAsDataURL(file);
          });
        }),
      );

      const response = await authenticatedFetch(
        "/api/generate/create",
        {
          method: "POST",
          body: JSON.stringify({
            images: imageData,
            category: selectedTemplate,
            sizing: availableSizing,
            template: selectedTemplate,
            productType,
            fabricMaterial,
            occasionUse,
            targetAudience,
            keyFeatures,
            additionalNotes,
          }),
        },
        shop || undefined,
      );

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || "Generation failed");
      }

      // Complete progress bar
      if (progressTimer.current) {
        clearInterval(progressTimer.current);
      }
      setProgress(100);

      setGeneratedContent(data.data.generatedContent);

      // Auto-suggest category
      if (data.data.generatedContent) {
        try {
          await suggestCategoryFromContent(data.data.generatedContent);
        } catch (suggestionError) {
          logger.error("Category suggestion failed", suggestionError as Error, {
            component: "create-pd-page",
            operation: "handleGenerateDescription-suggestCategory",
            shop,
          });
        }
      }
    } catch (err) {
      logger.error("Error generating content", err as Error, {
        component: "create-pd-page",
        operation: "handleGenerateDescription",
        category: selectedTemplate,
        photosCount: primaryPhotos.length + secondaryPhotos.length,
        shop,
      });
      setError("Failed to generate product description. Please try again.");
    } finally {
      if (progressTimer.current) {
        clearInterval(progressTimer.current);
      }
      setGenerating(false);
      setShowModal(false);
    }
  };

  // Create in Shopify handler
  const handleCreateInShopify = async () => {
    if (!generatedContent) return;

    setCreatingProduct(true);
    setError(null);

    try {
      const allPhotos = [...primaryPhotos, ...secondaryPhotos];
      const uploadedImagesData = await Promise.all(
        allPhotos.map(async ({ file }) => {
          return new Promise<{
            dataUrl: string;
            name: string;
            altText: string;
          }>((resolve) => {
            const reader = new FileReader();
            reader.onload = () => {
              resolve({
                dataUrl: reader.result as string,
                name: file.name,
                altText: generatedContent?.title || file.name,
              });
            };
            reader.readAsDataURL(file);
          });
        }),
      );

      const url = new URL(
        "/api/shopify/products/create",
        window.location.origin,
      );
      if (shop) {
        url.searchParams.append("shop", shop);
      }

      const finalCategory =
        suggestedCategory && suggestedCategory.confidence >= 0.6
          ? suggestedCategory.category
          : selectedTemplate;

      const response = await fetch(url.toString(), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          generatedContent,
          productData: {
            category: finalCategory,
            productType,
            sizing: availableSizing,
            template: selectedTemplate,
            fabricMaterial,
            occasionUse,
            targetAudience,
            keyFeatures,
            additionalNotes,
            colorVariants: detectedVariants,
          },
          uploadedImages: uploadedImagesData,
        }),
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || "Failed to create product in Shopify");
      }

      setProductCreated(data.data);
      setGeneratedContent(null);
    } catch (err) {
      logger.error("Error creating product in Shopify", err as Error, {
        component: "create-pd-page",
        operation: "handleCreateInShopify",
        shop,
      });
      setError(
        `Failed to create product in Shopify: ${err instanceof Error ? err.message : "Unknown error"}`,
      );
    } finally {
      setCreatingProduct(false);
    }
  };

  return (
    <>
      {/* Page Header */}
      <div
        style={{
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
          maxWidth: "800px",
          margin: "0 auto 24px auto",
          width: "100%",
        }}
      >
        <div>
          <h1
            style={{
              fontSize: "32px",
              fontWeight: 700,
              color: "#003366",
              margin: "0 0 4px 0",
              fontFamily:
                'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
            }}
          >
            Create New Product
          </h1>
          <p
            style={{
              fontSize: "14px",
              color: "#6b7280",
              margin: 0,
              fontFamily:
                'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
            }}
          >
            Generate product descriptions from images
          </p>
        </div>
        <button
          onClick={() =>
            (window.location.href = `/dashboard?${searchParams?.toString() || ""}`)
          }
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
          Back to Dashboard
        </button>
      </div>

      {/* Product Data Banner */}
      <ProductDataBanner
        dataLoading={dataLoading}
        dataLoadError={dataLoadError}
        prePopulatedData={prePopulatedData}
      />

      <section>
        {/* Step 1: Product Type Selection */}
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
              Step 1: What Product Are You Selling?
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
              Specify the primary product type first. This helps the AI focus on
              the correct item when analyzing images.
            </p>

            <ProductTypeSelector
              value={productType}
              onChange={setProductType}
              shopDomain={shop || undefined}
            />
          </div>
        </div>

        {/* Step 2: Primary Photos */}
        <PrimaryPhotoUpload
          photos={primaryPhotos}
          productType={productType}
          detectedVariants={detectedVariants}
          colorDetectionLoading={colorDetectionLoading}
          onPhotosAdd={handlePrimaryPhotosAdd}
          onPhotoRemove={handlePrimaryPhotoRemove}
          onVariantOverride={updateVariantOverride}
        />

        {/* Step 3: Secondary Photos */}
        <SecondaryPhotoUpload
          photos={secondaryPhotos}
          onPhotosAdd={handleSecondaryPhotosDrop}
          onPhotoRemove={removeSecondaryPhoto}
        />

        {/* Step 4 & 5: Product Details */}
        <div
          className="grid grid-cols-1 md:grid-cols-2"
          style={{
            maxWidth: "800px",
            margin: "0 auto",
            marginBottom: "32px",
            width: "100%",
            gap: "32px",
          }}
        >
          {/* Step 4: Product Details Card */}
          <div
            style={{
              background: "#ffffff",
              border: "1px solid #e5e7eb",
              borderRadius: "8px",
              boxShadow: "0 2px 8px rgba(0, 0, 0, 0.08)",
            }}
          >
            <div style={{ padding: "24px" }}>
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "16px",
                }}
              >
                <h2
                  style={{
                    fontSize: "20px",
                    fontWeight: 700,
                    color: "#003366",
                    margin: 0,
                    fontFamily:
                      'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
                  }}
                >
                  Step 4: Product Details
                </h2>

                {primaryPhotos.length === 0 && (
                  <div
                    style={{
                      background: "#eff6ff",
                      border: "1px solid #bfdbfe",
                      borderRadius: "8px",
                      padding: "16px",
                    }}
                  >
                    <p
                      style={{
                        fontSize: "14px",
                        color: "#003366",
                        margin: 0,
                        fontFamily:
                          'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
                      }}
                    >
                      Upload primary photos first, then manually select the
                      product category below
                    </p>
                  </div>
                )}

                {suggestedCategory && (
                  <div
                    style={{
                      background: "#f0fdf4",
                      border: "1px solid #bbf7d0",
                      borderRadius: "8px",
                      padding: "16px",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        gap: "8px",
                      }}
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
                        <span style={{ fontWeight: 700 }}>
                          Suggested Category:
                        </span>{" "}
                        {suggestedCategory.category}
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
                        Confidence:{" "}
                        {(suggestedCategory.confidence * 100).toFixed(0)}%
                        {suggestedCategory.confidence >= 0.6
                          ? " (Auto-assigned)"
                          : " (Please review)"}
                      </p>
                      {suggestedCategory.confidence < 0.6 && (
                        <button
                          onClick={() => {
                            setSelectedTemplate(
                              suggestedCategory.category as ProductCategory,
                            );
                            setCategoryDetected(true);
                          }}
                          style={{
                            background: "#16a34a",
                            color: "#ffffff",
                            border: "none",
                            borderRadius: "6px",
                            padding: "8px 16px",
                            fontSize: "12px",
                            fontWeight: 600,
                            fontFamily:
                              'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
                            cursor: "pointer",
                            alignSelf: "flex-start",
                          }}
                        >
                          Use This Suggestion
                        </button>
                      )}
                    </div>
                  </div>
                )}

                {/* Available Sizing */}
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: "8px",
                  }}
                >
                  <label
                    htmlFor="sizing-select"
                    style={{
                      fontSize: "14px",
                      fontWeight: 600,
                      color: "#003366",
                      fontFamily:
                        'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
                    }}
                  >
                    Available Sizing
                  </label>
                  <Select
                    value={availableSizing}
                    onValueChange={setAvailableSizing}
                  >
                    <SelectTrigger id="sizing-select">
                      <SelectValue placeholder="Select the available size range" />
                    </SelectTrigger>
                    <SelectContent>
                      {sizingOptions.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Product Templates */}
                <div style={{ marginTop: "8px" }}>
                  <CategoryTemplateSelector
                    value={selectedTemplate}
                    onChange={handleTemplateChange}
                    storeId={shop || "test-store"}
                    onPreview={setTemplatePreview}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Step 5: Additional Information Card */}
          <div
            style={{
              background: "#ffffff",
              border: "1px solid #e5e7eb",
              borderRadius: "8px",
              boxShadow: "0 2px 8px rgba(0, 0, 0, 0.08)",
            }}
          >
            <div style={{ padding: "24px" }}>
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "16px",
                }}
              >
                <h2
                  style={{
                    fontSize: "20px",
                    fontWeight: 700,
                    color: "#003366",
                    margin: 0,
                    fontFamily:
                      'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
                  }}
                >
                  Step 5: Additional Information
                </h2>

                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: "8px",
                  }}
                >
                  <label
                    htmlFor="fabric-material"
                    style={{
                      fontSize: "14px",
                      fontWeight: 600,
                      color: "#003366",
                      fontFamily:
                        'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
                    }}
                  >
                    Fabric/Material Content
                  </label>
                  <Textarea
                    id="fabric-material"
                    placeholder="e.g. 100% organic cotton, stainless steel, recycled plastic"
                    value={fabricMaterial}
                    onChange={(e) => setFabricMaterial(e.target.value)}
                    rows={2}
                  />
                </div>

                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: "8px",
                  }}
                >
                  <label
                    htmlFor="occasion-use"
                    style={{
                      fontSize: "14px",
                      fontWeight: 600,
                      color: "#003366",
                      fontFamily:
                        'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
                    }}
                  >
                    Occasion Use
                  </label>
                  <Textarea
                    id="occasion-use"
                    placeholder="e.g. outdoor activities, formal events, everyday use"
                    value={occasionUse}
                    onChange={(e) => setOccasionUse(e.target.value)}
                    rows={2}
                  />
                </div>

                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: "8px",
                  }}
                >
                  <label
                    htmlFor="target-audience"
                    style={{
                      fontSize: "14px",
                      fontWeight: 600,
                      color: "#003366",
                      fontFamily:
                        'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
                    }}
                  >
                    Target Audience
                  </label>
                  <Textarea
                    id="target-audience"
                    placeholder="e.g. young professionals, parents, fitness enthusiasts"
                    value={targetAudience}
                    onChange={(e) => setTargetAudience(e.target.value)}
                    rows={2}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Step 6: Features & Additional Details */}
        <Card
          style={{
            maxWidth: "800px",
            margin: "0 auto 32px auto",
            width: "100%",
          }}
        >
          <CardContent style={{ padding: "32px" }}>
            <div className="flex flex-col gap-4">
              <h2
                style={{
                  fontSize: "20px",
                  fontWeight: 600,
                  color: "#111827",
                  margin: "0 0 16px 0",
                }}
              >
                Step 6: Features & Additional Details
              </h2>

              <div className="space-y-2">
                <Label htmlFor="key-features">
                  List the main features and benefits
                </Label>
                <Textarea
                  id="key-features"
                  placeholder="e.g. waterproof, eco-friendly, machine washable, lifetime warranty"
                  value={keyFeatures}
                  onChange={(e) => setKeyFeatures(e.target.value)}
                  rows={3}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="additional-notes">Additional Notes</Label>
                <Textarea
                  id="additional-notes"
                  placeholder="Any other important information about this product"
                  value={additionalNotes}
                  onChange={(e) => setAdditionalNotes(e.target.value)}
                  rows={3}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Error Display */}
        {error && (
          <div
            style={{
              maxWidth: "800px",
              margin: "0 auto 24px auto",
              width: "100%",
            }}
          >
            <div
              style={{
                background: "#fff5f5",
                border: "1px solid #fecaca",
                borderRadius: "8px",
                padding: "16px",
              }}
            >
              <p
                style={{
                  fontSize: "14px",
                  color: "#b91c1c",
                  margin: 0,
                  fontFamily:
                    'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
                }}
              >
                {error}
              </p>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div
          style={{
            maxWidth: "800px",
            margin: "0 auto",
            width: "100%",
            display: "flex",
            justifyContent: "flex-end",
            gap: "12px",
          }}
        >
          <button
            onClick={() => window.history.back()}
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
            Cancel
          </button>
          <button
            onClick={handleGenerateDescription}
            disabled={
              primaryPhotos.length === 0 || !selectedTemplate || generating
            }
            style={{
              background:
                primaryPhotos.length === 0 || !selectedTemplate || generating
                  ? "#f9fafb"
                  : "#0066cc",
              color:
                primaryPhotos.length === 0 || !selectedTemplate || generating
                  ? "#6b7280"
                  : "#ffffff",
              border: "none",
              borderRadius: "8px",
              padding: "12px 24px",
              fontSize: "14px",
              fontWeight: 600,
              fontFamily:
                'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
              cursor:
                primaryPhotos.length === 0 || !selectedTemplate || generating
                  ? "not-allowed"
                  : "pointer",
              transition: "all 0.15s ease",
              display: "flex",
              alignItems: "center",
              gap: "8px",
            }}
          >
            {generating ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Generating...
              </>
            ) : (
              "Generate Description"
            )}
          </button>
        </div>
      </section>

      {/* Modals */}
      <GenerationModal
        open={showModal}
        onOpenChange={setShowModal}
        progress={progress}
      />

      <GeneratedContentModal
        content={generatedContent}
        onContentChange={setGeneratedContent}
        onClose={() => setGeneratedContent(null)}
        onRegenerate={() => {
          setGeneratedContent(null);
          handleGenerateDescription();
        }}
        onCreateInShopify={handleCreateInShopify}
        creatingProduct={creatingProduct}
      />

      <ProductCreatedModal
        data={productCreated}
        onClose={() => setProductCreated(null)}
      />
    </>
  );
}

export default function CreateProductPage() {
  return (
    <div
      style={{
        background: "#fafaf9",
        minHeight: "100vh",
        padding: "32px 16px",
      }}
    >
      <Suspense
        fallback={
          <div style={{ maxWidth: "1000px", margin: "0 auto" }}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "12px",
                padding: "48px",
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
                Loading Create Product Page...
              </p>
            </div>
          </div>
        }
      >
        <CreateProductContent />
      </Suspense>
    </div>
  );
}
