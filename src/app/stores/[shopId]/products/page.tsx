"use client";

/**
 * /stores/[shopId]/products
 *
 * Products page using UUID-based routing.
 * The shop context is provided by the parent layout.
 */

import { useState, useEffect, Suspense } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useShopContext } from "../ShopContext";
import { logger } from "@/lib/logger";
import { Button } from "@/components/ui/button";
import {
  Loader2,
  Zap,
  Package,
  ArrowLeft,
  Sparkles,
  ImageOff,
  AlertCircle,
  RefreshCw,
  ChevronRight,
} from "lucide-react";

export const dynamic = "force-dynamic";

interface ProductImage {
  id: string;
  url: string;
  altText: string | null;
}

interface Product {
  node: {
    id: string;
    title: string;
    description: string;
    handle: string;
    images: {
      edges: Array<{
        node: ProductImage;
      }>;
    };
  };
}

// Product Card Component
function ProductCard({
  product,
  onGenerate,
  isGenerating,
}: {
  product: Product;
  onGenerate: (id: string) => void;
  isGenerating: boolean;
}) {
  const productData = product.node;
  const primaryImage = productData.images.edges[0]?.node;

  const truncateText = (text: string, maxLength: number) => {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + "...";
  };

  const stripHtml = (html: string) => {
    if (!html) return "";
    return html.replace(/<[^>]*>/g, "");
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden hover:shadow-lg hover:-translate-y-1 transition-all duration-200 group">
      {/* Product Image */}
      <div className="h-48 bg-gray-50 flex items-center justify-center overflow-hidden">
        {primaryImage ? (
          <Image
            src={primaryImage.url}
            alt={primaryImage.altText || productData.title}
            width={400}
            height={192}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            unoptimized
          />
        ) : (
          <div className="text-center p-6">
            <ImageOff className="w-10 h-10 text-gray-300 mx-auto mb-2" />
            <p className="text-sm text-gray-400">No image</p>
          </div>
        )}
      </div>

      {/* Product Info */}
      <div className="p-5">
        <h3 className="font-semibold text-gray-900 mb-2 line-clamp-2">
          {truncateText(productData.title, 60)}
        </h3>

        {productData.description && (
          <p className="text-sm text-gray-500 mb-4 line-clamp-2">
            {truncateText(stripHtml(productData.description), 100)}
          </p>
        )}

        <Button
          className="w-full h-10 font-medium transition-all"
          style={{
            background: isGenerating
              ? "#9ca3af"
              : "linear-gradient(135deg, #10b981 0%, #059669 100%)",
            border: "none",
          }}
          onClick={() => onGenerate(productData.id)}
          disabled={isGenerating}
        >
          {isGenerating ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Opening...
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4 mr-2" />
              Generate Description
            </>
          )}
        </Button>
      </div>
    </div>
  );
}

// Empty State Component
function EmptyState() {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
      <div
        className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6"
        style={{ background: "rgba(0, 102, 204, 0.1)" }}
      >
        <Package className="w-8 h-8" style={{ color: "#0066cc" }} />
      </div>
      <h2 className="text-xl font-semibold text-gray-900 mb-2">
        No products found
      </h2>
      <p className="text-gray-500 max-w-md mx-auto">
        It looks like your store doesn&apos;t have any products yet, or there
        was an issue loading them.
      </p>
    </div>
  );
}

