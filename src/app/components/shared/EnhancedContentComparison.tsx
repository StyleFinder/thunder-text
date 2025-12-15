"use client";

import React, { useState, useEffect } from "react";
import DOMPurify from "dompurify";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Edit,
  Check,
  X,
  Copy,
  Sparkles,
  CheckCircle,
  Info,
} from "lucide-react";
import { colors } from "@/lib/design-system/colors";

interface ContentData {
  title?: string;
  description?: string;
  seoTitle?: string;
  seoDescription?: string;
  promoText?: string;
  bulletPoints?: string[];
}

interface EnhancedContentComparisonProps {
  active: boolean;
  onClose: () => void;
  onApply: (content: ContentData) => void;
  originalContent: {
    title?: string;
    description?: string;
    seoTitle?: string;
    seoDescription?: string;
    promoText?: string;
  };
  enhancedContent: {
    title?: string;
    description?: string;
    seoTitle?: string;
    seoDescription?: string;
    promoText?: string;
    bulletPoints?: string[];
    confidence?: number;
  };
  loading?: boolean;
}

export default function EnhancedContentComparison({
  active,
  onClose,
  onApply,
  originalContent,
  enhancedContent,
  loading = false,
}: EnhancedContentComparisonProps) {
  const [editedContent, setEditedContent] = useState(enhancedContent);
  const [editingField, setEditingField] = useState<string | null>(null);

  // Track which fields to apply (only title and description for Main Content)
  const [fieldsToApply, setFieldsToApply] = useState({
    title: !!enhancedContent.title,
    description: !!enhancedContent.description,
  });

  // Sync editedContent when enhancedContent prop changes
  useEffect(() => {
    setEditedContent(enhancedContent);

    // Also update fieldsToApply based on new content (only title and description)
    setFieldsToApply({
      title: !!enhancedContent.title,
      description: !!enhancedContent.description,
    });
  }, [enhancedContent]);

  /**
   * SECURITY: Helper function to render HTML content safely
   *
   * Uses DOMPurify to sanitize HTML before rendering to prevent XSS attacks.
   * Only allows safe formatting tags (p, strong, em, br, ul, ol, li).
   *
   * Even though content comes from trusted sources (AI API, Shopify),
   * defense-in-depth requires sanitization to prevent:
   * - Prompt injection attacks that could embed malicious HTML
   * - Compromised upstream data sources
   * - Future code changes that might introduce untrusted data
   */
  const renderFormattedHTML = (htmlContent: string) => {
    // Process the HTML to ensure proper formatting
    const processedHTML = htmlContent
      .replace(/<b>/g, "<strong>")
      .replace(/<\/b>/g, "</strong>")
      .replace(/\n\n/g, "</p><p>")
      .replace(/^(?!<p>)/, "<p>")
      .replace(/(?!<\/p>)$/, "</p>");

    // SECURITY: Sanitize HTML to prevent XSS attacks
    // Only allow safe formatting tags - no scripts, event handlers, or dangerous elements
    const sanitizedHTML = DOMPurify.sanitize(processedHTML, {
      ALLOWED_TAGS: ["p", "strong", "em", "b", "i", "br", "ul", "ol", "li"],
      ALLOWED_ATTR: [], // No attributes allowed (prevents onclick, onerror, etc.)
    });

    return (
      <div
        dangerouslySetInnerHTML={{ __html: sanitizedHTML }}
        style={{
          lineHeight: 1.8,
          fontSize: "14px",
          color: colors.oxfordNavyDark,
          fontFamily:
            '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
        }}
      />
    );
  };

  const handleEdit = (field: string) => {
    setEditingField(field);
  };

  const handleSave = (field: string, value: string) => {
    setEditedContent((prev) => ({
      ...prev,
      [field]: value,
    }));
    setEditingField(null);
  };

  const handleCancel = () => {
    setEditingField(null);
    setEditedContent(enhancedContent);
  };

  const handleApplyChanges = () => {
    // Only apply fields that are checked (title and description only)
    const contentToApply: ContentData = {};

    if (fieldsToApply.title && editedContent.title) {
      contentToApply.title = editedContent.title;
    }
    if (fieldsToApply.description && editedContent.description) {
      contentToApply.description = editedContent.description;
    }

    onApply(contentToApply);
    onClose();
  };

  const renderModernField = (
    label: string,
    fieldName: string,
    original: string | undefined,
    enhanced: string | undefined,
    multiline: boolean = false,
    isHtml: boolean = false,
  ) => {
    const isEditing = editingField === fieldName;
    const currentValue =
      (editedContent[fieldName as keyof typeof editedContent] as string) ||
      enhanced ||
      "";
    const hasChanged = original !== enhanced && enhanced;

    return (
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Checkbox
                checked={fieldsToApply[fieldName as keyof typeof fieldsToApply]}
                onCheckedChange={(checked) =>
                  setFieldsToApply((prev) => ({
                    ...prev,
                    [fieldName]: checked,
                  }))
                }
              />
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold text-base">{label}</h3>
                  {hasChanged && (
                    <Badge
                      variant="default"
                      style={{
                        backgroundColor: colors.success,
                        color: colors.white,
                      }}
                    >
                      <Sparkles className="w-3 h-3 mr-1" />
                      AI Enhanced
                    </Badge>
                  )}
                </div>
                {fieldsToApply[fieldName as keyof typeof fieldsToApply] && (
                  <p className="text-sm" style={{ color: colors.success }}>
                    ✓ Will be applied to product
                  </p>
                )}
              </div>
            </div>
            {!isEditing && enhanced && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleEdit(fieldName)}
              >
                <Edit className="w-4 h-4 mr-1" />
                Edit
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            {/* Original Content */}
            <div
              className="p-4 rounded-lg"
              style={{ backgroundColor: colors.backgroundLight }}
            >
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Copy
                    className="w-4 h-4"
                    style={{ color: colors.grayText }}
                  />
                  <h4
                    className="font-medium text-sm"
                    style={{ color: colors.grayText }}
                  >
                    Current Version
                  </h4>
                </div>
                <Separator />
                <div className="pt-2">
                  {original ? (
                    isHtml ? (
                      renderFormattedHTML(original)
                    ) : (
                      <p className="text-sm break-words">{original}</p>
                    )
                  ) : (
                    <p className="text-sm" style={{ color: colors.grayText }}>
                      No current content
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Enhanced Content */}
            <div
              className="p-4 rounded-lg border-2"
              style={{
                backgroundColor: colors.white,
                borderColor: fieldsToApply[
                  fieldName as keyof typeof fieldsToApply
                ]
                  ? colors.success
                  : colors.backgroundLight,
              }}
            >
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Sparkles
                    className="w-4 h-4"
                    style={{ color: colors.smartBlue }}
                  />
                  <h4
                    className="font-medium text-sm"
                    style={{ color: colors.smartBlue }}
                  >
                    AI Enhanced Version
                  </h4>
                </div>
                <Separator />
                <div className="pt-2">
                  {isEditing ? (
                    <div className="space-y-3">
                      <Textarea
                        value={currentValue}
                        onChange={(e) =>
                          setEditedContent((prev) => ({
                            ...prev,
                            [fieldName]: e.target.value,
                          }))
                        }
                        rows={multiline ? 5 : 3}
                        className="w-full"
                      />
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          onClick={() => handleSave(fieldName, currentValue)}
                          style={{
                            backgroundColor: colors.smartBlue,
                            color: colors.white,
                          }}
                        >
                          <Check className="w-4 h-4 mr-1" />
                          Save Changes
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={handleCancel}
                        >
                          <X className="w-4 h-4 mr-1" />
                          Cancel
                        </Button>
                      </div>
                    </div>
                  ) : enhanced ? (
                    isHtml || fieldName === "description" ? (
                      renderFormattedHTML(currentValue)
                    ) : (
                      <p className="text-sm break-words">{currentValue}</p>
                    )
                  ) : (
                    <p className="text-sm" style={{ color: colors.grayText }}>
                      No enhanced content generated
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  // Calculate selected count
  const selectedCount = Object.values(fieldsToApply).filter(Boolean).length;

  return (
    <Dialog open={active} onOpenChange={onClose}>
      <DialogContent className="max-w-[95vw] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold">
            AI Enhanced Content Review
          </DialogTitle>
          <DialogDescription>
            Review and select which AI-generated content to apply to your
            product
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Quick Actions Bar */}
          <Card>
            <CardContent className="p-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Sparkles
                    className="w-5 h-5"
                    style={{ color: colors.smartBlue }}
                  />
                  <h3 className="font-semibold text-sm">
                    AI-Generated Content Ready
                  </h3>
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() =>
                      setFieldsToApply({
                        title: true,
                        description: true,
                      })
                    }
                  >
                    Select All
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() =>
                      setFieldsToApply({
                        title: false,
                        description: false,
                      })
                    }
                  >
                    Deselect All
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Main Content */}
          <div className="space-y-6 min-h-[400px]">
            {enhancedContent.title &&
              renderModernField(
                "Product Title",
                "title",
                originalContent.title,
                enhancedContent.title,
                false,
                false,
              )}

            {enhancedContent.description &&
              renderModernField(
                "Product Description",
                "description",
                originalContent.description,
                enhancedContent.description,
                true,
                true,
              )}

            {!enhancedContent.title && !enhancedContent.description && (
              <Alert>
                <Info className="h-4 w-4" />
                <AlertDescription>
                  No main content was generated. Try enabling title or
                  description generation in enhancement options.
                </AlertDescription>
              </Alert>
            )}
          </div>

          {/* Selected Fields Summary */}
          {selectedCount > 0 && (
            <div
              className="p-3 rounded-lg"
              style={{
                backgroundColor: `${colors.success}15`,
              }}
            >
              <div className="flex items-center gap-2">
                <CheckCircle
                  style={{ color: colors.success }}
                  className="w-4 h-4"
                />
                <p className="text-sm" style={{ color: colors.success }}>
                  {selectedCount} field{selectedCount !== 1 ? "s" : ""} selected
                  for update
                </p>
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            onClick={handleApplyChanges}
            disabled={loading || !Object.values(fieldsToApply).some(Boolean)}
            style={{
              backgroundColor: colors.smartBlue,
              color: colors.white,
            }}
          >
            {loading ? "Applying..." : "Apply Selected Changes"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
