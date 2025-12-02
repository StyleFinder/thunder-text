"use client";

/**
 * Self-Contained Facebook Ad Creation Flow
 *
 * Complete workflow for creating Facebook ads:
 * 1. Select product from Shopify
 * 2. AI generates ad title & copy
 * 3. Select images from product
 * 4. Preview & submit to Facebook
 */

import { useState, useEffect, useRef, useCallback } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Loader2, AlertCircle, Image as ImageIcon } from "lucide-react";
import AdPreview from "./AdPreview";
import { authenticatedFetch } from "@/lib/shopify/api-client";
import { logger } from '@/lib/logger'

interface ShopifyProduct {
  id: string;
  title: string;
  description: string;
  images: Array<{ url: string; altText?: string }>;
  handle: string;
}

interface CreateFacebookAdFlowProps {
  open: boolean;
  onClose: () => void;
  shop: string;
  campaignId: string;
  campaignName: string;
  adAccountId: string;
}

type Step = "select-product" | "generate-content" | "select-images" | "preview";

export default function CreateFacebookAdFlow({
  open,
  onClose,
  shop,
  campaignId,
  campaignName,
  adAccountId,
}: CreateFacebookAdFlowProps) {
  const [step, setStep] = useState<Step>("select-product");

  // Step 1: Product Selection
  const [products, setProducts] = useState<ShopifyProduct[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<ShopifyProduct | null>(
    null,
  );
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState("");
  const [showProductList, setShowProductList] = useState(false);
  const debounceTimeout = useRef<NodeJS.Timeout | null>(null);

  // Step 2: AI Generated Content
  const [adTitle, setAdTitle] = useState("");
  const [adCopy, setAdCopy] = useState("");

  // Step 3: Image Selection
  const [selectedImageUrls, setSelectedImageUrls] = useState<string[]>([]);

  // Step 4: Submission
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch products with debounced search (server-side filtering)
  const fetchProducts = useCallback(async () => {
    try {
      setLoadingProducts(true);
      setError(null);

      const params = new URLSearchParams({
        shop: shop || "zunosai-staging-test-store",
        limit: "50", // Get more products for better search results
      });

      // Add search query if exists
      if (debouncedSearchQuery) {
        params.append("query", debouncedSearchQuery);
      }

      const response = await authenticatedFetch(
        `/api/shopify/products?${params}`,
      );
      const data = await response.json();


      if (data.success) {
        const productList = data.data?.products || data.products || [];


        // Products are already in the correct format from getProducts()
        // Just ensure they match our interface
        const transformedProducts: ShopifyProduct[] = productList.map(
          (p: {
            id: string;
            title: string;
            description?: string;
            images?: Array<{ url: string; altText?: string | null }>;
            handle: string;
          }) => ({
            id: p.id,
            title: p.title,
            description: p.description || "",
            images: p.images || [],
            handle: p.handle,
          }),
        );

        if (transformedProducts.length > 0) {
          console.log("📋 First product:", transformedProducts[0]);
        }

        setProducts(transformedProducts);
      } else {
        logger.error("❌ Products API error:", data.error, undefined, { component: 'CreateFacebookAdFlow' });
        setError(data.error || "Failed to load products from Shopify");
      }
    } catch (err) {
      logger.error("❌ Error fetching products:", err as Error, { component: 'CreateFacebookAdFlow' });
      setError(err instanceof Error ? err.message : "Failed to load products");
    } finally {
      setLoadingProducts(false);
    }
  }, [shop, debouncedSearchQuery]);

  // Fetch products when modal opens or debounced search changes
  useEffect(() => {
    if (open) {
      fetchProducts();
    }
  }, [open, fetchProducts]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (debounceTimeout.current) {
        clearTimeout(debounceTimeout.current);
      }
    };
  }, []);

  const resetFlow = () => {
    setStep("select-product");
    setSelectedProduct(null);
    setSearchQuery("");
    setDebouncedSearchQuery("");
    setShowProductList(false);
    setAdTitle("");
    setAdCopy("");
    setSelectedImageUrls([]);
    setError(null);
  };

  const handleSearchChange = (value: string) => {
    setSearchQuery(value);
    setShowProductList(true);

    // Clear any existing timeout
    if (debounceTimeout.current) {
      clearTimeout(debounceTimeout.current);
    }

    // If the search is cleared, update immediately
    if (value === "") {
      setDebouncedSearchQuery("");
    } else {
      // Otherwise, debounce the search query (triggers server-side search)
      debounceTimeout.current = setTimeout(() => {
        setDebouncedSearchQuery(value);
      }, 500); // 500ms delay
    }
  };

  const handleProductSelect = (
    product: ShopifyProduct,
    event?: React.MouseEvent,
  ) => {
    // Prevent the click from removing focus
    if (event) {
      event.preventDefault();
    }

    setSelectedProduct(product);
    setSearchQuery(product.title);
    setShowProductList(false);
  };

  const handleNextFromProductSelection = async () => {
    if (!selectedProduct) return;

    setStep("generate-content");
    await generateAdContent();
  };

  const generateAdContent = async () => {
    if (!selectedProduct) return;

    try {
      setError(null);

      const response = await fetch("/api/facebook/generate-ad-content", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          shop,
          productTitle: selectedProduct.title,
          productDescription: selectedProduct.description,
          productHandle: selectedProduct.handle,
        }),
      });

      const data = await response.json();

      if (data.success) {
        setAdTitle(data.data.title);
        setAdCopy(data.data.copy);

        // Auto-select all product images
        setSelectedImageUrls(selectedProduct.images.map((img) => img.url));

        setStep("select-images");
      } else {
        // Fallback: use product data directly
        setAdTitle(selectedProduct.title.substring(0, 125));
        setAdCopy(selectedProduct.description.substring(0, 125));
        setSelectedImageUrls(selectedProduct.images.map((img) => img.url));
        setStep("select-images");
      }
    } catch (err) {
      logger.error("Error generating ad content:", err as Error, { component: 'CreateFacebookAdFlow' });
      // Fallback: use product data directly
      setAdTitle(selectedProduct.title.substring(0, 125));
      setAdCopy(selectedProduct.description.substring(0, 125));
      setSelectedImageUrls(selectedProduct.images.map((img) => img.url));
      setStep("select-images");
    }
  };

  const toggleImageSelection = (imageUrl: string) => {
    setSelectedImageUrls((prev) => {
      if (prev.includes(imageUrl)) {
        return prev.filter((url) => url !== imageUrl);
      } else {
        return [...prev, imageUrl];
      }
    });
  };

  const handleSubmitAd = async () => {
    try {
      setSubmitting(true);
      setError(null);

      // Step 1: Create draft
      const draftResponse = await fetch("/api/facebook/ad-drafts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          shop,
          shopify_product_id: selectedProduct?.id,
          ad_title: adTitle,
          ad_copy: adCopy,
          image_urls: selectedImageUrls,
          selected_image_url: selectedImageUrls[0],
          facebook_campaign_id: campaignId,
          facebook_campaign_name: campaignName,
          facebook_ad_account_id: adAccountId,
          additional_metadata: {
            product_handle: selectedProduct?.handle,
            product_title: selectedProduct?.title,
          },
        }),
      });

      const draftData = await draftResponse.json();

      if (!draftData.success) {
        throw new Error(draftData.error || "Failed to create ad draft");
      }

      // Step 2: Submit to Facebook
      const submitResponse = await fetch("/api/facebook/ad-drafts/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          shop,
          draft_id: draftData.data.id,
        }),
      });

      const submitData = await submitResponse.json();

      console.log("📤 Submit response:", submitData);

      if (!submitData.success) {
        logger.error("❌ Submit error:", submitData as Error, { component: 'CreateFacebookAdFlow' });
        throw new Error(submitData.error || "Failed to submit ad to Facebook");
      }

      // Success!
      alert(
        "Ad successfully created in Facebook Ads Manager (PAUSED status). You can review and activate it in Facebook.",
      );
      onClose();
      resetFlow();
    } catch (err) {
      logger.error("Error submitting ad:", err as Error, { component: 'CreateFacebookAdFlow' });
      setError(err instanceof Error ? err.message : "Failed to create ad");
    } finally {
      setSubmitting(false);
    }
  };

  // Render product selection step
  const renderProductSelection = () => (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-semibold text-ace-gray-900 mb-4">
          Select a Product
        </h3>

        {/* Product search */}
        <div className="relative min-h-[100px]">
          <div className="space-y-2">
            <Label htmlFor="product-search">Search for a product</Label>
            <Input
              id="product-search"
              type="text"
              value={searchQuery}
              onChange={(e) => handleSearchChange(e.target.value)}
              placeholder="Type to search products..."
              autoComplete="off"
              onFocus={() => setShowProductList(true)}
              autoFocus
              className="border-ace-gray-300 focus:border-ace-purple focus:ring-ace-purple"
            />
          </div>

          {/* Product search results dropdown */}
          {showProductList && (products.length > 0 || loadingProducts) && (
            <div
              className="absolute top-full left-0 right-0 min-h-[400px] max-h-[800px] overflow-y-auto bg-white border border-ace-gray-200 rounded-lg mt-1 z-50 shadow-lg"
              onMouseDown={(e) => {
                // Prevent the dropdown from stealing focus from the text field
                e.preventDefault();
              }}
            >
              {loadingProducts ? (
                <div className="p-5 text-center">
                  <Loader2 className="h-6 w-6 animate-spin mx-auto text-ace-purple" />
                </div>
              ) : (
                products.map((product) => (
                  <div
                    key={product.id}
                    onClick={(e) => handleProductSelect(product, e)}
                    className="p-3 cursor-pointer border-b border-ace-gray-100 flex gap-3 items-center hover:bg-ace-gray-50 transition-colors"
                  >
                    {product.images.length > 0 ? (
                      <img
                        src={product.images[0].url}
                        alt={product.title}
                        className="w-12 h-12 object-cover rounded"
                      />
                    ) : (
                      <div className="w-12 h-12 bg-ace-gray-100 rounded flex items-center justify-center">
                        <ImageIcon className="h-6 w-6 text-ace-gray-400" />
                      </div>
                    )}
                    <div className="flex-1">
                      <p className="text-sm font-medium text-ace-gray-900">
                        {product.title}
                      </p>
                      {product.images.length > 0 && (
                        <p className="text-xs text-ace-gray-500">
                          {product.images.length} image(s)
                        </p>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {/* No results message */}
          {showProductList &&
            debouncedSearchQuery &&
            products.length === 0 &&
            !loadingProducts && (
              <div className="absolute top-full left-0 right-0 p-3 bg-white border border-ace-gray-200 rounded-lg mt-1 z-50 shadow-lg">
                <p className="text-sm text-ace-gray-500 text-center">
                  No products found matching &ldquo;{debouncedSearchQuery}&rdquo;
                </p>
              </div>
            )}
        </div>
      </div>

      {/* Show loading state */}
      {loadingProducts && !showProductList && (
        <div className="flex items-center justify-center gap-2 py-4">
          <Loader2 className="h-4 w-4 animate-spin text-ace-purple" />
          <p className="text-sm text-ace-gray-500">
            Loading products from Shopify...
          </p>
        </div>
      )}

      {/* Show no results message */}
      {!loadingProducts && products.length === 0 && debouncedSearchQuery && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            No products found matching &ldquo;{debouncedSearchQuery}&rdquo;. Try a
            different search term.
          </AlertDescription>
        </Alert>
      )}

      {/* Selected product preview */}
      {selectedProduct && (
        <Card className="border-ace-gray-200">
          <CardContent className="p-4">
            <p className="text-sm font-semibold text-ace-gray-900 mb-3">
              Selected Product:
            </p>
            <div className="flex gap-3 items-center">
              {selectedProduct.images.length > 0 ? (
                <img
                  src={selectedProduct.images[0].url}
                  alt={selectedProduct.title}
                  className="w-20 h-20 object-cover rounded"
                />
              ) : (
                <div className="w-20 h-20 bg-ace-gray-100 rounded flex items-center justify-center">
                  <ImageIcon className="h-8 w-8 text-ace-gray-400" />
                </div>
              )}
              <div>
                <p className="text-sm font-medium text-ace-gray-900">
                  {selectedProduct.title}
                </p>
                <p className="text-xs text-ace-gray-500">
                  {selectedProduct.images.length} image(s) available
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );

  // Render content generation step
  const renderContentGeneration = () => (
    <div className="flex flex-col items-center justify-center py-12 space-y-4">
      <Loader2 className="h-12 w-12 animate-spin text-ace-purple" />
      <p className="text-base font-medium text-ace-gray-700 text-center">
        AI is generating ad content...
      </p>
      <p className="text-sm text-ace-gray-500 text-center">
        Creating optimized ad title and copy for Facebook
      </p>
    </div>
  );

  // Render image selection step
  const renderImageSelection = () => (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-semibold text-ace-gray-900">
          Select Images for Ad
        </h3>
        <p className="text-sm text-ace-gray-500 mt-1">
          Choose which images to include in your Facebook ad (1-10 images)
        </p>
      </div>

      <div className="grid grid-cols-3 gap-4">
        {selectedProduct?.images.map((image, index) => (
          <Card key={index} className="border-ace-gray-200">
            <CardContent className="p-3 space-y-2">
              <div className="relative">
                <img
                  src={image.url}
                  alt={image.altText || `Product image ${index + 1}`}
                  className={`w-full h-36 object-cover rounded transition-opacity ${
                    selectedImageUrls.includes(image.url) ? 'opacity-100' : 'opacity-50'
                  }`}
                />
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id={`image-${index}`}
                  checked={selectedImageUrls.includes(image.url)}
                  onCheckedChange={() => toggleImageSelection(image.url)}
                  className="border-ace-gray-300 data-[state=checked]:bg-ace-purple data-[state=checked]:border-ace-purple"
                />
                <label
                  htmlFor={`image-${index}`}
                  className="text-sm font-medium text-ace-gray-700 cursor-pointer"
                >
                  Image {index + 1}
                </label>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Alert className={selectedImageUrls.length === 0 ? "border-yellow-200 bg-yellow-50" : "border-ace-gray-200"}>
        <AlertCircle className={`h-4 w-4 ${selectedImageUrls.length === 0 ? 'text-yellow-600' : 'text-ace-gray-600'}`} />
        <AlertDescription className={selectedImageUrls.length === 0 ? "text-yellow-800" : "text-ace-gray-700"}>
          {selectedImageUrls.length === 0
            ? "Please select at least one image"
            : `${selectedImageUrls.length} image(s) selected`}
        </AlertDescription>
      </Alert>
    </div>
  );

  // Render preview step
  const renderPreview = () => (
    <AdPreview
      title={adTitle}
      copy={adCopy}
      imageUrls={selectedImageUrls}
      selectedImageIndex={0}
      onTitleChange={setAdTitle}
      onCopyChange={setAdCopy}
      onSubmit={handleSubmitAd}
      submitting={submitting}
    />
  );

  // Determine modal actions based on step
  const getModalActions = () => {
    switch (step) {
      case "select-product":
        return {
          primaryAction: (
            <Button
              onClick={handleNextFromProductSelection}
              disabled={!selectedProduct}
              className="bg-ace-purple hover:bg-ace-purple-dark text-white"
            >
              Next: Generate Ad Content
            </Button>
          ),
          secondaryActions: (
            <Button
              variant="outline"
              onClick={onClose}
              className="border-ace-gray-300 text-ace-gray-700 hover:bg-ace-gray-50"
            >
              Cancel
            </Button>
          ),
        };

      case "generate-content":
        return { primaryAction: null, secondaryActions: null };

      case "select-images":
        return {
          primaryAction: (
            <Button
              onClick={() => setStep("preview")}
              disabled={selectedImageUrls.length === 0}
              className="bg-ace-purple hover:bg-ace-purple-dark text-white"
            >
              Next: Preview & Submit
            </Button>
          ),
          secondaryActions: (
            <Button
              variant="outline"
              onClick={() => setStep("select-product")}
              className="border-ace-gray-300 text-ace-gray-700 hover:bg-ace-gray-50"
            >
              Back to Product
            </Button>
          ),
        };

      case "preview":
        return {
          primaryAction: null,
          secondaryActions: (
            <Button
              variant="outline"
              onClick={() => setStep("select-images")}
              className="border-ace-gray-300 text-ace-gray-700 hover:bg-ace-gray-50"
            >
              Back to Images
            </Button>
          ),
        };

      default:
        return { primaryAction: null, secondaryActions: null };
    }
  };

  const modalActions = getModalActions();

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold text-ace-purple">
            Create Facebook Ad
          </DialogTitle>
          <DialogDescription className="text-sm text-ace-gray-500">
            Campaign: {campaignName}
          </DialogDescription>
        </DialogHeader>

        <div className="min-h-[600px]">
          <div className="space-y-4">
            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Error</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {step === "select-product" && renderProductSelection()}
            {step === "generate-content" && renderContentGeneration()}
            {step === "select-images" && renderImageSelection()}
            {step === "preview" && renderPreview()}
          </div>
        </div>

        {(modalActions.primaryAction || modalActions.secondaryActions) && (
          <DialogFooter className="flex items-center justify-between">
            {modalActions.secondaryActions}
            {modalActions.primaryAction}
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}
