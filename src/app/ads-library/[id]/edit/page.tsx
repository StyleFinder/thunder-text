"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter, useSearchParams, useParams } from "next/navigation";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Loader2,
  ArrowLeft,
  Save,
  Zap,
  AlertCircle,
  RefreshCw,
  Check,
  Copy,
  Download,
  Smartphone,
  Monitor,
  Sparkles,
  Send,
  Facebook,
} from "lucide-react";
import { logger } from "@/lib/logger";

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

interface AdData {
  id: string;
  headline: string;
  primary_text: string;
  description?: string;
  cta: string;
  platform: string;
  campaign_goal: string;
  variant_type?: string;
  image_urls?: string[];
  product_metadata?: any;
  predicted_score?: number;
  selected_length?: string;
  status: string;
  created_at: string;
  updated_at: string;
}

export default function AdEditorPage() {
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const adId = params?.id as string;
  const shop = searchParams?.get("shop") || "";

  const [ad, setAd] = useState<AdData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isPosting, setIsPosting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [facebookSuccessModalOpen, setFacebookSuccessModalOpen] =
    useState(false);
  const [previewMode, setPreviewMode] = useState<"mobile" | "desktop">(
    "mobile",
  );
  const [copied, setCopied] = useState<string | null>(null);

  // Campaign selection
  const [adAccounts, setAdAccounts] = useState<AdAccount[]>([]);
  const [selectedAdAccount, setSelectedAdAccount] = useState<string>("");
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [selectedCampaign, setSelectedCampaign] = useState<string>("");
  const [isLoadingCampaigns, setIsLoadingCampaigns] = useState(false);
  const [facebookConnected, setFacebookConnected] = useState(false);

  // Editable fields
  const [headline, setHeadline] = useState("");
  const [primaryText, setPrimaryText] = useState("");
  const [description, setDescription] = useState("");
  const [cta, setCta] = useState("");

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
        component: "ad-editor",
      });
      setFacebookConnected(false);
    }
  }, [shop]);

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
          component: "ad-editor",
        });
      } finally {
        setIsLoadingCampaigns(false);
      }
    },
    [shop],
  );

  useEffect(() => {
    if (shop) {
      fetchAdAccounts();
    }
  }, [shop, fetchAdAccounts]);

  useEffect(() => {
    if (selectedAdAccount && shop) {
      fetchCampaigns(selectedAdAccount);
    }
  }, [selectedAdAccount, shop, fetchCampaigns]);

  const handlePostToCampaign = async () => {
    if (!ad || !selectedCampaign || !selectedAdAccount) {
      setError("Please select an ad account and campaign first");
      return;
    }

    // Get the campaign name from the campaigns array
    const selectedCampaignData = campaigns.find(
      (c) => c.id === selectedCampaign,
    );
    if (!selectedCampaignData) {
      setError("Selected campaign not found. Please try selecting again.");
      return;
    }

    // Save changes first
    await handleSave();

    setIsPosting(true);
    setError(null);

    try {
      // Create an ad draft and submit it
      const draftResponse = await fetch("/api/facebook/ad-drafts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          shop,
          shopify_product_id: ad.product_metadata?.products?.[0]?.id || null,
          ad_title: headline,
          ad_copy: primaryText,
          image_urls: ad.image_urls || [],
          selected_image_url: ad.image_urls?.[0] || null,
          facebook_ad_account_id: selectedAdAccount,
          facebook_campaign_id: selectedCampaign,
          facebook_campaign_name: selectedCampaignData.name,
          additional_metadata: {
            description,
            cta,
            product_handle: ad.product_metadata?.products?.[0]?.handle,
            platform: ad.platform,
            campaign_goal: ad.campaign_goal,
          },
        }),
      });

      const draftData = await draftResponse.json();

      if (!draftData.success) {
        throw new Error(draftData.error || "Failed to create ad draft");
      }

      // Submit the draft to Facebook
      const submitResponse = await fetch("/api/facebook/ad-drafts/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          shop,
          draft_id: draftData.data.id,
        }),
      });

      const submitData = await submitResponse.json();

      if (!submitData.success) {
        throw new Error(submitData.error || "Failed to submit ad to Facebook");
      }

      // Show success modal instead of banner (user is at bottom of page)
      setFacebookSuccessModalOpen(true);
    } catch (err: any) {
      logger.error("Error posting to campaign:", err as Error, {
        component: "ad-editor",
      });
      setError(err.message || "Failed to post ad to campaign");
    } finally {
      setIsPosting(false);
    }
  };

  const fetchAd = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/aie/library/${adId}`);
      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error?.message || "Failed to fetch ad");
      }

      const adData = data.data?.ad;
      setAd(adData);
      setHeadline(adData.headline || "");
      setPrimaryText(adData.primary_text || "");
      setDescription(adData.description || "");
      setCta(adData.cta || "Shop Now");
    } catch (err: unknown) {
      const errorMessage =
        err instanceof Error ? err.message : "Failed to load ad";
      logger.error("Error fetching ad:", err as Error, {
        component: "ad-editor",
      });
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, [adId]);

  useEffect(() => {
    if (adId) {
      fetchAd();
    }
  }, [adId, fetchAd]);

  const handleSave = async () => {
    if (!ad) return;

    setIsSaving(true);
    setError(null);
    setSuccessMessage(null);

    try {
      const response = await fetch(`/api/aie/library/${adId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          headline,
          primaryText,
          description,
          cta,
        }),
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error?.message || "Failed to save changes");
      }

      setAd(data.data?.ad);
      setSuccessMessage("Changes saved successfully!");
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err: any) {
      logger.error("Error saving ad:", err as Error, {
        component: "ad-editor",
      });
      setError(err.message || "Failed to save changes");
    } finally {
      setIsSaving(false);
    }
  };

  const copyToClipboard = async (text: string, field: string) => {
    await navigator.clipboard.writeText(text);
    setCopied(field);
    setTimeout(() => setCopied(null), 2000);
  };

  const exportAd = () => {
    if (!ad) return;

    const exportData = {
      headline,
      primaryText,
      description,
      cta,
      platform: ad.platform,
      campaignGoal: ad.campaign_goal,
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `ad-${ad.id.slice(0, 8)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const getPlatformColor = (platform: string) => {
    const colors: Record<string, string> = {
      meta: "#1877F2",
      instagram: "#E4405F",
      google: "#4285F4",
      tiktok: "#000000",
      pinterest: "#E60023",
    };
    // eslint-disable-next-line security/detect-object-injection
    return colors[platform] || "#6B7280";
  };

  const getPlatformName = (platform: string) => {
    const names: Record<string, string> = {
      meta: "Meta (Facebook)",
      instagram: "Instagram",
      google: "Google Ads",
      tiktok: "TikTok",
      pinterest: "Pinterest",
    };
    // eslint-disable-next-line security/detect-object-injection
    return names[platform] || platform;
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <main className="max-w-6xl mx-auto px-6 py-8">
          <div className="animate-pulse space-y-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-gray-200" />
              <div>
                <div className="h-8 w-48 bg-gray-200 rounded mb-2" />
                <div className="h-4 w-64 bg-gray-100 rounded" />
              </div>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-white rounded-xl p-6 h-96 border border-gray-200" />
              <div className="bg-white rounded-xl p-6 h-96 border border-gray-200" />
            </div>
          </div>
        </main>
      </div>
    );
  }

  // Error state
  if (error && !ad) {
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
                Failed to Load Ad
              </h1>
              <p className="text-gray-500 mb-6">{error}</p>
              <div className="space-y-3">
                <Button
                  className="w-full h-11 text-base font-medium"
                  style={{
                    background:
                      "linear-gradient(135deg, #0066cc 0%, #0099ff 100%)",
                    border: "none",
                  }}
                  onClick={fetchAd}
                >
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Try Again
                </Button>
                <Button
                  variant="outline"
                  className="w-full h-11"
                  onClick={() => router.push(`/ads-library?shop=${shop}`)}
                >
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back to Library
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!ad) return null;

  return (
    <div className="min-h-screen bg-gray-50">
      <main className="max-w-7xl mx-auto px-6 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between flex-wrap gap-4 mb-4">
            <div className="flex items-center gap-4">
              <div
                className="w-12 h-12 rounded-xl flex items-center justify-center"
                style={{
                  background: `linear-gradient(135deg, ${getPlatformColor(ad.platform)} 0%, ${getPlatformColor(ad.platform)}cc 100%)`,
                }}
              >
                <Sparkles className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Edit Ad</h1>
                <p className="text-gray-500 text-sm">
                  {getPlatformName(ad.platform)} •{" "}
                  {ad.campaign_goal.charAt(0).toUpperCase() +
                    ad.campaign_goal.slice(1)}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                className="border-gray-200 hover:bg-gray-50"
                onClick={() => router.push(`/ads-library?shop=${shop}`)}
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Library
              </Button>
              <Button
                variant="outline"
                className="border-gray-200 hover:bg-gray-50"
                onClick={exportAd}
              >
                <Download className="w-4 h-4 mr-2" />
                Export
              </Button>
              <Button
                onClick={handleSave}
                disabled={isSaving}
                style={{
                  background:
                    "linear-gradient(135deg, #0066cc 0%, #0099ff 100%)",
                  border: "none",
                }}
              >
                {isSaving ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Save className="w-4 h-4 mr-2" />
                )}
                Save Changes
              </Button>
            </div>
          </div>

          {/* Status badges */}
          <div className="flex flex-wrap gap-2">
            <Badge
              style={{
                backgroundColor: `${getPlatformColor(ad.platform)}20`,
                color: getPlatformColor(ad.platform),
              }}
            >
              {getPlatformName(ad.platform)}
            </Badge>
            <Badge variant="outline">{ad.campaign_goal}</Badge>
            {ad.predicted_score && (
              <Badge className="bg-green-100 text-green-700">
                Score: {(ad.predicted_score * 10).toFixed(0)}%
              </Badge>
            )}
            {ad.selected_length && (
              <Badge variant="secondary">{ad.selected_length}</Badge>
            )}
          </div>
        </div>

        {/* Success/Error Messages */}
        {successMessage && (
          <Alert className="mb-6 bg-green-50 border-green-200">
            <Check className="h-4 w-4 text-green-600" />
            <AlertDescription className="text-green-700">
              {successMessage}
            </AlertDescription>
          </Alert>
        )}
        {error && (
          <Alert className="mb-6 bg-red-50 border-red-200">
            <AlertCircle className="h-4 w-4 text-red-600" />
            <AlertDescription className="text-red-700">
              {error}
            </AlertDescription>
          </Alert>
        )}

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Editor Panel */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Ad Copy</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Headline */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-sm font-medium text-gray-700">
                      Headline
                    </label>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 px-2"
                      onClick={() => copyToClipboard(headline, "headline")}
                    >
                      {copied === "headline" ? (
                        <Check className="w-3.5 h-3.5 text-green-600" />
                      ) : (
                        <Copy className="w-3.5 h-3.5 text-gray-400" />
                      )}
                    </Button>
                  </div>
                  <Input
                    value={headline}
                    onChange={(e) => setHeadline(e.target.value)}
                    placeholder="Enter headline..."
                    className="h-11"
                  />
                  <p className="text-xs text-gray-400 mt-1">
                    {headline.length} characters
                  </p>
                </div>

                {/* Primary Text */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-sm font-medium text-gray-700">
                      Primary Text
                    </label>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 px-2"
                      onClick={() =>
                        copyToClipboard(primaryText, "primaryText")
                      }
                    >
                      {copied === "primaryText" ? (
                        <Check className="w-3.5 h-3.5 text-green-600" />
                      ) : (
                        <Copy className="w-3.5 h-3.5 text-gray-400" />
                      )}
                    </Button>
                  </div>
                  <Textarea
                    value={primaryText}
                    onChange={(e) => setPrimaryText(e.target.value)}
                    placeholder="Enter primary text..."
                    className="min-h-[120px] resize-none"
                  />
                  <p className="text-xs text-gray-400 mt-1">
                    {primaryText.length} characters
                  </p>
                </div>

                {/* Description */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-sm font-medium text-gray-700">
                      Description (Optional)
                    </label>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 px-2"
                      onClick={() =>
                        copyToClipboard(description, "description")
                      }
                    >
                      {copied === "description" ? (
                        <Check className="w-3.5 h-3.5 text-green-600" />
                      ) : (
                        <Copy className="w-3.5 h-3.5 text-gray-400" />
                      )}
                    </Button>
                  </div>
                  <Textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Enter description..."
                    className="min-h-[80px] resize-none"
                  />
                </div>

                {/* CTA */}
                <div>
                  <label className="text-sm font-medium text-gray-700 block mb-2">
                    Call to Action
                  </label>
                  <Input
                    value={cta}
                    onChange={(e) => setCta(e.target.value)}
                    placeholder="Shop Now"
                    className="h-11"
                  />
                </div>
              </CardContent>
            </Card>

            {/* Product Info */}
            {ad.product_metadata?.products &&
              ad.product_metadata.products.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Product</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center gap-3">
                      {ad.image_urls?.[0] && (
                        <Image
                          src={ad.image_urls[0]}
                          alt="Product"
                          width={64}
                          height={64}
                          className="w-16 h-16 rounded-lg object-cover"
                          unoptimized
                        />
                      )}
                      <div>
                        <p className="font-medium text-gray-900">
                          {ad.product_metadata.products[0].title}
                        </p>
                        <p className="text-sm text-gray-500">
                          {ad.product_metadata.products[0].handle}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

            {/* Campaign Selection */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Facebook className="w-5 h-5 text-blue-600" />
                  Post to Facebook Campaign
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {!facebookConnected ? (
                  <Alert className="bg-yellow-50 border-yellow-200">
                    <AlertCircle className="h-4 w-4 text-yellow-600" />
                    <AlertDescription className="text-yellow-700">
                      Connect your Facebook account in Settings to post ads to
                      campaigns.
                    </AlertDescription>
                  </Alert>
                ) : (
                  <>
                    {/* Ad Account Selection */}
                    <div>
                      <label className="text-sm font-medium text-gray-700 block mb-2">
                        Ad Account
                      </label>
                      <Select
                        value={selectedAdAccount}
                        onValueChange={setSelectedAdAccount}
                      >
                        <SelectTrigger className="h-11">
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
                    <div>
                      <label className="text-sm font-medium text-gray-700 block mb-2">
                        Campaign
                      </label>
                      <Select
                        value={selectedCampaign}
                        onValueChange={setSelectedCampaign}
                        disabled={!selectedAdAccount || isLoadingCampaigns}
                      >
                        <SelectTrigger className="h-11">
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
                          <p className="text-xs text-gray-500 mt-1">
                            No active campaigns found. Create a campaign in
                            Facebook Ads Manager first.
                          </p>
                        )}
                    </div>

                    {/* Post to Campaign Button */}
                    <Button
                      onClick={handlePostToCampaign}
                      disabled={!selectedCampaign || isPosting}
                      className="w-full h-11"
                      style={{
                        background: selectedCampaign
                          ? "linear-gradient(135deg, #1877F2 0%, #42A5F5 100%)"
                          : undefined,
                        border: "none",
                      }}
                    >
                      {isPosting ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Posting to Facebook...
                        </>
                      ) : (
                        <>
                          <Send className="w-4 h-4 mr-2" />
                          Post to Campaign
                        </>
                      )}
                    </Button>
                    <p className="text-xs text-gray-500 text-center">
                      Ad will be created in PAUSED status for your review
                    </p>
                  </>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Preview Panel */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">Preview</h3>
              <div className="flex items-center gap-2 bg-gray-100 rounded-lg p-1">
                <button
                  onClick={() => setPreviewMode("mobile")}
                  className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                    previewMode === "mobile"
                      ? "bg-white text-gray-900 shadow-sm"
                      : "text-gray-500 hover:text-gray-700"
                  }`}
                >
                  <Smartphone className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setPreviewMode("desktop")}
                  className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                    previewMode === "desktop"
                      ? "bg-white text-gray-900 shadow-sm"
                      : "text-gray-500 hover:text-gray-700"
                  }`}
                >
                  <Monitor className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Platform Preview */}
            <div
              className={`bg-white rounded-xl border border-gray-200 overflow-hidden ${
                previewMode === "mobile" ? "max-w-[375px] mx-auto" : ""
              }`}
            >
              {/* Platform Header */}
              <div
                className="px-4 py-3 border-b border-gray-100 flex items-center gap-2"
                style={{
                  backgroundColor: `${getPlatformColor(ad.platform)}10`,
                }}
              >
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold"
                  style={{ backgroundColor: getPlatformColor(ad.platform) }}
                >
                  {ad.platform.charAt(0).toUpperCase()}
                </div>
                <div>
                  <p className="font-medium text-sm text-gray-900">
                    Your Brand
                  </p>
                  <p className="text-xs text-gray-500">Sponsored</p>
                </div>
              </div>

              {/* Ad Content */}
              <div className="p-4">
                {/* Primary Text */}
                <p className="text-sm text-gray-800 mb-3 whitespace-pre-wrap">
                  {primaryText || "Your primary text will appear here..."}
                </p>

                {/* Image */}
                {ad.image_urls?.[0] && (
                  <div className="relative aspect-square mb-3 rounded-lg overflow-hidden bg-gray-100">
                    <Image
                      src={ad.image_urls[0]}
                      alt="Ad preview"
                      fill
                      className="object-cover"
                      unoptimized
                    />
                  </div>
                )}

                {/* Headline & CTA */}
                <div className="border border-gray-200 rounded-lg p-3 bg-gray-50">
                  <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">
                    yourstore.com
                  </p>
                  <p className="font-semibold text-gray-900 mb-2">
                    {headline || "Your headline will appear here..."}
                  </p>
                  {description && (
                    <p className="text-sm text-gray-600 mb-3">{description}</p>
                  )}
                  <button
                    className="w-full py-2 px-4 rounded-lg font-medium text-white text-sm"
                    style={{ backgroundColor: getPlatformColor(ad.platform) }}
                  >
                    {cta || "Shop Now"}
                  </button>
                </div>
              </div>

              {/* Engagement Bar */}
              <div className="px-4 py-3 border-t border-gray-100 flex items-center justify-between text-gray-500 text-sm">
                <span>Like</span>
                <span>Comment</span>
                <span>Share</span>
              </div>
            </div>

            {/* Platform Tips */}
            <Card className="bg-blue-50 border-blue-100">
              <CardContent className="pt-4">
                <div className="flex items-start gap-3">
                  <Sparkles className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium text-blue-900 mb-1">
                      Platform Tips
                    </p>
                    <ul className="text-sm text-blue-700 space-y-1">
                      {ad.platform === "meta" && (
                        <>
                          <li>• Headlines: 25-40 characters work best</li>
                          <li>
                            • Primary text: First 125 characters are visible
                          </li>
                          <li>• Use emojis sparingly for engagement</li>
                        </>
                      )}
                      {ad.platform === "instagram" && (
                        <>
                          <li>• Keep captions concise and engaging</li>
                          <li>• Use 3-5 relevant hashtags</li>
                          <li>• Strong visual hook in first line</li>
                        </>
                      )}
                      {ad.platform === "google" && (
                        <>
                          <li>• Headlines: Max 30 characters each</li>
                          <li>• Descriptions: Max 90 characters</li>
                          <li>• Include keywords naturally</li>
                        </>
                      )}
                      {ad.platform === "tiktok" && (
                        <>
                          <li>• Hook viewers in first 2 seconds</li>
                          <li>• Keep text overlays brief</li>
                          <li>• Use trending sounds/effects</li>
                        </>
                      )}
                      {ad.platform === "pinterest" && (
                        <>
                          <li>• Use keyword-rich descriptions</li>
                          <li>• Vertical images perform best</li>
                          <li>• Include a clear CTA</li>
                        </>
                      )}
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>

      {/* Facebook Success Modal */}
      <Dialog
        open={facebookSuccessModalOpen}
        onOpenChange={setFacebookSuccessModalOpen}
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
            <div className="bg-white rounded-lg p-4 border border-gray-200">
              <div className="flex flex-col gap-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500">Campaign:</span>
                  <span className="font-medium text-gray-900">
                    {campaigns.find((c) => c.id === selectedCampaign)?.name ||
                      "Selected campaign"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Status:</span>
                  <span className="font-medium text-amber-600">PAUSED</span>
                </div>
              </div>
            </div>
            <p className="text-sm text-gray-500">
              Your ad has been created in PAUSED status for your review. You can
              activate it in Facebook Ads Manager.
            </p>
          </div>

          <div className="px-6 py-4 border-t border-gray-200 bg-white flex justify-end gap-3">
            <Button
              variant="outline"
              onClick={() => setFacebookSuccessModalOpen(false)}
              className="border-gray-200 hover:bg-gray-50"
            >
              Close
            </Button>
            <Button
              onClick={() => {
                setFacebookSuccessModalOpen(false);
                router.push(`/ads?shop=${shop}`);
              }}
              style={{
                background: "linear-gradient(135deg, #0066cc 0%, #0099ff 100%)",
                border: "none",
              }}
            >
              View Ads Library
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
