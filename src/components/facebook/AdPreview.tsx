/* eslint-disable security/detect-object-injection -- Dynamic object access with validated keys is safe here */
"use client";

/**
 * Facebook Ad Preview Component
 *
 * Shows a preview of how the ad will look on Facebook
 * before submitting to the API
 */

import { useState } from "react";
import NextImage from "next/image";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
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
import { Image as ImageIcon, AlertCircle, Loader2 } from "lucide-react";

interface AdPreviewProps {
  title: string;
  copy: string;
  imageUrls: string[];
  selectedImageIndex?: number;
  onTitleChange?: (title: string) => void;
  onCopyChange?: (copy: string) => void;
  onImageSelect?: (index: number) => void;
  onSubmit?: () => void;
  submitting?: boolean;
  readOnly?: boolean;
}

export default function AdPreview({
  title,
  copy,
  imageUrls,
  selectedImageIndex = 0,
  onTitleChange,
  onCopyChange,
  onImageSelect,
  onSubmit,
  submitting = false,
  readOnly = false,
}: AdPreviewProps) {
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const [localTitle, setLocalTitle] = useState(title);
  const [localCopy, setLocalCopy] = useState(copy);

  const handleTitleChange = (value: string) => {
    setLocalTitle(value);
    onTitleChange?.(value);
  };

  const handleCopyChange = (value: string) => {
    setLocalCopy(value);
    onCopyChange?.(value);
  };

  const selectedImage = imageUrls[selectedImageIndex] || imageUrls[0];
  const titleLength = localTitle.length;
  const copyLength = localCopy.length;
  const titleValid = titleLength > 0 && titleLength <= 125;
  const copyValid = copyLength > 0 && copyLength <= 125;

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="text-oxford-navy">Ad Preview</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Character count warnings */}
          {!readOnly && (
            <div className="space-y-2">
              {!titleValid && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    Title must be between 1-125 characters (currently:{" "}
                    {titleLength})
                  </AlertDescription>
                </Alert>
              )}
              {!copyValid && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    Copy must be between 1-125 characters (currently:{" "}
                    {copyLength})
                  </AlertDescription>
                </Alert>
              )}
            </div>
          )}

          {/* Editable fields */}
          {!readOnly && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="adTitle">Ad Title</Label>
                <Input
                  id="adTitle"
                  value={localTitle}
                  onChange={(e) => handleTitleChange(e.target.value)}
                  maxLength={125}
                  autoComplete="off"
                />
                <p className="text-xs text-muted-foreground">
                  {titleLength}/125 characters
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="adCopy">Ad Copy</Label>
                <Textarea
                  id="adCopy"
                  value={localCopy}
                  onChange={(e) => handleCopyChange(e.target.value)}
                  maxLength={125}
                  rows={3}
                  autoComplete="off"
                />
                <p className="text-xs text-muted-foreground">
                  {copyLength}/125 characters
                </p>
              </div>

              {imageUrls.length > 1 && (
                <div className="space-y-2">
                  <Label htmlFor="imageSelect">Select Image</Label>
                  <Select
                    value={String(selectedImageIndex)}
                    onValueChange={(value) => onImageSelect?.(parseInt(value))}
                  >
                    <SelectTrigger id="imageSelect">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {imageUrls.map((url, index) => (
                        <SelectItem key={index} value={String(index)}>
                          Image {index + 1}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
          )}

          {/* Facebook-style preview */}
          <Card className="overflow-hidden">
            <CardContent className="p-4 space-y-3">
              <div className="flex items-start gap-2">
                <div className="w-10 h-10 rounded-full bg-smart-blue-500 flex items-center justify-center text-white font-bold flex-shrink-0">
                  FB
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm text-oxford-navy">
                    Your Business Page
                  </p>
                  <p className="text-xs text-muted-foreground">Sponsored</p>
                </div>
              </div>

              <p className="text-sm text-oxford-navy">
                {localCopy || (
                  <span className="text-muted-foreground">
                    Your ad copy will appear here...
                  </span>
                )}
              </p>

              {selectedImage ? (
                <div className="w-full max-w-md border rounded-lg overflow-hidden">
                  <NextImage
                    src={selectedImage}
                    alt="Ad preview"
                    className="w-full h-auto block"
                    width={448}
                    height={448}
                    unoptimized
                  />
                </div>
              ) : (
                <div className="w-full max-w-md h-64 border-2 border-dashed rounded-lg flex flex-col items-center justify-center bg-muted/50">
                  <ImageIcon className="h-12 w-12 text-muted-foreground mb-2" />
                  <p className="text-sm text-muted-foreground">
                    No image selected
                  </p>
                </div>
              )}

              <div className="space-y-1">
                <p className="font-semibold text-sm text-oxford-navy">
                  {localTitle || (
                    <span className="text-muted-foreground">
                      Your ad title will appear here...
                    </span>
                  )}
                </p>
                <p className="text-xs text-muted-foreground">
                  yourbusiness.com
                </p>
              </div>

              <div className="flex gap-2 pt-2 border-t">
                <Button variant="ghost" size="sm" disabled className="text-xs">
                  Like
                </Button>
                <Button variant="ghost" size="sm" disabled className="text-xs">
                  Comment
                </Button>
                <Button variant="ghost" size="sm" disabled className="text-xs">
                  Share
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Submit button */}
          {!readOnly && onSubmit && (
            <div className="flex justify-end">
              <Button
                onClick={() => setShowSubmitModal(true)}
                disabled={
                  !titleValid || !copyValid || !selectedImage || submitting
                }
                className="bg-smart-blue-500 hover:bg-smart-blue-600"
              >
                {submitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  "Submit to Facebook"
                )}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Confirmation modal */}
      <Dialog open={showSubmitModal} onOpenChange={setShowSubmitModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-oxford-navy">
              Submit Ad to Facebook?
            </DialogTitle>
            <DialogDescription>
              Review your ad details before submitting
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <p className="text-sm">
              Your ad will be created in your selected Facebook campaign in{" "}
              <Badge variant="secondary">PAUSED</Badge> status.
            </p>
            <p className="text-sm">
              You can review and activate the ad in Facebook Ads Manager.
            </p>
            <div className="space-y-2 bg-muted p-4 rounded-lg">
              <p className="text-sm font-semibold text-oxford-navy">
                Ad Details:
              </p>
              <p className="text-sm">
                <span className="font-medium">Title:</span> {localTitle}
              </p>
              <p className="text-sm">
                <span className="font-medium">Copy:</span> {localCopy}
              </p>
              <p className="text-sm">
                <span className="font-medium">Images:</span> {imageUrls.length}
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSubmitModal(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                setShowSubmitModal(false);
                onSubmit?.();
              }}
              disabled={submitting}
              className="bg-smart-blue-500 hover:bg-smart-blue-600"
            >
              {submitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Submitting...
                </>
              ) : (
                "Submit Ad"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
