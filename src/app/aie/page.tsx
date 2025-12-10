/**
 * AIE Ad Generator Page
 * Main UI for generating AI-powered ad copy
 */

/* eslint-disable @next/next/no-img-element */
"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import {
  Search,
  Package,
  Loader2,
  X,
  Check,
  Megaphone,
  ArrowLeft,
  Sparkles,
  ChevronDown,
  Settings2,
  Facebook,
  AlertCircle,
} from "lucide-react";
import { authenticatedFetch } from "@/lib/shopify/api-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { logger } from "@/lib/logger";
import { getCharacterLimits } from "@/lib/aie/utils/platformConstraints";
import type { AiePlatform } from "@/types/aie";

interface Campaign {
  id: string;
  name: string;
  status: string;
  objective: string;
}

interface AdAccount {
  id: string;
  name: string;
  account_id: string;
  currency: string;
}

interface ShopifyProduct {
  id: string;
  title: string;
  description: string;
  images: Array<{ url: string; altText?: string }>;
  handle: string;
}

interface ImageSelectionModalProps {
  product: ShopifyProduct;
  onComplete: (selectedImages: string[]) => void;
  onCancel: () => void;
  isOpen: boolean;
}

function ImageSelectionModal({
  product,
  onComplete,
  onCancel,
  isOpen,
}: ImageSelectionModalProps) {
  const [tempSelectedImages, setTempSelectedImages] = useState<string[]>([]);

  const toggleImage = (imageUrl: string) => {
    if (tempSelectedImages.includes(imageUrl)) {
      setTempSelectedImages(
        tempSelectedImages.filter((url) => url !== imageUrl),
      );
    } else {
      setTempSelectedImages([...tempSelectedImages, imageUrl]);
    }
  };

  const handleDone = () => {
    if (tempSelectedImages.length === 0) {
      // If no images selected, select all by default
      const allImages = product.images.map((img) => img.url);
      onComplete(allImages);
    } else {
      onComplete(tempSelectedImages);
    }
    setTempSelectedImages([]);
  };

  const handleCancel = () => {
    setTempSelectedImages([]);
    onCancel();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleCancel()}>
      <DialogContent className="max-w-4xl w-[90vw] max-h-[80vh] rounded-xl p-0 overflow-hidden flex flex-col z-[60]">
        <DialogHeader className="px-6 py-5 border-b border-gray-200 bg-white flex-shrink-0 relative">
          <button
            onClick={handleCancel}
            className="absolute right-6 top-5 w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
          <DialogTitle className="text-lg font-semibold text-gray-900 pr-10">
            Select Images from {product.title}
          </DialogTitle>
        </DialogHeader>

        <div className="p-6 flex flex-col gap-5 overflow-y-auto flex-1 bg-gray-50">
          {product.images.length === 0 ? (
            <Alert className="bg-amber-50 border-amber-200 rounded-lg">
              <AlertDescription className="text-amber-700">
                This product has no images. You can still add it, but consider
                adding images to your product first.
              </AlertDescription>
            </Alert>
          ) : (
            <div className="grid grid-cols-[repeat(auto-fill,minmax(160px,1fr))] gap-4">
              {product.images.map((image, idx) => {
                const isSelected = tempSelectedImages.includes(image.url);
                return (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => toggleImage(image.url)}
                    className={`relative p-2 rounded-lg transition-all duration-200 ${
                      isSelected
                        ? "border-2 border-blue-500 bg-blue-50 ring-2 ring-blue-100"
                        : "border border-gray-200 bg-white hover:border-blue-400"
                    }`}
                  >
                    <img
                      src={image.url}
                      alt={
                        image.altText || `${product.title} - Image ${idx + 1}`
                      }
                      className="w-full h-40 object-cover rounded-md"
                    />
                    {isSelected && (
                      <div className="absolute top-3 right-3 w-7 h-7 rounded-full bg-blue-500 text-white flex items-center justify-center shadow-md">
                        <Check className="w-4 h-4" />
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          )}

          {tempSelectedImages.length > 0 && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg px-4 py-3">
              <p className="text-sm text-blue-700 font-medium">
                {tempSelectedImages.length} of {product.images.length} images
                selected
              </p>
            </div>
          )}
        </div>

        <div className="px-6 py-4 border-t border-gray-200 bg-white flex-shrink-0 flex justify-end gap-3">
          <Button
            variant="outline"
            onClick={handleCancel}
            className="border-gray-200 hover:bg-gray-50"
          >
            Cancel
          </Button>
          <Button
            onClick={handleDone}
            style={{
              background: "linear-gradient(135deg, #0066cc 0%, #0099ff 100%)",
              border: "none",
            }}
          >
            {tempSelectedImages.length > 0
              ? `Add ${tempSelectedImages.length} Image${tempSelectedImages.length !== 1 ? "s" : ""}`
              : "Add All Images"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

interface GeneratedVariant {
  id: string;
  variantNumber: number;
  variantType: string;
  headline: string;
  headlineAlternatives: string[];
  primaryText: string;
  description?: string;
  cta: string;
  ctaRationale?: string;
  hookTechnique: string;
  tone: string;
  predictedScore: number;
  scoreBreakdown: {
    brand_fit: number;
    context_relevance: number;
    platform_compliance: number;
    hook_strength: number;
    cta_clarity: number;
  };
  generationReasoning?: string;
}

interface EditableVariant extends GeneratedVariant {
  editedHeadline?: string;
  editedPrimaryText?: string;
  editedDescription?: string;
}

interface GenerationResult {
  adRequestId: string;
  variants: GeneratedVariant[];
  metadata: {
    generationTimeMs: number;
    aiCost: number;
  };
}

export default function AIEPage() {
  const searchParams = useSearchParams();
  const shop = searchParams?.get("shop") || "demo-shop";

  const [mounted, setMounted] = useState(false);
  const [platform, setPlatform] = useState<string>("meta");
  const [goal, setGoal] = useState<string>("conversion");
  const [description, setDescription] = useState<string>("");
  const [targetAudience, setTargetAudience] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);

  // Advanced ad length options
  const [showAdvancedOptions, setShowAdvancedOptions] =
    useState<boolean>(false);
  const [adLengthMode, setAdLengthMode] = useState<string>("AUTO");
  const [audienceTemperature, setAudienceTemperature] =
    useState<string>("COLD");
  const [productComplexity, setProductComplexity] = useState<string>("LOW");
  const [productPrice, setProductPrice] = useState<string>("");
  const [hasStrongStory, setHasStrongStory] = useState<boolean>(false);
  const [isPremiumBrand, setIsPremiumBrand] = useState<boolean>(false);
  const [loadingStep, setLoadingStep] = useState<string>("");
  const [loadingProgress, setLoadingProgress] = useState<number>(0);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<GenerationResult | null>(null);
  const [editableVariants, setEditableVariants] = useState<EditableVariant[]>(
    [],
  );
  const [resultsModalOpen, setResultsModalOpen] = useState(false);

  // Facebook Campaign selection state
  const [adAccounts, setAdAccounts] = useState<AdAccount[]>([]);
  const [selectedAdAccount, setSelectedAdAccount] = useState<string>("");
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [selectedCampaign, setSelectedCampaign] = useState<string>("");
  const [isLoadingCampaigns, setIsLoadingCampaigns] = useState(false);
  const [facebookConnected, setFacebookConnected] = useState(false);

  // Prevent hydration mismatch
  useEffect(() => {
    setMounted(true);
  }, []);

  // Product selection state
  const [products, setProducts] = useState<ShopifyProduct[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [selectedProducts, setSelectedProducts] = useState<ShopifyProduct[]>(
    [],
  );
  const [selectedImageUrls, setSelectedImageUrls] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState("");
  const [productModalOpen, setProductModalOpen] = useState(false);
  const [imageSelectionModalOpen, setImageSelectionModalOpen] = useState(false);
  const [imageUrlModalOpen, setImageUrlModalOpen] = useState(false);
  const [tempImageUrl, setTempImageUrl] = useState("");
  const [currentProductForImageSelection, setCurrentProductForImageSelection] =
    useState<ShopifyProduct | null>(null);
  const debounceTimeout = useRef<NodeJS.Timeout | null>(null);

  const platformOptions = [
    { label: "Meta (Facebook)", value: "meta", available: true },
    { label: "Instagram", value: "instagram", available: true },
    { label: "Google Ads", value: "google", available: false },
    { label: "TikTok", value: "tiktok", available: false },
    { label: "Pinterest", value: "pinterest", available: false },
  ];

  // Get the display name for the selected platform's campaign section
  const getPlatformCampaignLabel = (platformValue: string): string => {
    const labels: Record<string, string> = {
      meta: "Facebook",
      instagram: "Instagram",
      google: "Google",
      tiktok: "TikTok",
      pinterest: "Pinterest",
    };
    // eslint-disable-next-line security/detect-object-injection
    return labels[platformValue] || "Facebook";
  };

  const goalOptions = [
    { label: "Conversions", value: "conversion" },
    { label: "Brand Awareness", value: "awareness" },
    { label: "Engagement", value: "engagement" },
    { label: "Traffic", value: "traffic" },
    { label: "App Installs", value: "app_installs" },
  ];

  // Fetch products with debounced search
  const fetchProducts = useCallback(async () => {
    try {
      setLoadingProducts(true);

      const params = new URLSearchParams({
        shop,
        limit: "50",
      });

      if (debouncedSearchQuery) {
        params.append("query", debouncedSearchQuery);
      }

      const response = await authenticatedFetch(
        `/api/shopify/products?${params}`,
      );
      const data = await response.json();

      if (data.success) {
        const productList = data.data?.products || data.products || [];
        const transformedProducts: ShopifyProduct[] = productList.map(
          (p: {
            id: string;
            title: string;
            description?: string;
            images?: Array<{ url: string; altText?: string }>;
            handle: string;
          }) => ({
            id: p.id,
            title: p.title,
            description: p.description || "",
            images: p.images || [],
            handle: p.handle,
          }),
        );
        setProducts(transformedProducts);
      }
    } catch (err) {
      logger.error("Error fetching products:", err as Error, {
        component: "aie",
      });
    } finally {
      setLoadingProducts(false);
    }
  }, [shop, debouncedSearchQuery]);

  // Fetch Facebook Ad Accounts
  const fetchAdAccounts = useCallback(async () => {
    try {
      const response = await fetch(
        `/api/facebook/ad-accounts?shop=${encodeURIComponent(shop)}`,
      );
      const data = await response.json();

      if (data.success && data.data?.length > 0) {
        setAdAccounts(data.data);
        setFacebookConnected(true);
        // Auto-select first account if only one
        if (data.data.length === 1) {
          setSelectedAdAccount(data.data[0].id);
        }
      } else if (data.code === "NOT_CONNECTED") {
        setFacebookConnected(false);
      }
    } catch (err) {
      logger.error("Error fetching ad accounts:", err as Error, {
        component: "aie",
      });
      setFacebookConnected(false);
    }
  }, [shop]);

  // Fetch Facebook Campaigns for selected ad account
  const fetchCampaigns = useCallback(
    async (adAccountId: string) => {
      setIsLoadingCampaigns(true);
      try {
        const response = await fetch(
          `/api/facebook/campaigns?shop=${encodeURIComponent(shop)}&ad_account_id=${encodeURIComponent(adAccountId)}`,
        );
        const data = await response.json();

        if (data.success) {
          setCampaigns(data.data || []);
        }
      } catch (err) {
        logger.error("Error fetching campaigns:", err as Error, {
          component: "aie",
        });
      } finally {
        setIsLoadingCampaigns(false);
      }
    },
    [shop],
  );

  // Load ad accounts on mount
  useEffect(() => {
    if (shop) {
      fetchAdAccounts();
    }
  }, [shop, fetchAdAccounts]);

  // Load campaigns when ad account changes
  useEffect(() => {
    if (selectedAdAccount && shop) {
      fetchCampaigns(selectedAdAccount);
    }
  }, [selectedAdAccount, shop, fetchCampaigns]);

  useEffect(() => {
    if (productModalOpen) {
      fetchProducts();
    }
  }, [productModalOpen, fetchProducts]);

  useEffect(() => {
    return () => {
      if (debounceTimeout.current) {
        clearTimeout(debounceTimeout.current);
      }
    };
  }, []);

  const handleSearchChange = (value: string) => {
    setSearchQuery(value);

    if (debounceTimeout.current) {
      clearTimeout(debounceTimeout.current);
    }

    if (value === "") {
      setDebouncedSearchQuery("");
    } else {
      debounceTimeout.current = setTimeout(() => {
        setDebouncedSearchQuery(value);
      }, 500);
    }
  };

  const handleProductSelect = (product: ShopifyProduct) => {
    // Check if product already selected
    if (selectedProducts.find((p) => p.id === product.id)) {
      return; // Don't select same product twice
    }

    // If first product, auto-populate description
    if (selectedProducts.length === 0) {
      setDescription(product.description);
    }

    // Open image selection modal for this product
    setCurrentProductForImageSelection(product);
    setImageSelectionModalOpen(true);
  };

  const handleImageSelectionComplete = (selectedImages: string[]) => {
    if (currentProductForImageSelection) {
      // Add product to selected products
      setSelectedProducts([
        ...selectedProducts,
        currentProductForImageSelection,
      ]);

      // Add selected images to the list
      setSelectedImageUrls([...selectedImageUrls, ...selectedImages]);
    }

    // Close modal and reset
    setImageSelectionModalOpen(false);
    setCurrentProductForImageSelection(null);
  };

  const handleImageSelectionCancel = () => {
    // User cancelled image selection, don't add the product
    setImageSelectionModalOpen(false);
    setCurrentProductForImageSelection(null);
  };

  const handleRemoveProduct = (productId: string) => {
    setSelectedProducts(selectedProducts.filter((p) => p.id !== productId));
    // Remove images from that product
    const productToRemove = selectedProducts.find((p) => p.id === productId);
    if (productToRemove) {
      const imagesToRemove = productToRemove.images.map((img) => img.url);
      setSelectedImageUrls(
        selectedImageUrls.filter((url) => !imagesToRemove.includes(url)),
      );
    }
  };

  const handleImageUrlSubmit = () => {
    if (tempImageUrl && !selectedImageUrls.includes(tempImageUrl)) {
      setSelectedImageUrls([...selectedImageUrls, tempImageUrl]);
    }
    setImageUrlModalOpen(false);
    setTempImageUrl("");
  };

  const handleClearAll = () => {
    setSelectedProducts([]);
    setSelectedImageUrls([]);
    setDescription("");
  };

  const handleGenerate = async () => {
    if (!description.trim()) {
      setError("Please provide a product/service description");
      return;
    }

    setLoading(true);
    setLoadingStep("Preparing request...");
    setLoadingProgress(10);
    setError(null);
    setResult(null);

    try {
      // Prepare product metadata for RAG context
      const productMetadata = selectedProducts.map((product) => ({
        id: product.id,
        title: product.title,
        description: product.description,
        handle: product.handle,
      }));

      setLoadingStep("Retrieving best practices...");
      setLoadingProgress(30);
      const response = await fetch("/api/aie/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          shopId: shop,
          // Don't send productId - it's Shopify GID format, not UUID
          // Product metadata is sent in productMetadata array instead
          platform,
          goal,
          productInfo: description, // User-editable unified description (API expects productInfo)
          imageUrls: selectedImageUrls, // All selected images for carousel support
          targetAudience: targetAudience || undefined,
          // Pass all product metadata for RAG context (descriptions, titles, etc.)
          productMetadata:
            productMetadata.length > 0 ? productMetadata : undefined,
          // Indicate if this is a collection ad (multi-product)
          isCollectionAd: selectedProducts.length > 1,
          // Advanced ad length options
          adLengthMode: adLengthMode || "AUTO",
          audienceTemperature: audienceTemperature || undefined,
          productComplexity: productComplexity || undefined,
          productPrice: productPrice ? parseFloat(productPrice) : undefined,
          hasStrongStory: hasStrongStory || undefined,
          isPremiumBrand: isPremiumBrand || undefined,
        }),
      });

      setLoadingStep("Generating ad variants...");
      setLoadingProgress(60);
      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error?.message || "Failed to generate ads");
      }

      setLoadingStep("Finalizing results...");
      setLoadingProgress(90);
      setResult(data.data);

      // Initialize editable variants
      const variants = data.data.variants.map((v: GeneratedVariant) => ({
        ...v,
        editedHeadline: v.headline,
        editedPrimaryText: v.primaryText,
        editedDescription: v.description,
      }));
      setEditableVariants(variants);
      setLoadingProgress(100);

      // Open results modal
      setResultsModalOpen(true);
    } catch (err) {
      logger.error("Generation error:", err as Error, { component: "aie" });
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
      setLoadingStep("");
      setLoadingProgress(0);
    }
  };

  const handleVariantEdit = (
    variantId: string,
    field: "headline" | "primaryText" | "description",
    value: string,
  ) => {
    setEditableVariants((prev) =>
      prev.map((v) => {
        if (v.id === variantId) {
          return {
            ...v,
            [`edited${field.charAt(0).toUpperCase() + field.slice(1)}`]: value,
          };
        }
        return v;
      }),
    );
  };

  const handleSelectVariant = async (
    variant: EditableVariant,
    postToFacebook: boolean = false,
  ) => {
    try {
      // Save selected variant to ad library
      const response = await fetch("/api/aie/library", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          shopId: shop,
          adRequestId: null, // Future: link to aie_ad_requests if tracking generation sessions
          variantId: null, // Future: link to aie_ad_variants if storing all generated variants
          headline: variant.editedHeadline || variant.headline,
          primaryText: variant.editedPrimaryText || variant.primaryText,
          description: variant.editedDescription || variant.description,
          cta: variant.cta,
          platform,
          campaignGoal: goal,
          variantType: variant.variantType,
          imageUrls: selectedProducts.flatMap((p) =>
            p.images.map((img) => img.url),
          ),
          productMetadata: {
            products: selectedProducts.map((p) => ({
              id: p.id,
              title: p.title,
              handle: p.handle,
            })),
          },
          // Include Facebook campaign data if selected
          facebookCampaign:
            selectedCampaign && selectedAdAccount
              ? {
                  adAccountId: selectedAdAccount,
                  campaignId: selectedCampaign,
                }
              : undefined,
          status: "draft",
        }),
      });

      const data = await response.json();

      if (data.success && data.data?.ad?.id) {
        const adId = data.data.ad.id;

        // If user wants to post directly to Facebook and has a campaign selected
        if (postToFacebook && selectedCampaign && selectedAdAccount) {
          try {
            const postResponse = await fetch("/api/facebook/create-ad", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                shop,
                adId,
                adAccountId: selectedAdAccount,
                campaignId: selectedCampaign,
              }),
            });

            const postData = await postResponse.json();

            if (postData.success) {
              setResultsModalOpen(false);
              setError(null);
              // Navigate to ads library with success message
              router.push(`/ads-library?shop=${shop}&posted=true`);
              return;
            } else {
              // Ad saved but posting failed - go to edit page
              logger.error(
                "Failed to post to Facebook:",
                new Error(postData.error?.message || "Unknown error"),
                {
                  component: "aie",
                },
              );
              setError(
                `Ad saved but Facebook posting failed: ${postData.error?.message || "Unknown error"}. You can try again from the edit page.`,
              );
            }
          } catch (postErr) {
            logger.error("Error posting to Facebook:", postErr as Error, {
              component: "aie",
            });
            setError(
              "Ad saved but Facebook posting failed. You can try again from the edit page.",
            );
          }
        }

        setResultsModalOpen(false);
        setError(null);
        // Navigate to the ad editor page
        router.push(`/ads-library/${adId}/edit?shop=${shop}`);
      } else {
        throw new Error(data.error?.message || "Failed to save ad");
      }
    } catch (err) {
      logger.error("Error saving ad to library:", err as Error, {
        component: "aie",
      });
      setError(
        err instanceof Error ? err.message : "Failed to save ad to library",
      );
    }
  };

  const formatScore = (score: number) => {
    // Score is 0-10 from AI, convert to percentage (0-100)
    const percentage = (score * 10).toFixed(0);
    if (score >= 8)
      return {
        text: `${percentage}% - Excellent`,
        variant: "default" as const,
      };
    if (score >= 6)
      return { text: `${percentage}% - Good`, variant: "secondary" as const };
    return {
      text: `${percentage}% - Needs Improvement`,
      variant: "outline" as const,
    };
  };

  const router = useRouter();

  return (
    <div className="min-h-screen bg-gray-50">
      <main className="max-w-6xl mx-auto px-6 py-8">
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
                <Megaphone className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">
                  AI Ad Generator
                </h1>
                <p className="text-gray-500 text-sm">
                  Generate high-converting ad copy for {shop}
                </p>
              </div>
            </div>
            <Button
              variant="outline"
              className="border-gray-200 hover:bg-gray-50"
              onClick={() => router.push(`/dashboard?shop=${shop}`)}
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Dashboard
            </Button>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex flex-col gap-6">
          <Card className="bg-white rounded-xl border border-gray-200">
            <CardHeader className="border-b border-gray-200 p-6">
              <CardTitle className="text-xl font-semibold text-gray-900">
                Ad Generation Settings
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6 flex flex-col gap-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="flex flex-col gap-2">
                  <Label
                    htmlFor="platform"
                    className="text-sm font-medium text-gray-700"
                  >
                    Platform
                  </Label>
                  <Select value={platform} onValueChange={setPlatform}>
                    <SelectTrigger
                      id="platform"
                      className="h-11 border-gray-200"
                    >
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {platformOptions.map((opt) => (
                        <SelectItem
                          key={opt.value}
                          value={opt.value}
                          disabled={!opt.available}
                        >
                          <span className="flex items-center gap-2">
                            {opt.label}
                            {!opt.available && (
                              <span className="text-xs text-gray-400 italic">
                                Coming Soon
                              </span>
                            )}
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex flex-col gap-2">
                  <Label
                    htmlFor="goal"
                    className="text-sm font-medium text-gray-700"
                  >
                    Campaign Goal
                  </Label>
                  <Select value={goal} onValueChange={setGoal}>
                    <SelectTrigger id="goal" className="h-11 border-gray-200">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {goalOptions.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Platform Campaign Selection */}
              <Card className="border-blue-200 bg-blue-50/30">
                <CardContent className="pt-6 space-y-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Facebook className="w-5 h-5 text-blue-600" />
                    <Label className="text-base font-semibold text-gray-900">
                      {getPlatformCampaignLabel(platform)} Campaign (Optional)
                    </Label>
                  </div>

                  {!facebookConnected ? (
                    <Alert className="bg-yellow-50 border-yellow-200">
                      <AlertCircle className="h-4 w-4 text-yellow-600" />
                      <AlertDescription className="text-yellow-700">
                        Connect your Facebook account in{" "}
                        <a
                          href={`/settings/connections?shop=${shop}`}
                          className="underline font-medium"
                        >
                          Settings
                        </a>{" "}
                        to post ads directly to campaigns.
                      </AlertDescription>
                    </Alert>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {/* Ad Account Selection */}
                      <div className="flex flex-col gap-2">
                        <Label
                          htmlFor="adAccount"
                          className="text-sm font-medium text-gray-700"
                        >
                          Ad Account
                        </Label>
                        <Select
                          value={selectedAdAccount}
                          onValueChange={setSelectedAdAccount}
                        >
                          <SelectTrigger
                            id="adAccount"
                            className="h-11 border-gray-200 bg-white"
                          >
                            <SelectValue placeholder="Select an ad account" />
                          </SelectTrigger>
                          <SelectContent>
                            {adAccounts.map((account) => (
                              <SelectItem key={account.id} value={account.id}>
                                {account.name} ({account.currency})
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Campaign Selection */}
                      <div className="flex flex-col gap-2">
                        <Label
                          htmlFor="campaign"
                          className="text-sm font-medium text-gray-700"
                        >
                          Campaign
                        </Label>
                        <Select
                          value={selectedCampaign}
                          onValueChange={setSelectedCampaign}
                          disabled={!selectedAdAccount || isLoadingCampaigns}
                        >
                          <SelectTrigger
                            id="campaign"
                            className="h-11 border-gray-200 bg-white"
                          >
                            <SelectValue
                              placeholder={
                                isLoadingCampaigns
                                  ? "Loading campaigns..."
                                  : !selectedAdAccount
                                    ? "Select an ad account first"
                                    : campaigns.length === 0
                                      ? "No active campaigns found"
                                      : "Select a campaign"
                              }
                            />
                          </SelectTrigger>
                          <SelectContent>
                            {campaigns.map((campaign) => (
                              <SelectItem key={campaign.id} value={campaign.id}>
                                {campaign.name} ({campaign.status})
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        {selectedAdAccount &&
                          campaigns.length === 0 &&
                          !isLoadingCampaigns && (
                            <p className="text-xs text-gray-500">
                              No active campaigns found. Create a campaign in
                              Facebook Ads Manager first.
                            </p>
                          )}
                      </div>
                    </div>
                  )}

                  {facebookConnected && (
                    <p className="text-xs text-gray-500">
                      Select a campaign now to post your ad directly after
                      generation, or skip to just save to your library.
                    </p>
                  )}
                </CardContent>
              </Card>

              {/* Product/Image Selection Buttons */}
              <div className="flex flex-col gap-3">
                <Label className="text-base font-semibold text-gray-900">
                  Products & Images
                </Label>
                <div className="flex items-center gap-3 flex-wrap">
                  <Button
                    variant="outline"
                    onClick={() => setProductModalOpen(true)}
                    className="border-blue-500 text-blue-600 hover:bg-blue-50"
                  >
                    <Package className="w-4 h-4 mr-2" />
                    Add Product
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => setImageUrlModalOpen(true)}
                    className="border-blue-500 text-blue-600 hover:bg-blue-50"
                  >
                    Add Custom Image URL
                  </Button>
                </div>
                <p className="text-sm text-gray-500">
                  Select a product and choose images, or add custom image URLs
                </p>
              </div>

              {/* Selected Products */}
              {selectedProducts.length > 0 && (
                <Card className="bg-gray-50">
                  <CardContent className="pt-6 space-y-3">
                    <div className="flex items-center justify-between">
                      <h3 className="font-semibold text-oxford-900">
                        Selected Products ({selectedProducts.length})
                      </h3>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={handleClearAll}
                      >
                        Clear All
                      </Button>
                    </div>

                    <div className="space-y-2">
                      {selectedProducts.map((product) => (
                        <div key={product.id}>
                          <div className="flex items-center gap-3">
                            {product.images[0]?.url && (
                              <img
                                src={product.images[0].url}
                                alt={product.title}
                                className="w-12 h-12 object-cover rounded"
                              />
                            )}
                            <div className="flex-1 min-w-0">
                              <p className="font-semibold text-sm truncate">
                                {product.title}
                              </p>
                              <p className="text-xs text-gray-600">
                                {product.images.length} image
                                {product.images.length !== 1 ? "s" : ""}
                              </p>
                            </div>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleRemoveProduct(product.id)}
                            >
                              Remove
                            </Button>
                          </div>
                          <Separator className="mt-2" />
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Selected Images */}
              {selectedImageUrls.length > 0 && (
                <Card className="bg-gray-50">
                  <CardContent className="pt-6 space-y-3">
                    <h3 className="font-semibold text-oxford-900">
                      Selected Images ({selectedImageUrls.length})
                    </h3>
                    <div className="flex items-center gap-2 flex-wrap">
                      {selectedImageUrls.map((url, idx) => (
                        <div key={idx} className="relative">
                          <img
                            src={url}
                            alt={`Image ${idx + 1}`}
                            className="w-24 h-24 object-cover rounded"
                          />
                          <Button
                            size="sm"
                            variant="destructive"
                            className="absolute -top-2 -right-2 h-6 w-6 rounded-full p-0"
                            onClick={() => {
                              setSelectedImageUrls(
                                selectedImageUrls.filter((_, i) => i !== idx),
                              );
                            }}
                          >
                            <X className="w-3 h-3" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              <div className="flex flex-col gap-2">
                <Label
                  htmlFor="description"
                  className="text-sm font-medium text-gray-700"
                >
                  Product/Service Description
                </Label>
                <Textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={4}
                  placeholder="Describe your product or service. Include key benefits, features, and what makes it unique..."
                  maxLength={1000}
                  className="border-gray-200 resize-none"
                />
                <p className="text-sm text-gray-500">
                  Be specific - this helps the AI understand your offering (
                  {description.length}/1000)
                </p>
              </div>

              <div className="flex flex-col gap-2">
                <Label
                  htmlFor="audience"
                  className="text-sm font-medium text-gray-700"
                >
                  Target Audience (Optional)
                </Label>
                <Input
                  id="audience"
                  value={targetAudience}
                  onChange={(e) => setTargetAudience(e.target.value)}
                  placeholder="e.g., Busy moms aged 25-40, Tech professionals, Fitness enthusiasts"
                  className="h-11 border-gray-200"
                />
                <p className="text-sm text-gray-500">
                  Helps personalize the ad copy
                </p>
              </div>

              {/* Advanced Options - Collapsible */}
              <div className="border border-gray-200 rounded-lg overflow-hidden">
                <button
                  type="button"
                  onClick={() => setShowAdvancedOptions(!showAdvancedOptions)}
                  className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 hover:bg-gray-100 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <Settings2 className="w-4 h-4 text-gray-500" />
                    <span className="text-sm font-medium text-gray-700">
                      Advanced Options
                    </span>
                  </div>
                  <ChevronDown
                    className={`w-4 h-4 text-gray-500 transition-transform ${
                      showAdvancedOptions ? "rotate-180" : ""
                    }`}
                  />
                </button>

                {showAdvancedOptions && (
                  <div className="p-4 border-t border-gray-200 bg-white space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="flex flex-col gap-2">
                        <Label
                          htmlFor="adLengthMode"
                          className="text-sm font-medium text-gray-700"
                        >
                          Ad Length
                        </Label>
                        <Select
                          value={adLengthMode}
                          onValueChange={setAdLengthMode}
                        >
                          <SelectTrigger
                            id="adLengthMode"
                            className="h-11 border-gray-200"
                          >
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="AUTO">
                              Auto (Recommended)
                            </SelectItem>
                            <SelectItem value="SHORT">Short</SelectItem>
                            <SelectItem value="MEDIUM">Medium</SelectItem>
                            <SelectItem value="LONG">Long</SelectItem>
                          </SelectContent>
                        </Select>
                        <p className="text-xs text-gray-500">
                          AUTO intelligently selects based on context
                        </p>
                      </div>

                      <div className="flex flex-col gap-2">
                        <Label
                          htmlFor="audienceTemperature"
                          className="text-sm font-medium text-gray-700"
                        >
                          Audience Temperature
                        </Label>
                        <Select
                          value={audienceTemperature}
                          onValueChange={setAudienceTemperature}
                        >
                          <SelectTrigger
                            id="audienceTemperature"
                            className="h-11 border-gray-200"
                          >
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="COLD">
                              Cold (New prospects)
                            </SelectItem>
                            <SelectItem value="WARM">
                              Warm (Engaged users)
                            </SelectItem>
                            <SelectItem value="HOT">
                              Hot (Ready to buy)
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="flex flex-col gap-2">
                        <Label
                          htmlFor="productComplexity"
                          className="text-sm font-medium text-gray-700"
                        >
                          Product Complexity
                        </Label>
                        <Select
                          value={productComplexity}
                          onValueChange={setProductComplexity}
                        >
                          <SelectTrigger
                            id="productComplexity"
                            className="h-11 border-gray-200"
                          >
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="LOW">
                              Low (Simple product)
                            </SelectItem>
                            <SelectItem value="MEDIUM">
                              Medium (Some features)
                            </SelectItem>
                            <SelectItem value="HIGH">
                              High (Complex/Technical)
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="flex flex-col gap-2">
                        <Label
                          htmlFor="productPrice"
                          className="text-sm font-medium text-gray-700"
                        >
                          Product Price ($)
                        </Label>
                        <Input
                          id="productPrice"
                          type="number"
                          value={productPrice}
                          onChange={(e) => setProductPrice(e.target.value)}
                          placeholder="e.g., 49.99"
                          className="h-11 border-gray-200"
                        />
                        <p className="text-xs text-gray-500">
                          Helps determine copy length
                        </p>
                      </div>
                    </div>

                    <div className="flex flex-col sm:flex-row gap-4 pt-2">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={hasStrongStory}
                          onChange={(e) => setHasStrongStory(e.target.checked)}
                          className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                        <span className="text-sm text-gray-700">
                          Has Strong Story
                        </span>
                      </label>

                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={isPremiumBrand}
                          onChange={(e) => setIsPremiumBrand(e.target.checked)}
                          className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                        <span className="text-sm text-gray-700">
                          Premium Brand
                        </span>
                      </label>
                    </div>
                  </div>
                )}
              </div>

              <Button
                className="w-full h-11 text-base font-medium"
                style={{
                  background:
                    !description.trim() || loading
                      ? "#9ca3af"
                      : "linear-gradient(135deg, #0066cc 0%, #0099ff 100%)",
                  border: "none",
                }}
                disabled={!description.trim() || loading}
                onClick={handleGenerate}
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    {loadingStep || "Generating..."}
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 mr-2" />
                    Generate Ad Variants
                  </>
                )}
              </Button>
            </CardContent>
          </Card>

          {error && (
            <Alert className="bg-red-50 border-red-200 rounded-xl">
              <AlertDescription className="text-red-600 text-sm">
                {error}
              </AlertDescription>
            </Alert>
          )}
        </div>
      </main>

      {/* Progress Modal - Shows during generation */}
      {mounted && (
        <Dialog open={loading} onOpenChange={() => {}}>
          <DialogContent className="max-w-md rounded-xl">
            <DialogHeader>
              <div className="flex items-center gap-3 mb-2">
                <div
                  className="w-10 h-10 rounded-lg flex items-center justify-center"
                  style={{
                    background:
                      "linear-gradient(135deg, #0066cc 0%, #0099ff 100%)",
                  }}
                >
                  <Loader2 className="w-5 h-5 text-white animate-spin" />
                </div>
                <DialogTitle className="text-gray-900 text-lg">
                  Generating Ad Variants
                </DialogTitle>
              </div>
            </DialogHeader>
            <div className="space-y-4 pt-2">
              <p className="text-sm text-gray-700 font-medium">{loadingStep}</p>
              <Progress value={loadingProgress} className="w-full h-2" />
              <p className="text-sm text-gray-500">
                This typically takes 10-15 seconds. We&apos;re analyzing best
                practices and generating unique ad variants optimized for your
                platform.
              </p>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Results Modal - Shows generated ad variants */}
      {mounted && resultsModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-5">
          <div className="bg-white rounded-xl w-[90%] max-w-6xl max-h-[85vh] overflow-hidden flex flex-col shadow-2xl">
            {/* Modal Header */}
            <div className="p-6 border-b border-gray-200 flex justify-between items-center">
              <div className="flex items-center gap-3">
                <div
                  className="w-10 h-10 rounded-lg flex items-center justify-center"
                  style={{
                    background:
                      "linear-gradient(135deg, #10b981 0%, #059669 100%)",
                  }}
                >
                  <Check className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-gray-900">
                    Ad Variants Generated
                  </h2>
                  <p className="text-sm text-gray-500">
                    Select a variant to save to your library
                  </p>
                </div>
              </div>
              <button
                onClick={() => setResultsModalOpen(false)}
                className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6 overflow-y-auto flex-1 bg-gray-50">
              <div className="space-y-4">
                {result && (
                  <Alert className="bg-blue-50 border-blue-200 rounded-lg">
                    <AlertDescription className="text-blue-700">
                      Generated {result.variants.length} variants
                      {result.metadata?.generationTimeMs && (
                        <>
                          {" "}
                          in{" "}
                          {(result.metadata.generationTimeMs / 1000).toFixed(2)}
                          s
                        </>
                      )}
                      {result.metadata?.aiCost && (
                        <> • AI Cost: ${result.metadata.aiCost.toFixed(4)}</>
                      )}
                    </AlertDescription>
                  </Alert>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {editableVariants.map((variant) => {
                    const scoreInfo = formatScore(variant.predictedScore);

                    return (
                      <Card
                        key={variant.id}
                        className="bg-white border-gray-200"
                      >
                        <CardContent className="p-5 space-y-3">
                          <div className="flex items-center justify-between">
                            <h3 className="font-semibold text-gray-900">
                              Variant {variant.variantNumber}
                            </h3>
                            <Badge variant={scoreInfo.variant}>
                              {scoreInfo.text}
                            </Badge>
                          </div>

                          <Badge variant="outline" className="border-gray-300">
                            {variant.variantType}
                          </Badge>

                          <Separator />

                          {/* Media Section */}
                          {selectedProducts.length > 0 && (
                            <>
                              <div>
                                <p className="text-sm font-semibold mb-2">
                                  Media (
                                  {
                                    selectedProducts.flatMap((p) => p.images)
                                      .length
                                  }{" "}
                                  {selectedProducts.flatMap((p) => p.images)
                                    .length === 1
                                    ? "image"
                                    : "images"}
                                  )
                                </p>
                                <div
                                  className={`grid gap-2 ${
                                    selectedProducts.flatMap((p) => p.images)
                                      .length === 1
                                      ? "grid-cols-1"
                                      : "grid-cols-[repeat(auto-fill,minmax(80px,1fr))]"
                                  }`}
                                >
                                  {selectedProducts
                                    .flatMap((p) => p.images)
                                    .slice(0, 4)
                                    .map((img, idx) => (
                                      <div
                                        key={idx}
                                        className="relative pb-[100%] bg-gray-100 rounded-lg overflow-hidden"
                                      >
                                        <img
                                          src={img.url}
                                          alt={
                                            img.altText ||
                                            `Product image ${idx + 1}`
                                          }
                                          className="absolute inset-0 w-full h-full object-cover"
                                        />
                                      </div>
                                    ))}
                                  {selectedProducts.flatMap((p) => p.images)
                                    .length > 4 && (
                                    <div className="relative pb-[100%] bg-gray-100 rounded-lg flex items-center justify-center">
                                      <p className="text-sm text-gray-600 font-semibold">
                                        +
                                        {selectedProducts.flatMap(
                                          (p) => p.images,
                                        ).length - 4}
                                      </p>
                                    </div>
                                  )}
                                </div>
                                {selectedProducts.flatMap((p) => p.images)
                                  .length > 1 && (
                                  <p className="text-xs text-gray-600 text-center mt-1">
                                    Carousel
                                  </p>
                                )}
                              </div>
                              <Separator />
                            </>
                          )}

                          <div className="space-y-2">
                            <Label htmlFor={`headline-${variant.id}`}>
                              Headline
                            </Label>
                            <Textarea
                              id={`headline-${variant.id}`}
                              value={variant.editedHeadline || ""}
                              onChange={(e) =>
                                handleVariantEdit(
                                  variant.id,
                                  "headline",
                                  e.target.value,
                                )
                              }
                              rows={2}
                              maxLength={
                                getCharacterLimits(platform as AiePlatform)
                                  .headline.max
                              }
                              className="resize-none"
                            />
                            <p
                              className={`text-xs ${(variant.editedHeadline?.length || 0) > getCharacterLimits(platform as AiePlatform).headline.max ? "text-red-500" : "text-gray-500"}`}
                            >
                              {variant.editedHeadline?.length || 0}/
                              {
                                getCharacterLimits(platform as AiePlatform)
                                  .headline.max
                              }{" "}
                              characters
                            </p>
                          </div>

                          <div className="space-y-2">
                            <Label htmlFor={`primary-${variant.id}`}>
                              Ad Copy
                            </Label>
                            <Textarea
                              id={`primary-${variant.id}`}
                              value={variant.editedPrimaryText || ""}
                              onChange={(e) =>
                                handleVariantEdit(
                                  variant.id,
                                  "primaryText",
                                  e.target.value,
                                )
                              }
                              rows={3}
                              maxLength={
                                getCharacterLimits(platform as AiePlatform)
                                  .primaryText.max
                              }
                              className="resize-none"
                            />
                            <p
                              className={`text-xs ${(variant.editedPrimaryText?.length || 0) > getCharacterLimits(platform as AiePlatform).primaryText.max ? "text-red-500" : "text-gray-500"}`}
                            >
                              {variant.editedPrimaryText?.length || 0}/
                              {
                                getCharacterLimits(platform as AiePlatform)
                                  .primaryText.max
                              }{" "}
                              characters
                            </p>
                          </div>

                          {variant.description && (
                            <div className="space-y-2">
                              <Label htmlFor={`desc-${variant.id}`}>
                                Description
                              </Label>
                              <Textarea
                                id={`desc-${variant.id}`}
                                value={variant.editedDescription || ""}
                                onChange={(e) =>
                                  handleVariantEdit(
                                    variant.id,
                                    "description",
                                    e.target.value,
                                  )
                                }
                                rows={2}
                                className="resize-none"
                              />
                            </div>
                          )}

                          {variant.cta && (
                            <div>
                              <p className="text-sm font-semibold mb-1">
                                Call-to-Action
                              </p>
                              <Badge>{variant.cta}</Badge>
                            </div>
                          )}

                          <Separator />

                          {variant.scoreBreakdown && (
                            <div>
                              <p className="text-sm font-semibold mb-2 text-gray-700">
                                Quality Scores
                              </p>
                              <div className="flex items-center gap-1 flex-wrap">
                                {variant.scoreBreakdown.hook_strength !==
                                  undefined && (
                                  <Badge
                                    variant="secondary"
                                    className="bg-blue-50 text-blue-700"
                                  >
                                    Hook:{" "}
                                    {(
                                      variant.scoreBreakdown.hook_strength * 100
                                    ).toFixed(0)}
                                    %
                                  </Badge>
                                )}
                                {variant.scoreBreakdown.cta_clarity !==
                                  undefined && (
                                  <Badge
                                    variant="secondary"
                                    className="bg-blue-50 text-blue-700"
                                  >
                                    CTA:{" "}
                                    {(
                                      variant.scoreBreakdown.cta_clarity * 100
                                    ).toFixed(0)}
                                    %
                                  </Badge>
                                )}
                                {variant.scoreBreakdown.platform_compliance !==
                                  undefined && (
                                  <Badge
                                    variant="secondary"
                                    className="bg-blue-50 text-blue-700"
                                  >
                                    Platform:{" "}
                                    {(
                                      variant.scoreBreakdown
                                        .platform_compliance * 100
                                    ).toFixed(0)}
                                    %
                                  </Badge>
                                )}
                              </div>
                            </div>
                          )}

                          {variant.headlineAlternatives &&
                            variant.headlineAlternatives.length > 0 && (
                              <>
                                <Separator />
                                <div>
                                  <p className="text-sm font-semibold mb-1 text-gray-700">
                                    Alternative Headlines
                                  </p>
                                  <div className="space-y-1">
                                    {variant.headlineAlternatives
                                      .slice(0, 2)
                                      .map((alt, idx) => (
                                        <p
                                          key={idx}
                                          className="text-xs text-gray-500"
                                        >
                                          • {alt}
                                        </p>
                                      ))}
                                  </div>
                                </div>
                              </>
                            )}

                          <Separator />

                          <div className="space-y-2">
                            <Button
                              className="w-full h-10 font-medium"
                              style={{
                                background:
                                  "linear-gradient(135deg, #0066cc 0%, #0099ff 100%)",
                                border: "none",
                              }}
                              onClick={() =>
                                handleSelectVariant(variant, false)
                              }
                            >
                              Save to Library
                            </Button>
                            {selectedCampaign && selectedAdAccount && (
                              <Button
                                className="w-full h-10 font-medium"
                                style={{
                                  background:
                                    "linear-gradient(135deg, #1877f2 0%, #4267b2 100%)",
                                  border: "none",
                                }}
                                onClick={() =>
                                  handleSelectVariant(variant, true)
                                }
                              >
                                <Facebook className="w-4 h-4 mr-2" />
                                Save & Post to Facebook
                              </Button>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Product Selection Modal - Only render after mount to prevent hydration mismatch */}
      {mounted && (
        <Dialog
          open={productModalOpen}
          onOpenChange={(open) => {
            setProductModalOpen(open);
            if (!open) setSearchQuery("");
          }}
        >
          <DialogContent className="max-w-4xl w-[90vw] max-h-[80vh] rounded-xl p-0 overflow-hidden flex flex-col">
            <DialogHeader className="px-6 py-5 border-b border-gray-200 bg-white flex-shrink-0 relative">
              <button
                onClick={() => {
                  setProductModalOpen(false);
                  setSearchQuery("");
                }}
                className="absolute right-6 top-5 w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
              <div className="flex items-center gap-3">
                <div
                  className="w-10 h-10 rounded-lg flex items-center justify-center"
                  style={{
                    background:
                      "linear-gradient(135deg, #0066cc 0%, #0099ff 100%)",
                  }}
                >
                  <Package className="w-5 h-5 text-white" />
                </div>
                <DialogTitle className="text-lg font-semibold text-gray-900">
                  Add Products
                </DialogTitle>
              </div>
            </DialogHeader>

            <div className="p-6 flex flex-col gap-5 overflow-y-auto flex-1 bg-gray-50">
              <div className="flex flex-col gap-2 w-full">
                <Label
                  htmlFor="product-search"
                  className="text-sm font-medium text-gray-700"
                >
                  Search Products
                </Label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input
                    id="product-search"
                    value={searchQuery}
                    onChange={(e) => handleSearchChange(e.target.value)}
                    placeholder="Start typing to search..."
                    autoFocus
                    className="pl-10 h-11 border-gray-200"
                  />
                </div>
              </div>

              {selectedProducts.length > 0 && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg px-4 py-3">
                  <p className="text-sm text-blue-700 font-medium">
                    {selectedProducts.length} product
                    {selectedProducts.length !== 1 ? "s" : ""} selected
                  </p>
                </div>
              )}

              {loadingProducts && (
                <div className="flex items-center justify-center gap-2 py-8">
                  <Loader2 className="w-4 h-4 animate-spin text-gray-400" />
                  <p className="text-sm text-gray-500">Loading products...</p>
                </div>
              )}

              {!loadingProducts && products.length === 0 && (
                <p className="text-sm text-gray-500 text-center py-8">
                  {searchQuery
                    ? "No products found"
                    : "Start typing to search products"}
                </p>
              )}

              {!loadingProducts && products.length > 0 && (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {products.map((product) => {
                    const isSelected = selectedProducts.find(
                      (p) => p.id === product.id,
                    );
                    return (
                      <button
                        key={product.id}
                        type="button"
                        onClick={() => handleProductSelect(product)}
                        className={`text-left bg-white rounded-lg p-3 flex flex-col gap-3 transition-all duration-200 hover:shadow-md hover:-translate-y-0.5 ${
                          isSelected
                            ? "border-2 border-blue-500 ring-2 ring-blue-100"
                            : "border border-gray-200 hover:border-blue-400"
                        }`}
                      >
                        {product.images[0]?.url && (
                          <img
                            src={product.images[0].url}
                            alt={product.title}
                            className="w-full h-40 object-cover rounded-md"
                          />
                        )}
                        <div className="flex flex-col gap-2 flex-1 min-w-0">
                          <p className="text-sm font-semibold text-gray-900 truncate">
                            {product.title}
                          </p>
                          {isSelected && (
                            <span className="inline-flex items-center self-start bg-blue-500 text-white px-3 py-1 rounded-full text-xs font-medium">
                              <Check className="w-3 h-3 mr-1" />
                              Added
                            </span>
                          )}
                          {product.description && (
                            <p className="text-xs text-gray-500 line-clamp-2">
                              {product.description}
                            </p>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="px-6 py-4 border-t border-gray-200 bg-white flex-shrink-0 flex justify-end gap-3">
              <Button
                variant="outline"
                onClick={() => {
                  setProductModalOpen(false);
                  setSearchQuery("");
                }}
                className="border-gray-200 hover:bg-gray-50"
              >
                Cancel
              </Button>
              <Button
                onClick={() => {
                  setProductModalOpen(false);
                  setSearchQuery("");
                }}
                style={{
                  background:
                    "linear-gradient(135deg, #0066cc 0%, #0099ff 100%)",
                  border: "none",
                }}
              >
                Done
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Image Selection Modal - Shows for ONE product at a time */}
      {mounted && currentProductForImageSelection && (
        <ImageSelectionModal
          product={currentProductForImageSelection}
          onComplete={handleImageSelectionComplete}
          onCancel={handleImageSelectionCancel}
          isOpen={imageSelectionModalOpen}
        />
      )}

      {/* Image URL Modal */}
      {mounted && (
        <Dialog
          open={imageUrlModalOpen}
          onOpenChange={(open) => {
            setImageUrlModalOpen(open);
            if (!open) setTempImageUrl("");
          }}
        >
          <DialogContent className="max-w-lg rounded-xl p-0 overflow-hidden">
            <DialogHeader className="px-6 py-5 border-b border-gray-200 bg-white">
              <DialogTitle className="text-lg font-semibold text-gray-900">
                Add Product Image URL
              </DialogTitle>
            </DialogHeader>

            <div className="p-6 flex flex-col gap-5 bg-gray-50">
              <div className="flex flex-col gap-2">
                <Label
                  htmlFor="image-url"
                  className="text-sm font-medium text-gray-700"
                >
                  Image URL
                </Label>
                <Input
                  id="image-url"
                  value={tempImageUrl}
                  onChange={(e) => setTempImageUrl(e.target.value)}
                  placeholder="https://example.com/product-image.jpg"
                  autoFocus
                  className="h-11 border-gray-200"
                />
                <p className="text-sm text-gray-500">
                  Enter a direct URL to your product image
                </p>
              </div>

              {tempImageUrl && (
                <div className="flex flex-col gap-2">
                  <p className="text-sm font-semibold text-gray-900">Preview</p>
                  <img
                    src={tempImageUrl}
                    alt="Preview"
                    className="w-32 h-32 object-cover rounded-lg"
                  />
                </div>
              )}
            </div>

            <div className="px-6 py-4 border-t border-gray-200 bg-white flex justify-end gap-3">
              <Button
                variant="outline"
                onClick={() => {
                  setImageUrlModalOpen(false);
                  setTempImageUrl("");
                }}
                className="border-gray-200 hover:bg-gray-50"
              >
                Cancel
              </Button>
              <Button
                onClick={handleImageUrlSubmit}
                disabled={!tempImageUrl.trim()}
                style={{
                  background: !tempImageUrl.trim()
                    ? "#9ca3af"
                    : "linear-gradient(135deg, #0066cc 0%, #0099ff 100%)",
                  border: "none",
                }}
              >
                Add Image
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
