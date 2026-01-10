"use client";

import { useState, useEffect, useMemo } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ContentLoader } from "@/components/ui/loading/ContentLoader";
import Link from "next/link";
import {
  Filter,
  FileText,
  Calendar,
  Eye,
  Edit,
  Trash2,
  Download,
  MoreVertical,
  ArrowUpDown,
  BookmarkPlus,
  Bookmark,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { GeneratedContent, ContentType } from "@/types/content-center";
import { useShopifyAuth } from "@/app/components/UnifiedShopifyAuth";
import { logger } from "@/lib/logger";

type SortField = "created_at" | "word_count" | "topic";
type SortOrder = "asc" | "desc";

const CONTENT_TYPE_LABELS: Record<ContentType, string> = {
  blog: "Blog Post",
  ad: "Ad Copy",
  store_copy: "Store Copy",
  social_facebook: "Facebook",
  social_instagram: "Instagram",
  social_tiktok: "TikTok",
};

export default function LibraryPage() {
  const { shop: shopDomain } = useShopifyAuth();
  const [content, setContent] = useState<GeneratedContent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedType, setSelectedType] = useState<ContentType | "all">("all");
  const [showSavedOnly, setShowSavedOnly] = useState(false);
  const [sortField, setSortField] = useState<SortField>("created_at");
  const [sortOrder, setSortOrder] = useState<SortOrder>("desc");

  const fetchContent = async () => {
    if (!shopDomain) return;

    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      if (selectedType !== "all") params.append("content_type", selectedType);
      if (showSavedOnly) params.append("saved_only", "true");
      params.append("sort_by", sortField);
      params.append("sort_order", sortOrder);

      const response = await fetch(
        `/api/content-center/content?${params.toString()}`,
        {
          headers: {
            Authorization: `Bearer ${shopDomain}`,
          },
        },
      );

      if (!response.ok) throw new Error("Failed to fetch content");

      const data = await response.json();
      if (data.success) {
        setContent(data.data.content || []);
      }
    } catch (error) {
      logger.error("Error fetching content:", error as Error, {
        component: "library",
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (shopDomain) {
      fetchContent();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedType, showSavedOnly, sortField, sortOrder, shopDomain]);

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this content?")) return;
    if (!shopDomain) return;

    try {
      const response = await fetch(`/api/content-center/content/${id}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${shopDomain}`,
        },
      });

      if (!response.ok) throw new Error("Failed to delete");

      setContent(content.filter((c) => c.id !== id));
    } catch (error) {
      logger.error("Error deleting content:", error as Error, {
        component: "library",
      });
      alert("Failed to delete content");
    }
  };

  const handleToggleSave = async (item: GeneratedContent) => {
    if (!shopDomain) return;

    try {
      const response = await fetch(`/api/content-center/content/${item.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${shopDomain}`,
        },
        body: JSON.stringify({ is_saved: !item.is_saved }),
      });

      if (!response.ok) throw new Error("Failed to update");

      setContent(
        content.map((c) =>
          c.id === item.id ? { ...c, is_saved: !item.is_saved } : c,
        ),
      );
    } catch (error) {
      logger.error("Error toggling save:", error as Error, {
        component: "library",
      });
    }
  };

  const handleExport = async (
    item: GeneratedContent,
    format: "txt" | "html" | "md",
  ) => {
    if (!shopDomain) return;

    try {
      const response = await fetch(
        `/api/content-center/export/${item.id}?format=${format}`,
        {
          headers: {
            Authorization: `Bearer ${shopDomain}`,
          },
        },
      );

      if (!response.ok) throw new Error("Export failed");

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `content-${item.id}.${format}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      logger.error("Error exporting:", error as Error, {
        component: "library",
      });
      alert("Failed to export content");
    }
  };

  const toggleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortOrder("desc");
    }
  };

  // Q8: Memoize filtered content to avoid recomputation on every render
  const filteredContent = useMemo(() => {
    return content.filter((item) => {
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        return (
          item.topic.toLowerCase().includes(query) ||
          item.generated_text.toLowerCase().includes(query)
        );
      }
      return true;
    });
  }, [content, searchQuery]);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffHours / 24);

    if (diffHours < 1) return "Just now";
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      {/* Header */}
      <div style={{ marginBottom: "24px" }}>
        <h1
          style={{
            fontSize: "32px",
            fontWeight: 700,
            color: "#003366",
            marginBottom: "8px",
            fontFamily:
              'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
          }}
        >
          Content Library
        </h1>
        <p
          style={{
            fontSize: "14px",
            color: "#6b7280",
            margin: 0,
            fontFamily:
              'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
          }}
        >
          Browse and manage all your generated content
        </p>
      </div>

      {/* Filters and Search */}
      <div
        style={{
          background: "#ffffff",
          border: "1px solid #e5e7eb",
          borderRadius: "8px",
          boxShadow: "0 2px 8px rgba(0, 0, 0, 0.08)",
          padding: "16px",
          marginBottom: "24px",
          maxWidth: "450px",
        }}
      >
        <div className="flex flex-col lg:flex-row" style={{ gap: "12px" }}>
          {/* Search */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <input
              placeholder="Search by topic or content..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                width: "100%",
                padding: "8px 12px",
                border: "1px solid #e5e7eb",
                borderRadius: "8px",
                fontSize: "14px",
                fontFamily:
                  'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
                outline: "none",
                boxSizing: "border-box",
              }}
            />
          </div>

          {/* Content Type Filter */}
          <Select
            value={selectedType}
            onValueChange={(value) =>
              setSelectedType(value as ContentType | "all")
            }
          >
            <SelectTrigger
              className="w-full lg:w-[200px]"
              style={{
                border: "1px solid #e5e7eb",
                borderRadius: "8px",
                fontFamily:
                  'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
              }}
            >
              <Filter className="h-4 w-4 mr-2" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="blog">Blog Posts</SelectItem>
              <SelectItem value="ad">Ad Copy</SelectItem>
              <SelectItem value="store_copy">Store Copy</SelectItem>
              <SelectItem value="social_facebook">Facebook</SelectItem>
              <SelectItem value="social_instagram">Instagram</SelectItem>
              <SelectItem value="social_tiktok">TikTok</SelectItem>
            </SelectContent>
          </Select>

          {/* Saved Only Toggle */}
          <button
            onClick={() => setShowSavedOnly(!showSavedOnly)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              padding: "8px 16px",
              background: showSavedOnly ? "#0066cc" : "#ffffff",
              color: showSavedOnly ? "#ffffff" : "#003366",
              border: showSavedOnly ? "none" : "1px solid #e5e7eb",
              borderRadius: "8px",
              fontSize: "14px",
              fontWeight: 600,
              fontFamily:
                'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
              cursor: "pointer",
              transition: "all 0.15s ease",
              whiteSpace: "nowrap",
            }}
          >
            <Bookmark className="h-4 w-4" />
            Saved Only
          </button>
        </div>
      </div>

      {/* Content Count and Sort */}
      <div
        className="flex items-center justify-between"
        style={{ marginBottom: "16px" }}
      >
        <p
          style={{
            fontSize: "14px",
            color: "#6b7280",
            margin: 0,
            fontFamily:
              'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
          }}
        >
          {filteredContent.length}{" "}
          {filteredContent.length === 1 ? "item" : "items"}
        </p>
        <div className="flex gap-2">
          <button
            onClick={() => toggleSort("created_at")}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "4px",
              padding: "6px 12px",
              background: "transparent",
              color: "#6b7280",
              border: "none",
              borderRadius: "8px",
              fontSize: "14px",
              fontFamily:
                'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
              cursor: "pointer",
              transition: "all 0.15s ease",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "#f9fafb";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "transparent";
            }}
          >
            Date
            {sortField === "created_at" && <ArrowUpDown className="h-3 w-3" />}
          </button>
          <button
            onClick={() => toggleSort("word_count")}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "4px",
              padding: "6px 12px",
              background: "transparent",
              color: "#6b7280",
              border: "none",
              borderRadius: "8px",
              fontSize: "14px",
              fontFamily:
                'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
              cursor: "pointer",
              transition: "all 0.15s ease",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "#f9fafb";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "transparent";
            }}
          >
            Length
            {sortField === "word_count" && <ArrowUpDown className="h-3 w-3" />}
          </button>
        </div>
      </div>

      {/* Content List */}
      {isLoading ? (
        <div className="flex justify-center" style={{ padding: "80px 0" }}>
          <ContentLoader message="Loading your content..." />
        </div>
      ) : filteredContent.length === 0 ? (
        <div
          style={{
            background: "#ffffff",
            border: "1px solid #e5e7eb",
            borderRadius: "8px",
            boxShadow: "0 2px 8px rgba(0, 0, 0, 0.08)",
            padding: "80px 24px",
            textAlign: "center",
          }}
        >
          <FileText
            className="h-16 w-16 mx-auto"
            style={{ color: "#6b7280", marginBottom: "16px" }}
          />
          <h3
            style={{
              fontSize: "20px",
              fontWeight: 600,
              color: "#003366",
              marginBottom: "8px",
              fontFamily:
                'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
            }}
          >
            No content found
          </h3>
          <p
            style={{
              fontSize: "14px",
              color: "#6b7280",
              marginBottom: "24px",
              fontFamily:
                'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
            }}
          >
            {searchQuery || selectedType !== "all" || showSavedOnly
              ? "Try adjusting your filters or search query"
              : "Start generating content to see it here"}
          </p>
          <Link href="/content-center/generate">
            <button
              style={{
                background: "#0066cc",
                color: "#ffffff",
                border: "none",
                borderRadius: "8px",
                padding: "12px 24px",
                fontSize: "14px",
                fontWeight: 600,
                fontFamily:
                  'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
                cursor: "pointer",
              }}
            >
              Generate Content
            </button>
          </Link>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          {filteredContent.map((item) => (
            <div
              key={item.id}
              style={{
                background: "#ffffff",
                border: "1px solid #e5e7eb",
                borderRadius: "8px",
                boxShadow: "0 2px 8px rgba(0, 0, 0, 0.08)",
                transition: "box-shadow 0.15s ease",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.boxShadow =
                  "0 4px 12px rgba(0, 0, 0, 0.12)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.boxShadow =
                  "0 2px 8px rgba(0, 0, 0, 0.08)";
              }}
            >
              <div style={{ padding: "16px" }}>
                <div className="flex items-start gap-4">
                  {/* Icon */}
                  <div
                    style={{
                      background: "#f0f7ff",
                      padding: "12px",
                      borderRadius: "8px",
                      flexShrink: 0,
                    }}
                  >
                    <FileText
                      className="h-6 w-6"
                      style={{ color: "#0066cc" }}
                    />
                  </div>

                  {/* Content Info */}
                  <div className="flex-1 min-w-0">
                    <div
                      className="flex items-start justify-between gap-3"
                      style={{ marginBottom: "8px" }}
                    >
                      <div className="flex-1 min-w-0">
                        <Link href={`/content-center/library/${item.id}`}>
                          <h3
                            style={{
                              fontSize: "18px",
                              fontWeight: 600,
                              color: "#003366",
                              marginBottom: "4px",
                              fontFamily:
                                'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
                              cursor: "pointer",
                              transition: "color 0.15s ease",
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.color = "#0066cc";
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.color = "#003366";
                            }}
                          >
                            {item.topic}
                          </h3>
                        </Link>
                        <div className="flex flex-wrap items-center gap-2">
                          <span
                            style={{
                              background: "#f3f4f6",
                              color: "#6b7280",
                              fontSize: "12px",
                              padding: "2px 8px",
                              borderRadius: "4px",
                              fontFamily:
                                'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
                            }}
                          >
                            {CONTENT_TYPE_LABELS[item.content_type]}
                          </span>
                          {item.is_saved && (
                            <span
                              style={{
                                background: "#0066cc",
                                color: "#ffffff",
                                fontSize: "12px",
                                padding: "2px 8px",
                                borderRadius: "4px",
                                fontFamily:
                                  'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
                                display: "flex",
                                alignItems: "center",
                                gap: "4px",
                              }}
                            >
                              <Bookmark className="h-3 w-3" />
                              Saved
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Actions */}
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <button
                            style={{
                              background: "transparent",
                              border: "none",
                              padding: "6px",
                              borderRadius: "8px",
                              cursor: "pointer",
                              transition: "background 0.15s ease",
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.background = "#f9fafb";
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.background = "transparent";
                            }}
                          >
                            <MoreVertical
                              className="h-4 w-4"
                              style={{ color: "#6b7280" }}
                            />
                          </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <Link href={`/content-center/library/${item.id}`}>
                            <DropdownMenuItem>
                              <Eye className="h-4 w-4 mr-2" />
                              View
                            </DropdownMenuItem>
                          </Link>
                          <Link
                            href={`/content-center/library/${item.id}/edit`}
                          >
                            <DropdownMenuItem>
                              <Edit className="h-4 w-4 mr-2" />
                              Edit
                            </DropdownMenuItem>
                          </Link>
                          <DropdownMenuItem
                            onClick={() => handleToggleSave(item)}
                          >
                            {item.is_saved ? (
                              <>
                                <BookmarkPlus className="h-4 w-4 mr-2" />
                                Unsave
                              </>
                            ) : (
                              <>
                                <Bookmark className="h-4 w-4 mr-2" />
                                Save
                              </>
                            )}
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={() => handleExport(item, "txt")}
                          >
                            <Download className="h-4 w-4 mr-2" />
                            Export as TXT
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => handleExport(item, "html")}
                          >
                            <Download className="h-4 w-4 mr-2" />
                            Export as HTML
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => handleExport(item, "md")}
                          >
                            <Download className="h-4 w-4 mr-2" />
                            Export as Markdown
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={() => handleDelete(item.id)}
                            className="text-destructive"
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>

                    {/* Preview Text */}
                    <p
                      style={{
                        fontSize: "14px",
                        color: "#6b7280",
                        marginBottom: "12px",
                        fontFamily:
                          'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
                        display: "-webkit-box",
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: "vertical",
                        overflow: "hidden",
                      }}
                    >
                      {item.generated_text
                        .replace(/<[^>]*>/g, "")
                        .substring(0, 200)}
                      ...
                    </p>

                    {/* Metadata */}
                    <div
                      className="flex flex-wrap items-center gap-4"
                      style={{
                        fontSize: "12px",
                        color: "#6b7280",
                        fontFamily:
                          'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
                      }}
                    >
                      <span className="flex items-center gap-1">
                        <FileText className="h-3 w-3" />
                        {item.word_count} words
                      </span>
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {formatDate(item.created_at)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