function ProductsContent() {
  const router = useRouter();
  const { shopId, shopDomain } = useShopContext();

  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hasNextPage, setHasNextPage] = useState(false);
  const [cursor, setCursor] = useState<string | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const [generatingIds, setGeneratingIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (shopDomain) {
      fetchProducts();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shopDomain]);

  const fetchProducts = async (nextCursor?: string) => {
    try {
      const params = new URLSearchParams();
      params.append("limit", "12");
      if (shopDomain) {
        params.append("shop", shopDomain);
      }
      if (nextCursor) {
        params.append("cursor", nextCursor);
      }

      const response = await fetch(`/api/shopify/products?${params}`);
      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || "Failed to fetch products");
      }

      if (nextCursor) {
        setProducts((prev) => [...prev, ...data.products]);
      } else {
        setProducts(data.products || []);
      }

      setHasNextPage(data.pageInfo?.hasNextPage || false);
      setCursor(data.pageInfo?.endCursor || null);
      setError(null);
    } catch (err) {
      logger.error("Error fetching products:", err as Error, {
        component: "products",
      });
      setError("Failed to load products. Please try again.");
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  const handleLoadMore = () => {
    if (cursor && hasNextPage) {
      setLoadingMore(true);
      fetchProducts(cursor);
    }
  };

  const handleGenerateDescription = (productId: string) => {
    setGeneratingIds((prev) => new Set([...prev, productId]));
    // Navigate to generate page with UUID-based routing
    router.push(`/stores/${shopId}/enhance?productId=${productId}`);
  };

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <main className="max-w-6xl mx-auto px-6 py-8">
          {/* Header skeleton */}
          <div className="mb-8">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 rounded-xl bg-gray-200 animate-pulse" />
              <div>
                <div className="h-8 w-48 bg-gray-200 rounded animate-pulse mb-2" />
                <div className="h-4 w-64 bg-gray-100 rounded animate-pulse" />
              </div>
            </div>
          </div>

          {/* Loading grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div
                key={i}
                className="bg-white rounded-xl border border-gray-200 overflow-hidden"
              >
                <div className="h-48 bg-gray-100 animate-pulse" />
                <div className="p-5">
                  <div className="h-5 bg-gray-200 rounded animate-pulse mb-3" />
                  <div className="h-4 bg-gray-100 rounded animate-pulse mb-4 w-3/4" />
                  <div className="h-10 bg-gray-200 rounded animate-pulse" />
                </div>
              </div>
            ))}
          </div>
        </main>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div
        className="min-h-screen flex items-center justify-center p-6"
        style={{
          background:
            "linear-gradient(135deg, #001429 0%, #002952 50%, #003d7a 100%)",
        }}
      >
        <div className="w-full max-w-md">
          <div className="flex items-center justify-center gap-3 mb-8">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{
                background: "linear-gradient(135deg, #ffcc00 0%, #ff9900 100%)",
              }}
            >
              <Zap className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-bold text-white">Thunder Text</span>
          </div>
          <div className="bg-white rounded-2xl shadow-xl p-8">
            <div className="text-center">
              <div
                className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6"
                style={{ background: "rgba(220, 38, 38, 0.1)" }}
              >
                <AlertCircle className="w-8 h-8 text-red-500" />
              </div>
              <h1 className="text-2xl font-bold text-gray-900 mb-3">
                Failed to Load Products
              </h1>
              <p className="text-gray-500 mb-6">{error}</p>
              <Button
                className="w-full h-11 text-base font-medium"
                style={{
                  background:
                    "linear-gradient(135deg, #0066cc 0%, #0099ff 100%)",
                  border: "none",
                }}
                onClick={() => {
                  setLoading(true);
                  setError(null);
                  fetchProducts();
                }}
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Try Again
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

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
                <Package className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">
                  Your Products
                </h1>
                <p className="text-gray-500 text-sm">
                  {products.length} products from {shopDomain}
                </p>
              </div>
            </div>
            <Button
              variant="outline"
              className="border-gray-200 hover:bg-gray-50"
              onClick={() => router.push(`/stores/${shopId}/dashboard`)}
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Dashboard
            </Button>
          </div>

          {/* Info banner */}
          <div
            className="rounded-xl p-4 flex items-center gap-3"
            style={{
              background: "rgba(0, 102, 204, 0.05)",
              border: "1px solid rgba(0, 102, 204, 0.1)",
            }}
          >
            <Sparkles
              className="w-5 h-5 flex-shrink-0"
              style={{ color: "#0066cc" }}
            />
            <p className="text-sm" style={{ color: "#0066cc" }}>
              Select products to generate AI-powered descriptions that will
              boost your SEO and conversions.
            </p>
          </div>
        </div>

        {/* Products Grid */}
        {products.length === 0 ? (
          <EmptyState />
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
              {products.map((product) => (
                <ProductCard
                  key={product.node.id}
                  product={product}
                  onGenerate={handleGenerateDescription}
                  isGenerating={generatingIds.has(product.node.id)}
                />
              ))}
            </div>

            {/* Load More */}
            {hasNextPage && (
              <div className="text-center">
                <Button
                  variant="outline"
                  className="px-8 h-11 border-gray-200 hover:bg-gray-50"
                  onClick={handleLoadMore}
                  disabled={loadingMore}
                >
                  {loadingMore ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Loading more...
                    </>
                  ) : (
                    <>
                      Load More Products
                      <ChevronRight className="w-4 h-4 ml-2" />
                    </>
                  )}
                </Button>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}

export default function ProductsPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="flex flex-col items-center gap-4">
            <div
              className="w-12 h-12 rounded-xl flex items-center justify-center"
              style={{
                background: "linear-gradient(135deg, #ffcc00 0%, #ff9900 100%)",
              }}
            >
              <Zap className="w-6 h-6 text-white" />
            </div>
            <div className="flex items-center gap-3">
              <Loader2
                className="h-5 w-5 animate-spin"
                style={{ color: "#0066cc" }}
              />
              <p className="text-sm text-gray-500">Loading Products...</p>
            </div>
          </div>
        </div>
      }
    >
      <ProductsContent />
    </Suspense>
  );
}
