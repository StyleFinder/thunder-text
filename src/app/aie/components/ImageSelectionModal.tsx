"use client";

/* eslint-disable @next/next/no-img-element */

import { useState } from "react";
import { X, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { ShopifyProduct } from "../types";

interface ImageSelectionModalProps {
  product: ShopifyProduct;
  onComplete: (selectedImages: string[]) => void;
  onCancel: () => void;
  isOpen: boolean;
}

export function ImageSelectionModal({
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
