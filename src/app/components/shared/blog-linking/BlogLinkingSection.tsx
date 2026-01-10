"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Loader2, BookOpen } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { BlogSelector } from "./BlogSelector";
import { BlogCreationModal } from "./BlogCreationModal";
import { BlogSummaryPreview } from "./BlogSummaryPreview";
import type {
  BlogLinkingSectionProps,
  BlogOption,
  BlogSelection,
  BlogSource,
} from "@/types/blog-linking";
import { logger } from "@/lib/logger";

/**
 * BlogLinkingSection Component
 *
 * Main container component for the blog linking feature.
 * Manages the checkbox, dropdown, and blog creation modal.
 * Handles fetching blogs and generating summaries.
 */
export function BlogLinkingSection({
  enabled,
  onEnabledChange,
  selectedBlog,
  onBlogSelect,
  summary,
  onSummaryChange,
  storeId,
  shopDomain,
  loading: externalLoading = false,
}: BlogLinkingSectionProps) {
  const { toast } = useToast();

  // Blog source and list state
  const [source, setSource] = useState<BlogSource>("library");
  const [blogs, setBlogs] = useState<BlogOption[]>([]);
  const [loadingBlogs, setLoadingBlogs] = useState(false);

  // Modal state
  const [showCreationModal, setShowCreationModal] = useState(false);

  // Summary generation state
  const [generatingSummary, setGeneratingSummary] = useState(false);

  // Fetch blogs when enabled or source changes
  const fetchBlogs = useCallback(async () => {
    if (!enabled || !storeId) return;

    setLoadingBlogs(true);

    try {
      if (source === "library") {
        const response = await fetch(
          `/api/blogs/library?store_id=${storeId}&limit=20&saved_only=true`
        );
        const data = await response.json();

        if (data.success && data.data) {
          setBlogs(data.data.blogs);
        } else {
          logger.error("Failed to fetch library blogs", new Error(data.error || "Unknown error"), { component: "BlogLinkingSection", storeId });
          setBlogs([]);
        }
      } else if (source === "shopify" && shopDomain) {
        // Shopify blogs API
        const response = await fetch(
          `/api/shopify/blogs?shop=${encodeURIComponent(shopDomain)}&limit=20`
        );
        const data = await response.json();

        if (data.success && data.data) {
          setBlogs(data.data.blogs);
          // Show warning toast if there's a warning (e.g., missing permissions)
          if (data.warning && data.data.blogs.length === 0) {
            toast({
              title: "Shopify Blogs Unavailable",
              description: "Use Content Library instead to select a blog post.",
              variant: "default",
            });
          }
        } else {
          logger.error("Failed to fetch Shopify blogs", new Error(data.error || "Unknown error"), { component: "BlogLinkingSection", shopDomain });
          setBlogs([]);
        }
      }
    } catch (error) {
      logger.error("Error fetching blogs", error as Error, { component: "BlogLinkingSection", source });
      setBlogs([]);
    } finally {
      setLoadingBlogs(false);
    }
  }, [enabled, storeId, source, shopDomain]);

  useEffect(() => {
    fetchBlogs();
  }, [fetchBlogs]);

  // Generate summary when a blog is selected
  const generateSummary = useCallback(
    async (blogContent: string) => {
      if (!blogContent || blogContent.length < 100) return;

      setGeneratingSummary(true);

      try {
        const response = await fetch("/api/blogs/summarize", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            blogContent,
            maxSentences: 4,
          }),
        });

        const data = await response.json();

        if (data.success && data.data) {
          onSummaryChange(data.data.summary);
        } else {
          logger.error("Failed to generate summary", new Error(data.error || "Unknown error"), { component: "BlogLinkingSection" });
          toast({
            title: "Summary Generation Failed",
            description: "Could not generate a summary for this blog.",
            variant: "destructive",
          });
        }
      } catch (error) {
        logger.error("Error generating summary", error as Error, { component: "BlogLinkingSection" });
        toast({
          title: "Error",
          description: "Failed to generate blog summary.",
          variant: "destructive",
        });
      } finally {
        setGeneratingSummary(false);
      }
    },
    [onSummaryChange, toast]
  );

  // Handle blog selection
  const handleBlogSelect = async (blog: BlogOption | null) => {
    if (!blog) {
      onBlogSelect(null);
      onSummaryChange("");
      return;
    }

    // If it's a library blog, fetch the full content
    if (blog.source === "library") {
      try {
        // Fetch full blog content for summary generation
        const response = await fetch(
          `/api/content-center/content/${blog.id}`,
          { method: "GET" }
        );
        const data = await response.json();

        if (data.success && data.data) {
          const fullBlog: BlogSelection = {
            id: blog.id,
            source: "library",
            title: blog.title,
            content: data.data.generated_text || "",
          };

          onBlogSelect(fullBlog);

          // Generate summary from content
          if (fullBlog.content) {
            await generateSummary(fullBlog.content);
          }
        }
      } catch (error) {
        logger.error("Error fetching blog content", error as Error, { component: "BlogLinkingSection", blogId: blog.id });
        toast({
          title: "Error",
          description: "Failed to load blog content.",
          variant: "destructive",
        });
      }
    } else {
      // Shopify blog - would need different handling
      // For now, create a basic selection
      const shopifyBlog: BlogSelection = {
        id: blog.id,
        source: "shopify",
        title: blog.title,
        content: blog.excerpt || "",
        handle: blog.handle,
        blogHandle: blog.blogHandle,
      };

      onBlogSelect(shopifyBlog);

      // Generate summary from excerpt if available
      if (blog.excerpt && blog.excerpt.length >= 100) {
        await generateSummary(blog.excerpt);
      }
    }
  };

  // Handle blog creation
  const handleBlogCreated = async (newBlog: BlogSelection) => {
    // Add to blogs list
    const newOption: BlogOption = {
      id: newBlog.id,
      title: newBlog.title,
      excerpt: newBlog.content?.substring(0, 150),
      createdAt: new Date().toISOString(),
      source: "library",
    };

    setBlogs((prev) => [newOption, ...prev]);

    // Select the new blog
    onBlogSelect(newBlog);

    // Generate summary
    if (newBlog.content) {
      await generateSummary(newBlog.content);
    }
  };

  // Generate blog URL (placeholder for now)
  const getBlogUrl = (): string => {
    if (!selectedBlog) return "";

    if (selectedBlog.source === "shopify" && shopDomain) {
      // Construct Shopify blog URL
      const blogHandle = selectedBlog.blogHandle || "news";
      const articleHandle = selectedBlog.handle || selectedBlog.id;
      return `https://${shopDomain}/blogs/${blogHandle}/${articleHandle}`;
    }

    // For library blogs, we'll need to figure out where they'll be published
    // For now, return a placeholder or the content center URL
    return `#blog-${selectedBlog.id}`;
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <BookOpen className="h-5 w-5" />
          Link to Blog Post
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Enable Checkbox */}
        <div className="flex items-center space-x-2">
          <Checkbox
            id="add-blog"
            checked={enabled}
            onCheckedChange={(checked) => onEnabledChange(checked === true)}
            disabled={externalLoading}
          />
          <Label
            htmlFor="add-blog"
            className="text-sm font-medium leading-none cursor-pointer peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
          >
            Add a blog post to &quot;Discover More&quot; section
          </Label>
        </div>

        {/* Blog Selection UI - Only show when enabled */}
        {enabled && (
          <div className="space-y-4 mt-2">
            <BlogSelector
              source={source}
              onSourceChange={setSource}
              blogs={blogs}
              loading={loadingBlogs}
              selectedBlogId={selectedBlog?.id || null}
              onSelect={handleBlogSelect}
              onCreateNew={() => setShowCreationModal(true)}
              shopifyAvailable={!!shopDomain}
            />

            {/* Loading indicator for summary generation */}
            {generatingSummary && (
              <div className="flex items-center gap-2 text-sm text-slate-500">
                <Loader2 className="h-4 w-4 animate-spin" />
                Generating summary...
              </div>
            )}

            {/* Summary Preview */}
            {selectedBlog && summary && !generatingSummary && (
              <BlogSummaryPreview
                blogTitle={selectedBlog.title}
                blogSummary={summary}
                blogUrl={getBlogUrl()}
                onEditSummary={onSummaryChange}
                editable={true}
              />
            )}
          </div>
        )}

        {/* Blog Creation Modal */}
        <BlogCreationModal
          open={showCreationModal}
          onOpenChange={setShowCreationModal}
          onBlogCreated={handleBlogCreated}
          storeId={storeId}
        />
      </CardContent>
    </Card>
  );
}

export default BlogLinkingSection;
