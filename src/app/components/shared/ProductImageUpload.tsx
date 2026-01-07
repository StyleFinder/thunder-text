"use client";

import { useState, useCallback } from "react";
import Image from "next/image";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { _Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Upload, X, Image as ImageIcon, Info } from "lucide-react";
import { colors } from "@/lib/design-system/colors";

export interface UploadedFile {
  file: File;
  preview: string;
}

interface ProductImageUploadProps {
  title?: string;
  description?: string;
  allowMultiple?: boolean;
  maxFiles?: number;
  existingImages?: string[];
  useExistingImages?: boolean;
  onFilesAdded: (files: UploadedFile[]) => void;
  onExistingImagesToggle?: (useExisting: boolean) => void;
}

export function ProductImageUpload({
  title = "Product Images",
  description = "Current product images and upload options",
  allowMultiple = true,
  maxFiles = 5,
  existingImages = [],
  useExistingImages = false,
  onFilesAdded,
  onExistingImagesToggle,
}: ProductImageUploadProps) {
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [rejectedFiles, setRejectedFiles] = useState<File[]>([]);
  const [isDragging, setIsDragging] = useState(false);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const validImageTypes = [
    "image/gif",
    "image/jpeg",
    "image/png",
    "image/webp",
  ];

  const handleFiles = useCallback(
    (files: FileList | File[]) => {
      const fileArray = Array.from(files);
      const accepted: File[] = [];
      const rejected: File[] = [];

      fileArray.forEach((file) => {
        if (validImageTypes.includes(file.type)) {
          accepted.push(file);
        } else {
          rejected.push(file);
        }
      });

      const newFiles = accepted.map((file) => ({
        file,
        preview: URL.createObjectURL(file),
      }));

      const updatedFiles = [...uploadedFiles, ...newFiles].slice(0, maxFiles);
      setUploadedFiles(updatedFiles);
      setRejectedFiles(rejected);
      onFilesAdded(updatedFiles);
    },
    [uploadedFiles, maxFiles, onFilesAdded, validImageTypes],
  );

  const handleDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      setIsDragging(false);

      if (e.dataTransfer.files) {
        handleFiles(e.dataTransfer.files);
      }
    },
    [handleFiles],
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
      if (e.target.files) {
        handleFiles(e.target.files);
      }
    },
    [handleFiles],
  );

  const removeFile = useCallback(
    (index: number) => {
      const newFiles = uploadedFiles.filter((_, i) => i !== index);
      setUploadedFiles(newFiles);
      onFilesAdded(newFiles);
    },
    [uploadedFiles, onFilesAdded],
  );

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <CardTitle className="text-lg">{title}</CardTitle>
            <CardDescription>{description}</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Display existing product images */}
        {existingImages.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="use-existing"
                checked={useExistingImages}
                onCheckedChange={(checked) =>
                  onExistingImagesToggle?.(!!checked)
                }
              />
              <Label
                htmlFor="use-existing"
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
              >
                Use existing product images ({existingImages.length} available)
              </Label>
            </div>

            {useExistingImages && (
              <div className="flex flex-wrap gap-3">
                {existingImages.map((image, index) => (
                  <div
                    key={index}
                    className="p-2 rounded-lg"
                    style={{ backgroundColor: colors.backgroundLight }}
                  >
                    <div className="w-24 h-24 relative rounded overflow-hidden">
                      <Image
                        src={image}
                        alt={`Product image ${index + 1}`}
                        fill
                        className="object-cover"
                        unoptimized
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Upload new images section */}
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Upload className="w-4 h-4" />
            <h3 className="font-semibold text-sm">Upload New Images</h3>
            <Badge
              variant="secondary"
              style={{
                backgroundColor: colors.info,
                color: colors.white,
              }}
            >
              Optional
            </Badge>
          </div>

          {/* Drop Zone */}
          <div
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            className={`
              border-2 border-dashed rounded-lg p-8 text-center cursor-pointer
              transition-colors duration-200
              ${isDragging ? "border-blue-500 bg-blue-50" : "border-gray-300 hover:border-gray-400"}
            `}
            onClick={() => document.getElementById("file-input")?.click()}
          >
            <input
              id="file-input"
              type="file"
              accept={validImageTypes.join(",")}
              multiple={allowMultiple}
              onChange={handleFileInput}
              className="hidden"
            />

            {uploadedFiles.length === 0 ? (
              <div className="space-y-2">
                <ImageIcon
                  className="w-12 h-12 mx-auto"
                  style={{ color: colors.grayText }}
                />
                <div>
                  <p className="text-sm font-medium">Add images</p>
                  <p className="text-xs" style={{ color: colors.grayText }}>
                    or drop images to upload
                  </p>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex flex-wrap gap-3 justify-center">
                  {uploadedFiles.map((file, index) => (
                    <div
                      key={index}
                      className="relative group"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div className="w-24 h-24 rounded overflow-hidden relative">
                        <Image
                          src={file.preview}
                          alt={file.file.name}
                          fill
                          className="object-cover"
                          unoptimized
                        />
                      </div>
                      <button
                        onClick={() => removeFile(index)}
                        className="absolute -top-2 -right-2 rounded-full p-1 shadow-lg transition-opacity z-10"
                        style={{
                          backgroundColor: colors.error,
                          color: colors.white,
                        }}
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
                <p className="text-sm" style={{ color: colors.grayText }}>
                  {uploadedFiles.length} of {maxFiles} images uploaded. Click an
                  image to remove it.
                </p>
              </div>
            )}
          </div>

          {!useExistingImages &&
            uploadedFiles.length === 0 &&
            existingImages.length === 0 && (
              <p className="text-xs" style={{ color: colors.grayText }}>
                AI works best with product images. Either use existing images or
                upload new ones for better results.
              </p>
            )}
        </div>

        {rejectedFiles.length > 0 && (
          <Alert variant="destructive">
            <Info className="h-4 w-4" />
            <AlertDescription>
              Some files were rejected. Please upload only images (JPG, PNG,
              GIF, WebP).
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
}
