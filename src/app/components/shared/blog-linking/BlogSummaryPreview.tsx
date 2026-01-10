"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Edit2, Check, X, ExternalLink } from "lucide-react";
import type { BlogSummaryPreviewProps } from "@/types/blog-linking";

/**
 * BlogSummaryPreview Component
 *
 * Displays a preview of how the "Discover More" section will appear
 * in the product description. Optionally allows editing the summary.
 */
export function BlogSummaryPreview({
  blogTitle,
  blogSummary,
  blogUrl,
  onEditSummary,
  editable = true,
}: BlogSummaryPreviewProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editedSummary, setEditedSummary] = useState(blogSummary);

  const handleSave = () => {
    if (onEditSummary) {
      onEditSummary(editedSummary);
    }
    setIsEditing(false);
  };

  const handleCancel = () => {
    setEditedSummary(blogSummary);
    setIsEditing(false);
  };

  return (
    <Card className="border-l-4 border-l-blue-500 bg-slate-50">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium text-slate-600">
            Preview: Discover More Section
          </CardTitle>
          {editable && onEditSummary && !isEditing && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsEditing(true)}
              className="h-8 px-2 text-slate-500 hover:text-slate-700"
            >
              <Edit2 className="h-3.5 w-3.5 mr-1" />
              Edit Summary
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Blog Title */}
        <div>
          <h4 className="text-base font-semibold text-blue-600 hover:text-blue-700 cursor-pointer flex items-center gap-1">
            {blogTitle}
            <ExternalLink className="h-3.5 w-3.5" />
          </h4>
        </div>

        {/* Summary - Editable or Display */}
        {isEditing ? (
          <div className="space-y-2">
            <Textarea
              value={editedSummary}
              onChange={(e) => setEditedSummary(e.target.value)}
              rows={3}
              className="text-sm"
              placeholder="Enter a 3-4 sentence summary..."
            />
            <div className="flex gap-2">
              <Button
                size="sm"
                onClick={handleSave}
                className="h-7"
              >
                <Check className="h-3.5 w-3.5 mr-1" />
                Save
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={handleCancel}
                className="h-7"
              >
                <X className="h-3.5 w-3.5 mr-1" />
                Cancel
              </Button>
            </div>
          </div>
        ) : (
          <p className="text-sm text-slate-700 leading-relaxed">
            {blogSummary}
          </p>
        )}

        {/* Read More Link */}
        <div>
          <span className="text-sm font-medium text-blue-600 hover:text-blue-700 cursor-pointer inline-flex items-center gap-1">
            Read more
            <span className="text-base">→</span>
          </span>
        </div>

        {/* URL Display */}
        {blogUrl && (
          <p className="text-xs text-slate-400 truncate" title={blogUrl}>
            {blogUrl}
          </p>
        )}
      </CardContent>
    </Card>
  );
}

export default BlogSummaryPreview;
