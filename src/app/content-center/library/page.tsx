"use client";

import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
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
  Search,
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
      console.error("Error fetching content:", error);
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
      console.error("Error deleting content:", error);
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
      console.error("Error toggling save:", error);
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
      console.error("Error exporting:", error);
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

  const filteredContent = content.filter((item) => {
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      return (
        item.topic.toLowerCase().includes(query) ||
        item.generated_text.toLowerCase().includes(query)
      );
    }
    return true;
  });

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
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Content Library</h1>
        <p className="text-muted-foreground">
          Browse and manage all your generated content
        </p>
      </div>

      {/* Filters and Search */}
      <Card className="mb-6">
        <CardContent className="p-6">
          <div className="flex flex-col lg:flex-row gap-4">
            {/* Search */}
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by topic or content..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            {/* Content Type Filter */}
            <Select
              value={selectedType}
              onValueChange={(value) =>
                setSelectedType(value as ContentType | "all")
              }
            >
              <SelectTrigger className="w-full lg:w-[200px]">
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
            <Button
              variant={showSavedOnly ? "default" : "outline"}
              onClick={() => setShowSavedOnly(!showSavedOnly)}
              className="w-full lg:w-auto"
            >
              <Bookmark className="h-4 w-4 mr-2" />
              Saved Only
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Content Count and Sort */}
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-muted-foreground">
          {filteredContent.length}{" "}
          {filteredContent.length === 1 ? "item" : "items"}
        </p>
        <div className="flex gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => toggleSort("created_at")}
            className="gap-1"
          >
            Date
            {sortField === "created_at" && <ArrowUpDown className="h-3 w-3" />}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => toggleSort("word_count")}
            className="gap-1"
          >
            Length
            {sortField === "word_count" && <ArrowUpDown className="h-3 w-3" />}
          </Button>
        </div>
      </div>

      {/* Content List */}
      {isLoading ? (
        <div className="flex justify-center py-20">
          <ContentLoader message="Loading your content..." />
        </div>
      ) : filteredContent.length === 0 ? (
        <Card>
          <CardContent className="py-20 text-center">
            <FileText className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-xl font-semibold mb-2">No content found</h3>
            <p className="text-muted-foreground mb-6">
              {searchQuery || selectedType !== "all" || showSavedOnly
                ? "Try adjusting your filters or search query"
                : "Start generating content to see it here"}
            </p>
            <Link href="/content-center/generate">
              <Button>Generate Content</Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {filteredContent.map((item) => (
            <Card key={item.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-start gap-4">
                  {/* Icon */}
                  <div className="bg-primary/10 p-3 rounded-lg shrink-0">
                    <FileText className="h-6 w-6 text-primary" />
                  </div>

                  {/* Content Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <div className="flex-1 min-w-0">
                        <Link href={`/content-center/library/${item.id}`}>
                          <h3 className="font-semibold text-lg hover:text-primary transition-colors truncate">
                            {item.topic}
                          </h3>
                        </Link>
                        <div className="flex flex-wrap items-center gap-2 mt-1">
                          <Badge variant="secondary">
                            {CONTENT_TYPE_LABELS[item.content_type]}
                          </Badge>
                          {item.is_saved && (
                            <Badge variant="default" className="gap-1">
                              <Bookmark className="h-3 w-3" />
                              Saved
                            </Badge>
                          )}
                        </div>
                      </div>

                      {/* Actions */}
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
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
                    <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
                      {item.generated_text
                        .replace(/<[^>]*>/g, "")
                        .substring(0, 200)}
                      ...
                    </p>

                    {/* Metadata */}
                    <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
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
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
