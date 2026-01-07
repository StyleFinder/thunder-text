"use client";

import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Upload, FileText, AlertCircle, CheckCircle } from "lucide-react";
import { logger } from "@/lib/logger";

interface SampleUploadProps {
  onUploadSuccess?: () => void;
}

type SampleType = "blog" | "email" | "description" | "other";

export function SampleUpload({ onUploadSuccess }: SampleUploadProps) {
  const [sampleText, setSampleText] = useState("");
  const [sampleType, setSampleType] = useState<SampleType>("blog");
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const wordCount = sampleText
    .trim()
    .split(/\s+/)
    .filter((word) => word.length > 0).length;
  const isValidWordCount = wordCount >= 500 && wordCount <= 5000;

  const handleFileUpload = async (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Check for legacy .doc files first (not supported)
    if (file.name.endsWith(".doc") && !file.name.endsWith(".docx")) {
      setError(
        "Legacy .doc files are not supported. Please save as .docx or .txt format, or copy/paste your text.",
      );
      return;
    }

    // Check file type
    const validTypes = [
      "text/plain",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ];
    if (
      !validTypes.includes(file.type) &&
      !file.name.endsWith(".txt") &&
      !file.name.endsWith(".docx")
    ) {
      setError("Please upload a .txt or .docx file");
      return;
    }

    // Check file size (5MB limit)
    if (file.size > 5 * 1024 * 1024) {
      setError("File size must be less than 5MB");
      return;
    }

    setError(null);

    try {
      // Handle DOCX files
      if (file.name.endsWith(".docx")) {
        const mammoth = await import("mammoth");
        const arrayBuffer = await file.arrayBuffer();
        const result = await mammoth.extractRawText({ arrayBuffer });
        setSampleText(result.value);
        return;
      }

      // Handle plain text files
      if (file.name.endsWith(".txt")) {
        const reader = new FileReader();
        reader.onload = (e) => {
          const text = e.target?.result as string;
          setSampleText(text);
        };
        reader.onerror = () => {
          setError("Failed to read file");
        };
        reader.readAsText(file);
        return;
      }

      // Unsupported format
      setError(
        "Only .txt and .docx files are currently supported. Please convert your file or copy/paste the text.",
      );
    } catch (err) {
      setError(
        "Failed to parse file. Please try a different file or copy/paste the text.",
      );
      logger.error("File parsing error:", err as Error, {
        component: "SampleUpload",
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!isValidWordCount) {
      setError("Sample must be between 500 and 5000 words");
      return;
    }

    setIsUploading(true);
    setError(null);
    setSuccess(false);

    try {
      const response = await fetch("/api/content-center/samples", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("supabase_token")}`,
        },
        body: JSON.stringify({
          sample_text: sampleText,
          sample_type: sampleType,
        }),
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || "Failed to upload sample");
      }

      setSuccess(true);
      setSampleText("");
      // eslint-disable-next-line @typescript-eslint/no-unused-expressions
      fileInputRef.current && (fileInputRef.current.value = "");

      // Call success callback after a short delay
      setTimeout(() => {
        setSuccess(false);
        onUploadSuccess?.();
      }, 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to upload sample");
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Upload Content Sample</CardTitle>
        <CardDescription>
          Upload a sample of your writing (500-5000 words) to help build your
          brand voice profile
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* File Upload */}
          <div className="space-y-2">
            <Label htmlFor="file-upload">Upload from File (Optional)</Label>
            <div className="flex items-center gap-2">
              <input
                ref={fileInputRef}
                id="file-upload"
                type="file"
                accept=".txt,.doc,.docx,.pdf"
                onChange={handleFileUpload}
                className="hidden"
              />
              <Button
                type="button"
                variant="outline"
                onClick={() => fileInputRef.current?.click()}
                className="w-full sm:w-auto"
              >
                <Upload className="mr-2 h-4 w-4" />
                Choose File
              </Button>
              <span className="text-sm text-muted-foreground">
                .txt, .doc, .docx, or .pdf
              </span>
            </div>
          </div>

          {/* Sample Type */}
          <div className="space-y-2">
            <Label htmlFor="sample-type">Sample Type</Label>
            <Select
              value={sampleType}
              onValueChange={(value) => setSampleType(value as SampleType)}
            >
              <SelectTrigger id="sample-type">
                <SelectValue placeholder="Select sample type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="blog">Blog Post</SelectItem>
                <SelectItem value="email">Email</SelectItem>
                <SelectItem value="description">Product Description</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Text Input */}
          <div className="space-y-2">
            <Label htmlFor="sample-text">Sample Text</Label>
            <Textarea
              id="sample-text"
              placeholder="Paste or type your sample text here..."
              value={sampleText}
              onChange={(e) => setSampleText(e.target.value)}
              rows={12}
              className="font-mono text-sm"
            />
            <div className="flex items-center justify-between text-sm">
              <span
                className={`${isValidWordCount ? "text-green-600" : "text-muted-foreground"}`}
              >
                {wordCount} words {isValidWordCount && "✓"}
              </span>
              <span className="text-muted-foreground">
                {wordCount < 500 && `${500 - wordCount} more words needed`}
                {wordCount > 5000 && `${wordCount - 5000} words over limit`}
              </span>
            </div>
          </div>

          {/* Error Alert */}
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Success Alert */}
          {success && (
            <Alert className="border-green-600 bg-green-50">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-600">
                Sample uploaded successfully!
              </AlertDescription>
            </Alert>
          )}

          {/* Submit Button */}
          <Button
            type="submit"
            disabled={!isValidWordCount || isUploading}
            className="w-full"
          >
            {isUploading ? (
              <>Uploading...</>
            ) : (
              <>
                <FileText className="mr-2 h-4 w-4" />
                Upload Sample
              </>
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
