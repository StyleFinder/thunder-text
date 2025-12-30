"use client";

import { useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { RichTextEditor } from "./RichTextEditor";
import {
  Sparkles,
  Clock,
  DollarSign,
  FileText,
  Download,
  Save,
  RefreshCw,
  ThumbsUp,
  ThumbsDown,
  Share2,
  Eye,
  Edit3,
  Check,
} from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { GeneratedContent } from "@/types/content-center";

interface GenerationResultViewProps {
  result: GeneratedContent;
  generationTimeMs: number;
  costEstimate: number;
  onSave?: (content: GeneratedContent) => void;
  onRegenerate?: () => void;
  onExport?: (format: "txt" | "html" | "md") => void;
  className?: string;
}

export function GenerationResultView({
  result,
  generationTimeMs,
  costEstimate,
  onSave,
  onRegenerate,
  onExport,
  className = "",
}: GenerationResultViewProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editedContent, setEditedContent] = useState(result.generated_text);
  const [isSaved, setIsSaved] = useState(result.is_saved);
  const [feedback, setFeedback] = useState<"positive" | "negative" | null>(
    null,
  );

  const handleSave = () => {
    if (onSave) {
      onSave({
        ...result,
        generated_text: editedContent,
        is_saved: true,
      });
      setIsSaved(true);
      setIsEditing(false);
    }
  };

  const handleFeedback = (type: "positive" | "negative") => {
    setFeedback(type);
    // In real implementation, send feedback to backend
  };

  const formatTime = (ms: number) => {
    const seconds = Math.round(ms / 1000);
    return seconds < 60
      ? `${seconds}s`
      : `${Math.floor(seconds / 60)}m ${seconds % 60}s`;
  };

  const metadata = [
    {
      icon: FileText,
      label: "Word Count",
      value: result.word_count.toString(),
      tooltip: "Number of words in generated content",
    },
    {
      icon: Clock,
      label: "Generation Time",
      value: formatTime(generationTimeMs),
      tooltip: "Time taken to generate this content",
    },
    {
      icon: DollarSign,
      label: "Cost",
      value: `$${costEstimate.toFixed(4)}`,
      tooltip: "Estimated API cost for this generation",
    },
    {
      icon: Sparkles,
      label: "Content Type",
      value: result.content_type.replace(/_/g, " "),
      tooltip: "Type of content generated",
    },
  ];

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-2xl font-bold mb-2">Generated Content</h2>
          <p className="text-muted-foreground">
            Review and edit your AI-generated content below
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant={isEditing ? "default" : "outline"}
            size="sm"
            onClick={() => setIsEditing(!isEditing)}
          >
            {isEditing ? (
              <>
                <Eye className="h-4 w-4 mr-2" />
                Preview
              </>
            ) : (
              <>
                <Edit3 className="h-4 w-4 mr-2" />
                Edit
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Metadata Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {metadata.map((item, idx) => {
          const Icon = item.icon;
          return (
            <TooltipProvider key={idx}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Card className="cursor-help">
                    <CardContent className="pt-6">
                      <div className="flex items-center gap-3">
                        <div className="bg-primary/10 rounded-lg p-2">
                          <Icon className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">
                            {item.label}
                          </p>
                          <p className="text-lg font-semibold">{item.value}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </TooltipTrigger>
                <TooltipContent>
                  <p className="text-xs">{item.tooltip}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          );
        })}
      </div>

      {/* Topic Card */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div>
              <CardTitle className="text-base">Topic</CardTitle>
              <CardDescription className="mt-1">{result.topic}</CardDescription>
            </div>
            <Badge variant="secondary">
              {result.generation_params?.tone_intensity || 3}/5 Intensity
            </Badge>
          </div>
        </CardHeader>
      </Card>

      {/* Content Editor */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">Content</h3>
          {isEditing && (
            <p className="text-sm text-muted-foreground">
              Make changes and save when ready
            </p>
          )}
        </div>

        <RichTextEditor
          content={editedContent}
          onChange={setEditedContent}
          readOnly={!isEditing}
          minHeight="500px"
        />
      </div>

      {/* Actions */}
      <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
        {/* Primary Actions */}
        <div className="flex flex-wrap gap-2">
          <Button
            onClick={handleSave}
            disabled={!isEditing && isSaved}
            variant={isSaved ? "default" : "outline"}
          >
            {isSaved ? (
              <>
                <Check className="h-4 w-4 mr-2" />
                Saved
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                Save
              </>
            )}
          </Button>

          {onRegenerate && (
            <Button variant="outline" onClick={onRegenerate}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Regenerate
            </Button>
          )}

          {onExport && (
            <div className="flex gap-1">
              <Button
                variant="outline"
                size="sm"
                onClick={() => onExport("txt")}
              >
                <Download className="h-4 w-4 mr-2" />
                .txt
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => onExport("html")}
              >
                <Download className="h-4 w-4 mr-2" />
                .html
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => onExport("md")}
              >
                <Download className="h-4 w-4 mr-2" />
                .md
              </Button>
            </div>
          )}

          <Button variant="outline">
            <Share2 className="h-4 w-4 mr-2" />
            Share
          </Button>
        </div>

        {/* Feedback */}
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">
            Rate this generation:
          </span>
          <Button
            variant={feedback === "positive" ? "default" : "outline"}
            size="sm"
            onClick={() => handleFeedback("positive")}
          >
            <ThumbsUp className="h-4 w-4" />
          </Button>
          <Button
            variant={feedback === "negative" ? "default" : "outline"}
            size="sm"
            onClick={() => handleFeedback("negative")}
          >
            <ThumbsDown className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Generation Parameters Summary */}
      <Card className="bg-muted/30">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Generation Parameters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <p className="text-muted-foreground">Word Count</p>
              <p className="font-medium">
                {result.generation_params?.word_count || "N/A"}
              </p>
            </div>
            <div>
              <p className="text-muted-foreground">Tone Intensity</p>
              <p className="font-medium">
                {result.generation_params?.tone_intensity || "N/A"}/5
              </p>
            </div>
            <div>
              <p className="text-muted-foreground">CTA Type</p>
              <p className="font-medium capitalize">
                {result.generation_params?.cta_type?.replace(/_/g, " ") ||
                  "None"}
              </p>
            </div>
            <div>
              <p className="text-muted-foreground">Created</p>
              <p className="font-medium">
                {new Date(result.created_at).toLocaleDateString()}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
