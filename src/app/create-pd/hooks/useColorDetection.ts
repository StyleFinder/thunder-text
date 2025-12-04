"use client";

import { useState, useCallback } from "react";
import { logger } from "@/lib/logger";
import { authenticatedFetch } from "@/lib/shopify/api-client";

export interface ColorVariant {
  colorName: string;
  standardizedColor: string;
  confidence: number;
  imageIndices: number[];
  primaryImageIndex: number;
  originalDetections: string[];
  userOverride?: string;
}

export interface UploadedFile {
  file: File;
  preview: string;
}

interface UseColorDetectionParams {
  shop: string | null;
}

interface UseColorDetectionReturn {
  detectedVariants: ColorVariant[];
  colorDetectionLoading: boolean;
  detectColorsFromPhotos: (photos: UploadedFile[]) => Promise<void>;
  updateVariantOverride: (standardizedColor: string, override: string) => void;
  clearVariants: () => void;
}

export function useColorDetection({
  shop,
}: UseColorDetectionParams): UseColorDetectionReturn {
  const [detectedVariants, setDetectedVariants] = useState<ColorVariant[]>([]);
  const [colorDetectionLoading, setColorDetectionLoading] = useState(false);

  const detectColorsFromPhotos = useCallback(
    async (photos: UploadedFile[]) => {
      if (photos.length === 0) {
        setDetectedVariants([]);
        return;
      }

      setColorDetectionLoading(true);
      console.log(
        `🎨 Starting color detection for ${photos.length} primary photos`,
      );

      try {
        // Convert files to base64 for API
        const imageData = await Promise.all(
          photos.map(async ({ file }) => {
            return new Promise<{ dataUrl: string; filename: string }>(
              (resolve) => {
                const reader = new FileReader();
                reader.onload = () => {
                  resolve({
                    dataUrl: reader.result as string,
                    filename: file.name,
                  });
                };
                reader.readAsDataURL(file);
              },
            );
          }),
        );

        const response = await authenticatedFetch(
          "/api/detect-colors",
          {
            method: "POST",
            body: JSON.stringify({ images: imageData }),
          },
          shop || undefined,
        );

        const result = await response.json();

        if (result.success && result.variants) {
          setDetectedVariants(result.variants);
        } else {
          logger.error(
            "Color detection failed",
            new Error(result.error || "Unknown error"),
            {
              component: "useColorDetection",
              operation: "detectColorsFromPhotos",
              photosCount: photos.length,
              shop,
            },
          );
          setDetectedVariants([]);
        }
      } catch (error) {
        logger.error("Error detecting colors", error as Error, {
          component: "useColorDetection",
          operation: "detectColorsFromPhotos",
          photosCount: photos.length,
          shop,
        });
        setDetectedVariants([]);
      } finally {
        setColorDetectionLoading(false);
      }
    },
    [shop],
  );

  const updateVariantOverride = useCallback(
    (standardizedColor: string, override: string) => {
      setDetectedVariants((prev) =>
        prev.map((variant) =>
          variant.standardizedColor === standardizedColor
            ? { ...variant, userOverride: override.trim() || undefined }
            : variant,
        ),
      );
    },
    [],
  );

  const clearVariants = useCallback(() => {
    setDetectedVariants([]);
  }, []);

  return {
    detectedVariants,
    colorDetectionLoading,
    detectColorsFromPhotos,
    updateVariantOverride,
    clearVariants,
  };
}
