'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Download,
  RefreshCw,
  Save,
  Share2,
  Sparkles,
  Clock,
  ImageIcon,
  Send,
} from 'lucide-react';
import { colors } from '@/lib/design-system/colors';
import type { GeneratedImage } from '@/types/image-generation';

interface GeneratedImagePreviewProps {
  image: GeneratedImage | null;
  isLoading?: boolean;
  onIterate: (feedback: string) => void;
  onSave: () => void;
  onDownload: () => void;
  onExport: () => void;
  iterationDisabled?: boolean;
}

export function GeneratedImagePreview({
  image,
  isLoading = false,
  onIterate,
  onSave,
  onDownload,
  onExport,
  iterationDisabled = false,
}: GeneratedImagePreviewProps) {
  const [feedback, setFeedback] = useState('');

  const handleIterate = () => {
    if (feedback.trim()) {
      onIterate(feedback.trim());
      setFeedback('');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleIterate();
    }
  };

  if (!image && !isLoading) {
    return (
      <Card className="h-full">
        <CardContent className="h-full flex flex-col items-center justify-center min-h-[400px]">
          <div
            className="w-16 h-16 rounded-full flex items-center justify-center mb-4"
            style={{ backgroundColor: colors.backgroundLight }}
          >
            <ImageIcon className="w-8 h-8" style={{ color: colors.grayText }} />
          </div>
          <p className="text-sm font-medium" style={{ color: colors.oxfordNavy }}>
            No image generated yet
          </p>
          <p className="text-xs mt-1 text-center max-w-xs" style={{ color: colors.grayText }}>
            Upload a product image and describe the scene you want to create
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="pb-3 flex-shrink-0">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Sparkles className="w-4 h-4" style={{ color: colors.smartBlue }} />
            Generated Image
          </CardTitle>
          {image && (
            <div className="flex items-center gap-2">
              <Badge
                variant="outline"
                className="text-xs"
                style={{ borderColor: colors.border, color: colors.grayText }}
              >
                OpenAI - {image.model.split('-').slice(0, 2).join(' ')}
              </Badge>
              <Badge
                variant="outline"
                className="text-xs"
                style={{ borderColor: colors.brightAmber, color: colors.oxfordNavy }}
              >
                ${(image.costCents / 100).toFixed(2)}
              </Badge>
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent className="flex-1 flex flex-col gap-4 overflow-hidden">
        {/* Image Preview */}
        <div className="relative flex-1 min-h-[300px]">
          {isLoading ? (
            <div
              className="absolute inset-0 rounded-lg flex flex-col items-center justify-center"
              style={{ backgroundColor: colors.backgroundLight }}
            >
              <div className="relative">
                <div
                  className="w-16 h-16 rounded-full border-4 border-t-transparent animate-spin"
                  style={{ borderColor: `${colors.smartBlue} transparent ${colors.smartBlue} ${colors.smartBlue}` }}
                />
                <Sparkles
                  className="w-6 h-6 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2"
                  style={{ color: colors.smartBlue }}
                />
              </div>
              <p className="text-sm mt-4" style={{ color: colors.grayText }}>
                Generating your image...
              </p>
              <p className="text-xs mt-1" style={{ color: colors.grayText }}>
                This may take 10-30 seconds
              </p>
            </div>
          ) : image ? (
            <div className="relative h-full">
              <img
                src={image.imageUrl}
                alt="Generated"
                className="w-full h-full object-contain rounded-lg"
                style={{ backgroundColor: colors.backgroundLight }}
              />
              {image.isFinal && (
                <Badge
                  className="absolute top-2 right-2"
                  style={{ backgroundColor: colors.success, color: colors.white }}
                >
                  <Save className="w-3 h-3 mr-1" />
                  Saved
                </Badge>
              )}
            </div>
          ) : null}
        </div>

        {/* Action Buttons */}
        {image && !isLoading && (
          <div className="flex-shrink-0 space-y-3">
            {/* Primary Actions */}
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                className="flex-1"
                onClick={onDownload}
              >
                <Download className="w-4 h-4 mr-2" />
                Download
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="flex-1"
                onClick={onSave}
                disabled={image.isFinal}
              >
                <Save className="w-4 h-4 mr-2" />
                {image.isFinal ? 'Saved' : 'Save to Library'}
              </Button>
              <Button
                size="sm"
                className="flex-1"
                onClick={onExport}
                style={{
                  backgroundColor: colors.smartBlue,
                  color: colors.white,
                }}
              >
                <Share2 className="w-4 h-4 mr-2" />
                Export
              </Button>
            </div>

            {/* Iteration Input */}
            {!image.isFinal && (
              <div className="flex gap-2">
                <Input
                  placeholder="Describe changes (e.g., 'Make the lighting warmer')"
                  value={feedback}
                  onChange={(e) => setFeedback(e.target.value)}
                  onKeyDown={handleKeyDown}
                  disabled={iterationDisabled}
                  className="flex-1 text-sm"
                />
                <Button
                  onClick={handleIterate}
                  disabled={!feedback.trim() || iterationDisabled}
                  style={{
                    backgroundColor: feedback.trim() && !iterationDisabled ? colors.smartBlue : colors.backgroundLight,
                    color: feedback.trim() && !iterationDisabled ? colors.white : colors.grayText,
                  }}
                >
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Iterate
                </Button>
              </div>
            )}

            {/* Metadata */}
            <div className="flex items-center gap-4 text-xs" style={{ color: colors.grayText }}>
              <div className="flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {new Date(image.createdAt).toLocaleTimeString()}
              </div>
              {image.aspectRatio && (
                <div className="flex items-center gap-1">
                  <ImageIcon className="w-3 h-3" />
                  {image.aspectRatio}
                </div>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
