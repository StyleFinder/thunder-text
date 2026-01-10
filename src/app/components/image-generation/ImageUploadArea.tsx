"use client";

import { useState, useCallback, useEffect } from "react";
import Image from "next/image";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Upload, X, Image as ImageIcon, History, Trash2 } from "lucide-react";
import { colors } from "@/lib/design-system/colors";

const RECENT_IMAGES_KEY = "thunder-text-recent-reference-images";
const MAX_RECENT_IMAGES = 6;

interface RecentImage {
  id: string;
  dataUrl: string;
  timestamp: number;
}

interface ImageUploadAreaProps {
  onImageSelect: (imageData: string | null) => void;
  selectedImage: string | null;
  isLoading?: boolean;
}

export function ImageUploadArea({
  onImageSelect,
  selectedImage,
  isLoading = false,
}: ImageUploadAreaProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [recentImages, setRecentImages] = useState<RecentImage[]>([]);
  const [showRecent, setShowRecent] = useState(false);

  const validImageTypes = [
    "image/gif",
    "image/jpeg",
    "image/png",
    "image/webp",
  ];

  // Load recent images from localStorage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem(RECENT_IMAGES_KEY);
      if (saved) {
        const images: RecentImage[] = JSON.parse(saved);
        // Sort by most recent and clean up old entries (older than 7 days)
        const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
        const validImages = images
          .filter((img) => img.timestamp > sevenDaysAgo)
          .sort((a, b) => b.timestamp - a.timestamp)
          .slice(0, MAX_RECENT_IMAGES);
        setRecentImages(validImages);
        // Update storage with cleaned images
        if (validImages.length !== images.length) {
          localStorage.setItem(RECENT_IMAGES_KEY, JSON.stringify(validImages));
        }
      }
    } catch (e) {
      console.warn("Failed to load recent images:", e);
    }
  }, []);

  // Save image to recent images when selected
  const saveToRecent = useCallback((imageData: string) => {
    try {
      // Generate a simple hash for the image to prevent duplicates
      const imageId = imageData.slice(0, 100) + imageData.length;

      setRecentImages((prev) => {
        // Check if already exists
        const exists = prev.some((img) => img.id === imageId);
        if (exists) {
          // Move to front
          const updated = [
            { id: imageId, dataUrl: imageData, timestamp: Date.now() },
            ...prev.filter((img) => img.id !== imageId),
          ].slice(0, MAX_RECENT_IMAGES);
          localStorage.setItem(RECENT_IMAGES_KEY, JSON.stringify(updated));
          return updated;
        }

        // Add new image
        const updated = [
          { id: imageId, dataUrl: imageData, timestamp: Date.now() },
          ...prev,
        ].slice(0, MAX_RECENT_IMAGES);
        localStorage.setItem(RECENT_IMAGES_KEY, JSON.stringify(updated));
        return updated;
      });
    } catch (e) {
      console.warn("Failed to save to recent images:", e);
    }
  }, []);

  const removeFromRecent = useCallback((imageId: string) => {
    setRecentImages((prev) => {
      const updated = prev.filter((img) => img.id !== imageId);
      localStorage.setItem(RECENT_IMAGES_KEY, JSON.stringify(updated));
      return updated;
    });
  }, []);

  const selectFromRecent = useCallback(
    (image: RecentImage) => {
      onImageSelect(image.dataUrl);
      setShowRecent(false);
    },
    [onImageSelect],
  );

  const handleFile = useCallback(
    async (file: File) => {
      if (!validImageTypes.includes(file.type)) {
        return;
      }

      // Convert to base64
      const reader = new FileReader();
      reader.onload = () => {
        const base64 = reader.result as string;
        onImageSelect(base64);
        saveToRecent(base64);
      };
      reader.readAsDataURL(file);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [onImageSelect, saveToRecent],
  );

  const handleDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      setIsDragging(false);

      if (e.dataTransfer.files && e.dataTransfer.files[0]) {
        handleFile(e.dataTransfer.files[0]);
      }
    },
    [handleFile],
  );

  const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleFileInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files[0]) {
        handleFile(e.target.files[0]);
      }
    },
    [handleFile],
  );

  const removeImage = useCallback(() => {
    onImageSelect(null);
  }, [onImageSelect]);

  return (
    <Card>
      <CardHeader className="pb-2 pt-3">
        <CardTitle className="text-sm flex items-center gap-2">
          <ImageIcon className="w-4 h-4" style={{ color: colors.smartBlue }} />
          Reference Image
        </CardTitle>
      </CardHeader>
      <CardContent className="pb-3">
        {selectedImage ? (
          <div className="space-y-2">
            <div className="relative h-32">
              <div
                className="rounded-lg overflow-hidden border"
                style={{ borderColor: colors.border }}
              >
                <Image
                  src={selectedImage}
                  alt="Reference"
                  width={400}
                  height={128}
                  className="w-full h-32 object-contain bg-gray-50"
                  unoptimized
                />
              </div>
              <button
                onClick={removeImage}
                disabled={isLoading}
                className="absolute -top-2 -right-2 rounded-full p-1 shadow-lg transition-opacity disabled:opacity-50 z-10"
                style={{
                  backgroundColor: colors.error,
                  color: colors.white,
                }}
              >
                <X className="w-3 h-3" />
              </button>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="w-full h-7 text-xs"
              onClick={() =>
                document.getElementById("image-upload-input")?.click()
              }
              disabled={isLoading}
            >
              <Upload className="w-3 h-3 mr-1" />
              Change
            </Button>
            <input
              id="image-upload-input"
              type="file"
              accept={validImageTypes.join(",")}
              onChange={handleFileInput}
              className="hidden"
            />
          </div>
        ) : (
          <div className="space-y-3">
            {/* Upload Area */}
            <div
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              className={`
                border-2 border-dashed rounded-lg p-4 text-center cursor-pointer
                transition-colors duration-200 min-h-[120px] flex flex-col items-center justify-center
                ${isDragging ? "border-blue-500 bg-blue-50" : "border-gray-300 hover:border-gray-400"}
                ${isLoading ? "opacity-50 pointer-events-none" : ""}
              `}
              onClick={() =>
                document.getElementById("image-upload-input")?.click()
              }
            >
              <input
                id="image-upload-input"
                type="file"
                accept={validImageTypes.join(",")}
                onChange={handleFileInput}
                className="hidden"
              />
              <Upload
                className="w-8 h-8 mb-2"
                style={{ color: colors.grayText }}
              />
              <p
                className="text-xs font-medium"
                style={{ color: colors.oxfordNavy }}
              >
                Upload product image
              </p>
              <p className="text-xs mt-1" style={{ color: colors.grayText }}>
                PNG, JPG, GIF, WebP
              </p>
            </div>

            {/* Recent Images Toggle */}
            {recentImages.length > 0 && (
              <div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowRecent(!showRecent);
                  }}
                  disabled={isLoading}
                  className="flex items-center gap-1.5 text-xs font-medium transition-colors hover:opacity-80 disabled:opacity-50"
                  style={{ color: colors.smartBlue }}
                >
                  <History className="w-3.5 h-3.5" />
                  {showRecent
                    ? "Hide recent"
                    : `Recent images (${recentImages.length})`}
                </button>

                {/* Recent Images Gallery */}
                {showRecent && (
                  <div className="mt-2 grid grid-cols-3 gap-2">
                    {recentImages.map((image) => (
                      <div
                        key={image.id}
                        className="relative group cursor-pointer rounded-md overflow-hidden border hover:border-blue-400 transition-colors"
                        style={{ borderColor: colors.border }}
                        onClick={(e) => {
                          e.stopPropagation();
                          selectFromRecent(image);
                        }}
                      >
                        <Image
                          src={image.dataUrl}
                          alt="Recent reference"
                          width={80}
                          height={60}
                          className="w-full h-14 object-cover"
                          unoptimized
                        />
                        {/* Delete button */}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            removeFromRecent(image.id);
                          }}
                          className="absolute top-0.5 right-0.5 rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity shadow-sm"
                          style={{
                            backgroundColor: colors.error,
                            color: colors.white,
                          }}
                        >
                          <Trash2 className="w-2.5 h-2.5" />
                        </button>
                        {/* Hover overlay */}
                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors" />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
