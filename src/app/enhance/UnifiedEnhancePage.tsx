"use client";

export const dynamic = "force-dynamic";

import { useState, useCallback, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { useShop } from "@/hooks/useShop";
import Image from "next/image";
import {
  ProductImageUpload,
  type UploadedFile,
} from "@/app/components/shared/ProductImageUpload";
import { ProductDetailsForm } from "@/app/components/shared/ProductDetailsForm";
import { AdditionalInfoForm } from "@/app/components/shared/AdditionalInfoForm";
import EnhancedContentComparison from "@/app/components/shared/EnhancedContentComparison";
import { type ProductCategory } from "@/lib/prompts-types";
import {
  fetchProductDataForEnhancement,
  type EnhancementProductData,
} from "@/lib/shopify/product-enhancement";
import { useShopifyAuth } from "@/app/components/ShopifyAuthProvider";
import { ProductSelector } from "./components/ProductSelector";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
  Loader2,
  X,
  ArrowLeft,
  CheckCircle2,
  PenTool,
  Package,
  Sparkles,
  ExternalLink,
  AlertCircle,
  Wand2,
  Info,
} from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { logger } from "@/lib/logger";

interface EnhancementOptions {
  generateTitle: boolean;
  enhanceDescription: boolean;
  generateSEO: boolean;
  updateImages: boolean;
}

