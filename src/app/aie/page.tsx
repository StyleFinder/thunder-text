/**
 * AIE Ad Generator Page
 * Main UI for generating AI-powered ad copy
 *
 * Refactored to use modular components from ./components/
 */

/* eslint-disable @next/next/no-img-element */
"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useNavigation } from "@/app/hooks/useNavigation";
import { useShop } from "@/hooks/useShop";
import {
  Package,
  Loader2,
  X,
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
import { Separator } from "@/components/ui/separator";
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

// Import modular components
import {
  ImageSelectionModal,
  GenerationProgress,
  ResultsModal,
  UnifiedProductSelector,
} from "./components";
import type {
  Campaign,
  AdAccount,
  ShopifyProduct,
  EditableVariant,
  GenerationResult,
  GeneratedVariant,
} from "./types";

export default function AIEPage() {
  const _searchParams = useSearchParams();
  const { shop } = useShop();
  const { buildUrl } = useNavigation();

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
  const [comparisonMode, setComparisonMode] = useState<"grid" | "compare">(
    "grid",
  );
  const [selectedForComparison, setSelectedForComparison] = useState<string[]>(
    [],
  );

  // Facebook Campaign selection state
  const [adAccounts, setAdAccounts] = useState<AdAccount[]>([]);
  const [selectedAdAccount, setSelectedAdAccount] = useState<string>("");
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [selectedCampaign, setSelectedCampaign] = useState<string>("");
  const [isLoadingCampaigns, setIsLoadingCampaigns] = useState(false);
  const [facebookConnected, setFacebookConnected] = useState(false);
  const [facebookSuccessModalOpen, setFacebookSuccessModalOpen] =
    useState(false);
  const [facebookSuccessData, setFacebookSuccessData] = useState<{
    campaignName: string;
    adAccountName: string;
  } | null>(null);

  // Prevent hydration mismatch
  useEffect(() => {
    setMounted(true);
  }, []);

  // Check for image passed from Image Generation page
  useEffect(() => {
    if (typeof window !== "undefined") {
      const imageUrl = sessionStorage.getItem("aie_image_url");
      if (imageUrl) {
        // Add the image to selected images
        setSelectedImageUrls((prev) => {
          if (!prev.includes(imageUrl)) {
            return [...prev, imageUrl];
          }
          return prev;
        });
        // Clear from sessionStorage to prevent re-adding on page refresh
        sessionStorage.removeItem("aie_image_url");
      }
    }
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

  // Reset form to initial state (used after successful Facebook post)
  const handleResetForm = useCallback(() => {
    // Reset product selection
    setSelectedProducts([]);
    setSelectedImageUrls([]);

    // Reset form fields
    setDescription("");
    setTargetAudience("");
    setPlatform("meta");
    setGoal("conversion");

    // Reset advanced options
    setShowAdvancedOptions(false);
    setAdLengthMode("AUTO");
    setAudienceTemperature("COLD");
    setProductComplexity("LOW");
    setProductPrice("");
    setHasStrongStory(false);
    setIsPremiumBrand(false);

    // Reset generation state
    setLoading(false);
    setLoadingStep("");
    setLoadingProgress(0);
    setError(null);
    setResult(null);
    setEditableVariants([]);
    setResultsModalOpen(false);

    // Reset search
    setSearchQuery("");
    setDebouncedSearchQuery("");

    // Keep Facebook connection state (adAccounts, campaigns, facebookConnected)
    // as these don't need to be reset
  }, []);

  // Fetch products with debounced search
  const fetchProducts = useCallback(async () => {
    if (!shop) return;

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
    if (!shop) return;

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
      if (!shop) return;

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

  const handleImageUrlAdd = (url: string) => {
    if (url && !selectedImageUrls.includes(url)) {
      setSelectedImageUrls([...selectedImageUrls, url]);
    }
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

      // Open results modal and reset comparison state
      setComparisonMode("grid");
      setSelectedForComparison([]);
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
              // Get campaign and account names for success message
              const campaignName =
                campaigns.find((c) => c.id === selectedCampaign)?.name ||
                "your campaign";
              const adAccountName =
                adAccounts.find((a) => a.id === selectedAdAccount)?.name ||
                "your ad account";
              // Show success modal
              setFacebookSuccessData({ campaignName, adAccountName });
              setFacebookSuccessModalOpen(true);
              return;
            } else {
              // Ad saved but posting failed - redirect to edit page
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
              setResultsModalOpen(false);
              router.push(buildUrl(`/ads-library/${adId}/edit`));
              return;
            }
          } catch (postErr) {
            logger.error("Error posting to Facebook:", postErr as Error, {
              component: "aie",
            });
            setError(
              "Ad saved but Facebook posting failed. You can try again from the edit page.",
            );
            // Still redirect to edit page on error so user can retry
            setResultsModalOpen(false);
            router.push(buildUrl(`/ads-library/${adId}/edit`));
            return;
          }
        }

        // For "Save Only" (not posting to Facebook) - redirect to edit page
        setResultsModalOpen(false);
        setError(null);
        router.push(buildUrl(`/ads-library/${adId}/edit`));
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
                      {getPlatformCampaignLabel(platform)} Campaign
                    </Label>
                  </div>

                  {!facebookConnected ? (
                    <Alert className="bg-yellow-50 border-yellow-200">
                      <AlertCircle className="h-4 w-4 text-yellow-600" />
                      <AlertDescription className="text-yellow-700">
                        Connect your Facebook account in{" "}
                        <a
                          href={buildUrl("/settings")}
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

              {/* Unified Product/Image Selection */}
              <div className="flex flex-col gap-3">
                <Label className="text-base font-semibold text-gray-900">
                  Products & Images
                </Label>
                <Button
                  variant="outline"
                  onClick={() => setProductModalOpen(true)}
                  className="border-blue-500 text-blue-600 hover:bg-blue-50 w-fit"
                >
                  <Package className="w-4 h-4 mr-2" />
                  Add Products or Images
                  {(selectedProducts.length > 0 ||
                    selectedImageUrls.length > 0) && (
                    <span className="ml-2 bg-blue-100 text-blue-700 text-xs font-semibold px-2 py-0.5 rounded-full">
                      {selectedProducts.length + selectedImageUrls.length}
                    </span>
                  )}
                </Button>
                <p className="text-sm text-gray-500">
                  Select from your Shopify store or add custom image URLs
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

              {/* Credit Cost Display */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-blue-600" />
                    <span className="text-sm font-medium text-blue-800">
                      Generation Cost
                    </span>
                  </div>
                  <span className="text-sm font-semibold text-blue-900">
                    1 credit
                  </span>
                </div>
                <p className="text-xs text-blue-600 mt-1">
                  Generates 3 ad variants optimized for{" "}
                  {platform === "meta"
                    ? "Facebook"
                    : platform === "instagram"
                      ? "Instagram"
                      : "your platform"}
                </p>
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
        <GenerationProgress isOpen={loading} progress={loadingProgress} />
      )}

      {/* Results Modal - Shows generated ad variants */}
      {mounted && (
        <ResultsModal
          isOpen={resultsModalOpen}
          onClose={() => setResultsModalOpen(false)}
          result={result}
          editableVariants={editableVariants}
          comparisonMode={comparisonMode}
          setComparisonMode={setComparisonMode}
          selectedForComparison={selectedForComparison}
          setSelectedForComparison={setSelectedForComparison}
          selectedProducts={selectedProducts}
          selectedCampaign={selectedCampaign}
          selectedAdAccount={selectedAdAccount}
          platform={platform}
          onVariantEdit={handleVariantEdit}
          onSelectVariant={handleSelectVariant}
        />
      )}
      {/* Unified Product Selection Modal */}
      {mounted && (
        <UnifiedProductSelector
          isOpen={productModalOpen}
          onOpenChange={(open) => {
            setProductModalOpen(open);
            if (!open) setSearchQuery("");
          }}
          products={products}
          selectedProducts={selectedProducts}
          loadingProducts={loadingProducts}
          searchQuery={searchQuery}
          onSearchChange={handleSearchChange}
          onProductSelect={handleProductSelect}
          selectedImageUrls={selectedImageUrls}
          onImageUrlAdd={handleImageUrlAdd}
          onDone={() => {
            setProductModalOpen(false);
            setSearchQuery("");
          }}
        />
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

      {/* Facebook Success Modal */}
      {mounted && (
        <Dialog
          open={facebookSuccessModalOpen}
          onOpenChange={(open) => {
            if (!open) {
              setFacebookSuccessModalOpen(false);
              setFacebookSuccessData(null);
              handleResetForm();
            }
          }}
        >
          <DialogContent className="max-w-md rounded-xl p-0 overflow-hidden">
            <DialogHeader className="px-6 py-5 border-b border-gray-200 bg-white">
              <DialogTitle className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <svg
                  className="w-6 h-6 text-green-500"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                Ad Posted Successfully!
              </DialogTitle>
            </DialogHeader>

            <div className="p-6 flex flex-col gap-4 bg-gray-50">
              <p className="text-gray-700">
                Your ad has been successfully posted to Facebook!
              </p>
              {facebookSuccessData && (
                <div className="bg-white rounded-lg p-4 border border-gray-200">
                  <div className="flex flex-col gap-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-500">Campaign:</span>
                      <span className="font-medium text-gray-900">
                        {facebookSuccessData.campaignName}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Ad Account:</span>
                      <span className="font-medium text-gray-900">
                        {facebookSuccessData.adAccountName}
                      </span>
                    </div>
                  </div>
                </div>
              )}
              <p className="text-sm text-gray-500">
                Your ad is now live. Click below to create another ad or view
                your ads library.
              </p>
            </div>

            <div className="px-6 py-4 border-t border-gray-200 bg-white flex justify-end gap-3">
              <Button
                variant="outline"
                onClick={() => {
                  setFacebookSuccessModalOpen(false);
                  setFacebookSuccessData(null);
                  router.push(buildUrl("/ads-library"));
                }}
                className="border-gray-200 hover:bg-gray-50"
              >
                View Ads Library
              </Button>
              <Button
                onClick={() => {
                  setFacebookSuccessModalOpen(false);
                  setFacebookSuccessData(null);
                  handleResetForm();
                }}
                style={{
                  background:
                    "linear-gradient(135deg, #0066cc 0%, #0099ff 100%)",
                  border: "none",
                }}
              >
                <Sparkles className="w-4 h-4 mr-2" />
                Create Another Ad
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
