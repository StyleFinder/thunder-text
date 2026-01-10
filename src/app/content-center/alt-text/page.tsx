"use client";

import { useState, useEffect, useCallback } from "react";
import { useShop } from "@/hooks/useShop";
import { useShopifyAuth } from "@/app/components/ShopifyAuthProvider";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import Image from "next/image";
import {
  ImageIcon,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Sparkles,
  ArrowRight,
  Info,
  X,
} from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { logger } from "@/lib/logger";

interface AltTextSummary {
  totalProducts: number;
  totalImages: number;
  imagesWithAlt: number;
  imagesWithoutAlt: number;
  completionPercentage: number;
}

interface ProductNeedingAltText {
  id: string;
  title: string;
  totalImages: number;
  missingAlt: number;
}

interface BulkProcessResult {
  productsProcessed: number;
  imagesProcessed: number;
  imagesUpdated: number;
  errors: number;
  results: Array<{
    productId: string;
    productTitle: string;
    imagesProcessed: number;
    imagesUpdated: number;
    errors: string[];
  }>;
}

export default function AltTextPage() {
  const { shop, shopId, isUuidRouting } = useShop();
  const { authenticatedFetch } = useShopifyAuth();

  // State
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [summary, setSummary] = useState<AltTextSummary | null>(null);
  const [productsNeedingAlt, setProductsNeedingAlt] = useState<ProductNeedingAltText[]>([]);
  const [hasMore, setHasMore] = useState(false);

  // Selection state
  const [selectedProducts, setSelectedProducts] = useState<Set<string>>(new Set());
  const [selectAll, setSelectAll] = useState(false);

  // Processing state
  const [processing, setProcessing] = useState(false);
  const [processProgress, setProcessProgress] = useState(0);
  const [processResult, setProcessResult] = useState<BulkProcessResult | null>(null);

  // Fetch alt text summary
  const fetchSummary = useCallback(async () => {
    if (!shop) return;

    setLoading(true);
    setError(null);

    try {
      const isTestStore = shop?.includes("zunosai-staging-test-store");
      const isEmbedded = typeof window !== "undefined" && window.top !== window.self;

      const response = isTestStore && !isEmbedded
        ? await fetch("/api/shopify/products/bulk-alt-text?limit=100")
        : await authenticatedFetch("/api/shopify/products/bulk-alt-text?limit=100");

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to fetch alt text summary");
      }

      setSummary(data.data.summary);
      setProductsNeedingAlt(data.data.productsNeedingAltText || []);
      setHasMore(data.data.hasMoreProducts || false);
    } catch (err) {
      logger.error("Error fetching alt text summary:", err as Error, {
        component: "AltTextPage",
      });
      setError(err instanceof Error ? err.message : "Failed to load alt text data");
    } finally {
      setLoading(false);
    }
  }, [shop, authenticatedFetch]);

  useEffect(() => {
    fetchSummary();
  }, [fetchSummary]);

  // Handle select all toggle
  const handleSelectAll = () => {
    if (selectAll) {
      setSelectedProducts(new Set());
    } else {
      setSelectedProducts(new Set(productsNeedingAlt.map(p => p.id)));
    }
    setSelectAll(!selectAll);
  };

  // Handle individual product selection
  const handleProductSelect = (productId: string) => {
    const newSelected = new Set(selectedProducts);
    if (newSelected.has(productId)) {
      newSelected.delete(productId);
    } else {
      newSelected.add(productId);
    }
    setSelectedProducts(newSelected);
    setSelectAll(newSelected.size === productsNeedingAlt.length);
  };

  // Process selected products
  const handleProcessSelected = async () => {
    if (selectedProducts.size === 0) return;

    setProcessing(true);
    setProcessProgress(0);
    setProcessResult(null);
    setError(null);

    try {
      const isTestStore = shop?.includes("zunosai-staging-test-store");
      const isEmbedded = typeof window !== "undefined" && window.top !== window.self;

      // Start progress animation
      const progressInterval = setInterval(() => {
        setProcessProgress(prev => Math.min(prev + 5, 90));
      }, 500);

      const response = isTestStore && !isEmbedded
        ? await fetch("/api/shopify/products/bulk-alt-text", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              productIds: Array.from(selectedProducts),
              maxProducts: selectedProducts.size,
              onlyMissing: true,
            }),
          })
        : await authenticatedFetch("/api/shopify/products/bulk-alt-text", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              productIds: Array.from(selectedProducts),
              maxProducts: selectedProducts.size,
              onlyMissing: true,
            }),
          });

      clearInterval(progressInterval);
      setProcessProgress(100);

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to process alt text");
      }

      setProcessResult(data.data);

      // Refresh the summary after processing
      await fetchSummary();

      // Clear selection
      setSelectedProducts(new Set());
      setSelectAll(false);
    } catch (err) {
      logger.error("Error processing alt text:", err as Error, {
        component: "AltTextPage",
      });
      setError(err instanceof Error ? err.message : "Failed to process alt text");
    } finally {
      setProcessing(false);
    }
  };

  // Process all products needing alt text
  const handleProcessAll = async () => {
    setProcessing(true);
    setProcessProgress(0);
    setProcessResult(null);
    setError(null);

    try {
      const isTestStore = shop?.includes("zunosai-staging-test-store");
      const isEmbedded = typeof window !== "undefined" && window.top !== window.self;

      // Start progress animation
      const progressInterval = setInterval(() => {
        setProcessProgress(prev => Math.min(prev + 3, 90));
      }, 1000);

      const response = isTestStore && !isEmbedded
        ? await fetch("/api/shopify/products/bulk-alt-text", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              maxProducts: 50,
              onlyMissing: true,
            }),
          })
        : await authenticatedFetch("/api/shopify/products/bulk-alt-text", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              maxProducts: 50,
              onlyMissing: true,
            }),
          });

      clearInterval(progressInterval);
      setProcessProgress(100);

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to process alt text");
      }

      setProcessResult(data.data);

      // Refresh the summary after processing
      await fetchSummary();
    } catch (err) {
      logger.error("Error processing bulk alt text:", err as Error, {
        component: "AltTextPage",
      });
      setError(err instanceof Error ? err.message : "Failed to process alt text");
    } finally {
      setProcessing(false);
    }
  };

  // Loading state
  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
            <span className="ml-3 text-gray-600">Loading alt text data...</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div
              className="w-12 h-12 rounded-xl flex items-center justify-center"
              style={{ background: "linear-gradient(135deg, #0066cc 0%, #0099ff 100%)" }}
            >
              <ImageIcon className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Image Alt Text Manager</h1>
              <p className="text-gray-500">Generate SEO-friendly alt text for your product images</p>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={fetchSummary}
            disabled={loading}
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>

        {/* Error Alert */}
        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription className="flex-1">{error}</AlertDescription>
            <Button variant="ghost" size="sm" onClick={() => setError(null)}>
              <X className="h-4 w-4" />
            </Button>
          </Alert>
        )}

        {/* Summary Card */}
        {summary && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-green-600" />
                Alt Text Coverage
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Completion</span>
                  <span className="font-semibold text-lg">
                    {summary.completionPercentage}%
                  </span>
                </div>
                <Progress value={summary.completionPercentage} className="h-3" />
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-2">
                  <div className="text-center p-3 bg-gray-50 rounded-lg">
                    <div className="text-2xl font-bold text-gray-900">{summary.totalProducts}</div>
                    <div className="text-sm text-gray-500">Total Products</div>
                  </div>
                  <div className="text-center p-3 bg-gray-50 rounded-lg">
                    <div className="text-2xl font-bold text-gray-900">{summary.totalImages}</div>
                    <div className="text-sm text-gray-500">Total Images</div>
                  </div>
                  <div className="text-center p-3 bg-green-50 rounded-lg">
                    <div className="text-2xl font-bold text-green-600">{summary.imagesWithAlt}</div>
                    <div className="text-sm text-gray-500">With Alt Text</div>
                  </div>
                  <div className="text-center p-3 bg-amber-50 rounded-lg">
                    <div className="text-2xl font-bold text-amber-600">{summary.imagesWithoutAlt}</div>
                    <div className="text-sm text-gray-500">Missing Alt Text</div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Process Result */}
        {processResult && (
          <Alert className="bg-green-50 border-green-200">
            <CheckCircle2 className="h-4 w-4 text-green-600" />
            <AlertDescription className="text-green-700">
              Successfully processed {processResult.productsProcessed} product(s).
              Generated alt text for {processResult.imagesUpdated} image(s).
              {processResult.errors > 0 && ` (${processResult.errors} errors encountered)`}
            </AlertDescription>
          </Alert>
        )}

        {/* Products Needing Alt Text */}
        {productsNeedingAlt.length > 0 ? (
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <AlertCircle className="w-5 h-5 text-amber-600" />
                  Products Needing Alt Text ({productsNeedingAlt.length})
                </CardTitle>
                <div className="flex items-center gap-2">
                  {selectedProducts.size > 0 && (
                    <Button
                      size="sm"
                      onClick={handleProcessSelected}
                      disabled={processing}
                      style={{
                        background: "linear-gradient(135deg, #0066cc 0%, #0099ff 100%)",
                        border: "none",
                      }}
                    >
                      {processing ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Processing...
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-4 h-4 mr-2" />
                          Generate for Selected ({selectedProducts.size})
                        </>
                      )}
                    </Button>
                  )}
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={handleProcessAll}
                          disabled={processing}
                        >
                          <Sparkles className="w-4 h-4 mr-2" />
                          Generate All
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Process up to 50 products at once</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {/* Processing Progress */}
              {processing && (
                <div className="mb-4 space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">Generating alt text...</span>
                    <span className="font-medium">{processProgress}%</span>
                  </div>
                  <Progress value={processProgress} className="h-2" />
                </div>
              )}

              {/* Select All */}
              <div className="flex items-center space-x-2 mb-4 pb-4 border-b">
                <Checkbox
                  id="select-all"
                  checked={selectAll}
                  onCheckedChange={handleSelectAll}
                  disabled={processing}
                />
                <Label htmlFor="select-all" className="cursor-pointer font-medium">
                  Select All Products
                </Label>
              </div>

              {/* Product List */}
              <div className="space-y-2">
                {productsNeedingAlt.map((product) => (
                  <div
                    key={product.id}
                    className={`flex items-center justify-between p-3 rounded-lg border transition-colors ${
                      selectedProducts.has(product.id)
                        ? "border-blue-200 bg-blue-50/50"
                        : "border-gray-200 hover:border-gray-300"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <Checkbox
                        checked={selectedProducts.has(product.id)}
                        onCheckedChange={() => handleProductSelect(product.id)}
                        disabled={processing}
                      />
                      <div>
                        <div className="font-medium text-gray-900">{product.title}</div>
                        <div className="text-sm text-gray-500">
                          {product.missingAlt} of {product.totalImages} images need alt text
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-1 bg-amber-100 text-amber-700 text-xs font-medium rounded">
                        {product.missingAlt} missing
                      </span>
                    </div>
                  </div>
                ))}
              </div>

              {hasMore && (
                <div className="mt-4 pt-4 border-t text-center">
                  <p className="text-sm text-gray-500">
                    <Info className="w-4 h-4 inline mr-1" />
                    Showing first 100 products. Generate alt text to see remaining products.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        ) : summary && summary.imagesWithoutAlt === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <CheckCircle2 className="w-12 h-12 text-green-600 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                All Images Have Alt Text!
              </h3>
              <p className="text-gray-500">
                Great job! All your product images have SEO-friendly alt text.
              </p>
            </CardContent>
          </Card>
        ) : null}

        {/* Info Section */}
        <Card className="bg-blue-50 border-blue-100">
          <CardContent className="py-4">
            <div className="flex items-start gap-3">
              <Info className="w-5 h-5 text-blue-600 mt-0.5" />
              <div>
                <h4 className="font-medium text-blue-900 mb-1">Why Alt Text Matters</h4>
                <ul className="text-sm text-blue-700 space-y-1">
                  <li>• Improves SEO rankings by helping search engines understand images</li>
                  <li>• Makes your store accessible to users with visual impairments</li>
                  <li>• Displays as text when images fail to load</li>
                  <li>• Required for WCAG accessibility compliance</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