export default function UnifiedEnhancePage() {
  const searchParams = useSearchParams();
  const { shop: authShop, authenticatedFetch } = useShopifyAuth();
  const { shop: shopFromHook, shopId, isUuidRouting } = useShop();

  const productId = searchParams?.get("productId") || "";
  const shop =
    shopFromHook || authShop || "zunosai-staging-test-store.myshopify.com";

  // Product data states
  const [productData, setProductData] = useState<EnhancementProductData | null>(
    null,
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [updateResult, setUpdateResult] = useState<Record<
    string,
    unknown
  > | null>(null);

  // Image states
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [useExistingImages, setUseExistingImages] = useState(true);

  // Form states
  const [parentCategory, setParentCategory] = useState("");
  const [availableSizing, setAvailableSizing] = useState("");
  const [selectedTemplate, setSelectedTemplate] =
    useState<ProductCategory>("general");
  const [templatePreview, setTemplatePreview] = useState<
    { name: string; description: string; sections?: string[] } | undefined
  >(undefined);

  const [fabricMaterial, setFabricMaterial] = useState("");
  const [occasionUse, setOccasionUse] = useState("");
  const [keyFeatures, setKeyFeatures] = useState("");
  const [additionalNotes, setAdditionalNotes] = useState("");

  // Enhancement options - all three main options enabled by default
  const [enhancementOptions, setEnhancementOptions] =
    useState<EnhancementOptions>({
      generateTitle: true,
      enhanceDescription: true,
      generateSEO: true,
      updateImages: false,
    });

  // Generation states
  const [generating, setGenerating] = useState(false);
  const [generatedContent, setGeneratedContent] = useState<Record<
    string,
    unknown
  > | null>(null);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [applying, setApplying] = useState(false);
  const [progress, setProgress] = useState(0);

  // Track which fields were auto-populated from Shopify
  const [autoPopulatedFields, setAutoPopulatedFields] = useState<string[]>([]);

  // Load product data function
  const loadProduct = useCallback(async () => {
    if (!productId || productId.trim() === "" || !shop) {
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const isTestStore = shop.includes("zunosai-staging-test-store");
      const isEmbedded =
        typeof window !== "undefined" && window.top !== window.self;

      const fetchMethod =
        isTestStore && !isEmbedded ? undefined : authenticatedFetch;
      const data = await fetchProductDataForEnhancement(
        productId,
        shop,
        null,
        fetchMethod,
      );

      if (data) {
        setProductData(data);
        const populatedFields: string[] = [];

        if (data.productType) {
          setParentCategory(data.productType.toLowerCase());
          populatedFields.push("parentCategory");
        }

        if (data.variants && data.variants.length > 0) {
          const sizes = data.variants
            .filter(
              (v) =>
                "selectedOptions" in v &&
                v.selectedOptions &&
                Array.isArray(v.selectedOptions) &&
                v.selectedOptions.some(
                  (opt) => opt && opt.name && opt.name.toLowerCase() === "size",
                ),
            )
            .map((v) => {
              if ("selectedOptions" in v && Array.isArray(v.selectedOptions)) {
                const sizeOption = v.selectedOptions.find(
                  (opt) => opt && opt.name && opt.name.toLowerCase() === "size",
                );
                return sizeOption?.value;
              }
              return undefined;
            })
            .filter(Boolean);

          if (sizes.length > 0) {
            const uniqueSizes = [...new Set(sizes)];
            if (uniqueSizes.includes("XS") && uniqueSizes.includes("XL")) {
              setAvailableSizing("xs-xl");
              populatedFields.push("availableSizing");
            } else if (
              uniqueSizes.includes("XS") &&
              uniqueSizes.includes("XXL")
            ) {
              setAvailableSizing("xs-xxl");
              populatedFields.push("availableSizing");
            } else if (
              uniqueSizes.includes("S") &&
              uniqueSizes.includes("XXXL")
            ) {
              setAvailableSizing("s-xxxl");
              populatedFields.push("availableSizing");
            } else if (
              uniqueSizes.length === 1 &&
              uniqueSizes[0] === "One Size"
            ) {
              setAvailableSizing("onesize");
              populatedFields.push("availableSizing");
            }
          }
        }

        // Extract materials from tags
        let extractedFabric = "";
        if (data.tags) {
          const tags = data.tags;
          const tagsArray: string[] = Array.isArray(tags)
            ? tags
            : typeof tags === "string"
              ? (tags as string).split(",").map((t) => t.trim())
              : [];
          const materials = tagsArray
            .filter(
              (tag) =>
                tag.toLowerCase().includes("cotton") ||
                tag.toLowerCase().includes("polyester") ||
                tag.toLowerCase().includes("wool") ||
                tag.toLowerCase().includes("silk"),
            )
            .join(", ");
          if (materials) {
            extractedFabric = materials;
            setFabricMaterial(materials);
            populatedFields.push("fabricMaterial");
          }
        }

        // Extract key features from bullet points
        if (data.originalDescription) {
          const features = data.originalDescription
            .split("\n")
            .filter(
              (line) =>
                line.trim().startsWith("•") || line.trim().startsWith("-"),
            )
            .map((line) => line.replace(/^[•\-]\s*/, ""))
            .join("\n");
          if (features) {
            setKeyFeatures(features);
            populatedFields.push("keyFeatures");
          }
        }

        // Intelligent extraction from description text
        if (data.originalDescription) {
          const descText = data.originalDescription.toLowerCase();

          // Extract fabric/material if not already set from tags
          if (!extractedFabric) {
            /* eslint-disable security/detect-unsafe-regex -- Patterns are bounded with {1,20} quantifiers and tested */
            const fabricPatterns = [
              /(?:made (?:of|from|with)|crafted (?:from|in)|featuring|in) (?:a )?(?:soft |lightweight |premium |luxurious |breathable |cozy |comfortable )?([a-z]{1,20}(?: [a-z]{1,20})? (?:fabric|cotton|polyester|wool|silk|linen|cashmere|velvet|satin|denim|jersey|knit|fleece|chiffon|organza|tweed|corduroy|suede|leather|lace|mesh|rayon|viscose|nylon|spandex|lycra|elastane|modal|bamboo|hemp))/i,
              /(?:lightweight|soft|premium|luxurious|breathable|cozy|comfortable) ([a-z]{1,20}(?: [a-z]{1,20})? (?:fabric|material|blend))/i,
              /((?:cotton|polyester|wool|silk|linen|cashmere|velvet|satin|denim|jersey|knit|fleece|chiffon|organza|tweed|corduroy|suede|leather|lace|mesh|rayon|viscose|nylon|spandex|lycra|elastane|modal|bamboo|hemp)(?: blend)?)/i,
            ];
            /* eslint-enable security/detect-unsafe-regex */

            for (const pattern of fabricPatterns) {
              const match = data.originalDescription.match(pattern);
              if (match && match[1]) {
                setFabricMaterial(match[1].trim());
                if (!populatedFields.includes("fabricMaterial")) {
                  populatedFields.push("fabricMaterial");
                }
                break;
              }
            }
          }

          // Extract occasion/use cases
          const occasionKeywords = [
            "beach",
            "vacation",
            "resort",
            "poolside",
            "summer",
            "spring",
            "casual",
            "everyday",
            "daily",
            "weekend",
            "relaxed",
            "evening",
            "night out",
            "dinner",
            "date night",
            "cocktail",
            "formal",
            "office",
            "work",
            "professional",
            "business",
            "wedding",
            "party",
            "celebration",
            "special occasion",
            "workout",
            "gym",
            "athletic",
            "sports",
            "active",
            "outdoor",
            "hiking",
            "travel",
            "lounging",
            "cozy",
          ];

          const foundOccasions: string[] = [];
          for (const keyword of occasionKeywords) {
            if (descText.includes(keyword)) {
              // Capitalize first letter
              foundOccasions.push(
                keyword.charAt(0).toUpperCase() + keyword.slice(1),
              );
            }
          }

          // Also look for phrases like "perfect for", "ideal for", "great for"
          const occasionPhraseMatch = data.originalDescription.match(
            /(?:perfect|ideal|great|designed|made) for (?:a )?([^.]+?)(?:\.|,|$)/gi,
          );
          if (occasionPhraseMatch) {
            for (const match of occasionPhraseMatch) {
              const occasion = match
                .replace(
                  /(?:perfect|ideal|great|designed|made) for (?:a )?/i,
                  "",
                )
                .replace(/[.,]$/, "")
                .trim();
              if (occasion.length > 3 && occasion.length < 50) {
                foundOccasions.push(occasion);
              }
            }
          }

          if (foundOccasions.length > 0) {
            // Remove duplicates and limit to 5
            const uniqueOccasions = [...new Set(foundOccasions)].slice(0, 5);
            setOccasionUse(uniqueOccasions.join(", "));
            populatedFields.push("occasionUse");
          }
        }

        if (data.productType) {
          const type = data.productType.toLowerCase();
          if (
            type.includes("cloth") ||
            type.includes("apparel") ||
            type.includes("shirt") ||
            type.includes("dress")
          ) {
            setSelectedTemplate("womens_clothing");
            populatedFields.push("selectedTemplate");
          } else if (type.includes("jewelry") || type.includes("accessory")) {
            setSelectedTemplate("jewelry_accessories");
            populatedFields.push("selectedTemplate");
          } else {
            setSelectedTemplate("general");
          }
        }

        // Set auto-populated fields state
        if (populatedFields.length > 0) {
          setAutoPopulatedFields(populatedFields);
        }
      }
    } catch (err) {
      logger.error("Error loading product:", err as Error, {
        component: "UnifiedEnhancePage",
      });
      setError(err instanceof Error ? err.message : "Failed to load product");
    } finally {
      setLoading(false);
    }
  }, [productId, shop, authenticatedFetch]);

  useEffect(() => {
    loadProduct();
  }, [loadProduct]);

  const parentCategoryOptions = [
    { label: "Select a parent category", value: "" },
    { label: "Clothing", value: "clothing" },
    { label: "Accessories", value: "accessories" },
    { label: "Home & Living", value: "home" },
    { label: "Beauty", value: "beauty" },
    { label: "Electronics", value: "electronics" },
  ];

  const sizingOptions = [
    { label: "Select sizing range", value: "" },
    { label: "XS - XL (XS, S, M, L, XL)", value: "xs-xl" },
    { label: "XS - XXL (XS, S, M, L, XL, XXL)", value: "xs-xxl" },
    { label: "S - XXXL (S, M, L, XL, XXL, XXXL)", value: "s-xxxl" },
    { label: "One Size", value: "onesize" },
    { label: "Numeric (28-44)", value: "numeric-28-44" },
    { label: "Children (2T-14)", value: "children" },
  ];

  const handleGenerate = async () => {
    setGenerating(true);
    setProgress(0);

    const progressInterval = setInterval(() => {
      setProgress((prev) => Math.min(prev + 10, 90));
    }, 500);

    try {
      const formData = new FormData();

      if (
        useExistingImages &&
        productData?.images &&
        productData.images.length > 0
      ) {
        productData.images.forEach((img) => {
          if (
            img.url &&
            img.url.length > 0 &&
            (img.url.startsWith("http") || img.url.startsWith("//"))
          ) {
            formData.append("existingImages", img.url);
          } else {
            console.warn("⚠️ Skipping invalid image URL:", img);
          }
        });
      } else {
        console.log(
          "📸 No existing images to add or useExistingImages is false",
        );
      }
      uploadedFiles.forEach((file) => formData.append("images", file.file));

      let detectedSizing = "";
      if (productData?.variants && productData.variants.length > 0) {
        const sizes = productData.variants
          .filter(
            (v) =>
              "selectedOptions" in v &&
              v.selectedOptions &&
              Array.isArray(v.selectedOptions) &&
              v.selectedOptions.some(
                (opt) => opt && opt.name && opt.name.toLowerCase() === "size",
              ),
          )
          .map((v) => {
            if ("selectedOptions" in v && Array.isArray(v.selectedOptions)) {
              const sizeOption = v.selectedOptions.find(
                (opt) => opt && opt.name && opt.name.toLowerCase() === "size",
              );
              return sizeOption?.value;
            }
            return undefined;
          })
          .filter(Boolean);

        if (sizes.length > 0) {
          detectedSizing = [...new Set(sizes)].join(", ");
        }
      }

      formData.append("productId", productId || "");
      formData.append("shop", shop || "");
      formData.append("template", selectedTemplate);
      formData.append(
        "parentCategory",
        productData?.productType || parentCategory || "general",
      );
      formData.append("availableSizing", detectedSizing || "Not specified");
      formData.append("fabricMaterial", fabricMaterial);
      formData.append("occasionUse", occasionUse);
      formData.append("keyFeatures", keyFeatures);
      formData.append("additionalNotes", additionalNotes);
      formData.append("enhancementOptions", JSON.stringify(enhancementOptions));

      const isTestStore = shop?.includes("zunosai-staging-test-store");
      const isEmbedded =
        typeof window !== "undefined" && window.top !== window.self;

      let response;
      if (isTestStore && !isEmbedded) {
        response = await fetch("/api/enhance", {
          method: "POST",
          body: formData,
        });
      } else {
        response = await authenticatedFetch("/api/enhance", {
          method: "POST",
          body: formData,
        });
      }

      if (!response.ok) {
        const errorData = await response.json();
        logger.error("Enhancement API error:", errorData as Error, {
          component: "UnifiedEnhancePage",
        });
        throw new Error(
          errorData.error || `Failed to generate content: ${response.status}`,
        );
      }

      const result = await response.json();
      setGeneratedContent(result.data);
      setProgress(100);
      setShowPreviewModal(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Generation failed");
    } finally {
      clearInterval(progressInterval);
      setGenerating(false);
    }
  };

  const handleApplyChanges = async (editedContent: {
    title?: string;
    description?: string;
    seoTitle?: string;
    seoDescription?: string;
    bulletPoints?: string[];
  }) => {
    setApplying(true);
    setError(null);

    try {
      if (editedContent.description) {
        console.log(
          "📝 Description preview (first 200 chars):",
          editedContent.description.substring(0, 200),
        );
        console.log("📏 Description length:", editedContent.description.length);
      }

      const isTestStore = shop?.includes("zunosai-staging-test-store");
      const isEmbedded =
        typeof window !== "undefined" && window.top !== window.self;

      let response;
      if (isTestStore && !isEmbedded) {
        response = await fetch(`/api/products/update`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            shop: shop || "zunosai-staging-test-store.myshopify.com",
            productId: productId,
            updates: editedContent,
          }),
        });
      } else {
        response = await authenticatedFetch(`/api/products/update`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            shop: shop || "zunosai-staging-test-store.myshopify.com",
            productId: productId,
            updates: editedContent,
          }),
        });
      }

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Failed to apply changes");
      }

      if (productData) {
        const updatedData = { ...productData };

        if (editedContent.title !== undefined && editedContent.title !== null) {
          updatedData.title = editedContent.title;
        }
        if (
          editedContent.description !== undefined &&
          editedContent.description !== null
        ) {
          updatedData.originalDescription = editedContent.description;
        }

        if (editedContent.seoTitle !== undefined) {
          updatedData.seoTitle = editedContent.seoTitle;
        }
        if (editedContent.seoDescription !== undefined) {
          updatedData.seoDescription = editedContent.seoDescription;
        }

        setProductData(updatedData);
      }

      const message = "Updates have been successfully applied to the product.";

      setSuccessMessage(message);
      setUpdateResult(result);
      setShowPreviewModal(false);
      setGeneratedContent(null);
      setShowSuccessModal(true);
    } catch (err) {
      logger.error("Error applying changes:", err as Error, {
        component: "UnifiedEnhancePage",
      });
      setError(err instanceof Error ? err.message : "Failed to apply changes");
    } finally {
      setApplying(false);
    }
  };

  const isFormValid = () => {
    return !!productData;
  };

  // Product selection state
  if (!productId) {
    return (
      <ProductSelector
        shop={shop || "zunosai-staging-test-store"}
        onProductSelect={(id) => {
          const params = new URLSearchParams(window.location.search);
          params.set("productId", id);
          // Use UUID routing if we're in a /stores/{shopId}/ route, otherwise use legacy route
          if (isUuidRouting && shopId) {
            window.location.href = `/stores/${shopId}/enhance?${params}`;
          } else {
            window.location.href = `/enhance?${params}`;
          }
        }}
      />
    );
  }

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <main className="max-w-4xl mx-auto px-6 py-8">
          {/* Header skeleton */}
          <div className="mb-8">
            <div className="flex items-center gap-4 mb-6">
              <div className="w-12 h-12 rounded-xl bg-gray-200 animate-pulse" />
              <div>
                <div className="h-7 w-64 bg-gray-200 rounded animate-pulse mb-2" />
                <div className="h-4 w-48 bg-gray-100 rounded animate-pulse" />
              </div>
            </div>
          </div>

          {/* Content skeleton */}
          <div className="space-y-6">
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <div className="h-6 w-32 bg-gray-200 rounded animate-pulse mb-4" />
              <div className="h-40 bg-gray-100 rounded animate-pulse" />
            </div>
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <div className="h-6 w-48 bg-gray-200 rounded animate-pulse mb-4" />
              <div className="space-y-3">
                {[1, 2, 3, 4].map((i) => (
                  <div
                    key={i}
                    className="h-5 bg-gray-100 rounded animate-pulse"
                  />
                ))}
              </div>
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <>
      <div className="min-h-screen bg-gray-50">
        <main className="max-w-4xl mx-auto px-6 py-8">
          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center justify-between flex-wrap gap-4 mb-4">
              <div className="flex items-center gap-4">
                <div
                  className="w-12 h-12 rounded-xl flex items-center justify-center"
                  style={{
                    background:
                      "linear-gradient(135deg, #0066cc 0%, #0099ff 100%)",
                  }}
                >
                  <PenTool className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">
                    Enhance an Existing Product Description
                  </h1>
                  {productData && (
                    <p className="text-gray-500 text-sm">{productData.title}</p>
                  )}
                </div>
              </div>
              <Button
                variant="outline"
                className="border-gray-200 hover:bg-gray-50"
                onClick={() => {
                  // Use UUID routing if available, otherwise use legacy route
                  if (isUuidRouting && shopId) {
                    window.location.href = `/stores/${shopId}/dashboard`;
                  } else {
                    window.location.href = `/dashboard?shop=${shop}`;
                  }
                }}
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Dashboard
              </Button>
            </div>
          </div>

          {/* Error Alert */}
          {error && (
            <Alert variant="destructive" className="mb-6">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription className="flex-1">{error}</AlertDescription>
              <Button
                variant="ghost"
                size="sm"
                className="ml-auto"
                onClick={() => setError(null)}
              >
                <X className="h-4 w-4" />
              </Button>
            </Alert>
          )}

          {/* Product Info Card */}
          {productData && (
            <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
              <div className="flex items-start gap-4">
                {productData.images?.[0]?.url && (
                  <Image
                    src={productData.images[0].url}
                    alt={productData.title}
                    width={80}
                    height={80}
                    className="w-20 h-20 object-cover rounded-lg"
                    unoptimized
                  />
                )}
                <div className="flex-1">
                  <h2 className="text-lg font-semibold text-gray-900 mb-1">
                    {productData.title}
                  </h2>
                  <div className="flex flex-wrap gap-2 text-sm text-gray-500">
                    <span className="px-2 py-1 bg-gray-100 rounded">
                      SKU: {productData.variants[0]?.sku || "N/A"}
                    </span>
                    <span className="px-2 py-1 bg-gray-100 rounded">
                      Type: {productData.productType || "N/A"}
                    </span>
                    <span className="px-2 py-1 bg-gray-100 rounded">
                      Vendor: {productData.vendor || "N/A"}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Smart Fill Indicator */}
          {autoPopulatedFields.length > 0 && (
            <TooltipProvider>
              <div className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-xl p-4 mb-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-green-100">
                      <Wand2 className="w-5 h-5 text-green-600" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-sm font-semibold text-green-800">
                          Smart Fill Applied
                        </h3>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <button
                              type="button"
                              className="text-green-600 hover:text-green-700"
                            >
                              <Info className="w-4 h-4" />
                            </button>
                          </TooltipTrigger>
                          <TooltipContent side="top" className="max-w-xs p-3">
                            <p className="text-sm">
                              We analyzed your Shopify product data and
                              pre-filled fields to save you time. You can edit
                              any field before generating.
                            </p>
                          </TooltipContent>
                        </Tooltip>
                      </div>
                      <p className="text-xs text-green-600">
                        {autoPopulatedFields.length} field
                        {autoPopulatedFields.length !== 1 ? "s" : ""}{" "}
                        auto-filled from your Shopify data
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {autoPopulatedFields.includes("parentCategory") && (
                      <span className="px-2 py-1 bg-green-100 text-green-700 text-xs font-medium rounded-full">
                        Category
                      </span>
                    )}
                    {autoPopulatedFields.includes("availableSizing") && (
                      <span className="px-2 py-1 bg-green-100 text-green-700 text-xs font-medium rounded-full">
                        Sizing
                      </span>
                    )}
                    {autoPopulatedFields.includes("fabricMaterial") && (
                      <span className="px-2 py-1 bg-green-100 text-green-700 text-xs font-medium rounded-full">
                        Material
                      </span>
                    )}
                    {autoPopulatedFields.includes("occasionUse") && (
                      <span className="px-2 py-1 bg-green-100 text-green-700 text-xs font-medium rounded-full">
                        Occasion
                      </span>
                    )}
                    {autoPopulatedFields.includes("keyFeatures") && (
                      <span className="px-2 py-1 bg-green-100 text-green-700 text-xs font-medium rounded-full">
                        Features
                      </span>
                    )}
                    {autoPopulatedFields.includes("selectedTemplate") && (
                      <span className="px-2 py-1 bg-green-100 text-green-700 text-xs font-medium rounded-full">
                        Template
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </TooltipProvider>
          )}

          {/* Main Form */}
          <div className="space-y-6">
            {/* Images Section */}
            <ProductImageUpload
              title="Product Images"
              description="Add new images or use existing ones for AI analysis"
              existingImages={productData?.images?.map((img) => img.url) || []}
              useExistingImages={useExistingImages}
              onFilesAdded={setUploadedFiles}
              onExistingImagesToggle={setUseExistingImages}
              maxFiles={5}
            />

            {/* Enhancement Options */}
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div
                    className="w-10 h-10 rounded-lg flex items-center justify-center"
                    style={{ background: "rgba(0, 102, 204, 0.1)" }}
                  >
                    <Sparkles
                      className="w-5 h-5"
                      style={{ color: "#0066cc" }}
                    />
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold text-gray-900">
                      Enhancement Options
                    </h2>
                    <p className="text-sm text-gray-500">
                      Choose what to generate
                    </p>
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="border-gray-200"
                  onClick={() => {
                    const allSelected =
                      enhancementOptions.generateTitle &&
                      enhancementOptions.enhanceDescription &&
                      enhancementOptions.generateSEO;

                    setEnhancementOptions({
                      generateTitle: !allSelected,
                      enhanceDescription: !allSelected,
                      generateSEO: !allSelected,
                      updateImages: false,
                    });
                  }}
                >
                  {enhancementOptions.generateTitle &&
                  enhancementOptions.enhanceDescription &&
                  enhancementOptions.generateSEO
                    ? "Deselect All"
                    : "Select All"}
                </Button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {[
                  {
                    id: "generateTitle",
                    label: "Generate new title",
                    checked: enhancementOptions.generateTitle,
                  },
                  {
                    id: "enhanceDescription",
                    label: "Enhance description",
                    checked: enhancementOptions.enhanceDescription,
                  },
                  {
                    id: "generateSEO",
                    label: "Generate SEO metadata",
                    checked: enhancementOptions.generateSEO,
                  },
                ].map((option) => (
                  <div
                    key={option.id}
                    className={`flex items-center space-x-3 p-4 rounded-lg border transition-colors ${
                      option.checked
                        ? "border-blue-200 bg-blue-50/50"
                        : "border-gray-200 hover:border-gray-300"
                    }`}
                  >
                    <Checkbox
                      id={option.id}
                      checked={option.checked}
                      onCheckedChange={(checked) =>
                        setEnhancementOptions((prev) => ({
                          ...prev,
                          [option.id]: checked as boolean,
                        }))
                      }
                    />
                    <Label htmlFor={option.id} className="cursor-pointer">
                      {option.label}
                    </Label>
                  </div>
                ))}
              </div>
            </div>

            {/* Product Details */}
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <div className="flex items-center gap-3 mb-6">
                <div
                  className="w-10 h-10 rounded-lg flex items-center justify-center"
                  style={{ background: "rgba(0, 102, 204, 0.1)" }}
                >
                  <Package className="w-5 h-5" style={{ color: "#0066cc" }} />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">
                    Product Details
                  </h2>
                  <p className="text-sm text-gray-500">
                    Category and template settings
                  </p>
                </div>
              </div>
              <ProductDetailsForm
                mode="enhance"
                parentCategory={parentCategory}
                setParentCategory={setParentCategory}
                parentCategoryOptions={parentCategoryOptions}
                availableSizing={availableSizing}
                setAvailableSizing={setAvailableSizing}
                sizingOptions={sizingOptions}
                selectedTemplate={selectedTemplate}
                setSelectedTemplate={setSelectedTemplate}
                templatePreview={templatePreview}
                setTemplatePreview={setTemplatePreview}
              />
            </div>

            {/* Additional Information */}
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <AdditionalInfoForm
                mode="enhance"
                fabricMaterial={fabricMaterial}
                setFabricMaterial={setFabricMaterial}
                occasionUse={occasionUse}
                setOccasionUse={setOccasionUse}
                keyFeatures={keyFeatures}
                setKeyFeatures={setKeyFeatures}
                additionalNotes={additionalNotes}
                setAdditionalNotes={setAdditionalNotes}
              />
            </div>

            {/* Action Buttons */}
            <div className="flex justify-end gap-3 pt-4 pb-8">
              <Button
                variant="outline"
                size="lg"
                className="border-gray-200"
                onClick={() => {
                  if (isUuidRouting && shopId) {
                    window.location.href = `/stores/${shopId}/dashboard`;
                  } else {
                    window.location.href = `/dashboard?shop=${shop}`;
                  }
                }}
              >
                Cancel
              </Button>
              <Button
                size="lg"
                className="px-8"
                style={{
                  background:
                    "linear-gradient(135deg, #0066cc 0%, #0099ff 100%)",
                  border: "none",
                }}
                onClick={handleGenerate}
                disabled={!isFormValid() || generating}
              >
                {generating ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Generating...
                  </>
                ) : !productData ? (
                  "Loading Product Data..."
                ) : (
                  <>
                    <Sparkles className="mr-2 h-4 w-4" />
                    Generate Enhanced Content
                  </>
                )}
              </Button>
            </div>
          </div>
        </main>
      </div>

      {/* Progress Modal */}
      <Dialog open={generating} onOpenChange={() => {}}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="w-5 h-5" style={{ color: "#0066cc" }} />
              Generating Enhanced Content
            </DialogTitle>
            <DialogDescription>
              AI is analyzing your product and generating enhanced content...
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <Progress value={progress} className="w-full h-2" />
            <p className="text-sm text-gray-600 text-center">
              {progress < 30
                ? "🔍 Preparing images for analysis..."
                : progress < 60
                  ? "🤖 Analyzing with GPT-4 Vision..."
                  : progress < 90
                    ? "✍️ Generating enhanced descriptions..."
                    : "✨ Finalizing your content..."}
            </p>
          </div>
        </DialogContent>
      </Dialog>

      {/* Success Modal */}
      <Dialog open={showSuccessModal} onOpenChange={setShowSuccessModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-green-600" />
              Product Updated Successfully
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {successMessage && (
              <Alert className="bg-green-50 border-green-200">
                <AlertDescription className="text-green-700">
                  {successMessage}
                </AlertDescription>
              </Alert>
            )}
            {updateResult && Boolean(updateResult.shopifyResult) && (
              <div className="space-y-2">
                <p className="text-sm text-gray-600">
                  The following changes have been applied:
                </p>
                <div className="space-y-1 text-sm">
                  {updateResult.updates &&
                  typeof updateResult.updates === "object" ? (
                    <>
                      {"title" in updateResult.updates &&
                      (updateResult.updates as Record<string, unknown>)
                        .title ? (
                        <p className="flex items-center gap-2">
                          <CheckCircle2 className="w-4 h-4 text-green-500" />
                          Title updated
                        </p>
                      ) : null}
                      {"description" in updateResult.updates &&
                      (updateResult.updates as Record<string, unknown>)
                        .description ? (
                        <p className="flex items-center gap-2">
                          <CheckCircle2 className="w-4 h-4 text-green-500" />
                          Description updated
                        </p>
                      ) : null}
                      {"seoTitle" in updateResult.updates &&
                      (updateResult.updates as Record<string, unknown>)
                        .seoTitle ? (
                        <p className="flex items-center gap-2">
                          <CheckCircle2 className="w-4 h-4 text-green-500" />
                          SEO title updated
                        </p>
                      ) : null}
                      {"seoDescription" in updateResult.updates &&
                      (updateResult.updates as Record<string, unknown>)
                        .seoDescription ? (
                        <p className="flex items-center gap-2">
                          <CheckCircle2 className="w-4 h-4 text-green-500" />
                          SEO meta description updated
                        </p>
                      ) : null}
                      {"bulletPoints" in updateResult.updates &&
                      (updateResult.updates as Record<string, unknown>)
                        .bulletPoints ? (
                        <p className="flex items-center gap-2">
                          <CheckCircle2 className="w-4 h-4 text-green-500" />
                          Bullet points added
                        </p>
                      ) : null}
                    </>
                  ) : null}
                </div>
              </div>
            )}
            <p className="text-sm text-gray-500">
              Click &quot;View Product&quot; to see the updated product in your
              Shopify admin.
            </p>
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => {
                setShowSuccessModal(false);
                setSuccessMessage(null);
                setUpdateResult(null);
              }}
            >
              Close
            </Button>
            <Button
              style={{
                background: "linear-gradient(135deg, #0066cc 0%, #0099ff 100%)",
                border: "none",
              }}
              onClick={() => {
                // Use the resolved shopDomain from API response (handles standalone users with email → domain resolution)
                const resolvedDomain = (updateResult as Record<string, unknown>)
                  ?.shopDomain as string | undefined;
                const shopDomain = (resolvedDomain || shop)?.replace(
                  ".myshopify.com",
                  "",
                );
                const adminUrl = `https://admin.shopify.com/store/${shopDomain}/products/${productId?.split("/").pop()}`;
                window.open(adminUrl, "_blank");
              }}
            >
              View Product
              <ExternalLink className="w-4 h-4 ml-2" />
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Content Comparison Modal */}
      <EnhancedContentComparison
        active={showPreviewModal}
        onClose={() => {
          setShowPreviewModal(false);
          setError(null);
        }}
        onApply={handleApplyChanges}
        originalContent={{
          title: productData?.title || "",
          description: productData?.originalDescription || "",
          seoTitle: productData?.seoTitle || "",
          seoDescription: productData?.seoDescription || "",
          promoText: "",
        }}
        enhancedContent={generatedContent || {}}
        loading={applying}
      />
    </>
  );
}
