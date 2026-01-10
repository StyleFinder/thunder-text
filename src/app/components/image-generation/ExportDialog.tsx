"use client";

import { useState } from "react";
import Image from "next/image";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Download,
  FileImage,
  ShoppingBag,
  Megaphone,
  Library,
  Loader2,
  Check,
  ExternalLink,
} from "lucide-react";
import { colors } from "@/lib/design-system/colors";
import type { GeneratedImage } from "@/types/image-generation";
import { logger } from "@/lib/logger";

interface ExportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  image: GeneratedImage | null;
  products?: Array<{ id: string; title: string }>;
  onDownload: (format: "png" | "jpg" | "webp") => void;
  onAddToProduct: (productId: string) => Promise<void>;
  onCreateAd: () => void;
  onSaveToLibrary: () => Promise<void>;
}

type ExportOption = "download" | "product" | "ad" | "library";

export function ExportDialog({
  open,
  onOpenChange,
  image,
  products = [],
  onDownload,
  onAddToProduct,
  onCreateAd,
  onSaveToLibrary,
}: ExportDialogProps) {
  const [selectedOption, setSelectedOption] =
    useState<ExportOption>("download");
  const [downloadFormat, setDownloadFormat] = useState<"png" | "jpg" | "webp">(
    "png",
  );
  const [selectedProductId, setSelectedProductId] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);

  const handleExport = async () => {
    if (!image) return;

    setIsLoading(true);
    setSuccess(null);

    try {
      switch (selectedOption) {
        case "download":
          onDownload(downloadFormat);
          setSuccess("Image downloaded!");
          break;
        case "product":
          if (selectedProductId) {
            await onAddToProduct(selectedProductId);
            setSuccess("Image added to product!");
          }
          break;
        case "ad":
          onCreateAd();
          onOpenChange(false);
          break;
        case "library":
          await onSaveToLibrary();
          setSuccess("Image saved to library!");
          break;
      }
    } catch (error) {
      logger.error("Export error", error as Error, { component: "export-dialog" });
    } finally {
      setIsLoading(false);
    }
  };

  const exportOptions = [
    {
      id: "download" as ExportOption,
      icon: Download,
      title: "Download Locally",
      description: "Save the image to your computer",
    },
    {
      id: "product" as ExportOption,
      icon: ShoppingBag,
      title: "Add to Product",
      description: "Add image to a product listing",
      disabled: products.length === 0,
    },
    {
      id: "ad" as ExportOption,
      icon: Megaphone,
      title: "Create an Ad",
      description: "Use image for a new advertisement",
    },
    {
      id: "library" as ExportOption,
      icon: Library,
      title: "Save to Library",
      description: "Store in your image library (30 days)",
      disabled: image?.isFinal,
    },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileImage
              className="w-5 h-5"
              style={{ color: colors.smartBlue }}
            />
            Export Image
          </DialogTitle>
          <DialogDescription>
            Choose how you want to use your generated image
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Image Preview */}
          {image && (
            <div
              className="rounded-lg overflow-hidden border"
              style={{ borderColor: colors.border }}
            >
              <Image
                src={image.imageUrl}
                alt="Generated preview"
                width={500}
                height={128}
                className="w-full h-32 object-contain"
                style={{ backgroundColor: colors.backgroundLight }}
                unoptimized
              />
            </div>
          )}

          {/* Export Options */}
          <div className="space-y-2">
            {exportOptions.map((option) => {
              const Icon = option.icon;
              const isSelected = selectedOption === option.id;
              const isDisabled = option.disabled;

              return (
                <button
                  key={option.id}
                  onClick={() => !isDisabled && setSelectedOption(option.id)}
                  disabled={isDisabled}
                  className={`
                    w-full flex items-center gap-3 p-3 rounded-lg border text-left
                    transition-all duration-200
                    ${isSelected ? "border-2" : "border hover:border-gray-400"}
                    ${isDisabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}
                  `}
                  style={{
                    borderColor: isSelected ? colors.smartBlue : colors.border,
                    backgroundColor: isSelected
                      ? `${colors.smartBlue}08`
                      : colors.white,
                  }}
                >
                  <div
                    className="w-10 h-10 rounded-lg flex items-center justify-center"
                    style={{
                      backgroundColor: isSelected
                        ? colors.smartBlue
                        : colors.backgroundLight,
                    }}
                  >
                    <Icon
                      className="w-5 h-5"
                      style={{
                        color: isSelected ? colors.white : colors.grayText,
                      }}
                    />
                  </div>
                  <div className="flex-1">
                    <p
                      className="text-sm font-medium"
                      style={{
                        color: isSelected
                          ? colors.smartBlue
                          : colors.oxfordNavy,
                      }}
                    >
                      {option.title}
                    </p>
                    <p className="text-xs" style={{ color: colors.grayText }}>
                      {option.description}
                    </p>
                  </div>
                  {isSelected && (
                    <Check
                      className="w-5 h-5"
                      style={{ color: colors.smartBlue }}
                    />
                  )}
                </button>
              );
            })}
          </div>

          {/* Option-specific Settings */}
          {selectedOption === "download" && (
            <div className="space-y-2 pt-2">
              <Label
                className="text-xs font-medium"
                style={{ color: colors.grayText }}
              >
                Image Format
              </Label>
              <Select
                value={downloadFormat}
                onValueChange={(v) =>
                  setDownloadFormat(v as "png" | "jpg" | "webp")
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="png">PNG (High Quality)</SelectItem>
                  <SelectItem value="jpg">JPG (Smaller Size)</SelectItem>
                  <SelectItem value="webp">WebP (Best Compression)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          {selectedOption === "product" && products.length > 0 && (
            <div className="space-y-2 pt-2">
              <Label
                className="text-xs font-medium"
                style={{ color: colors.grayText }}
              >
                Select Product
              </Label>
              <Select
                value={selectedProductId}
                onValueChange={setSelectedProductId}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Choose a product..." />
                </SelectTrigger>
                <SelectContent>
                  {products.map((product) => (
                    <SelectItem key={product.id} value={product.id}>
                      {product.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Success Message */}
          {success && (
            <div
              className="flex items-center gap-2 p-3 rounded-lg"
              style={{
                backgroundColor: `${colors.success}15`,
                color: colors.success,
              }}
            >
              <Check className="w-4 h-4" />
              <span className="text-sm font-medium">{success}</span>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2">
          <Button
            variant="outline"
            className="flex-1"
            onClick={() => onOpenChange(false)}
            disabled={isLoading}
          >
            Cancel
          </Button>
          <Button
            className="flex-1"
            onClick={handleExport}
            disabled={
              isLoading || (selectedOption === "product" && !selectedProductId)
            }
            style={{
              backgroundColor: colors.smartBlue,
              color: colors.white,
            }}
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Processing...
              </>
            ) : selectedOption === "ad" ? (
              <>
                Create Ad
                <ExternalLink className="w-4 h-4 ml-2" />
              </>
            ) : (
              "Export"
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
