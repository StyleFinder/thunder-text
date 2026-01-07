"use client";

/**
 * Product Animator Component
 *
 * UI for generating animated product videos using Veo 3.1 via Kie.ai
 *
 * Features:
 * - Image upload/URL input
 * - Gemini quality pre-check with warnings
 * - Video generation with progress tracking
 * - Refund button for poor quality results
 * - Credit balance display
 */

import { useState, useRef, useCallback, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Upload,
  Video,
  Sparkles,
  AlertCircle,
  CheckCircle,
  RefreshCw,
  Play,
  Coins,
  Info,
  AlertTriangle,
  Loader2,
  Download,
  RotateCcw,
  X,
  Image as ImageIcon,
  Clock,
  User,
  MessageSquare,
} from "lucide-react";
import { logger } from "@/lib/logger";

// Types
type GenerationStatus =
  | "idle"
  | "uploading"
  | "quality_check"
  | "generating"
  | "generating_scripts"
  | "completed"
  | "failed"
  | "refunded";

type AspectRatio = "16:9" | "9:16";
type Model = "veo3_fast" | "veo3";
type VideoType = "360" | "ugc";

interface QualityWarning {
  type: string;
  severity: "low" | "medium" | "high";
  message: string;
}

interface QualityCheckResult {
  passed: boolean;
  score: number;
  warnings: QualityWarning[];
  recommendation: "proceed" | "caution" | "stop";
}

interface UGCScript {
  scriptNumber: number;
  title: string;
  energy: string;
  dialogue: { timestamp: string; text: string }[];
}

interface UGCPersona {
  name: string;
  age: number;
  occupation: string;
  appearance: string;
  style: string;
}

interface GenerationResult {
  generationId: string;
  taskId: string;
  status: GenerationStatus;
  videoUrl?: string;
  thumbnailUrl?: string;
  duration?: number;
  error?: string;
  qualityCheck?: QualityCheckResult;
  // UGC-specific fields
  persona?: UGCPersona;
  scripts?: UGCScript[];
  selectedScript?: UGCScript;
}

interface CreditInfo {
  balance: number;
  refundsRemaining: number;
}

interface VideoLibraryItem {
  id: string;
  videoUrl: string;
  thumbnailUrl?: string;
  sourceImageUrl: string;
  prompt: string;
  model: string;
  aspectRatio: string;
  durationSeconds?: number;
  status: string;
  createdAt: string;
  completedAt?: string;
  expiresAt?: string;
  daysUntilExpiration?: number;
  generationType?: "360" | "ugc";
  ugcProductName?: string;
}

// 360° clothing model rotation prompt for e-commerce
const PROMPT_360_CLOTHING = `Generate a 360-degree product video for an e-commerce clothing store. This video will feature the same person shown in the first and last frame reference images wearing the article of clothing from those images. Video Concept: The model should naturally turn around in a complete 360-degree rotation to showcase the article of clothing from all angles. The movement should feel organic and fluid, as if the model is casually showing off the outfit to a friend. The rotation should be smooth and at a comfortable, conversational pace, allowing viewers to see the front, sides, and back of the garment clearly. The model can make subtle, natural movements like adjusting their posture, smoothing the fabric, or looking over their shoulder during the turn to keep the presentation feeling authentic and engaging rather than stiff or robotic. Key Requirements: The model performs a complete 360-degree rotation with natural body language Movement feels casual and effortless, not mechanical Clothing is clearly visible from all angles (front, both sides, back) Lighting is consistent throughout the rotation Professional yet approachable e-commerce presentation style Constraints: No music or sound effects The final output video should NOT have any audio Muted audio Muted sound effect`;

