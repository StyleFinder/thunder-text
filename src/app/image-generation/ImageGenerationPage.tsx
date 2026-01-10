"use client";

/**
 * Image Generation Page Component
 *
 * AI-powered lifestyle image generator for product photos.
 * Features:
 * - Upload product reference image
 * - Choose AI model (GPT Image 1 / DALL-E 3)
 * - Chat-based interaction for generating and iterating on images
 * - Export to library, download, or use in ads
 */

import { useState, useCallback, useEffect } from "react";
import Image from "next/image";
import { useShop } from "@/hooks/useShop";
import { logger } from "@/lib/logger";
import { useNavigation } from "@/app/hooks/useNavigation";
import {
  ArrowLeft,
  Sparkles,
  Library,
  Clock,
  Loader2,
  ImageIcon,
  Trash2,
  Info,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import { colors } from "@/lib/design-system/colors";
import {
  ImageUploadArea,
  ProviderSelector,
  ExportDialog,
  ImageGenerationChat,
} from "@/app/components/image-generation";
import type {
  OpenAIImageModel,
  AspectRatio,
  GeneratedImage,
  LibraryImage,
} from "@/types/image-generation";

interface UsageInfo {
  usedCount: number;
  totalCostCents: number;
  limitCount: number;
  remainingCount: number;
}

interface ShopifyProduct {
  id: string;
  title: string;
}

export default function ImageGenerationPage() {
  const { navigateTo } = useNavigation();
  const { shopId, shopDomain, shop: _shop, isLoading: shopLoading } = useShop();

  // State
  const [referenceImage, setReferenceImage] = useState<string | null>(null);
  const [openaiModel, setOpenaiModel] =
    useState<OpenAIImageModel>("gpt-image-1");
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>("1:1");
  const [currentImage, setCurrentImage] = useState<GeneratedImage | null>(null);
  const [isGenerating, _setIsGenerating] = useState(false);
  const [showExportDialog, setShowExportDialog] = useState(false);
  const [usageInfo, setUsageInfo] = useState<UsageInfo | null>(null);
  const [library, setLibrary] = useState<LibraryImage[]>([]);
  const [showLibrary, setShowLibrary] = useState(false);
  const [isLoadingLibrary, setIsLoadingLibrary] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [products, setProducts] = useState<ShopifyProduct[]>([]);
  const [_isLoadingProducts, setIsLoadingProducts] = useState(false);

  // Fetch usage info on mount
  useEffect(() => {
    if (shopId) {
      fetchUsageInfo();
    }
  }, [shopId]);

  // Fetch products on mount for export dialog
  useEffect(() => {
    if (shopDomain) {
      fetchProducts();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shopDomain]);

  const fetchProducts = async () => {
    if (!shopDomain) return;

    setIsLoadingProducts(true);
    try {
      const response = await fetch(
        `/api/shopify/products?shop=${encodeURIComponent(shopDomain)}`,
      );
      if (response.ok) {
        const data = await response.json();
        if (data.success && data.products) {
          // Map to the format ExportDialog expects
          setProducts(
            data.products.map((p: { id: string; title: string }) => ({
              id: p.id,
              title: p.title,
            })),
          );
        }
      }
    } catch (error) {
      logger.error("Failed to fetch products", error, { component: "image-generation" });
    } finally {
      setIsLoadingProducts(false);
    }
  };

  const fetchUsageInfo = async () => {
    try {
      const response = await fetch("/api/image-generation");
      if (response.ok) {
        const data = await response.json();
        setUsageInfo(data.usage);
      }
    } catch (error) {
      logger.error("Failed to fetch usage info", error, { component: "image-generation" });
    }
  };

  const fetchLibrary = async () => {
    setIsLoadingLibrary(true);
    try {
      const response = await fetch("/api/image-generation/save");
      if (response.ok) {
        const data = await response.json();
        setLibrary(data.images || []);
      }
    } catch (error) {
      logger.error("Failed to fetch library", error, { component: "image-generation" });
    } finally {
      setIsLoadingLibrary(false);
    }
  };

  const handleImageGenerated = useCallback((image: GeneratedImage) => {
    setCurrentImage(image);
    // Refresh usage info
    fetchUsageInfo();
  }, []);

  const handleDownload = useCallback(
    (format: "png" | "jpg" | "webp" = "png") => {
      if (!currentImage) return;

      // Convert base64 to blob and download
      const link = document.createElement("a");
      link.href = currentImage.imageUrl;
      link.download = `generated-image-${Date.now()}.${format}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    },
    [currentImage],
  );

  const handleSaveToLibrary = useCallback(
    async (image?: GeneratedImage): Promise<boolean> => {
      const imageToSave = image || currentImage;
      if (!imageToSave) {
        logger.warn("No image to save", { component: "image-generation" });
        return false;
      }

      // Generate a conversation ID if missing (required by API)
      const conversationId =
        imageToSave.conversationId ||
        `save-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;

      try {
        const response = await fetch("/api/image-generation/save", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            imageUrl: imageToSave.imageUrl,
            conversationId,
            prompt: imageToSave.prompt,
            provider: imageToSave.provider,
            model: imageToSave.model,
            costCents: imageToSave.costCents,
            aspectRatio: imageToSave.aspectRatio,
          }),
        });

        const data = await response.json();

        if (!response.ok) {
          logger.error("Save to library failed", new Error(data.error), { component: "image-generation" });
          return false;
        }

        // Update currentImage if this was the current one
        if (image === currentImage || !image) {
          setCurrentImage({
            ...imageToSave,
            id: data.id,
            imageUrl: data.imageUrl,
            isFinal: true,
          });
        }
        // Refresh library if open
        if (showLibrary) {
          fetchLibrary();
        }
        return true;
      } catch (error) {
        logger.error("Failed to save to library", error, { component: "image-generation" });
        return false;
      }
    },
    [currentImage, showLibrary],
  );

  const handleAddToProduct = useCallback(
    async (productId: string) => {
      if (!currentImage) {
        throw new Error("No image to add");
      }

      const response = await fetch("/api/shopify/products/add-image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productId,
          imageUrl: currentImage.imageUrl,
          altText: currentImage.prompt || "AI generated product image",
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to add image to product");
      }

      return data;
    },
    [currentImage],
  );

  const handleCreateAd = useCallback(() => {
    // Navigate to AIE with the image using proper navigation
    if (currentImage) {
      // Store the image URL in sessionStorage for the AIE page to access
      sessionStorage.setItem("aie_image_url", currentImage.imageUrl);
      navigateTo("/aie");
    }
  }, [navigateTo, currentImage]);

  const handleDeleteFromLibrary = async (imageId: string) => {
    try {
      const response = await fetch(`/api/image-generation/save?id=${imageId}`, {
        method: "DELETE",
      });

      if (response.ok) {
        setLibrary((prev) => prev.filter((img) => img.id !== imageId));
        setDeleteConfirm(null);
      }
    } catch (error) {
      logger.error("Failed to delete from library", error, { component: "image-generation" });
    }
  };

  const _handleIterate = useCallback((_feedback: string) => {
    // This is handled by the chat component
  }, []);

  if (shopLoading) {
    return (
      <div
        className="min-h-screen flex items-center justify-center"
        style={{ backgroundColor: colors.background }}
      >
        <div className="flex flex-col items-center gap-4">
          <Loader2
            className="w-8 h-8 animate-spin"
            style={{ color: colors.smartBlue }}
          />
          <p className="text-sm" style={{ color: colors.grayText }}>
            Loading...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div
      className="min-h-screen"
      style={{ backgroundColor: colors.background }}
    >
      {/* Header */}
      <div
        className="border-b"
        style={{ backgroundColor: colors.white, borderColor: colors.border }}
      >
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigateTo("dashboard")}
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back
              </Button>
              <div className="flex items-center gap-3">
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center"
                  style={{
                    background: `linear-gradient(135deg, ${colors.smartBlue} 0%, ${colors.berryLipstick} 100%)`,
                  }}
                >
                  <Sparkles className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h1
                    className="text-lg font-semibold"
                    style={{ color: colors.oxfordNavy }}
                  >
                    Image Generation
                  </h1>
                  <p className="text-xs" style={{ color: colors.grayText }}>
                    Create AI-powered lifestyle images for your products
                  </p>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              {/* Usage Badge */}
              {usageInfo && (
                <Badge
                  variant="outline"
                  className="px-3 py-1"
                  style={{ borderColor: colors.border }}
                >
                  <ImageIcon className="w-3 h-3 mr-1" />
                  {usageInfo.remainingCount} / {usageInfo.limitCount} remaining
                </Badge>
              )}

              {/* Library Button */}
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setShowLibrary(!showLibrary);
                  if (!showLibrary) {
                    fetchLibrary();
                  }
                }}
              >
                <Library className="w-4 h-4 mr-2" />
                Library
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 py-6">
        {/* Storage Retention Notice */}
        <Alert className="mb-6 border-blue-200 bg-blue-50">
          <Info className="h-4 w-4 text-blue-600" />
          <AlertDescription className="text-blue-800">
            <strong>Storage Policy:</strong> Generated images are stored for{" "}
            <strong>30 days</strong>. Please download or export any images you
            wish to keep before they expire.
          </AlertDescription>
        </Alert>

        {showLibrary ? (
          // Library View
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Library
                      className="w-5 h-5"
                      style={{ color: colors.smartBlue }}
                    />
                    Image Library
                  </CardTitle>
                  <CardDescription>
                    Your saved images (automatically deleted after 30 days)
                  </CardDescription>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowLibrary(false)}
                >
                  Back to Generator
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {isLoadingLibrary ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2
                    className="w-6 h-6 animate-spin"
                    style={{ color: colors.smartBlue }}
                  />
                </div>
              ) : library.length === 0 ? (
                <div className="text-center py-12">
                  <ImageIcon
                    className="w-12 h-12 mx-auto mb-4"
                    style={{ color: colors.grayText }}
                  />
                  <p
                    className="text-sm font-medium"
                    style={{ color: colors.oxfordNavy }}
                  >
                    No images saved yet
                  </p>
                  <p
                    className="text-xs mt-1"
                    style={{ color: colors.grayText }}
                  >
                    Generate and save images to see them here
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {library.map((image) => (
                    <div
                      key={image.id}
                      className="relative group rounded-lg overflow-hidden border"
                      style={{ borderColor: colors.border }}
                    >
                      <Image
                        src={image.imageUrl}
                        alt={image.prompt}
                        className="w-full aspect-square object-cover"
                        width={400}
                        height={400}
                        unoptimized
                      />
                      <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-3">
                        <p className="text-white text-xs line-clamp-2">
                          {image.prompt}
                        </p>
                        <div className="flex items-center justify-between mt-2">
                          <div className="flex items-center gap-1 text-white/80 text-xs">
                            <Clock className="w-3 h-3" />
                            {image.daysUntilExpiration}d left
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 w-7 p-0 text-white hover:text-red-400"
                            onClick={() => setDeleteConfirm(image.id)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        ) : (
          // Generator View - Two column layout
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left Sidebar - Settings (compact) */}
            <div className="lg:col-span-3 space-y-4">
              {/* Upload Area */}
              <ImageUploadArea
                onImageSelect={setReferenceImage}
                selectedImage={referenceImage}
                isLoading={isGenerating}
              />

              {/* Model Selection */}
              <ProviderSelector
                openaiModel={openaiModel}
                onOpenaiModelChange={setOpenaiModel}
                disabled={isGenerating}
              />

              {/* Aspect Ratio */}
              <Card>
                <CardHeader className="pb-2 pt-3">
                  <CardTitle className="text-sm">Output Settings</CardTitle>
                </CardHeader>
                <CardContent className="pb-3">
                  <div className="space-y-1">
                    <Label
                      className="text-xs font-medium"
                      style={{ color: colors.grayText }}
                    >
                      Aspect Ratio
                    </Label>
                    <Select
                      value={aspectRatio}
                      onValueChange={(v) => setAspectRatio(v as AspectRatio)}
                      disabled={isGenerating}
                    >
                      <SelectTrigger className="h-8 text-sm">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1:1">Square (1:1)</SelectItem>
                        <SelectItem value="16:9">Landscape (16:9)</SelectItem>
                        <SelectItem value="9:16">Portrait (9:16)</SelectItem>
                        <SelectItem value="4:3">Standard (4:3)</SelectItem>
                        <SelectItem value="3:4">Portrait (3:4)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Main Chat Area - Expanded */}
            <div className="lg:col-span-9">
              <ImageGenerationChat
                shopId={shopId || ""}
                shopDomain={shopDomain || undefined}
                referenceImage={referenceImage}
                openaiModel={openaiModel}
                aspectRatio={aspectRatio}
                onImageGenerated={handleImageGenerated}
                onSaveToLibrary={handleSaveToLibrary}
                onExport={() => setShowExportDialog(true)}
                disabled={!referenceImage}
              />
            </div>
          </div>
        )}
      </div>

      {/* Export Dialog */}
      <ExportDialog
        open={showExportDialog}
        onOpenChange={setShowExportDialog}
        image={currentImage}
        products={products}
        onDownload={handleDownload}
        onAddToProduct={handleAddToProduct}
        onCreateAd={handleCreateAd}
        onSaveToLibrary={async () => {
          await handleSaveToLibrary();
        }}
      />

      {/* Delete Confirmation Dialog */}
      <AlertDialog
        open={!!deleteConfirm}
        onOpenChange={() => setDeleteConfirm(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Image</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this image from your library? This
              action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() =>
                deleteConfirm && handleDeleteFromLibrary(deleteConfirm)
              }
              style={{ backgroundColor: colors.error }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
