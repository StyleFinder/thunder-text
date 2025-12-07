"use client";

import { useState, useEffect, useCallback } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Loader2,
  Library,
  ArrowLeft,
  Sparkles,
  Plus,
  Eye,
  Zap,
  AlertCircle,
  RefreshCw,
  Megaphone,
  ImageOff,
  Pencil,
  Trash2,
} from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { AdMockupModal } from "@/components/AdMockupModal";
import { logger } from "@/lib/logger";

interface SavedAd {
  id: string;
  headline: string;
  primary_text: string;
  description?: string;
  cta: string;
  platform: string;
  campaign_goal: string;
  variant_type?: string;
  image_urls?: string[];
  product_metadata?: {
    products?: Array<{
      id: string;
      title: string;
      handle: string;
    }>;
  };
  predicted_score?: number;
  selected_length?: string;
  status: string;
  created_at: string;
}

export default function AdsLibraryPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const shop = searchParams?.get("shop") || "";

  const [ads, setAds] = useState<SavedAd[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedAd, setSelectedAd] = useState<SavedAd | null>(null);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [adToDelete, setAdToDelete] = useState<SavedAd | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const fetchAds = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(
        `/api/aie/library?shopId=${encodeURIComponent(shop)}`,
      );
      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error?.message || "Failed to fetch ads");
      }

      setAds(data.data?.ads || []);
    } catch (err: unknown) {
      const errorMessage =
        err instanceof Error ? err.message : "Failed to load ads library";
      logger.error("Error fetching ads:", err as Error, {
        component: "ads-library",
      });
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, [shop]);

  useEffect(() => {
    if (shop) {
      fetchAds();
    }
  }, [shop, fetchAds]);

  const handlePreview = (ad: SavedAd) => {
    setSelectedAd(ad);
    setShowPreviewModal(true);
  };

  const handleDeleteClick = (ad: SavedAd) => {
    setAdToDelete(ad);
  };

  const handleDeleteConfirm = async () => {
    if (!adToDelete) return;

    setIsDeleting(true);
    try {
      const response = await fetch(
        `/api/aie/library?adId=${encodeURIComponent(adToDelete.id)}`,
        {
          method: "DELETE",
        },
      );
      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error?.message || "Failed to delete ad");
      }

      // Remove the deleted ad from local state
      setAds(ads.filter((ad) => ad.id !== adToDelete.id));
      setAdToDelete(null);
    } catch (err: any) {
      logger.error("Error deleting ad:", err as Error, {
        component: "ads-library",
      });
      setError(err.message || "Failed to delete ad");
    } finally {
      setIsDeleting(false);
    }
  };

  const getPlatformBadge = (platform: string) => {
    const getVariantClass = (p: string): string => {
      switch (p) {
        case "meta":
          return "bg-blue-100 text-blue-800 hover:bg-blue-200";
        case "instagram":
          return "bg-purple-100 text-purple-800 hover:bg-purple-200";
        case "google":
          return "bg-green-100 text-green-800 hover:bg-green-200";
        case "tiktok":
          return "bg-pink-100 text-pink-800 hover:bg-pink-200";
        case "pinterest":
          return "bg-red-100 text-red-800 hover:bg-red-200";
        default:
          return "bg-gray-100 text-gray-800";
      }
    };

    return (
      <Badge className={getVariantClass(platform)}>
        {platform.charAt(0).toUpperCase() + platform.slice(1)}
      </Badge>
    );
  };

  const getGoalBadge = (goal: string) => {
    return (
      <Badge variant="outline">
        {goal.charAt(0).toUpperCase() + goal.slice(1)}
      </Badge>
    );
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
    }).format(date);
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <main className="max-w-6xl mx-auto px-6 py-8">
          {/* Header skeleton */}
          <div className="mb-8">
            <div className="flex items-center gap-4 mb-6">
              <div className="w-12 h-12 rounded-xl bg-gray-200 animate-pulse" />
              <div>
                <div className="h-8 w-48 bg-gray-200 rounded animate-pulse mb-2" />
                <div className="h-4 w-64 bg-gray-100 rounded animate-pulse" />
              </div>
            </div>
          </div>
          {/* Content skeleton */}
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="bg-white rounded-xl border border-gray-200 p-6 animate-pulse"
              >
                <div className="flex gap-4">
                  <div className="flex-1">
                    <div className="flex gap-2 mb-3">
                      <div className="h-6 w-20 bg-gray-200 rounded-full" />
                      <div className="h-6 w-16 bg-gray-100 rounded-full" />
                    </div>
                    <div className="h-5 bg-gray-200 rounded mb-2 w-3/4" />
                    <div className="h-4 bg-gray-100 rounded mb-2 w-full" />
                    <div className="h-4 bg-gray-100 rounded w-1/2" />
                  </div>
                  <div className="w-20 h-20 bg-gray-100 rounded-lg" />
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
                Failed to Load Ads Library
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
                  setError(null);
                  setIsLoading(true);
                  fetchAds();
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
                <Library className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">
                  Ads Library
                </h1>
                <p className="text-gray-500 text-sm">
                  Browse and manage your saved ad campaigns
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                className="border-gray-200 hover:bg-gray-50"
                onClick={() => router.push(`/dashboard?shop=${shop}`)}
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Dashboard
              </Button>
              <Link href={`/create-ad?shop=${shop}`}>
                <Button
                  style={{
                    background:
                      "linear-gradient(135deg, #0066cc 0%, #0099ff 100%)",
                    border: "none",
                  }}
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Create New Ad
                </Button>
              </Link>
            </div>
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
              Your saved ads are stored here. Preview, edit, or use them to
              launch new campaigns.
            </p>
          </div>
        </div>

        {/* Empty State */}
        {ads.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
            <div
              className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6"
              style={{ background: "rgba(0, 102, 204, 0.1)" }}
            >
              <Megaphone className="w-8 h-8" style={{ color: "#0066cc" }} />
            </div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">
              No ads in your library yet
            </h2>
            <p className="text-gray-500 max-w-md mx-auto mb-6">
              Create your first ad campaign to get started. Your saved ads will
              appear here.
            </p>
            <Link href={`/create-ad?shop=${shop}`}>
              <Button
                className="h-11 px-6 text-base font-medium"
                style={{
                  background:
                    "linear-gradient(135deg, #0066cc 0%, #0099ff 100%)",
                  border: "none",
                }}
              >
                <Plus className="w-4 h-4 mr-2" />
                Create Your First Ad
              </Button>
            </Link>
          </div>
        ) : (
          /* Ads List */
          <div className="space-y-4">
            {ads.map((ad) => (
              <div
                key={ad.id}
                className="bg-white rounded-xl border border-gray-200 p-6 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200"
              >
                <div className="flex justify-between items-start gap-4">
                  <div className="flex-1 space-y-3">
                    <div className="flex flex-wrap gap-2">
                      {getPlatformBadge(ad.platform)}
                      {getGoalBadge(ad.campaign_goal)}
                      {ad.predicted_score && ad.predicted_score > 0 && (
                        <Badge className="bg-green-100 text-green-700 hover:bg-green-200">
                          Score: {(ad.predicted_score * 10).toFixed(0)}%
                        </Badge>
                      )}
                      {ad.selected_length && (
                        <Badge
                          variant="secondary"
                          className="bg-gray-100 text-gray-600"
                        >
                          {ad.selected_length}
                        </Badge>
                      )}
                    </div>

                    <h3 className="text-lg font-semibold text-gray-900">
                      {ad.headline}
                    </h3>

                    <p className="text-gray-600 text-sm">
                      {ad.primary_text?.length > 150
                        ? ad.primary_text.substring(0, 150) + "..."
                        : ad.primary_text}
                    </p>

                    {ad.product_metadata?.products?.[0]?.title && (
                      <p className="text-sm text-gray-500">
                        Product: {ad.product_metadata.products[0].title}
                      </p>
                    )}

                    <p className="text-xs text-gray-400">
                      Created {formatDate(ad.created_at)}
                    </p>
                  </div>

                  {ad.image_urls?.[0] ? (
                    <div className="w-20 h-20 rounded-lg overflow-hidden bg-gray-100 flex-shrink-0 relative">
                      <Image
                        src={ad.image_urls[0]}
                        alt={
                          ad.product_metadata?.products?.[0]?.title || "Product"
                        }
                        fill
                        className="object-cover"
                        unoptimized
                      />
                    </div>
                  ) : (
                    <div className="w-20 h-20 rounded-lg bg-gray-50 flex items-center justify-center flex-shrink-0">
                      <ImageOff className="w-6 h-6 text-gray-300" />
                    </div>
                  )}
                </div>

                <div className="mt-4 pt-4 border-t border-gray-100 flex justify-between items-center">
                  <div className="flex gap-3">
                    <Button
                      onClick={() => handlePreview(ad)}
                      variant="outline"
                      className="border-gray-200 hover:bg-gray-50"
                    >
                      <Eye className="w-4 h-4 mr-2" />
                      Preview
                    </Button>
                    <Button
                      onClick={() =>
                        router.push(`/ads-library/${ad.id}/edit?shop=${shop}`)
                      }
                      style={{
                        background:
                          "linear-gradient(135deg, #0066cc 0%, #0099ff 100%)",
                        border: "none",
                      }}
                    >
                      <Pencil className="w-4 h-4 mr-2" />
                      Edit Ad
                    </Button>
                  </div>
                  <Button
                    onClick={() => handleDeleteClick(ad)}
                    variant="ghost"
                    className="text-red-500 hover:text-red-700 hover:bg-red-50"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Preview Modal */}
        {selectedAd && (
          <AdMockupModal
            open={showPreviewModal}
            onClose={() => {
              setShowPreviewModal(false);
              setSelectedAd(null);
            }}
            variant={{
              headline: selectedAd.headline,
              primary_text: selectedAd.primary_text,
              description: selectedAd.description,
              variant_type: selectedAd.variant_type,
              predicted_score: selectedAd.predicted_score,
              selected_length: selectedAd.selected_length,
            }}
            platform={selectedAd.platform}
            goal={selectedAd.campaign_goal}
            productData={selectedAd.product_metadata}
            previewOnly={true}
          />
        )}

        {/* Delete Confirmation Dialog */}
        <AlertDialog
          open={!!adToDelete}
          onOpenChange={(open) => !open && setAdToDelete(null)}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Ad</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete &quot;{adToDelete?.headline}
                &quot;? This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={isDeleting}>
                Cancel
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDeleteConfirm}
                disabled={isDeleting}
                className="bg-red-500 hover:bg-red-600 text-white"
              >
                {isDeleting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Deleting...
                  </>
                ) : (
                  <>
                    <Trash2 className="w-4 h-4 mr-2" />
                    Delete
                  </>
                )}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </main>
    </div>
  );
}