export function ProductAnimator() {
  // State
  const [imageUrl, setImageUrl] = useState("");
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageBase64, setImageBase64] = useState<string | null>(null);
  const [productName, setProductName] = useState("");
  const [prompt, setPrompt] = useState("");
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>("16:9");
  const [model, setModel] = useState<Model>("veo3_fast");
  const [videoType, setVideoType] = useState<VideoType>("360");
  const [status, setStatus] = useState<GenerationStatus>("idle");
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<GenerationResult | null>(null);
  const [credits, setCredits] = useState<CreditInfo | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showQualityWarning, setShowQualityWarning] = useState(false);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [pendingGeneration, setPendingGeneration] = useState(false);
  const [videoLibrary, setVideoLibrary] = useState<VideoLibraryItem[]>([]);
  const [libraryLoading, setLibraryLoading] = useState(false);
  // UGC-specific state
  const [selectedScriptIndex, setSelectedScriptIndex] = useState(0);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [showScriptSelection, setShowScriptSelection] = useState(false);
  // Video playback modal state
  const [selectedVideo, setSelectedVideo] = useState<VideoLibraryItem | null>(
    null,
  );
  const [showVideoModal, setShowVideoModal] = useState(false);
  const [videoLoading, setVideoLoading] = useState(false);
  const [videoError, setVideoError] = useState<string | null>(null);
  const [videoReady, setVideoReady] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  // Delay video mounting until dialog is fully open and handle playback
  useEffect(() => {
    if (showVideoModal && selectedVideo) {
      const timer = setTimeout(() => {
        setVideoReady(true);
      }, 150);
      return () => clearTimeout(timer);
    } else {
      setVideoReady(false);
      setVideoLoading(false);
      setVideoError(null);
    }
  }, [showVideoModal, selectedVideo]);

  // Handle video element events via ref
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !videoReady) return;

    const handleLoadedData = () => {
      setVideoLoading(false);
      video.play().catch(() => {
        // Autoplay blocked - user can click play
      });
    };

    const handleCanPlay = () => {
      setVideoLoading(false);
    };

    const handleError = () => {
      setVideoLoading(false);
      const mediaError = video.error;
      if (mediaError && mediaError.code) {
        const errorMessages: Record<number, string> = {
          1: "Video loading was aborted",
          2: "Network error while loading video",
          3: "Video decoding failed",
          4: "Video format not supported",
        };
        setVideoError(
          errorMessages[mediaError.code] || `Error code: ${mediaError.code}`,
        );
      }
    };

    video.addEventListener("loadeddata", handleLoadedData);
    video.addEventListener("canplay", handleCanPlay);
    video.addEventListener("error", handleError);

    return () => {
      video.removeEventListener("loadeddata", handleLoadedData);
      video.removeEventListener("canplay", handleCanPlay);
      video.removeEventListener("error", handleError);
    };
  }, [videoReady]);

  // Fetch credits and video library on mount
  useEffect(() => {
    fetchCredits();
    fetchVideoLibrary();
    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchCredits = async () => {
    try {
      const response = await fetch("/api/video/credits");
      const data = await response.json();
      if (data.success) {
        setCredits({
          balance: data.data.balance,
          refundsRemaining: data.data.refundsRemaining,
        });
      }
    } catch (err) {
      logger.error("Failed to fetch credits", err as Error, {
        component: "ProductAnimator",
      });
    }
  };

  const fetchVideoLibrary = useCallback(async () => {
    setLibraryLoading(true);
    try {
      const response = await fetch("/api/video/library?limit=20");
      const data = await response.json();
      if (data.success) {
        setVideoLibrary(data.data.videos);
      }
    } catch (err) {
      logger.error("Failed to fetch video library", err as Error, {
        component: "ProductAnimator",
      });
    } finally {
      setLibraryLoading(false);
    }
  }, []);

  // Handle file upload
  const handleFileUpload = async (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    const validTypes = ["image/jpeg", "image/png", "image/webp"];
    if (!validTypes.includes(file.type)) {
      setError("Please upload a JPG, PNG, or WebP image");
      return;
    }

    // Validate file size (10MB max)
    if (file.size > 10 * 1024 * 1024) {
      setError("Image must be less than 10MB");
      return;
    }

    setError(null);
    setStatus("uploading");

    try {
      // Create preview and base64 using data URL
      const reader = new FileReader();
      reader.onload = (e) => {
        const dataUrl = e.target?.result as string;
        setImagePreview(dataUrl);
        setImageBase64(dataUrl); // Store base64 for UGC generation
      };
      reader.readAsDataURL(file);

      // Upload image to Supabase Storage to get a proper HTTP URL
      const formData = new FormData();
      formData.append("file", file);

      const uploadResponse = await fetch("/api/video/upload-image", {
        method: "POST",
        body: formData,
      });

      const uploadData = await uploadResponse.json();

      if (!uploadResponse.ok || !uploadData.success) {
        throw new Error(uploadData.error || "Failed to upload image");
      }

      // Use the public URL from Supabase Storage
      setImageUrl(uploadData.data.url);
      setStatus("idle");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to upload image");
      setStatus("idle");
      setImagePreview(null);
    }
  };

  // Handle URL input
  const handleUrlInput = (url: string) => {
    setImageUrl(url);
    if (url && url.startsWith("http")) {
      setImagePreview(url);
    } else {
      setImagePreview(null);
    }
  };

  // Start generation for 360° videos
  const start360Generation = async (skipQualityCheck = false) => {
    if (!imageUrl || !prompt) {
      setError("Please provide an image and prompt");
      return;
    }

    if (!credits || credits.balance < 1) {
      setError("Insufficient credits. Please purchase credits to continue.");
      return;
    }

    setError(null);
    setStatus("quality_check");
    setProgress(0);

    try {
      const response = await fetch("/api/video/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          imageUrl,
          prompt,
          model,
          aspectRatio,
          skipQualityCheck,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        // Handle quality check failure
        if (response.status === 422 && data.qualityCheck) {
          setResult({
            generationId: "",
            taskId: "",
            status: "idle",
            qualityCheck: data.qualityCheck,
          });
          setShowQualityWarning(true);
          setStatus("idle");
          return;
        }

        // Handle content policy violation with detailed guidance
        if (
          response.status === 400 &&
          data.error === "CONTENT_POLICY_VIOLATION"
        ) {
          setError(
            "⚠️ Content Policy: Your prompt was flagged by the AI moderation system. " +
              "Try using more specific descriptions like 'rotate 360 degrees on white background' " +
              "instead of vague phrases. Focus on camera movements and lighting rather than actions.",
          );
          setStatus("idle");
          return;
        }

        throw new Error(data.message || data.error || "Generation failed");
      }

      // Generation started
      setResult({
        generationId: data.data.generationId,
        taskId: data.data.taskId,
        status: "generating",
        qualityCheck: data.data.qualityCheck,
      });
      setStatus("generating");
      setProgress(10);

      // Start polling for status
      startPolling(data.data.generationId);

      // Refresh credits
      fetchCredits();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Generation failed");
      setStatus("failed");
    }
  };

  // Start UGC video generation (first step: generate scripts)
  const startUGCGeneration = async () => {
    if (!imageBase64 || !productName) {
      setError("Please provide an image and product name");
      return;
    }

    if (!credits || credits.balance < 2) {
      setError("Insufficient credits. UGC videos cost 2 credits.");
      return;
    }

    setError(null);
    setStatus("generating_scripts");
    setProgress(10);

    try {
      const response = await fetch("/api/video/generate-ugc", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          imageBase64,
          productName,
          scriptIndex: selectedScriptIndex,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        // Handle content policy violation
        if (
          response.status === 400 &&
          data.error === "CONTENT_POLICY_VIOLATION"
        ) {
          setError(
            "⚠️ Content Policy: The image or product name was flagged. " +
              "Try using a different product image or simpler product name.",
          );
          setStatus("idle");
          return;
        }

        throw new Error(data.message || data.error || "UGC generation failed");
      }

      // Store scripts and persona for display
      setResult({
        generationId: data.data.generationId,
        taskId: data.data.videoId,
        status: "generating",
        persona: data.data.persona,
        scripts: data.data.allScripts,
        selectedScript: data.data.selectedScript,
      });
      setStatus("generating");
      setProgress(30);

      // Start polling for status
      startPolling(data.data.generationId);

      // Refresh credits
      fetchCredits();
    } catch (err) {
      setError(err instanceof Error ? err.message : "UGC generation failed");
      setStatus("failed");
    }
  };

  // Main start generation function
  const startGeneration = async (skipQualityCheck = false) => {
    if (videoType === "ugc") {
      await startUGCGeneration();
    } else {
      await start360Generation(skipQualityCheck);
    }
  };

  // Poll for generation status
  const startPolling = (generationId: string) => {
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current);
    }

    let pollCount = 0;
    const maxPolls = 120; // 10 minutes max

    pollIntervalRef.current = setInterval(async () => {
      pollCount++;

      if (pollCount >= maxPolls) {
        clearInterval(pollIntervalRef.current!);
        setError("Generation timed out");
        setStatus("failed");
        return;
      }

      try {
        const response = await fetch(`/api/video/status?id=${generationId}`);
        const data = await response.json();

        if (!data.success) {
          throw new Error(data.error);
        }

        const statusData = data.data;

        // Update progress (simulate progress during processing)
        if (statusData.status === "processing") {
          setProgress(Math.min(90, 10 + pollCount * 1.5));
        }

        if (statusData.status === "completed") {
          clearInterval(pollIntervalRef.current!);
          setResult((prev) => ({
            ...prev!,
            status: "completed",
            videoUrl: statusData.videoUrl,
            thumbnailUrl: statusData.thumbnailUrl,
            duration: statusData.duration,
          }));
          setStatus("completed");
          setProgress(100);
          // Refresh video library to show the new video
          fetchVideoLibrary();
        }

        if (statusData.status === "failed") {
          clearInterval(pollIntervalRef.current!);
          setError(statusData.error || "Generation failed");
          setStatus("failed");
        }
      } catch (err) {
        logger.error("Polling error", err as Error, {
          component: "ProductAnimator",
        });
      }
    }, 5000); // Poll every 5 seconds
  };

  // Request refund
  const requestRefund = async () => {
    if (!result?.generationId) return;

    try {
      const response = await fetch("/api/video/refund", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          generationId: result.generationId,
          reason: "User reported poor quality",
        }),
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error);
      }

      setResult((prev) => ({ ...prev!, status: "refunded" }));
      setStatus("refunded");
      setCredits({
        balance: data.data.newBalance,
        refundsRemaining: data.data.refundsRemaining,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Refund failed");
    }
  };

  // Reset form
  const resetForm = () => {
    setImageUrl("");
    setImagePreview(null);
    setImageBase64(null);
    setProductName("");
    setPrompt("");
    setStatus("idle");
    setProgress(0);
    setResult(null);
    setError(null);
    setSelectedScriptIndex(0);
    setShowScriptSelection(false);
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current);
    }
  };

  // Open video in modal
  const openVideoModal = (video: VideoLibraryItem) => {
    if (video.status === "completed" && video.videoUrl) {
      setVideoLoading(true);
      setVideoError(null);
      setSelectedVideo(video);
      setShowVideoModal(true);
    }
  };

  // Render quality warnings
  const renderQualityWarnings = (warnings: QualityWarning[]) => (
    <div className="space-y-2">
      {warnings.map((warning, index) => (
        <div
          key={index}
          className={`flex items-start gap-2 text-sm ${
            warning.severity === "high"
              ? "text-red-600"
              : warning.severity === "medium"
                ? "text-yellow-600"
                : "text-gray-600"
          }`}
        >
          <AlertTriangle className="h-4 w-4 mt-0.5 flex-shrink-0" />
          <span>{warning.message}</span>
        </div>
      ))}
    </div>
  );

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      {/* Header with Credits */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Product Animator</h1>
          <p className="text-gray-600">
            Transform product images into animated videos with AI
          </p>
        </div>
        {credits && (
          <div className="flex items-center gap-2 bg-blue-50 px-4 py-2 rounded-lg">
            <Coins className="h-5 w-5 text-blue-600" />
            <span className="font-semibold text-blue-900">
              {credits.balance} credits
            </span>
          </div>
        )}
      </div>

      {/* Video Type Selection */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Video className="h-5 w-5" />
            Video Type
          </CardTitle>
          <CardDescription>
            Choose the type of video you want to create
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            <button
              onClick={() => setVideoType("360")}
              disabled={status !== "idle"}
              className={`p-4 rounded-lg border-2 transition-all text-left ${
                videoType === "360"
                  ? "border-blue-500 bg-blue-50"
                  : "border-gray-200 hover:border-gray-300"
              } ${status !== "idle" ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
            >
              <div className="flex items-center gap-3 mb-2">
                <div
                  className={`p-2 rounded-full ${videoType === "360" ? "bg-blue-100" : "bg-gray-100"}`}
                >
                  <RotateCcw
                    className={`h-5 w-5 ${videoType === "360" ? "text-blue-600" : "text-gray-500"}`}
                  />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">360° Rotation</h3>
                  <Badge variant="outline" className="text-xs">
                    1 credit
                  </Badge>
                </div>
              </div>
              <p className="text-sm text-gray-600">
                Professional product showcase with smooth rotation. Best for
                clothing, accessories, and physical products.
              </p>
            </button>

            <button
              onClick={() => setVideoType("ugc")}
              disabled={status !== "idle"}
              className={`p-4 rounded-lg border-2 transition-all text-left ${
                videoType === "ugc"
                  ? "border-purple-500 bg-purple-50"
                  : "border-gray-200 hover:border-gray-300"
              } ${status !== "idle" ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
            >
              <div className="flex items-center gap-3 mb-2">
                <div
                  className={`p-2 rounded-full ${videoType === "ugc" ? "bg-purple-100" : "bg-gray-100"}`}
                >
                  <User
                    className={`h-5 w-5 ${videoType === "ugc" ? "text-purple-600" : "text-gray-500"}`}
                  />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">UGC Style</h3>
                  <Badge variant="outline" className="text-xs">
                    2 credits
                  </Badge>
                </div>
              </div>
              <p className="text-sm text-gray-600">
                AI-generated influencer talking about your product. Authentic,
                iPhone-style UGC content.
              </p>
            </button>
          </div>
        </CardContent>
      </Card>

      {/* Storage Retention Notice */}
      <Alert className="mb-8 border-blue-200 bg-blue-50">
        <Info className="h-4 w-4 text-blue-600" />
        <AlertDescription className="text-blue-800">
          <strong>Storage Policy:</strong> Generated videos are stored for{" "}
          <strong>14 days</strong>. Please download any videos you wish to keep
          before they expire.
        </AlertDescription>
      </Alert>

      {/* Main Content */}
      <div className="grid gap-6">
        {/* Image Upload Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ImageIcon className="h-5 w-5" />
              Product Image
            </CardTitle>
            <CardDescription>
              Upload a high-quality product image or provide a URL
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Image Preview */}
            {imagePreview && (
              <div className="relative w-full aspect-video bg-gray-100 rounded-lg overflow-hidden">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={imagePreview}
                  alt="Product preview"
                  className="w-full h-full object-contain"
                />
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute top-2 right-2 bg-white/80 hover:bg-white"
                  onClick={() => {
                    setImageUrl("");
                    setImagePreview(null);
                  }}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            )}

            {/* Upload Options */}
            {!imagePreview && (
              <div className="border-2 border-dashed border-gray-200 rounded-lg p-8 text-center">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={handleFileUpload}
                  className="hidden"
                />
                <Upload className="h-10 w-10 text-gray-400 mx-auto mb-4" />
                <Button
                  variant="outline"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={status !== "idle"}
                >
                  Upload Image
                </Button>
                <p className="text-sm text-gray-500 mt-2">
                  JPG, PNG, or WebP up to 10MB
                </p>
              </div>
            )}

            {/* URL Input */}
            <div className="space-y-2">
              <Label htmlFor="image-url">Or paste image URL</Label>
              <Input
                id="image-url"
                placeholder="https://example.com/product-image.jpg"
                value={imageUrl.startsWith("data:") ? "" : imageUrl}
                onChange={(e) => handleUrlInput(e.target.value)}
                disabled={status !== "idle"}
              />
            </div>
          </CardContent>
        </Card>

        {/* Prompt Section - 360° Mode */}
        {videoType === "360" && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="h-5 w-5" />
                Animation Prompt
              </CardTitle>
              <CardDescription>
                Describe how you want the product to be animated
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Textarea
                placeholder="Describe the animation you want..."
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                rows={4}
                disabled={status !== "idle"}
                className="resize-none"
              />
              <p className="text-xs text-gray-500">
                {prompt.length}/2000 characters
              </p>

              {/* 360° Prompt Button */}
              <div className="space-y-2">
                <Label className="text-sm text-gray-600">Quick prompt:</Label>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPrompt(PROMPT_360_CLOTHING)}
                  disabled={status !== "idle"}
                  className="text-sm font-medium"
                >
                  <RotateCcw className="h-4 w-4 mr-2" />
                  360° Clothing Model Rotation
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Product Info Section - UGC Mode */}
        {videoType === "ugc" && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="h-5 w-5" />
                Product Information
              </CardTitle>
              <CardDescription>
                AI will create a creator persona and script based on your
                product
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="product-name">Product Name</Label>
                <Input
                  id="product-name"
                  placeholder="e.g., Cozy Comfort Throw Blanket"
                  value={productName}
                  onChange={(e) => setProductName(e.target.value)}
                  disabled={status !== "idle"}
                />
                <p className="text-xs text-gray-500">
                  Enter a descriptive name for your product. The AI will analyze
                  the image and create an authentic UGC-style video.
                </p>
              </div>

              {/* UGC Info */}
              <Alert className="border-purple-200 bg-purple-50">
                <User className="h-4 w-4 text-purple-600" />
                <AlertDescription className="text-purple-800">
                  <strong>How it works:</strong> AI will analyze your product
                  image, create a realistic creator persona, and generate a
                  12-second authentic UGC-style video of them naturally talking
                  about your product.
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>
        )}

        {/* Settings Section - 360° Mode Only */}
        {videoType === "360" && (
          <Card>
            <CardHeader>
              <CardTitle>Settings</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Aspect Ratio</Label>
                  <Select
                    value={aspectRatio}
                    onValueChange={(value) =>
                      setAspectRatio(value as AspectRatio)
                    }
                    disabled={status !== "idle"}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="16:9">16:9 (Landscape)</SelectItem>
                      <SelectItem value="9:16">
                        9:16 (Portrait/TikTok)
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Label>Quality</Label>
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger>
                          <Info className="h-4 w-4 text-gray-400" />
                        </TooltipTrigger>
                        <TooltipContent className="max-w-xs">
                          <p>
                            <strong>Fast:</strong> ~60-90 seconds, $0.40/video
                          </p>
                          <p>
                            <strong>Quality:</strong> ~2-4 minutes, $2.00/video
                          </p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                  <Select
                    value={model}
                    onValueChange={(value) => setModel(value as Model)}
                    disabled={status !== "idle"}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="veo3_fast">Fast (1 credit)</SelectItem>
                      <SelectItem value="veo3">Quality (5 credits)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Error Alert */}
        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Quality Check Result (shown inline when passed) */}
        {result?.qualityCheck &&
          !showQualityWarning &&
          result.qualityCheck.warnings.length > 0 && (
            <Alert className="border-yellow-200 bg-yellow-50">
              <AlertTriangle className="h-4 w-4 text-yellow-600" />
              <AlertTitle className="text-yellow-800">Quality Notes</AlertTitle>
              <AlertDescription>
                {renderQualityWarnings(result.qualityCheck.warnings)}
              </AlertDescription>
            </Alert>
          )}

        {/* Generation Progress */}
        {(status === "quality_check" ||
          status === "generating" ||
          status === "generating_scripts") && (
          <Card
            className={`${videoType === "ugc" ? "border-purple-200 bg-purple-50" : "border-blue-200 bg-blue-50"}`}
          >
            <CardContent className="pt-6">
              <div className="flex items-center gap-4 mb-4">
                <Loader2
                  className={`h-6 w-6 animate-spin ${videoType === "ugc" ? "text-purple-600" : "text-blue-600"}`}
                />
                <div>
                  <p
                    className={`font-medium ${videoType === "ugc" ? "text-purple-900" : "text-blue-900"}`}
                  >
                    {status === "quality_check"
                      ? "Checking image quality..."
                      : status === "generating_scripts"
                        ? "Creating AI persona and script..."
                        : videoType === "ugc"
                          ? "Generating UGC video..."
                          : "Generating video..."}
                  </p>
                  <p
                    className={`text-sm ${videoType === "ugc" ? "text-purple-700" : "text-blue-700"}`}
                  >
                    {status === "generating_scripts" &&
                      "AI is analyzing your product and creating an authentic creator persona..."}
                    {status === "generating" &&
                      videoType === "ugc" &&
                      "This typically takes 3-5 minutes for UGC videos"}
                    {status === "generating" &&
                      videoType === "360" &&
                      `This typically takes ${model === "veo3" ? "2-4 minutes" : "60-90 seconds"}`}
                  </p>
                </div>
              </div>
              <Progress value={progress} className="h-2" />

              {/* Show persona and script info during UGC generation */}
              {videoType === "ugc" && result?.persona && (
                <div className="mt-4 p-4 bg-white/50 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <User className="h-4 w-4 text-purple-600" />
                    <span className="font-medium text-purple-900">
                      Creator: {result.persona.name}
                    </span>
                  </div>
                  <p className="text-sm text-purple-700">
                    {result.persona.age} • {result.persona.occupation}
                  </p>
                  {result.selectedScript && (
                    <div className="mt-2 pt-2 border-t border-purple-200">
                      <p className="text-sm text-purple-800 font-medium">
                        Script: {result.selectedScript.title}
                      </p>
                      <p className="text-xs text-purple-600 mt-1">
                        {result.selectedScript.energy}
                      </p>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Completed Result */}
        {status === "completed" && result?.videoUrl && (
          <Card className="border-green-200 bg-green-50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-green-800">
                <CheckCircle className="h-5 w-5" />
                Video Generated!
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Video Player with visible controls */}
              <div className="aspect-video bg-black rounded-lg overflow-hidden relative group">
                <video
                  src={result.videoUrl}
                  controls
                  controlsList="nodownload"
                  className="w-full h-full object-contain"
                  poster={result.thumbnailUrl}
                  playsInline
                  preload="metadata"
                />
              </div>

              {/* Actions */}
              <div className="flex flex-wrap gap-3">
                <Button
                  asChild
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                >
                  <a href={result.videoUrl} download>
                    <Download className="h-4 w-4 mr-2" />
                    Download Video
                  </a>
                </Button>
                <Button variant="outline" onClick={resetForm}>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Create Another
                </Button>
                {credits && credits.refundsRemaining > 0 && (
                  <Button
                    variant="ghost"
                    className="text-orange-600 hover:text-orange-700 hover:bg-orange-50"
                    onClick={requestRefund}
                  >
                    <RotateCcw className="h-4 w-4 mr-2" />
                    Report Poor Quality
                  </Button>
                )}
              </div>

              {credits && credits.refundsRemaining > 0 && (
                <p className="text-xs text-gray-500">
                  Not happy with the result? You have {credits.refundsRemaining}{" "}
                  refunds remaining today.
                </p>
              )}
            </CardContent>
          </Card>
        )}

        {/* Refunded State */}
        {status === "refunded" && (
          <Alert className="border-orange-200 bg-orange-50">
            <RotateCcw className="h-4 w-4 text-orange-600" />
            <AlertTitle className="text-orange-800">Credit Refunded</AlertTitle>
            <AlertDescription className="text-orange-700">
              Your credit has been refunded. You now have {credits?.balance}{" "}
              credits.
              <Button variant="link" className="px-0 ml-2" onClick={resetForm}>
                Try again
              </Button>
            </AlertDescription>
          </Alert>
        )}

        {/* Generate Button */}
        {status === "idle" && (
          <Button
            size="lg"
            onClick={() => startGeneration()}
            disabled={
              videoType === "360"
                ? !imageUrl || !prompt || !credits || credits.balance < 1
                : !imageBase64 ||
                  !productName ||
                  !credits ||
                  credits.balance < 2
            }
            className={`w-full ${videoType === "ugc" ? "bg-purple-600 hover:bg-purple-700" : ""}`}
          >
            {videoType === "ugc" ? (
              <>
                <User className="h-5 w-5 mr-2" />
                Generate UGC Video (2 credits)
              </>
            ) : (
              <>
                <Video className="h-5 w-5 mr-2" />
                Generate Video (1 credit)
              </>
            )}
          </Button>
        )}

        {/* Credit Purchase CTA */}
        {credits && credits.balance === 0 && (
          <Alert>
            <Coins className="h-4 w-4" />
            <AlertTitle>No Credits</AlertTitle>
            <AlertDescription>
              You need credits to generate videos.
              <Button variant="link" className="px-1">
                Purchase credits
              </Button>
            </AlertDescription>
          </Alert>
        )}
      </div>

      {/* Quality Warning Dialog */}
      <AlertDialog
        open={showQualityWarning}
        onOpenChange={setShowQualityWarning}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-yellow-600" />
              Low Quality Image Detected
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-4">
              <p>
                Our quality check detected some issues with your image that may
                result in a poor video:
              </p>
              {result?.qualityCheck?.warnings && (
                <div className="bg-yellow-50 p-4 rounded-lg">
                  {renderQualityWarnings(result.qualityCheck.warnings)}
                </div>
              )}
              <p>
                You can proceed anyway, but results may be inconsistent. You can
                always request a refund if unhappy.
              </p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Use Different Image</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                setShowQualityWarning(false);
                startGeneration(true);
              }}
            >
              Proceed Anyway
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Video Playback Modal */}
      <Dialog open={showVideoModal} onOpenChange={setShowVideoModal}>
        <DialogContent className="max-w-4xl p-0 overflow-hidden bg-black">
          <DialogHeader className="p-4 pb-0">
            <DialogTitle className="text-white flex items-center gap-2">
              <Video className="h-5 w-5" />
              {selectedVideo?.generationType === "ugc"
                ? "UGC Video"
                : "360° Product Video"}
              {selectedVideo?.ugcProductName && (
                <span className="text-gray-400 font-normal">
                  — {selectedVideo.ugcProductName}
                </span>
              )}
            </DialogTitle>
          </DialogHeader>
          <div className="aspect-video bg-black relative">
            {videoLoading && (
              <div className="absolute inset-0 flex items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-white" />
              </div>
            )}
            {videoError && (
              <div className="absolute inset-0 flex flex-col items-center justify-center text-white">
                <AlertCircle className="h-8 w-8 text-red-400 mb-2" />
                <p className="text-sm text-red-400">{videoError}</p>
              </div>
            )}
            {selectedVideo?.videoUrl && videoReady && (
              <video
                ref={videoRef}
                key={selectedVideo.id}
                src={selectedVideo.videoUrl}
                controls
                muted
                playsInline
                preload="auto"
                className={`w-full h-full object-contain transition-opacity ${videoLoading || videoError ? "opacity-0" : "opacity-100"}`}
              />
            )}
          </div>
          <div className="p-4 pt-2 flex items-center justify-between">
            <div className="text-sm text-gray-400">
              {selectedVideo?.createdAt && (
                <span>
                  Created{" "}
                  {new Date(selectedVideo.createdAt).toLocaleDateString()}
                </span>
              )}
              {selectedVideo?.daysUntilExpiration !== undefined && (
                <span className="ml-3 text-orange-400">
                  Expires in {selectedVideo.daysUntilExpiration} days
                </span>
              )}
            </div>
            {selectedVideo?.videoUrl && (
              <a
                href={selectedVideo.videoUrl}
                download
                className="inline-flex items-center justify-center h-8 rounded-md px-3 text-sm font-semibold bg-blue-600 hover:bg-blue-700 text-white transition-colors"
              >
                <Download className="h-4 w-4 mr-2" />
                Download
              </a>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Video Library Section */}
      <div className="mt-12">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl font-bold text-gray-900">Your Videos</h2>
            <p className="text-gray-600 text-sm">
              Previously generated product animations
            </p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={fetchVideoLibrary}
            disabled={libraryLoading}
          >
            <RefreshCw
              className={`h-4 w-4 mr-2 ${libraryLoading ? "animate-spin" : ""}`}
            />
            Refresh
          </Button>
        </div>

        {libraryLoading && videoLibrary.length === 0 ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
          </div>
        ) : videoLibrary.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Video className="h-12 w-12 text-gray-300 mb-4" />
              <p className="text-gray-500 text-center">
                No videos yet. Generate your first product animation above!
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {videoLibrary.map((video) => (
              <Card key={video.id} className="overflow-hidden">
                <div
                  className={`aspect-video bg-gray-900 relative ${
                    video.status === "completed" && video.videoUrl
                      ? "cursor-pointer group"
                      : ""
                  }`}
                  onClick={() => openVideoModal(video)}
                >
                  {video.status === "completed" && video.videoUrl ? (
                    <>
                      {/* Thumbnail/poster image */}
                      {video.thumbnailUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={video.thumbnailUrl}
                          alt="Video thumbnail"
                          className="w-full h-full object-contain"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-gray-800">
                          <Video className="h-12 w-12 text-gray-500" />
                        </div>
                      )}
                      {/* Play overlay */}
                      <div className="absolute inset-0 flex items-center justify-center bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity">
                        <div className="w-16 h-16 rounded-full bg-white/90 flex items-center justify-center shadow-lg">
                          <Play className="h-8 w-8 text-gray-900 ml-1" />
                        </div>
                      </div>
                    </>
                  ) : video.status === "processing" ||
                    video.status === "pending" ? (
                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-800">
                      <Loader2 className="h-8 w-8 animate-spin text-blue-400 mb-2" />
                      <span className="text-white text-sm">Processing...</span>
                    </div>
                  ) : (
                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-800">
                      <AlertCircle className="h-8 w-8 text-red-400 mb-2" />
                      <span className="text-white text-sm">Failed</span>
                    </div>
                  )}
                </div>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <p className="text-sm text-gray-700 line-clamp-2 flex-1">
                      {video.prompt}
                    </p>
                    <div className="flex flex-col items-end gap-1">
                      {video.generationType === "ugc" && (
                        <Badge
                          variant="outline"
                          className="bg-purple-50 text-purple-700 border-purple-200 text-xs"
                        >
                          UGC
                        </Badge>
                      )}
                      <Badge
                        variant={
                          video.status === "completed"
                            ? "default"
                            : video.status === "processing" ||
                                video.status === "pending"
                              ? "secondary"
                              : "destructive"
                        }
                        className="flex-shrink-0"
                      >
                        {video.status}
                      </Badge>
                    </div>
                  </div>
                  <div className="flex items-center justify-between text-xs text-gray-500">
                    <span>
                      {new Date(video.createdAt).toLocaleDateString()}
                    </span>
                    <span>
                      {video.generationType === "ugc" ? "Sora 2" : video.model}
                    </span>
                  </div>
                  {video.daysUntilExpiration !== undefined && (
                    <div
                      className={`flex items-center gap-1 text-xs mt-2 ${
                        video.daysUntilExpiration <= 3
                          ? "text-orange-600"
                          : "text-gray-500"
                      }`}
                    >
                      <Clock className="h-3 w-3" />
                      <span>
                        {video.daysUntilExpiration === 0
                          ? "Expires today"
                          : video.daysUntilExpiration === 1
                            ? "Expires tomorrow"
                            : `Expires in ${video.daysUntilExpiration} days`}
                      </span>
                    </div>
                  )}
                  {video.status === "completed" && video.videoUrl && (
                    <div className="mt-3 pt-3 border-t flex gap-2">
                      <a
                        href={video.videoUrl}
                        download
                        className="flex-1 inline-flex items-center justify-center gap-1 rounded-md border border-input bg-background px-3 py-2 text-sm font-medium hover:bg-accent hover:text-accent-foreground"
                      >
                        <Download className="h-3 w-3" />
                        Download
                      </a>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
