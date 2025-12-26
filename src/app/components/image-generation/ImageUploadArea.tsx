'use client';

import { useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Upload, X, Image as ImageIcon } from 'lucide-react';
import { colors } from '@/lib/design-system/colors';

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

  const validImageTypes = ['image/gif', 'image/jpeg', 'image/png', 'image/webp'];

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
      };
      reader.readAsDataURL(file);
    },
    [onImageSelect]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      setIsDragging(false);

      if (e.dataTransfer.files && e.dataTransfer.files[0]) {
        handleFile(e.dataTransfer.files[0]);
      }
    },
    [handleFile]
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
    [handleFile]
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
            <div className="relative">
              <div className="rounded-lg overflow-hidden border" style={{ borderColor: colors.border }}>
                <img
                  src={selectedImage}
                  alt="Reference"
                  className="w-full h-32 object-contain bg-gray-50"
                />
              </div>
              <button
                onClick={removeImage}
                disabled={isLoading}
                className="absolute -top-2 -right-2 rounded-full p-1 shadow-lg transition-opacity disabled:opacity-50"
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
              onClick={() => document.getElementById('image-upload-input')?.click()}
              disabled={isLoading}
            >
              <Upload className="w-3 h-3 mr-1" />
              Change
            </Button>
            <input
              id="image-upload-input"
              type="file"
              accept={validImageTypes.join(',')}
              onChange={handleFileInput}
              className="hidden"
            />
          </div>
        ) : (
          <div
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            className={`
              border-2 border-dashed rounded-lg p-4 text-center cursor-pointer
              transition-colors duration-200 min-h-[120px] flex flex-col items-center justify-center
              ${isDragging ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-gray-400'}
              ${isLoading ? 'opacity-50 pointer-events-none' : ''}
            `}
            onClick={() => document.getElementById('image-upload-input')?.click()}
          >
            <input
              id="image-upload-input"
              type="file"
              accept={validImageTypes.join(',')}
              onChange={handleFileInput}
              className="hidden"
            />
            <Upload className="w-8 h-8 mb-2" style={{ color: colors.grayText }} />
            <p className="text-xs font-medium" style={{ color: colors.oxfordNavy }}>
              Upload product image
            </p>
            <p className="text-xs mt-1" style={{ color: colors.grayText }}>
              PNG, JPG, GIF, WebP
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
