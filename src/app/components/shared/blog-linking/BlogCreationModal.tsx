"use client";

import { useState } from "react";
import DOMPurify from "dompurify";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, Sparkles, Save, Info } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useToast } from "@/hooks/use-toast";
import type { BlogCreationModalProps, BlogSelection } from "@/types/blog-linking";
import { logger } from "@/lib/logger";

// Blog-specific word count range
const BLOG_WORD_COUNT = {
  min: 300,
  max: 2000,
  recommended: 800,
};

// CTA options
const CTA_TYPES = [
  { value: "shop_now", label: "Shop Now" },
  { value: "learn_more", label: "Learn More" },
  { value: "sign_up", label: "Sign Up" },
  { value: "contact_us", label: "Contact Us" },
  { value: "limited_time", label: "Limited Time Offer" },
  { value: "custom", label: "Custom CTA" },
  { value: "none", label: "No CTA" },
] as const;

// Tone intensity labels
const TONE_LABELS = ["Subtle", "Light", "Balanced", "Strong", "Bold"];

/**
 * BlogCreationModal Component
 *
 * Modal for creating new blog posts inline (without navigating to content center).
 * Uses similar UI to the content creation center for consistency.
 * Saves blog to content library only (not to Shopify).
 */
export function BlogCreationModal({
  open,
  onOpenChange,
  onBlogCreated,
  storeId,
}: BlogCreationModalProps) {
  const { toast } = useToast();

  // Form state
  const [topic, setTopic] = useState("");
  const [wordCount, setWordCount] = useState(BLOG_WORD_COUNT.recommended);
  const [toneIntensity, setToneIntensity] = useState(3);
  const [ctaType, setCtaType] = useState("learn_more");
  const [customCta, setCustomCta] = useState("");
  const [additionalContext, setAdditionalContext] = useState("");

  // Generation state
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedContent, setGeneratedContent] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const canGenerate = topic.trim().length > 0 && !isGenerating;
  const canSave = generatedContent && !isSaving;

  const handleGenerate = async () => {
    if (!canGenerate) return;

    setIsGenerating(true);
    setGeneratedContent(null);

    try {
      const response = await fetch("/api/content-center/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content_type: "blog",
          topic: topic.trim(),
          word_count: wordCount,
          tone_intensity: toneIntensity,
          cta_type: ctaType,
          custom_cta: ctaType === "custom" ? customCta : undefined,
          additional_context: additionalContext.trim() || undefined,
          save: false, // Don't auto-save, we'll handle it
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || "Failed to generate blog");
      }

      setGeneratedContent(data.data.generated_text);
    } catch (error) {
      logger.error("Error generating blog", error as Error, { component: "blog-creation-modal" });
      toast({
        title: "Generation Failed",
        description: error instanceof Error ? error.message : "Failed to generate blog content",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSave = async () => {
    if (!canSave || !generatedContent) return;

    setIsSaving(true);

    try {
      // First, generate the blog (if not already generated with save=true)
      // Then save it to the content library
      const response = await fetch("/api/content-center/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content_type: "blog",
          topic: topic.trim(),
          word_count: wordCount,
          tone_intensity: toneIntensity,
          cta_type: ctaType,
          custom_cta: ctaType === "custom" ? customCta : undefined,
          additional_context: additionalContext.trim() || undefined,
          save: true, // Save to content library
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || "Failed to save blog");
      }

      // Create BlogSelection object
      const newBlog: BlogSelection = {
        id: data.data.id,
        source: "library",
        title: topic.trim(),
        content: generatedContent,
      };

      toast({
        title: "Blog Saved",
        description: "Your blog has been saved to the content library.",
      });

      // Notify parent and close
      onBlogCreated(newBlog);
      handleClose();
    } catch (error) {
      logger.error("Error saving blog", error as Error, { component: "blog-creation-modal" });
      toast({
        title: "Save Failed",
        description: error instanceof Error ? error.message : "Failed to save blog to library",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleClose = () => {
    // Reset form
    setTopic("");
    setWordCount(BLOG_WORD_COUNT.recommended);
    setToneIntensity(3);
    setCtaType("learn_more");
    setCustomCta("");
    setAdditionalContext("");
    setGeneratedContent(null);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold">
            Create New Blog Post
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Topic */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Label htmlFor="blog-topic">Topic *</Label>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Info className="h-4 w-4 text-slate-400 cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p className="max-w-xs">
                      What should this blog be about? Be specific for best results.
                    </p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
            <Input
              id="blog-topic"
              placeholder="e.g., 5 Ways to Style Our Summer Collection"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              disabled={isGenerating}
            />
          </div>

          {/* Word Count */}
          <div className="space-y-3 p-4 border border-slate-200 rounded-lg bg-slate-50">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Label>Word Count</Label>
                <Badge variant="secondary">{wordCount} words</Badge>
              </div>
              <span className="text-xs text-slate-500">
                Range: {BLOG_WORD_COUNT.min}-{BLOG_WORD_COUNT.max}
              </span>
            </div>
            <Slider
              value={[wordCount]}
              onValueChange={([value]) => setWordCount(value)}
              min={BLOG_WORD_COUNT.min}
              max={BLOG_WORD_COUNT.max}
              step={50}
              disabled={isGenerating}
              className="w-full"
            />
          </div>

          {/* Tone Intensity */}
          <div className="space-y-3 p-4 border border-slate-200 rounded-lg bg-slate-50">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Label>Tone Intensity</Label>
                <Badge variant="outline">{TONE_LABELS[toneIntensity - 1]}</Badge>
              </div>
            </div>
            <Slider
              value={[toneIntensity]}
              onValueChange={([value]) => setToneIntensity(value)}
              min={1}
              max={5}
              step={1}
              disabled={isGenerating}
              className="w-full"
            />
            <p className="text-xs text-slate-500">
              How strongly should your brand voice come through?
            </p>
          </div>

          {/* CTA Type */}
          <div className="space-y-2">
            <Label>Call to Action</Label>
            <Select
              value={ctaType}
              onValueChange={setCtaType}
              disabled={isGenerating}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select CTA type" />
              </SelectTrigger>
              <SelectContent>
                {CTA_TYPES.map((cta) => (
                  <SelectItem key={cta.value} value={cta.value}>
                    {cta.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {ctaType === "custom" && (
              <Input
                placeholder="Enter custom CTA text..."
                value={customCta}
                onChange={(e) => setCustomCta(e.target.value)}
                disabled={isGenerating}
                className="mt-2"
              />
            )}
          </div>

          {/* Additional Context */}
          <div className="space-y-2">
            <Label htmlFor="additional-context">Additional Context (optional)</Label>
            <Textarea
              id="additional-context"
              placeholder="Any specific details or requirements for this blog..."
              value={additionalContext}
              onChange={(e) => setAdditionalContext(e.target.value)}
              rows={2}
              maxLength={500}
              disabled={isGenerating}
            />
            <p className="text-xs text-slate-500 text-right">
              {additionalContext.length}/500
            </p>
          </div>

          {/* Generated Content Preview */}
          {generatedContent && (
            <div className="space-y-2">
              <Label>Generated Content</Label>
              <div
                className="p-4 border border-slate-200 rounded-lg bg-white max-h-48 overflow-y-auto text-sm prose prose-sm"
                dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(generatedContent) }}
              />
            </div>
          )}
        </div>

        <DialogFooter className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={handleClose}
            disabled={isGenerating || isSaving}
          >
            Cancel
          </Button>

          {!generatedContent ? (
            <Button
              type="button"
              onClick={handleGenerate}
              disabled={!canGenerate}
            >
              {isGenerating ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4 mr-2" />
                  Generate Blog
                </>
              )}
            </Button>
          ) : (
            <>
              <Button
                type="button"
                variant="outline"
                onClick={handleGenerate}
                disabled={!canGenerate}
              >
                <Sparkles className="h-4 w-4 mr-2" />
                Regenerate
              </Button>
              <Button
                type="button"
                onClick={handleSave}
                disabled={!canSave}
              >
                {isSaving ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    Save & Select
                  </>
                )}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default BlogCreationModal;
