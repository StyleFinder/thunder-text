"use client";

// Force dynamic rendering for this page
export const dynamic = "force-dynamic";

import { useState, useCallback, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { ProductImageUpload, type UploadedFile } from "@/app/components/shared/ProductImageUpload";
import { ProductDetailsForm } from "@/app/components/shared/ProductDetailsForm";
import { AdditionalInfoForm } from "@/app/components/shared/AdditionalInfoForm";
import EnhancedContentComparison from "@/app/components/shared/EnhancedContentComparison";
import { type ProductCategory } from "@/lib/prompts";
import {
  fetchProductDataForEnhancement,
  type EnhancementProductData,
} from "@/lib/shopify/product-enhancement";
import { useShopifyAuth } from "@/app/components/ShopifyAuthProvider";
import { ProductSelector } from "./components/ProductSelector";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Loader2, X, ChevronLeft, CheckCircle2 } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { PAGE_HEADER_STYLES, PAGE_SECTION_STYLES } from '@/app/styles/layout-constants';
import { logger } from '@/lib/logger'

interface EnhancementOptions {
  generateTitle: boolean;
  enhanceDescription: boolean;
  generateSEO: boolean;
  createPromo: boolean;
  updateImages: boolean;
}

export default function UnifiedEnhancePage() {
  const searchParams = useSearchParams();
  const { shop: authShop, authenticatedFetch } = useShopifyAuth();

  const productId = searchParams?.get("productId") || "";
  const shop =
    searchParams?.get("shop") ||
    authShop ||
    "zunosai-staging-test-store.myshopify.com";

  // Product data states
  const [productData, setProductData] = useState<EnhancementProductData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [updateResult, setUpdateResult] = useState<Record<string, unknown> | null>(null);

  // Image states
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [useExistingImages, setUseExistingImages] = useState(true);

  // Form states
  const [parentCategory, setParentCategory] = useState("");
  const [availableSizing, setAvailableSizing] = useState("");
  const [selectedTemplate, setSelectedTemplate] = useState<ProductCategory>("general");
  const [templatePreview, setTemplatePreview] = useState<
    { name: string; description: string; sections?: string[] } | undefined
  >(undefined);

  const [fabricMaterial, setFabricMaterial] = useState("");
  const [occasionUse, setOccasionUse] = useState("");
  const [targetAudience, setTargetAudience] = useState("");
  const [keyFeatures, setKeyFeatures] = useState("");
  const [additionalNotes, setAdditionalNotes] = useState("");

  // Enhancement options
  const [enhancementOptions, setEnhancementOptions] = useState<EnhancementOptions>({
    generateTitle: false,
    enhanceDescription: true,
    generateSEO: true,
    createPromo: false,
    updateImages: false,
  });

  // Generation states
  const [generating, setGenerating] = useState(false);
  const [generatedContent, setGeneratedContent] = useState<Record<string, unknown> | null>(null);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [applying, setApplying] = useState(false);
  const [progress, setProgress] = useState(0);

  // Load product data function
  const loadProduct = useCallback(async () => {
    if (!productId || productId.trim() === "" || !shop) {
      console.log("Missing required params:", { productId, shop });
      return;
    }

    setLoading(true);
    setError(null);

    try {
      console.log("Loading product data for:", { productId, shop });
      const isTestStore = shop.includes("zunosai-staging-test-store");
      const isEmbedded = typeof window !== "undefined" && window.top !== window.self;

      const fetchMethod = isTestStore && !isEmbedded ? undefined : authenticatedFetch;
      const data = await fetchProductDataForEnhancement(productId, shop, null, fetchMethod);

      if (data) {
        setProductData(data);

        if (data.productType) {
          setParentCategory(data.productType.toLowerCase());
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
            } else if (uniqueSizes.includes("XS") && uniqueSizes.includes("XXL")) {
              setAvailableSizing("xs-xxl");
            } else if (uniqueSizes.includes("S") && uniqueSizes.includes("XXXL")) {
              setAvailableSizing("s-xxxl");
            } else if (uniqueSizes.length === 1 && uniqueSizes[0] === "One Size") {
              setAvailableSizing("onesize");
            }
          }
        }

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
          if (materials) setFabricMaterial(materials);
        }

        if (data.originalDescription) {
          const features = data.originalDescription
            .split("\n")
            .filter(
              (line) => line.trim().startsWith("•") || line.trim().startsWith("-"),
            )
            .map((line) => line.replace(/^[•\-]\s*/, ""))
            .join("\n");
          if (features) setKeyFeatures(features);
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
          } else if (type.includes("jewelry") || type.includes("accessory")) {
            setSelectedTemplate("jewelry_accessories");
          } else {
            setSelectedTemplate("general");
          }
        }
      }
    } catch (err) {
      logger.error("Error loading product:", err as Error, { component: 'UnifiedEnhancePage' });
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

      if (useExistingImages && productData?.images && productData.images.length > 0) {
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
        console.log("📸 No existing images to add or useExistingImages is false");
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
      formData.append("targetAudience", targetAudience);
      formData.append("keyFeatures", keyFeatures);
      formData.append("additionalNotes", additionalNotes);
      formData.append("enhancementOptions", JSON.stringify(enhancementOptions));

      const isTestStore = shop?.includes("zunosai-staging-test-store");
      const isEmbedded = typeof window !== "undefined" && window.top !== window.self;

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
        logger.error("Enhancement API error:", errorData as Error, { component: 'UnifiedEnhancePage' });
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
      const isEmbedded = typeof window !== "undefined" && window.top !== window.self;

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
        if (editedContent.description !== undefined && editedContent.description !== null) {
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
      logger.error("Error applying changes:", err as Error, { component: 'UnifiedEnhancePage' });
      setError(err instanceof Error ? err.message : "Failed to apply changes");
    } finally {
      setApplying(false);
    }
  };

  const isFormValid = () => {
    return !!productData;
  };

  if (!productId) {
    return (
      <ProductSelector
        shop={shop || "zunosai-staging-test-store"}
        onProductSelect={(id) => {
          const params = new URLSearchParams(window.location.search);
          params.set("productId", id);
          window.location.href = `/enhance?${params}`;
        }}
      />
    );
  }

  if (loading) {
    return (
      <div className="w-full flex flex-col items-center">
        <div style={PAGE_HEADER_STYLES}>
          <h1 className="text-3xl font-bold text-gray-900">Enhance Product</h1>
        </div>
        <Card style={PAGE_SECTION_STYLES}>
          <CardContent className="flex items-center justify-center py-12">
            <div className="flex flex-col items-center gap-4">
              <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
              <p className="text-gray-600">Loading product data...</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <>
      <div style={{
        maxWidth: '800px',
        margin: '0 auto 16px auto',
        width: '100%'
      }}>
        <div className="flex items-center gap-4 mb-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => (window.location.href = `/dashboard?shop=${shop}`)}
          >
            <ChevronLeft className="h-4 w-4 mr-1" />
            Back to Dashboard
          </Button>
        </div>
        <h1 className="text-3xl font-bold text-gray-900">Enhance Product Description</h1>
        {productData && (
          <p className="text-gray-600 mt-1">{productData.title}</p>
        )}
      </div>

      <div style={{ display: 'contents' }}>
        <div style={{ maxWidth: '800px', margin: '0 auto 32px auto', width: '100%' }}>
          <div className="space-y-6">
          {error && (
            <Alert variant="destructive">
              <X className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
              <Button
                variant="ghost"
                size="sm"
                className="absolute right-2 top-2"
                onClick={() => setError(null)}
              >
                <X className="h-4 w-4" />
              </Button>
            </Alert>
          )}

          {/* Success Modal */}
          <Dialog open={showSuccessModal} onOpenChange={setShowSuccessModal}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <CheckCircle2 className="h-5 w-5 text-green-600" />
                  Product Updated Successfully
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                {successMessage && (
                  <Alert>
                    <AlertDescription>{successMessage}</AlertDescription>
                  </Alert>
                )}
                {updateResult && Boolean(updateResult.shopifyResult) && (
                  <div className="space-y-2">
                    <p className="text-sm text-gray-600">The following changes have been applied:</p>
                    <div className="space-y-1 text-sm">
                      {updateResult.updates && typeof updateResult.updates === "object" ? (
                        <>
                          {"title" in updateResult.updates && (updateResult.updates as Record<string, unknown>).title ? (
                            <p>• Title updated</p>
                          ) : null}
                          {"description" in updateResult.updates && (updateResult.updates as Record<string, unknown>).description ? (
                            <p>• Description updated</p>
                          ) : null}
                          {"seoTitle" in updateResult.updates && (updateResult.updates as Record<string, unknown>).seoTitle ? (
                            <p>• SEO title updated</p>
                          ) : null}
                          {"seoDescription" in updateResult.updates && (updateResult.updates as Record<string, unknown>).seoDescription ? (
                            <p>• SEO meta description updated</p>
                          ) : null}
                          {"bulletPoints" in updateResult.updates && (updateResult.updates as Record<string, unknown>).bulletPoints ? (
                            <p>• Bullet points added</p>
                          ) : null}
                        </>
                      ) : null}
                    </div>
                  </div>
                )}
                <p className="text-sm text-gray-600">
                  Click "View Product" to see the updated product in your Shopify admin, or
                  "Continue Editing" to make more changes.
                </p>
              </div>
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowSuccessModal(false);
                    setSuccessMessage(null);
                    setUpdateResult(null);
                  }}
                >
                  Continue Editing
                </Button>
                <Button
                  onClick={() => {
                    const shopDomain = shop?.replace(".myshopify.com", "");
                    const adminUrl = `https://admin.shopify.com/store/${shopDomain}/products/${productId?.split("/").pop()}`;
                    window.open(adminUrl, "_blank");
                  }}
                >
                  View Product
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {productData && (
            <Card>
              <CardHeader>
                <CardTitle>{productData.title}</CardTitle>
                <CardDescription>
                  SKU: {productData.variants[0]?.sku || "N/A"} | Type:{" "}
                  {productData.productType || "N/A"} | Vendor:{" "}
                  {productData.vendor || "N/A"}
                </CardDescription>
              </CardHeader>
            </Card>
          )}

          <ProductImageUpload
            title="Product Images"
            description="Add new images or use existing ones for AI analysis"
            existingImages={productData?.images?.map((img) => img.url) || []}
            useExistingImages={useExistingImages}
            onFilesAdded={setUploadedFiles}
            onExistingImagesToggle={setUseExistingImages}
            maxFiles={5}
          />

          <Card>
            <CardContent className="space-y-6 pt-6">
              {/* Enhancement Options Section */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-semibold">Enhancement Options</h2>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const allSelected =
                        enhancementOptions.generateTitle &&
                        enhancementOptions.enhanceDescription &&
                        enhancementOptions.generateSEO &&
                        enhancementOptions.createPromo;

                      setEnhancementOptions({
                        generateTitle: !allSelected,
                        enhanceDescription: !allSelected,
                        generateSEO: !allSelected,
                        createPromo: !allSelected,
                        updateImages: false,
                      });
                    }}
                  >
                    {enhancementOptions.generateTitle &&
                      enhancementOptions.enhanceDescription &&
                      enhancementOptions.generateSEO &&
                      enhancementOptions.createPromo
                      ? "Deselect All"
                      : "Select All"}
                  </Button>
                </div>
                <div className="space-y-3">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="generateTitle"
                      checked={enhancementOptions.generateTitle}
                      onCheckedChange={(checked) =>
                        setEnhancementOptions((prev) => ({
                          ...prev,
                          generateTitle: checked as boolean,
                        }))
                      }
                    />
                    <Label htmlFor="generateTitle">Generate new title</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="enhanceDescription"
                      checked={enhancementOptions.enhanceDescription}
                      onCheckedChange={(checked) =>
                        setEnhancementOptions((prev) => ({
                          ...prev,
                          enhanceDescription: checked as boolean,
                        }))
                      }
                    />
                    <Label htmlFor="enhanceDescription">Enhance description</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="generateSEO"
                      checked={enhancementOptions.generateSEO}
                      onCheckedChange={(checked) =>
                        setEnhancementOptions((prev) => ({
                          ...prev,
                          generateSEO: checked as boolean,
                        }))
                      }
                    />
                    <Label htmlFor="generateSEO">Generate SEO metadata</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="createPromo"
                      checked={enhancementOptions.createPromo}
                      onCheckedChange={(checked) =>
                        setEnhancementOptions((prev) => ({
                          ...prev,
                          createPromo: checked as boolean,
                        }))
                      }
                    />
                    <Label htmlFor="createPromo">Create promotional copy</Label>
                  </div>
                </div>
              </div>

              <Separator />

              {/* Product Details Section */}
              <div>
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

              <Separator />

              {/* Additional Information Section */}
              <div>
                <AdditionalInfoForm
                  mode="enhance"
                  fabricMaterial={fabricMaterial}
                  setFabricMaterial={setFabricMaterial}
                  occasionUse={occasionUse}
                  setOccasionUse={setOccasionUse}
                  targetAudience={targetAudience}
                  setTargetAudience={setTargetAudience}
                  keyFeatures={keyFeatures}
                  setKeyFeatures={setKeyFeatures}
                  additionalNotes={additionalNotes}
                  setAdditionalNotes={setAdditionalNotes}
                  prefilled={!!productData}
                />
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-end gap-3 pb-8">
            <Button
              variant="outline"
              size="lg"
              onClick={() => (window.location.href = `/dashboard?shop=${shop}`)}
            >
              Cancel
            </Button>
            <Button
              size="lg"
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
                "Generate Enhanced Description"
              )}
            </Button>
          </div>

          {/* Progress Modal */}
          <Dialog open={generating} onOpenChange={() => { }}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Generating Enhanced Content</DialogTitle>
                <DialogDescription>
                  AI is analyzing your product and generating enhanced content...
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <Progress value={progress} className="w-full" />
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
          </div>
        </div>

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
      </div>
    </>
  );
}
