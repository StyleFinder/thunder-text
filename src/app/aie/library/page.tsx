/**
 * Ad Library Page
 * Displays store's ad library with tabs for different statuses
 */

"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { Plus, Loader2, X } from "lucide-react";
import { logger } from "@/lib/logger";
import { useShop } from "@/hooks/useShop";

interface AdLibraryItem {
  id: string;
  shop_id: string;
  status: "draft" | "active" | "paused" | "archived";
  headline: string;
  primary_text: string;
  description: string | null;
  cta: string;
  platform: string;
  campaign_goal: string;
  variant_type: string | null;
  image_urls: string[];
  product_metadata: {
    products?: Array<{
      id: string;
      title: string;
      handle: string;
    }>;
  };
  impressions: number;
  clicks: number;
  conversions: number;
  spend: number;
  revenue: number;
  ctr: number | null;
  cpc: number | null;
  cpa: number | null;
  roas: number | null;
  created_at: string;
  updated_at: string;
  published_at: string | null;
  archived_at: string | null;
}

interface AdCardProps {
  ad: AdLibraryItem;
  onStatusChange: (adId: string, newStatus: string) => void;
  onEdit: (ad: AdLibraryItem) => void;
}

function AdCard({ ad, onStatusChange, onEdit }: AdCardProps) {
  const getStatusBadge = (status: string) => {
    switch (status) {
      case "draft":
        return (
          <Badge
            variant="secondary"
            className="bg-dodger-100 text-dodger-700 hover:bg-dodger-200"
          >
            Draft
          </Badge>
        );
      case "active":
        return (
          <Badge
            variant="secondary"
            className="bg-green-100 text-green-700 hover:bg-green-200"
          >
            Active
          </Badge>
        );
      case "paused":
        return (
          <Badge
            variant="secondary"
            className="bg-amber-100 text-amber-700 hover:bg-amber-200"
          >
            Paused
          </Badge>
        );
      case "archived":
        return <Badge variant="secondary">Archived</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const hasMetrics = ad.impressions > 0 || ad.clicks > 0;

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex flex-col gap-4">
          {/* Header with status and date */}
          <div className="flex items-center justify-between">
            {getStatusBadge(ad.status)}
            <p className="text-sm text-gray-500">
              Created {formatDate(ad.created_at)}
            </p>
          </div>

          {/* Media Section */}
          {ad.image_urls && ad.image_urls.length > 0 && (
            <>
              <div className="flex flex-col gap-2">
                <p className="text-sm font-semibold">
                  Media ({ad.image_urls.length}{" "}
                  {ad.image_urls.length === 1 ? "image" : "images"})
                </p>
                <div className="grid grid-cols-3 gap-2 max-w-[50%]">
                  {ad.image_urls.slice(0, 4).map((url, idx) => (
                    <div
                      key={idx}
                      className="relative pb-[100%] bg-gray-100 rounded-lg overflow-hidden"
                    >
                      <Image
                        src={url}
                        alt={`Ad image ${idx + 1}`}
                        fill
                        className="object-cover"
                        unoptimized
                      />
                    </div>
                  ))}
                  {ad.image_urls.length > 4 && (
                    <div className="relative pb-[100%] bg-gray-100 rounded-lg flex items-center justify-center">
                      <p className="absolute text-sm text-gray-500 font-semibold">
                        +{ad.image_urls.length - 4}
                      </p>
                    </div>
                  )}
                </div>
                {ad.image_urls.length > 1 && (
                  <p className="text-xs text-gray-500 text-center">Carousel</p>
                )}
              </div>
              <Separator />
            </>
          )}

          {/* Ad Content */}
          <div className="flex flex-col gap-2">
            <h3 className="text-lg font-bold text-oxford-900">{ad.headline}</h3>
            <p className="text-base">{ad.primary_text}</p>
            {ad.description && (
              <p className="text-sm text-gray-500">{ad.description}</p>
            )}
            <div className="flex items-start gap-2 flex-wrap">
              <Badge
                variant="secondary"
                className="bg-dodger-100 text-dodger-700 hover:bg-dodger-200"
              >
                {ad.cta}
              </Badge>
              <Badge variant="secondary">{ad.platform}</Badge>
              <Badge variant="secondary">{ad.campaign_goal}</Badge>
            </div>
          </div>

          {/* Product Info */}
          {ad.product_metadata?.products &&
            ad.product_metadata.products.length > 0 && (
              <div className="flex flex-col gap-1">
                <p className="text-sm font-semibold">Products</p>
                {ad.product_metadata.products.map((product) => (
                  <p key={product.id} className="text-xs text-gray-500">
                    • {product.title}
                  </p>
                ))}
              </div>
            )}

          {/* Metrics (if available) */}
          {hasMetrics && (
            <>
              <Separator />
              <div className="flex flex-col gap-2">
                <p className="text-sm font-semibold">Performance</p>
                <div className="grid grid-cols-[repeat(auto-fit,minmax(100px,1fr))] gap-2">
                  <div className="flex flex-col gap-0.5">
                    <p className="text-xs text-gray-500">Impressions</p>
                    <p className="text-sm font-semibold">
                      {ad.impressions.toLocaleString()}
                    </p>
                  </div>
                  <div className="flex flex-col gap-0.5">
                    <p className="text-xs text-gray-500">Clicks</p>
                    <p className="text-sm font-semibold">
                      {ad.clicks.toLocaleString()}
                    </p>
                  </div>
                  {ad.conversions > 0 && (
                    <div className="flex flex-col gap-0.5">
                      <p className="text-xs text-gray-500">Conversions</p>
                      <p className="text-sm font-semibold">
                        {ad.conversions.toLocaleString()}
                      </p>
                    </div>
                  )}
                  {ad.ctr !== null && (
                    <div className="flex flex-col gap-0.5">
                      <p className="text-xs text-gray-500">CTR</p>
                      <p className="text-sm font-semibold">
                        {ad.ctr.toFixed(2)}%
                      </p>
                    </div>
                  )}
                  {ad.roas !== null && ad.roas > 0 && (
                    <div className="flex flex-col gap-0.5">
                      <p className="text-xs text-gray-500">ROAS</p>
                      <p className="text-sm font-semibold">
                        {ad.roas.toFixed(2)}x
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </>
          )}

          {/* Actions */}
          <Separator />
          <div className="flex items-center gap-2">
            {ad.status === "draft" && (
              <Button
                onClick={() => onStatusChange(ad.id, "active")}
                className="bg-smart-500 hover:bg-smart-600 text-white"
              >
                Activate
              </Button>
            )}
            {ad.status === "active" && (
              <Button
                onClick={() => onStatusChange(ad.id, "paused")}
                variant="outline"
              >
                Pause
              </Button>
            )}
            {ad.status === "paused" && (
              <>
                <Button
                  onClick={() => onStatusChange(ad.id, "active")}
                  className="bg-smart-500 hover:bg-smart-600 text-white"
                >
                  Resume
                </Button>
                <Button
                  onClick={() => onStatusChange(ad.id, "archived")}
                  variant="outline"
                >
                  Archive
                </Button>
              </>
            )}
            {ad.status !== "archived" && (
              <Button onClick={() => onEdit(ad)} variant="outline">
                Edit
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function AdLibraryPage() {
  const { shopId } = useShop();

  const [selected, setSelected] = useState("all");
  const [ads, setAds] = useState<AdLibraryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [bannerMessage, setBannerMessage] = useState<string>("");
  const [bannerTone, setBannerTone] = useState<"success" | "critical" | "info">(
    "info",
  );

  const tabs = [
    { id: "all", content: "All" },
    { id: "draft", content: "Drafts" },
    { id: "active", content: "Active" },
    { id: "paused", content: "Paused" },
    { id: "archived", content: "Archived" },
  ];

  const statusFilter = selected === "all" ? null : selected;

  const fetchAds = async () => {
    if (!shopId) return;

    try {
      setLoading(true);
      const url = new URL("/api/aie/library", window.location.origin);
      url.searchParams.set("shopId", shopId);
      if (statusFilter) {
        url.searchParams.set("status", statusFilter);
      }

      const response = await fetch(url.toString());
      const data = await response.json();

      if (data.success) {
        setAds(data.data.ads || []);
      } else {
        throw new Error(data.error?.message || "Failed to fetch ads");
      }
    } catch (error) {
      logger.error("Error fetching ads:", error as Error, {
        component: "library",
      });
      setBannerMessage(
        error instanceof Error ? error.message : "Failed to load ads",
      );
      setBannerTone("critical");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAds();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shopId, selected]);

  const handleStatusChange = async (adId: string, newStatus: string) => {
    try {
      const response = await fetch("/api/aie/library", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ adId, status: newStatus }),
      });

      const data = await response.json();

      if (data.success) {
        setBannerMessage("Ad status updated successfully");
        setBannerTone("success");
        fetchAds(); // Refresh the list
      } else {
        throw new Error(data.error?.message || "Failed to update ad");
      }
    } catch (error) {
      logger.error("Error updating ad:", error as Error, {
        component: "library",
      });
      setBannerMessage(
        error instanceof Error ? error.message : "Failed to update ad status",
      );
      setBannerTone("critical");
    }
  };

  const handleEdit = (_ad: AdLibraryItem) => {
    // Future: Open edit modal
    setBannerMessage("Edit functionality coming soon");
    setBannerTone("info");
  };

  const filteredAds = ads;
  const adCount = filteredAds.length;

  return (
    <div className="w-full">
      {/* Header */}
      <div className="border-b bg-white">
        <div className="w-full">
          <div className="flex items-center justify-between">
            <h1 className="text-3xl font-bold text-oxford-900">Ad Library</h1>
            <Button
              asChild
              className="bg-smart-500 hover:bg-smart-600 text-white"
            >
              <a href={`/aie?shop=${shopId}`}>
                <Plus className="w-4 h-4 mr-2" />
                Generate New Ad
              </a>
            </Button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="w-full">
        <div className="flex flex-col gap-4">
          {bannerMessage && (
            <Alert
              variant={bannerTone === "critical" ? "destructive" : "default"}
              className={
                bannerTone === "success"
                  ? "bg-green-50 border-green-200 text-green-800"
                  : bannerTone === "info"
                    ? "bg-dodger-50 border-dodger-200 text-dodger-800"
                    : ""
              }
            >
              <AlertDescription className="flex items-center justify-between">
                <span>{bannerMessage}</span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setBannerMessage("")}
                  className="h-auto p-1"
                >
                  <X className="w-4 h-4" />
                </Button>
              </AlertDescription>
            </Alert>
          )}

          <Card className="p-0">
            <Tabs value={selected} onValueChange={setSelected}>
              <CardHeader className="pb-0">
                <TabsList className="w-full justify-start">
                  {tabs.map((tab) => (
                    <TabsTrigger key={tab.id} value={tab.id}>
                      {tab.content}
                    </TabsTrigger>
                  ))}
                </TabsList>
              </CardHeader>
              <CardContent className="p-4">
                {tabs.map((tab) => (
                  <TabsContent key={tab.id} value={tab.id} className="mt-0">
                    {loading ? (
                      <div className="text-center py-10">
                        <Loader2 className="w-8 h-8 animate-spin mx-auto text-smart-500" />
                      </div>
                    ) : filteredAds.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
                        <Image
                          src="https://cdn.shopify.com/s/files/1/0262/4071/2726/files/emptystate-files.png"
                          alt="No ads"
                          width={128}
                          height={128}
                          className="w-32 h-32 mb-4 opacity-50"
                          unoptimized
                        />
                        <h3 className="text-lg font-semibold text-oxford-900 mb-2">
                          {statusFilter
                            ? `No ${statusFilter} ads yet`
                            : "No ads in your library yet"}
                        </h3>
                        <p className="text-gray-500 mb-4">
                          {statusFilter === "draft"
                            ? "Generate your first ad to get started"
                            : statusFilter
                              ? `No ads with "${statusFilter}" status`
                              : "Start by generating some ads"}
                        </p>
                        <Button
                          asChild
                          className="bg-smart-500 hover:bg-smart-600 text-white"
                        >
                          <a href={`/aie?shop=${shopId}`}>Generate New Ad</a>
                        </Button>
                      </div>
                    ) : (
                      <div className="flex flex-col gap-4">
                        <p className="text-base text-gray-500">
                          {adCount} {adCount === 1 ? "ad" : "ads"}
                        </p>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                          {filteredAds.map((ad) => (
                            <AdCard
                              key={ad.id}
                              ad={ad}
                              onStatusChange={handleStatusChange}
                              onEdit={handleEdit}
                            />
                          ))}
                        </div>
                      </div>
                    )}
                  </TabsContent>
                ))}
              </CardContent>
            </Tabs>
          </Card>
        </div>
      </div>
    </div>
  );
}
