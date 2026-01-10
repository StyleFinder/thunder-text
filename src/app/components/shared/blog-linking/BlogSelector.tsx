"use client";

import { useState, useMemo } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Plus, Search, Library, Store } from "lucide-react";
import type { BlogSelectorProps, BlogOption } from "@/types/blog-linking";

/**
 * BlogSelector Component
 *
 * Dropdown for selecting blogs from Content Library or Shopify.
 * Includes search, source toggle, and "Create new blog" option.
 */
export function BlogSelector({
  source,
  onSourceChange,
  blogs,
  loading,
  selectedBlogId,
  onSelect,
  onCreateNew,
  shopifyAvailable = false,
}: BlogSelectorProps) {
  const [searchQuery, setSearchQuery] = useState("");

  // Q8: Memoize filtered blogs to avoid recomputation on every render
  const filteredBlogs = useMemo(
    () =>
      blogs.filter(
        (blog) =>
          blog.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          (blog.excerpt && blog.excerpt.toLowerCase().includes(searchQuery.toLowerCase()))
      ),
    [blogs, searchQuery]
  );

  const selectedBlog = blogs.find((b) => b.id === selectedBlogId);

  return (
    <div className="space-y-3">
      {/* Source Toggle - Only show if Shopify is available */}
      {shopifyAvailable && (
        <div className="flex items-center gap-2">
          <Label className="text-sm text-slate-600">Source:</Label>
          <div className="flex rounded-lg border border-slate-200 p-0.5">
            <Button
              type="button"
              variant={source === "library" ? "default" : "ghost"}
              size="sm"
              className="h-7 px-3 text-xs"
              onClick={() => onSourceChange("library")}
            >
              <Library className="h-3.5 w-3.5 mr-1" />
              Content Library
            </Button>
            <Button
              type="button"
              variant={source === "shopify" ? "default" : "ghost"}
              size="sm"
              className="h-7 px-3 text-xs"
              onClick={() => onSourceChange("shopify")}
            >
              <Store className="h-3.5 w-3.5 mr-1" />
              Shopify
            </Button>
          </div>
        </div>
      )}

      {/* Search Input */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
        <Input
          type="text"
          placeholder="Search blogs..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-9 h-9"
        />
      </div>

      {/* Blog Dropdown */}
      <Select
        value={selectedBlogId || ""}
        onValueChange={(value) => {
          if (value === "create-new") {
            onCreateNew();
          } else {
            const blog = blogs.find((b) => b.id === value);
            onSelect(blog || null);
          }
        }}
        disabled={loading}
      >
        <SelectTrigger className="w-full">
          {loading ? (
            <div className="flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Loading blogs...</span>
            </div>
          ) : (
            <SelectValue placeholder="Select a blog post...">
              {selectedBlog ? selectedBlog.title : "Select a blog post..."}
            </SelectValue>
          )}
        </SelectTrigger>
        <SelectContent>
          {/* Create New Option - Always at top */}
          <SelectItem value="create-new" className="font-medium">
            <div className="flex items-center gap-2 text-blue-600">
              <Plus className="h-4 w-4" />
              Create new blog
            </div>
          </SelectItem>

          {/* Divider */}
          <div className="h-px bg-slate-200 my-1" />

          {/* Blog Options */}
          {filteredBlogs.length === 0 ? (
            <div className="px-2 py-3 text-sm text-slate-500 text-center">
              {searchQuery
                ? "No blogs match your search"
                : source === "library"
                  ? "No saved blogs in your content library"
                  : "No blog posts found in your Shopify store"}
            </div>
          ) : (
            filteredBlogs.map((blog) => (
              <SelectItem key={blog.id} value={blog.id}>
                <div className="flex flex-col">
                  <span className="font-medium">{blog.title}</span>
                  {blog.excerpt && (
                    <span className="text-xs text-slate-500 truncate max-w-[250px]">
                      {blog.excerpt}
                    </span>
                  )}
                </div>
              </SelectItem>
            ))
          )}
        </SelectContent>
      </Select>

      {/* Selected Blog Info */}
      {selectedBlog && (
        <div className="text-xs text-slate-500 flex items-center gap-1">
          {selectedBlog.source === "library" ? (
            <Library className="h-3 w-3" />
          ) : (
            <Store className="h-3 w-3" />
          )}
          <span>
            From {selectedBlog.source === "library" ? "Content Library" : "Shopify"}
          </span>
          <span>•</span>
          <span>
            {new Date(selectedBlog.createdAt).toLocaleDateString()}
          </span>
        </div>
      )}
    </div>
  );
}

export default BlogSelector;
