"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { RichTextEditor } from "@/components/content-center/RichTextEditor";
import { ContentLoader } from "@/components/ui/loading/ContentLoader";
import {
  ArrowLeft,
  Edit,
  Save,
  Download,
  Trash2,
  Copy,
  Check,
  FileText,
  Calendar,
  Clock,
  Sparkles,
  RefreshCw,
  Share2,
} from "lucide-react";
import { GeneratedContent, ContentType } from "@/types/content-center";
import { supabase } from "@/lib/supabase";
import { logger } from "@/lib/logger";

const CONTENT_TYPE_LABELS: Record<ContentType, string> = {
  blog: "Blog Post",
  ad: "Ad Copy",
  store_copy: "Store Copy",
  social_facebook: "Facebook Post",
  social_instagram: "Instagram Caption",
  social_tiktok: "TikTok Caption",
};

export default function ContentDetailPage() {
  const params = useParams();
  const router = useRouter();
  const contentId = params.id as string;

  const [content, setContent] = useState<GeneratedContent | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [editedText, setEditedText] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  const [authToken, setAuthToken] = useState<string | null>(null);

  useEffect(() => {
    const getAuthToken = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (session?.access_token) {
        setAuthToken(session.access_token);
        fetchContent(session.access_token);
      }
    };
    getAuthToken();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [contentId]);

  const fetchContent = async (token: string) => {
    try {
      const response = await fetch(`/api/content-center/content/${contentId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) throw new Error("Failed to fetch content");

      const data = await response.json();
      if (data.success) {
        setContent(data.data);
        setEditedText(data.data.generated_text);
      }
    } catch (error) {
      logger.error("Error fetching content:", error as Error, {
        component: "[id]",
      });
      alert("Failed to load content");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    if (!content || !authToken) return;

    setIsSaving(true);
    try {
      const response = await fetch(`/api/content-center/content/${contentId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          generated_text: editedText,
          is_saved: true,
        }),
      });

      if (!response.ok) throw new Error("Failed to save");

      const data = await response.json();
      if (data.success) {
        setContent(data.data);
        setIsEditing(false);
        alert("Content saved successfully!");
      }
    } catch (error) {
      logger.error("Error saving content:", error as Error, {
        component: "[id]",
      });
      alert("Failed to save content");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!authToken) return;

    if (
      !confirm(
        "Are you sure you want to delete this content? This action cannot be undone.",
      )
    ) {
      return;
    }

    try {
      const response = await fetch(`/api/content-center/content/${contentId}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
      });

      if (!response.ok) throw new Error("Failed to delete");

      router.push("/content-center/library");
    } catch (error) {
      logger.error("Error deleting content:", error as Error, {
        component: "[id]",
      });
      alert("Failed to delete content");
    }
  };

  const handleCopy = async () => {
    if (!content) return;

    const text = content.generated_text.replace(/<[^>]*>/g, "");
    await navigator.clipboard.writeText(text);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  const handleExport = async (format: "txt" | "html" | "md") => {
    if (!authToken) return;

    try {
      const response = await fetch(
        `/api/content-center/export/${contentId}?format=${format}`,
        {
          headers: {
            Authorization: `Bearer ${authToken}`,
          },
        },
      );

      if (!response.ok) throw new Error("Export failed");

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `content-${contentId}.${format}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      logger.error("Error exporting:", error as Error, { component: "[id]" });
      alert("Failed to export content");
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-5xl">
        <div className="flex justify-center py-20">
          <ContentLoader message="Loading content..." />
        </div>
      </div>
    );
  }

  if (!content) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-5xl">
        <Card>
          <CardContent className="py-20 text-center">
            <h3 className="text-xl font-semibold mb-2">Content not found</h3>
            <p className="text-muted-foreground mb-6">
              The content you&apos;re looking for doesn&apos;t exist or has been
              deleted.
            </p>
            <Button onClick={() => router.push("/content-center/library")}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Library
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-5xl">
      {/* Header */}
      <div className="mb-6">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.push("/content-center/library")}
          className="mb-4"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Library
        </Button>

        <div className="flex items-start justify-between gap-4 mb-4">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <h1 className="text-3xl font-bold">{content.topic}</h1>
              <Badge variant="secondary">
                {CONTENT_TYPE_LABELS[content.content_type]}
              </Badge>
            </div>
            <p className="text-muted-foreground">
              Created {formatDate(content.created_at)}
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2">
            {isEditing ? (
              <>
                <Button onClick={handleSave} disabled={isSaving}>
                  <Save className="h-4 w-4 mr-2" />
                  {isSaving ? "Saving..." : "Save Changes"}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    setIsEditing(false);
                    setEditedText(content.generated_text);
                  }}
                  disabled={isSaving}
                >
                  Cancel
                </Button>
              </>
            ) : (
              <>
                <Button variant="outline" onClick={() => setIsEditing(true)}>
                  <Edit className="h-4 w-4 mr-2" />
                  Edit
                </Button>
                <Button variant="outline" onClick={handleCopy}>
                  {isCopied ? (
                    <>
                      <Check className="h-4 w-4 mr-2" />
                      Copied!
                    </>
                  ) : (
                    <>
                      <Copy className="h-4 w-4 mr-2" />
                      Copy
                    </>
                  )}
                </Button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Metadata Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="bg-primary/10 rounded-lg p-2">
                <FileText className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Word Count</p>
                <p className="text-lg font-semibold">{content.word_count}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="bg-primary/10 rounded-lg p-2">
                <Sparkles className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Tone</p>
                <p className="text-lg font-semibold">
                  {content.generation_params?.tone_intensity || "N/A"}/5
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="bg-primary/10 rounded-lg p-2">
                <Calendar className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Created</p>
                <p className="text-sm font-semibold">
                  {new Date(content.created_at).toLocaleDateString()}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="bg-primary/10 rounded-lg p-2">
                <Clock className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Created</p>
                <p className="text-sm font-semibold">
                  {new Date(content.created_at).toLocaleDateString()}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Content Editor */}
      <div className="mb-6">
        <RichTextEditor
          content={editedText}
          onChange={setEditedText}
          readOnly={!isEditing}
          minHeight="600px"
        />
      </div>

      {/* Generation Parameters */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-base">Generation Parameters</CardTitle>
          <CardDescription>
            Settings used to generate this content
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            <div>
              <p className="text-sm text-muted-foreground mb-1">
                Target Word Count
              </p>
              <p className="font-medium">
                {content.generation_params?.word_count || "N/A"}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground mb-1">
                Tone Intensity
              </p>
              <p className="font-medium">
                {content.generation_params?.tone_intensity || "N/A"}/5
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground mb-1">CTA Type</p>
              <p className="font-medium capitalize">
                {content.generation_params?.cta_type?.replace(/_/g, " ") ||
                  "None"}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground mb-1">Content Type</p>
              <p className="font-medium">
                {CONTENT_TYPE_LABELS[content.content_type]}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Actions Bar */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" onClick={() => handleExport("txt")}>
                <Download className="h-4 w-4 mr-2" />
                Export TXT
              </Button>
              <Button variant="outline" onClick={() => handleExport("html")}>
                <Download className="h-4 w-4 mr-2" />
                Export HTML
              </Button>
              <Button variant="outline" onClick={() => handleExport("md")}>
                <Download className="h-4 w-4 mr-2" />
                Export Markdown
              </Button>
              <Button variant="outline">
                <Share2 className="h-4 w-4 mr-2" />
                Share
              </Button>
              <Button variant="outline">
                <RefreshCw className="h-4 w-4 mr-2" />
                Regenerate
              </Button>
            </div>

            <Button variant="destructive" onClick={handleDelete}>
              <Trash2 className="h-4 w-4 mr-2" />
              Delete
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
