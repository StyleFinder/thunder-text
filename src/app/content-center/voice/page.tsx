/* eslint-disable react/no-unescaped-entities -- Quotes and apostrophes in JSX text are intentional */
"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  CheckCircle2,
  AlertCircle,
  Sparkles,
  MessageSquare,
  Upload,
  FileText,
  X,
  Download,
  Link as LinkIcon,
  Loader2,
} from "lucide-react";
import { useShopifyAuth } from "@/app/components/UnifiedShopifyAuth";
import type { ContentSample, BrandVoiceProfile } from "@/types/content-center";
import { logger } from "@/lib/logger";

interface WritingSample {
  id: string;
  name: string;
  type: string;
  uploadDate: string;
  size: string;
  dbId?: string; // Database ID if saved
}

export default function BrandVoicePage() {
  const {
    shop: shopDomain,
    isAuthenticated,
    isLoading: authLoading,
  } = useShopifyAuth();

  // State
  const [samples, setSamples] = useState<WritingSample[]>([]);
  const [profile, setProfile] = useState<BrandVoiceProfile | null>(null);
  const [isLoadingSamples, setIsLoadingSamples] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [showPasteDialog, setShowPasteDialog] = useState(false);
  const [showUrlDialog, setShowUrlDialog] = useState(false);
  const [pasteText, setPasteText] = useState("");
  const [pasteName, setPasteName] = useState("");
  const [urlInput, setUrlInput] = useState("");
  const [showSuccessToast, setShowSuccessToast] = useState(false);
  const [toastMessage, setToastMessage] = useState("");
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [editedProfileText, setEditedProfileText] = useState("");
  const [isSavingProfile, setIsSavingProfile] = useState(false);

  // Load existing samples and profile on mount
  useEffect(() => {
    if (shopDomain && isAuthenticated) {
      loadSamples();
      loadProfile();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shopDomain, isAuthenticated]);

  const loadSamples = async () => {
    try {
      const response = await fetch("/api/content-center/samples", {
        headers: {
          Authorization: `Bearer ${shopDomain}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success && data.data.samples) {
          // Convert DB samples to UI format
          const uiSamples: WritingSample[] = data.data.samples.map(
            (s: ContentSample) => {
              // Extract first line or first 50 chars as name
              const firstLine = s.sample_text.split("\n")[0].trim();
              const displayName =
                firstLine.length > 0 && firstLine.length <= 100
                  ? firstLine
                  : firstLine.substring(0, 50) + "...";

              return {
                id: s.id,
                dbId: s.id,
                name: displayName,
                type: s.sample_type.toUpperCase(),
                uploadDate: new Date(s.created_at).toLocaleDateString(),
                size: `${s.word_count} words`,
              };
            },
          );
          setSamples(uiSamples);
        }
      }
    } catch (error) {
      logger.error("Failed to load samples", error as Error, {
        component: "content-center-voice-page",
        operation: "loadSamples",
        shop: shopDomain,
      });
    } finally {
      setIsLoadingSamples(false);
    }
  };

  const loadProfile = async () => {
    try {
      const response = await fetch("/api/content-center/voice", {
        headers: {
          Authorization: `Bearer ${shopDomain}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success && data.data.profile) {
          setProfile(data.data.profile);
        }
      }
    } catch (error) {
      logger.error("Failed to load profile", error as Error, {
        component: "content-center-voice-page",
        operation: "loadProfile",
        shop: shopDomain,
      });
    }
  };

  const showToast = (message: string) => {
    setToastMessage(message);
    setShowSuccessToast(true);
    setTimeout(() => setShowSuccessToast(false), 3000);
  };

  // Auto-generate profile when we have 3+ samples and no profile exists
  useEffect(() => {
    if (samples.length >= 3 && !profile && !isGenerating) {
      generateProfile();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [samples.length, profile]);

  const generateProfile = async () => {
    if (isGenerating) return;

    setIsGenerating(true);
    try {
      const response = await fetch("/api/content-center/voice/generate", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${shopDomain}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success && data.data.profile) {
          setProfile(data.data.profile);
          showToast("Brand voice profile generated successfully!");
        }
      } else {
        const error = await response.json();
        logger.error(
          "Profile generation failed",
          new Error(error.error || "Unknown error"),
          {
            component: "content-center-voice-page",
            operation: "generateProfile",
            shop: shopDomain,
          },
        );
      }
    } catch (error) {
      logger.error("Failed to generate profile", error as Error, {
        component: "content-center-voice-page",
        operation: "generateProfile",
        shop: shopDomain,
      });
    } finally {
      setIsGenerating(false);
    }
  };

  // Sample handling functions
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const files = Array.from(e.dataTransfer.files);
    processFiles(files);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;

    const files = Array.from(e.target.files);
    processFiles(files);

    // Reset input so same file can be selected again
    e.target.value = "";
  };

  const processFiles = async (files: File[]) => {
    setIsUploading(true);

    for (const file of files) {
      // Validate file
      const extension = file.name.toLowerCase().split(".").pop();

      // Check for legacy .doc files first
      if (extension === "doc") {
        alert(
          `File "${file.name}" uses legacy .doc format which is not supported. Please save as .docx or .txt format, or copy/paste the text.`,
        );
        continue;
      }

      const isValidType = ["txt", "pdf", "docx"].includes(extension || "");
      const isValidSize = file.size <= 10 * 1024 * 1024; // 10MB

      if (!isValidType) {
        alert(
          `File "${file.name}" is not supported. Please upload PDF, DOCX, or TXT files.`,
        );
        continue;
      }

      if (!isValidSize) {
        alert(`File "${file.name}" is too large. Maximum file size is 10MB.`);
        continue;
      }

      try {
        let text: string;

        // Extract text based on file type
        if (extension === "txt") {
          text = await readFileAsText(file);
        } else if (extension === "pdf") {
          text = await extractTextFromPDF(file);
        } else if (extension === "docx") {
          text = await extractTextFromWord(file);
        } else {
          continue;
        }

        // Validate extracted text
        if (!text || text.trim().length < 100) {
          alert(
            `File "${file.name}" doesn't contain enough text. Minimum 100 characters required.`,
          );
          continue;
        }

        // Upload to API
        const response = await fetch("/api/content-center/samples", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${shopDomain}`,
          },
          body: JSON.stringify({
            sample_text: text,
            sample_type: "other",
          }),
        });

        if (response.ok) {
          const data = await response.json();
          if (data.success && data.data.sample) {
            const newSample: WritingSample = {
              id: data.data.sample.id,
              dbId: data.data.sample.id,
              name: file.name,
              type: extension.toUpperCase(),
              uploadDate: new Date().toLocaleDateString(),
              size: `${data.data.word_count} words`,
            };
            setSamples((prev) => [...prev, newSample]);
          }
        } else {
          const error = await response.json();
          alert(`Failed to upload "${file.name}": ${error.error}`);
        }
      } catch (error) {
        logger.error(`Error processing file`, error as Error, {
          component: "content-center-voice-page",
          operation: "uploadFiles",
          fileName: file.name,
          shop: shopDomain,
        });
        alert(
          `Failed to process "${file.name}". ${error instanceof Error ? error.message : ""}`,
        );
      }
    }

    setIsUploading(false);
  };

  const readFileAsText = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target?.result as string);
      reader.onerror = reject;
      reader.readAsText(file);
    });
  };

  const extractTextFromPDF = async (file: File): Promise<string> => {
    // Use pdf.js library
    const pdfjsLib = await import("pdfjs-dist");

    // Set worker source to use the npm package worker
    // Next.js will serve this from node_modules via /_next/static
    pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
      "pdfjs-dist/build/pdf.worker.min.mjs",
      import.meta.url,
    ).toString();

    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;

    let fullText = "";

    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();
      const pageText = textContent.items
        .map((item) => ("str" in item ? item.str : ""))
        .join(" ");
      fullText += pageText + "\n";
    }

    return fullText.trim();
  };

  const extractTextFromWord = async (file: File): Promise<string> => {
    // Use mammoth library for Word documents
    const mammoth = await import("mammoth");

    const arrayBuffer = await file.arrayBuffer();
    const result = await mammoth.extractRawText({ arrayBuffer });

    return result.value.trim();
  };

  const _formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const formatProfileText = (text: string): React.ReactElement => {
    // Remove markdown formatting characters
    const cleaned = text
      .replace(/\*\*/g, "") // Remove bold markers
      .replace(/\*/g, "") // Remove italic markers
      .replace(/\#\#/g, "") // Remove heading markers
      .replace(/^- /gm, "") // Remove bullet point dashes at start of lines
      .replace(/^• /gm, ""); // Remove bullet points

    // Split into lines
    const lines = cleaned.split("\n");

    return (
      <>
        {lines.map((line, index) => {
          const trimmed = line.trim();

          // Skip empty lines
          if (!trimmed) return <br key={index} />;

          // Check if line is a heading (all caps, ends with colon, or specific keywords)
          const isHeading =
            (trimmed === trimmed.toUpperCase() && trimmed.length > 3) ||
            (trimmed.endsWith(":") && /^[A-Z]/.test(trimmed));

          if (isHeading) {
            return (
              <p
                key={index}
                style={{
                  fontSize: "14px",
                  fontWeight: 700,
                  color: "#003366",
                  marginBottom: "8px",
                  marginTop: index > 0 ? "16px" : 0,
                  fontFamily:
                    'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
                }}
              >
                {trimmed}
              </p>
            );
          }

          // Regular paragraph - treat former bullet points as regular text
          return (
            <p
              key={index}
              style={{
                fontSize: "14px",
                color: "#374151",
                marginBottom: "8px",
                fontFamily:
                  'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
                paddingLeft: "0",
              }}
            >
              {trimmed}
            </p>
          );
        })}
      </>
    );
  };

  const removeSample = (id: string) => {
    setSamples(samples.filter((s) => s.id !== id));
  };

  const handlePasteSubmit = async () => {
    if (!pasteText.trim()) return;

    setIsUploading(true);
    try {
      const response = await fetch("/api/content-center/samples", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${shopDomain}`,
        },
        body: JSON.stringify({
          sample_text: pasteText,
          sample_type: "other",
        }),
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success && data.data.sample) {
          const newSample: WritingSample = {
            id: data.data.sample.id,
            dbId: data.data.sample.id,
            name: pasteName.trim() || "Pasted Text",
            type: "TEXT",
            uploadDate: new Date().toLocaleDateString(),
            size: `${data.data.word_count} words`,
          };
          setSamples((prev) => [...prev, newSample]);
          setPasteText("");
          setPasteName("");
          setShowPasteDialog(false);
        }
      } else {
        const error = await response.json();
        alert(`Failed to save text: ${error.error}`);
      }
    } catch (error) {
      logger.error("Failed to save pasted text", error as Error, {
        component: "content-center-voice-page",
        operation: "savePastedText",
        shop: shopDomain,
      });
      alert("Failed to save text. Please try again.");
    } finally {
      setIsUploading(false);
    }
  };

  const handleUrlSubmit = async () => {
    if (!urlInput.trim()) return;

    const newSample: WritingSample = {
      id: Date.now().toString(),
      name: "Content from URL",
      type: "URL",
      uploadDate: new Date().toLocaleDateString(),
      size: "Processing...",
    };

    setSamples([...samples, newSample]);
    setUrlInput("");
    setShowUrlDialog(false);
  };

  // Loading state
  if (authLoading || isLoadingSamples) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-5xl">
        <div
          className="flex items-center justify-center"
          style={{ padding: "80px 0" }}
        >
          <Loader2
            className="h-8 w-8 animate-spin"
            style={{ color: "#0066cc" }}
          />
        </div>
      </div>
    );
  }

  // Not authenticated
  if (!isAuthenticated || !shopDomain) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-5xl">
        <div
          style={{
            background: "#fff5f5",
            border: "1px solid #fecaca",
            borderRadius: "8px",
            padding: "16px",
            display: "flex",
            alignItems: "flex-start",
            gap: "12px",
          }}
        >
          <AlertCircle
            className="h-5 w-5"
            style={{ color: "#dc2626", marginTop: "2px" }}
          />
          <div>
            <p
              style={{
                fontSize: "14px",
                fontWeight: 600,
                color: "#991b1b",
                marginBottom: "4px",
                fontFamily:
                  'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
              }}
            >
              Authentication Required
            </p>
            <p
              style={{
                fontSize: "14px",
                color: "#b91c1c",
                margin: 0,
                fontFamily:
                  'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
              }}
            >
              Please access this page from your Shopify admin.
            </p>
          </div>
        </div>
      </div>
    );
  }

  const cleanProfileText = (text: string): string => {
    // Remove markdown formatting characters for editing
    return text
      .replace(/\*\*/g, "") // Remove bold markers
      .replace(/\*/g, "") // Remove italic markers
      .replace(/\#\#/g, "") // Remove heading markers
      .replace(/^- /gm, "") // Remove bullet point dashes at start of lines
      .replace(/^• /gm, ""); // Remove bullet points
  };

  const handleEditProfile = () => {
    if (profile) {
      setEditedProfileText(cleanProfileText(profile.profile_text));
      setIsEditingProfile(true);
    }
  };

  const handleSaveProfile = async () => {
    if (!profile || !editedProfileText.trim()) return;

    setIsSavingProfile(true);
    try {
      const response = await fetch(`/api/content-center/voice/${profile.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${shopDomain}`,
        },
        body: JSON.stringify({
          profile_text: editedProfileText,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success && data.data.profile) {
          setProfile(data.data.profile);
          setIsEditingProfile(false);
          showToast("Brand voice profile updated successfully!");
        }
      } else {
        const error = await response.json();
        alert(`Failed to update profile: ${error.error}`);
      }
    } catch (error) {
      logger.error("Failed to update profile", error as Error, {
        component: "content-center-voice-page",
        operation: "saveProfileEdits",
        shop: shopDomain,
      });
      alert("Failed to update profile. Please try again.");
    } finally {
      setIsSavingProfile(false);
    }
  };

  const handleCancelEdit = () => {
    setIsEditingProfile(false);
    setEditedProfileText("");
  };

  const samplesNeeded = Math.max(0, 3 - samples.length);
  const _hasEnoughSamples = samples.length >= 3;

  return (
    <div className="container mx-auto px-4 py-8 max-w-5xl">
      {/* Header */}
      <div style={{ marginBottom: "32px" }}>
        <div
          className="flex items-center gap-3"
          style={{ marginBottom: "8px" }}
        >
          <div
            style={{
              background: "#f0f7ff",
              padding: "8px",
              borderRadius: "8px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <MessageSquare className="h-6 w-6" style={{ color: "#0066cc" }} />
          </div>
          <h1
            style={{
              fontSize: "32px",
              fontWeight: 700,
              color: "#003366",
              margin: 0,
              fontFamily:
                'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
            }}
          >
            Brand Voice Profile
          </h1>
        </div>
        <p
          style={{
            fontSize: "14px",
            color: "#6b7280",
            margin: 0,
            fontFamily:
              'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
          }}
        >
          Upload writing samples so AI can learn your brand's unique voice
        </p>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
        {/* Profile Status */}
        <div
          style={{
            background: "#ffffff",
            border: "1px solid #e5e7eb",
            borderRadius: "8px",
            boxShadow: "0 2px 8px rgba(0, 0, 0, 0.08)",
          }}
        >
          <div style={{ padding: "24px", borderBottom: "1px solid #e5e7eb" }}>
            <h3
              className="flex items-center"
              style={{
                gap: "12px",
                fontSize: "20px",
                fontWeight: 700,
                color: "#003366",
                margin: 0,
                fontFamily:
                  'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
              }}
            >
              {profile ? (
                <CheckCircle2
                  className="h-5 w-5"
                  style={{ color: "#16a34a" }}
                />
              ) : isGenerating ? (
                <Loader2
                  className="h-5 w-5 animate-spin"
                  style={{ color: "#0066cc" }}
                />
              ) : (
                <AlertCircle className="h-5 w-5" style={{ color: "#d97706" }} />
              )}
              Profile Status
            </h3>
          </div>
          <div style={{ padding: "24px" }}>
            {profile ? (
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "16px",
                }}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span
                      style={{
                        background: "#16a34a",
                        color: "#ffffff",
                        fontSize: "12px",
                        fontWeight: 600,
                        padding: "4px 12px",
                        borderRadius: "4px",
                        fontFamily:
                          'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
                      }}
                    >
                      Ready
                    </span>
                    <span
                      style={{
                        fontSize: "14px",
                        color: "#6b7280",
                        fontFamily:
                          'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
                      }}
                    >
                      Generated from {samples.length} samples on{" "}
                      {new Date(profile.generated_at).toLocaleDateString()}
                    </span>
                  </div>
                  {!isEditingProfile && (
                    <button
                      onClick={handleEditProfile}
                      style={{
                        background: "transparent",
                        border: "1px solid #e5e7eb",
                        borderRadius: "8px",
                        padding: "8px 16px",
                        fontSize: "14px",
                        fontWeight: 600,
                        color: "#003366",
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
                      Edit Profile
                    </button>
                  )}
                </div>
                {isEditingProfile ? (
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: "16px",
                    }}
                  >
                    <div>
                      <label
                        htmlFor="profile-text"
                        style={{
                          display: "block",
                          fontSize: "14px",
                          fontWeight: 600,
                          color: "#003366",
                          marginBottom: "8px",
                          fontFamily:
                            'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
                        }}
                      >
                        Brand Voice Profile
                      </label>
                      <textarea
                        id="profile-text"
                        rows={12}
                        value={editedProfileText}
                        onChange={(e) => setEditedProfileText(e.target.value)}
                        style={{
                          width: "100%",
                          padding: "12px",
                          border: "1px solid #e5e7eb",
                          borderRadius: "8px",
                          fontSize: "14px",
                          fontFamily:
                            'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
                          resize: "vertical",
                          outline: "none",
                          lineHeight: 1.6,
                        }}
                      />
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={handleSaveProfile}
                        disabled={isSavingProfile || !editedProfileText.trim()}
                        style={{
                          background:
                            isSavingProfile || !editedProfileText.trim()
                              ? "#9ca3af"
                              : "#0066cc",
                          color: "#ffffff",
                          border: "none",
                          borderRadius: "8px",
                          padding: "12px 24px",
                          fontSize: "14px",
                          fontWeight: 600,
                          fontFamily:
                            'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
                          cursor:
                            isSavingProfile || !editedProfileText.trim()
                              ? "not-allowed"
                              : "pointer",
                          transition: "all 0.15s ease",
                          display: "flex",
                          alignItems: "center",
                          gap: "8px",
                        }}
                        onMouseEnter={(e) => {
                          if (!isSavingProfile && editedProfileText.trim()) {
                            e.currentTarget.style.background = "#0052a3";
                          }
                        }}
                        onMouseLeave={(e) => {
                          if (!isSavingProfile && editedProfileText.trim()) {
                            e.currentTarget.style.background = "#0066cc";
                          }
                        }}
                      >
                        {isSavingProfile ? (
                          <>
                            <Loader2 className="h-4 w-4 animate-spin" />
                            Saving...
                          </>
                        ) : (
                          "Save Changes"
                        )}
                      </button>
                      <button
                        onClick={handleCancelEdit}
                        disabled={isSavingProfile}
                        style={{
                          background: "transparent",
                          border: "1px solid #e5e7eb",
                          borderRadius: "8px",
                          padding: "12px 24px",
                          fontSize: "14px",
                          fontWeight: 600,
                          color: "#003366",
                          fontFamily:
                            'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
                          cursor: isSavingProfile ? "not-allowed" : "pointer",
                          transition: "all 0.15s ease",
                        }}
                        onMouseEnter={(e) => {
                          if (!isSavingProfile) {
                            e.currentTarget.style.background = "#f9fafb";
                          }
                        }}
                        onMouseLeave={(e) => {
                          if (!isSavingProfile) {
                            e.currentTarget.style.background = "transparent";
                          }
                        }}
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <div
                    style={{
                      background: "#f9fafb",
                      padding: "16px",
                      borderRadius: "8px",
                    }}
                  >
                    <p
                      style={{
                        fontSize: "14px",
                        fontWeight: 600,
                        color: "#003366",
                        marginBottom: "12px",
                        fontFamily:
                          'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
                      }}
                    >
                      Your Brand Voice:
                    </p>
                    <div style={{ lineHeight: 1.6 }}>
                      {formatProfileText(profile.profile_text)}
                    </div>
                  </div>
                )}
              </div>
            ) : isGenerating ? (
              <div
                className="flex items-center gap-3"
                style={{ color: "#0066cc" }}
              >
                <Loader2 className="h-5 w-5 animate-spin" />
                <span
                  style={{
                    fontSize: "14px",
                    fontWeight: 600,
                    fontFamily:
                      'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
                  }}
                >
                  Analyzing your writing samples and generating brand voice
                  profile...
                </span>
              </div>
            ) : (
              <div>
                <p
                  style={{
                    fontSize: "14px",
                    color: "#374151",
                    marginBottom: "8px",
                    fontFamily:
                      'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
                  }}
                >
                  {samplesNeeded > 0 ? (
                    <>
                      Upload{" "}
                      <strong>
                        {samplesNeeded} more sample
                        {samplesNeeded > 1 ? "s" : ""}
                      </strong>{" "}
                      to generate your brand voice profile.
                    </>
                  ) : (
                    <>
                      You have enough samples! Profile will generate
                      automatically.
                    </>
                  )}
                </p>
                <p
                  style={{
                    fontSize: "12px",
                    color: "#6b7280",
                    margin: 0,
                    fontFamily:
                      'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
                  }}
                >
                  Minimum 3 samples required • Current: {samples.length}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Writing Samples Section */}
        <div style={{ marginBottom: "32px" }}>
          <div
            className="flex items-center gap-3"
            style={{ marginBottom: "24px" }}
          >
            <div
              style={{
                background: "#f0f7ff",
                padding: "8px",
                borderRadius: "8px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <FileText className="h-6 w-6" style={{ color: "#0066cc" }} />
            </div>
            <div>
              <h2
                style={{
                  fontSize: "24px",
                  fontWeight: 700,
                  color: "#003366",
                  margin: 0,
                  fontFamily:
                    'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
                }}
              >
                Writing Samples
              </h2>
              <p
                style={{
                  fontSize: "14px",
                  color: "#6b7280",
                  margin: 0,
                  fontFamily:
                    'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
                }}
              >
                Upload examples to train the AI on your unique style
              </p>
            </div>
          </div>

          {/* Info Alert */}
          <div
            style={{
              background: "#eff6ff",
              border: "1px solid #bfdbfe",
              borderRadius: "8px",
              padding: "16px",
              marginBottom: "24px",
              display: "flex",
              alignItems: "flex-start",
              gap: "12px",
            }}
          >
            <Sparkles
              className="h-5 w-5"
              style={{ color: "#0066cc", marginTop: "2px" }}
            />
            <div>
              <p
                style={{
                  fontSize: "14px",
                  fontWeight: 600,
                  color: "#1e3a8a",
                  marginBottom: "4px",
                  fontFamily:
                    'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
                }}
              >
                Why upload samples?
              </p>
              <p
                style={{
                  fontSize: "14px",
                  color: "#1e40af",
                  margin: 0,
                  fontFamily:
                    'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
                }}
              >
                The AI learns from your existing content to generate new posts
                that match your brand's authentic voice
              </p>
            </div>
          </div>

          {/* Uploaded Samples - Shown First */}
          {samples.length > 0 && (
            <div
              style={{
                background: "#ffffff",
                border: "1px solid #e5e7eb",
                borderRadius: "8px",
                boxShadow: "0 2px 8px rgba(0, 0, 0, 0.08)",
                marginBottom: "24px",
              }}
            >
              <div
                style={{ padding: "24px", borderBottom: "1px solid #e5e7eb" }}
              >
                <h3
                  style={{
                    fontSize: "20px",
                    fontWeight: 700,
                    color: "#003366",
                    marginBottom: "4px",
                    fontFamily:
                      'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
                  }}
                >
                  Your Samples ({samples.length})
                </h3>
                <p
                  style={{
                    fontSize: "14px",
                    color: "#6b7280",
                    margin: 0,
                    fontFamily:
                      'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
                  }}
                >
                  These samples are used to train the AI on your brand voice
                </p>
              </div>
              <div style={{ padding: "24px" }}>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns:
                      "repeat(auto-fill, minmax(300px, 1fr))",
                    gap: "16px",
                  }}
                >
                  {samples.map((sample) => (
                    <div
                      key={sample.id}
                      style={{
                        padding: "16px",
                        border: "1px solid #e5e7eb",
                        borderRadius: "8px",
                        background: "#ffffff",
                        transition: "background 0.15s ease",
                        display: "flex",
                        flexDirection: "column",
                        gap: "12px",
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = "#f9fafb";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = "#ffffff";
                      }}
                    >
                      <div className="flex items-start gap-3">
                        <FileText
                          className="h-5 w-5"
                          style={{
                            color: "#0066cc",
                            flexShrink: 0,
                            marginTop: "2px",
                          }}
                        />
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <p
                            style={{
                              fontSize: "14px",
                              fontWeight: 600,
                              color: "#003366",
                              marginBottom: "4px",
                              fontFamily:
                                'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                              whiteSpace: "nowrap",
                            }}
                          >
                            {sample.name}
                          </p>
                          <p
                            style={{
                              fontSize: "12px",
                              color: "#6b7280",
                              margin: 0,
                              fontFamily:
                                'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
                            }}
                          >
                            {sample.type}
                          </p>
                          <p
                            style={{
                              fontSize: "12px",
                              color: "#6b7280",
                              margin: 0,
                              fontFamily:
                                'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
                            }}
                          >
                            {sample.size}
                          </p>
                          <p
                            style={{
                              fontSize: "12px",
                              color: "#6b7280",
                              margin: 0,
                              fontFamily:
                                'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
                            }}
                          >
                            {sample.uploadDate}
                          </p>
                        </div>
                        <button
                          onClick={() => removeSample(sample.id)}
                          style={{
                            background: "transparent",
                            border: "none",
                            padding: "4px",
                            cursor: "pointer",
                            borderRadius: "4px",
                            transition: "background 0.15s ease",
                            flexShrink: 0,
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.background = "#f3f4f6";
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.background = "transparent";
                          }}
                        >
                          <X className="h-4 w-4" style={{ color: "#6b7280" }} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Upload Area */}
          <div
            style={{
              background: "#ffffff",
              border: "1px solid #e5e7eb",
              borderRadius: "8px",
              boxShadow: "0 2px 8px rgba(0, 0, 0, 0.08)",
              marginBottom: "24px",
            }}
          >
            <div style={{ padding: "24px", borderBottom: "1px solid #e5e7eb" }}>
              <h3
                style={{
                  fontSize: "20px",
                  fontWeight: 700,
                  color: "#003366",
                  marginBottom: "4px",
                  fontFamily:
                    'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
                }}
              >
                Upload Samples
              </h3>
              <p
                style={{
                  fontSize: "14px",
                  color: "#6b7280",
                  margin: 0,
                  fontFamily:
                    'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
                }}
              >
                Drag and drop files or click to browse
              </p>
            </div>
            <div style={{ padding: "24px" }}>
              <div
                style={{
                  border: isDragging
                    ? "2px dashed #0066cc"
                    : "2px dashed #d1d5db",
                  borderRadius: "8px",
                  padding: "24px",
                  textAlign: "center",
                  transition: "all 0.15s ease",
                  background: isDragging ? "#eff6ff" : "#ffffff",
                  cursor: "pointer",
                }}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => document.getElementById("file-upload")?.click()}
                onMouseEnter={(e) => {
                  if (!isDragging) {
                    e.currentTarget.style.borderColor = "#60a5fa";
                    e.currentTarget.style.background = "#eff6ff";
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isDragging) {
                    e.currentTarget.style.borderColor = "#d1d5db";
                    e.currentTarget.style.background = "#ffffff";
                  }
                }}
              >
                <Upload
                  className="h-10 w-10 mx-auto"
                  style={{ color: "#9ca3af", marginBottom: "12px" }}
                />
                <p
                  style={{
                    fontSize: "14px",
                    fontWeight: 600,
                    color: "#003366",
                    marginBottom: "6px",
                    fontFamily:
                      'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
                  }}
                >
                  Drop files here or click to upload
                </p>
                <p
                  style={{
                    fontSize: "13px",
                    color: "#6b7280",
                    marginBottom: "4px",
                    fontFamily:
                      'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
                  }}
                >
                  Supported formats: PDF, DOCX, TXT
                </p>
                <p
                  style={{
                    fontSize: "12px",
                    color: "#9ca3af",
                    margin: 0,
                    fontFamily:
                      'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
                  }}
                >
                  For Google Docs: File → Download → Plain Text (.txt) • Max
                  10MB
                </p>

                <input
                  id="file-upload"
                  type="file"
                  multiple
                  accept=".pdf,.docx,.txt"
                  className="hidden"
                  onChange={handleFileSelect}
                />
              </div>

              <div className="flex gap-2" style={{ marginTop: "16px" }}>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowPasteDialog(true);
                  }}
                  style={{
                    flex: 1,
                    background: "transparent",
                    border: "1px solid #e5e7eb",
                    borderRadius: "8px",
                    padding: "12px 16px",
                    fontSize: "14px",
                    fontWeight: 600,
                    color: "#003366",
                    fontFamily:
                      'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
                    cursor: "pointer",
                    transition: "all 0.15s ease",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "8px",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = "#f9fafb";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = "transparent";
                  }}
                >
                  <FileText className="h-4 w-4" />
                  Paste Text
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowUrlDialog(true);
                  }}
                  style={{
                    flex: 1,
                    background: "transparent",
                    border: "1px solid #e5e7eb",
                    borderRadius: "8px",
                    padding: "12px 16px",
                    fontSize: "14px",
                    fontWeight: 600,
                    color: "#003366",
                    fontFamily:
                      'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
                    cursor: "pointer",
                    transition: "all 0.15s ease",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "8px",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = "#f9fafb";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = "transparent";
                  }}
                >
                  <Download className="h-4 w-4" />
                  Import from URL
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Paste Text Dialog */}
      <Dialog open={showPasteDialog} onOpenChange={setShowPasteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Paste Text Sample</DialogTitle>
            <DialogDescription>
              Paste your content below to add it as a writing sample
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="sample-name">Sample Name (Optional)</Label>
              <Input
                id="sample-name"
                placeholder="e.g., Instagram caption for summer collection"
                value={pasteName}
                onChange={(e) => setPasteName(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="sample-text">Content</Label>
              <Textarea
                id="sample-text"
                placeholder="Paste your content here..."
                rows={10}
                value={pasteText}
                onChange={(e) => setPasteText(e.target.value)}
              />
              <p className="text-xs text-gray-500 mt-1">
                {pasteText.length} characters
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPasteDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handlePasteSubmit} disabled={!pasteText.trim()}>
              Add Sample
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Import from URL Dialog */}
      <Dialog open={showUrlDialog} onOpenChange={setShowUrlDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Import from URL</DialogTitle>
            <DialogDescription>
              Enter a URL to import content as a writing sample
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="url-input">URL</Label>
              <div className="flex gap-2">
                <LinkIcon className="h-4 w-4 text-gray-400 mt-3" />
                <Input
                  id="url-input"
                  type="url"
                  placeholder="https://example.com/blog-post"
                  value={urlInput}
                  onChange={(e) => setUrlInput(e.target.value)}
                />
              </div>
              <p className="text-xs text-gray-500 mt-2">
                We'll extract the text content from this URL
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowUrlDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleUrlSubmit} disabled={!urlInput.trim()}>
              Import Content
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Success Toast - Bottom Right */}
      {showSuccessToast && (
        <div className="fixed bottom-8 right-8 z-50 animate-in slide-in-from-bottom-5 duration-300">
          <div
            style={{
              background: "#16a34a",
              color: "#ffffff",
              padding: "16px 24px",
              borderRadius: "8px",
              boxShadow: "0 4px 12px rgba(0, 0, 0, 0.15)",
              display: "flex",
              alignItems: "center",
              gap: "12px",
              minWidth: "300px",
            }}
          >
            <CheckCircle2 className="h-5 w-5 flex-shrink-0" />
            <div>
              <p
                style={{
                  fontSize: "14px",
                  fontWeight: 700,
                  marginBottom: "4px",
                  fontFamily:
                    'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
                }}
              >
                Success!
              </p>
              <p
                style={{
                  fontSize: "14px",
                  color: "#dcfce7",
                  margin: 0,
                  fontFamily:
                    'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
                }}
              >
                {toastMessage}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Uploading Overlay */}
      {isUploading && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center"
          style={{ background: "rgba(0, 0, 0, 0.5)" }}
        >
          <div
            style={{
              background: "#ffffff",
              borderRadius: "8px",
              padding: "24px",
              display: "flex",
              alignItems: "center",
              gap: "12px",
            }}
          >
            <Loader2
              className="h-6 w-6 animate-spin"
              style={{ color: "#0066cc" }}
            />
            <span
              style={{
                fontSize: "14px",
                fontWeight: 600,
                fontFamily:
                  'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
              }}
            >
              Uploading samples...
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
