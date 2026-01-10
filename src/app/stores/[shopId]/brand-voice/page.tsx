/* eslint-disable react/no-unescaped-entities */
/* eslint-disable security/detect-object-injection */
"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { logger } from "@/lib/logger";
import { useShop } from "@/hooks/useShop";
import { ContentLoader } from "@/components/ui/loading/ContentLoader";
import type { ContentSample, BrandVoiceProfile } from "@/types/content-center";
import {
  Trash2,
  Loader2,
  FileText,
  AlertCircle,
  Upload,
  X,
  CheckCircle2,
  Sparkles,
  MessageSquare,
  ChevronDown,
  ChevronUp,
  Settings2,
  Download,
  Link as LinkIcon,
  RefreshCw,
} from "lucide-react";

// ============================================================================
// Types
// ============================================================================

interface ToneSliders {
  playfulSerious: number;
  casualElevated: number;
  trendyClassic: number;
  friendlyProfessional: number;
  simpleDetailed: number;
  boldSoft: number;
}

interface VoiceVocabulary {
  preferred: string[];
  avoided: string[];
}

interface BrandVoiceSettings {
  voiceTone: string;
  voiceStyle: string;
  voicePersonality: string;
  voiceVocabulary: VoiceVocabulary;
  toneSliders: ToneSliders;
  customerTerm: string;
  signatureSentence: string;
  valuePillars: string[];
  audienceDescription: string;
  writingSamples: string;
}

interface WritingSample {
  id: string;
  name: string;
  type: string;
  uploadDate: string;
  size: string;
  dbId?: string;
}

const defaultSettings: BrandVoiceSettings = {
  voiceTone: "",
  voiceStyle: "",
  voicePersonality: "",
  voiceVocabulary: { preferred: [], avoided: [] },
  toneSliders: {
    playfulSerious: 3,
    casualElevated: 3,
    trendyClassic: 3,
    friendlyProfessional: 3,
    simpleDetailed: 3,
    boldSoft: 3,
  },
  customerTerm: "",
  signatureSentence: "",
  valuePillars: [],
  audienceDescription: "",
  writingSamples: "",
};

// ============================================================================
// Main Component
// ============================================================================

export default function UnifiedBrandVoicePage() {
  const router = useRouter();
  const { shop, shopId, isLoading: shopLoading } = useShop();

  // Profile state
  const [profile, setProfile] = useState<BrandVoiceProfile | null>(null);
  const [isLoadingProfile, setIsLoadingProfile] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [editedProfileText, setEditedProfileText] = useState("");
  const [isSavingProfile, setIsSavingProfile] = useState(false);

  // Samples state
  const [samples, setSamples] = useState<WritingSample[]>([]);
  const [isLoadingSamples, setIsLoadingSamples] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [showPasteDialog, setShowPasteDialog] = useState(false);
  const [showUrlDialog, setShowUrlDialog] = useState(false);
  const [pasteText, setPasteText] = useState("");
  const [pasteName, setPasteName] = useState("");
  const [urlInput, setUrlInput] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Settings state (for fine-tuning)
  const [settings, setSettings] = useState<BrandVoiceSettings>(defaultSettings);
  const [originalSettings, setOriginalSettings] =
    useState<BrandVoiceSettings>(defaultSettings);
  const [isLoadingSettings, setIsLoadingSettings] = useState(true);
  const [isSavingSettings, setIsSavingSettings] = useState(false);
  const [isFineTuningOpen, setIsFineTuningOpen] = useState(false);

  // Vocabulary inputs
  const [newPreferredWord, setNewPreferredWord] = useState("");
  const [newAvoidedWord, setNewAvoidedWord] = useState("");
  const [newValuePillar, setNewValuePillar] = useState("");

  // Feedback
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Delete modal
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [sampleToDelete, setSampleToDelete] = useState<WritingSample | null>(
    null
  );

  const hasSettingsChanges =
    JSON.stringify(settings) !== JSON.stringify(originalSettings);

  // ============================================================================
  // Load Data
  // ============================================================================

  // Load voice profile
  const loadProfile = useCallback(async () => {
    if (!shop) return;
    try {
      const response = await fetch("/api/content-center/voice", {
        headers: { Authorization: `Bearer ${shop}` },
      });
      if (response.ok) {
        const data = await response.json();
        if (data.success && data.data.profile) {
          setProfile(data.data.profile);
        }
      }
    } catch (err) {
      logger.error("Failed to load profile", err as Error, {
        component: "brand-voice-unified",
      });
    } finally {
      setIsLoadingProfile(false);
    }
  }, [shop]);

  // Load samples
  const loadSamples = useCallback(async () => {
    if (!shop) return;
    try {
      const response = await fetch("/api/content-center/samples", {
        headers: { Authorization: `Bearer ${shop}` },
      });
      if (response.ok) {
        const data = await response.json();
        if (data.success && data.data.samples) {
          const uiSamples: WritingSample[] = data.data.samples.map(
            (s: ContentSample) => {
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
            }
          );
          setSamples(uiSamples);
        }
      }
    } catch (err) {
      logger.error("Failed to load samples", err as Error, {
        component: "brand-voice-unified",
      });
    } finally {
      setIsLoadingSamples(false);
    }
  }, [shop]);

  // Load settings
  const loadSettings = useCallback(async () => {
    if (!shop) return;
    try {
      const response = await fetch("/api/business-profile/settings", {
        headers: { Authorization: `Bearer ${shop}` },
      });
      if (response.ok) {
        const data = await response.json();
        if (data.success && data.data.settings) {
          setSettings(data.data.settings);
          setOriginalSettings(data.data.settings);
        }
      }
    } catch (err) {
      logger.error("Error loading settings:", err as Error, {
        component: "brand-voice-unified",
      });
    } finally {
      setIsLoadingSettings(false);
    }
  }, [shop]);

  useEffect(() => {
    if (shop) {
      loadProfile();
      loadSamples();
      loadSettings();
    }
  }, [shop, loadProfile, loadSamples, loadSettings]);

  // Auto-generate profile when we have 3+ samples and no profile exists
  useEffect(() => {
    if (samples.length >= 3 && !profile && !isGenerating && !isLoadingProfile) {
      generateProfile();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [samples.length, profile, isLoadingProfile]);

  // ============================================================================
  // Profile Actions
  // ============================================================================

  const generateProfile = async () => {
    if (isGenerating || !shop) return;
    setIsGenerating(true);
    setError(null);

    try {
      const response = await fetch("/api/content-center/voice/generate", {
        method: "POST",
        headers: { Authorization: `Bearer ${shop}` },
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success && data.data.profile) {
          setProfile(data.data.profile);
          showSuccess("Brand voice profile generated successfully!");
        }
      } else {
        const err = await response.json();
        setError(err.error || "Failed to generate profile");
      }
    } catch (err) {
      logger.error("Failed to generate profile", err as Error, {
        component: "brand-voice-unified",
      });
      setError("Failed to generate profile");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleEditProfile = () => {
    if (profile) {
      setEditedProfileText(cleanProfileText(profile.profile_text));
      setIsEditingProfile(true);
    }
  };

  const handleSaveProfile = async () => {
    if (!profile || !editedProfileText.trim() || !shop) return;

    setIsSavingProfile(true);
    try {
      const response = await fetch(`/api/content-center/voice/${profile.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${shop}`,
        },
        body: JSON.stringify({ profile_text: editedProfileText }),
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success && data.data.profile) {
          setProfile(data.data.profile);
          setIsEditingProfile(false);
          showSuccess("Brand voice profile updated successfully!");
        }
      } else {
        const err = await response.json();
        setError(err.error || "Failed to update profile");
      }
    } catch (err) {
      logger.error("Failed to update profile", err as Error, {
        component: "brand-voice-unified",
      });
      setError("Failed to update profile");
    } finally {
      setIsSavingProfile(false);
    }
  };

  const handleCancelEdit = () => {
    setIsEditingProfile(false);
    setEditedProfileText("");
  };

  const handleRegenerate = async () => {
    if (samples.length < 3) {
      setError("Need at least 3 writing samples to regenerate profile");
      return;
    }
    await generateProfile();
  };

  // ============================================================================
  // Sample Actions
  // ============================================================================

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
    e.target.value = "";
  };

  const processFiles = async (files: File[]) => {
    if (!shop) return;
    setIsUploading(true);
    setError(null);

    for (const file of files) {
      const extension = file.name.toLowerCase().split(".").pop();

      if (extension === "doc") {
        setError(
          `File "${file.name}" uses legacy .doc format. Please save as .docx or .txt.`
        );
        continue;
      }

      const isValidType = ["txt", "pdf", "docx"].includes(extension || "");
      const isValidSize = file.size <= 10 * 1024 * 1024;

      if (!isValidType) {
        setError(
          `File "${file.name}" is not supported. Use PDF, DOCX, or TXT.`
        );
        continue;
      }

      if (!isValidSize) {
        setError(`File "${file.name}" is too large. Maximum 10MB.`);
        continue;
      }

      try {
        let text: string;

        if (extension === "txt") {
          text = await readFileAsText(file);
        } else if (extension === "pdf") {
          text = await extractTextFromPDF(file);
        } else if (extension === "docx") {
          text = await extractTextFromWord(file);
        } else {
          continue;
        }

        if (!text || text.trim().length < 100) {
          setError(
            `File "${file.name}" doesn't have enough text. Minimum 100 characters.`
          );
          continue;
        }

        const response = await fetch("/api/content-center/samples", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${shop}`,
          },
          body: JSON.stringify({ sample_text: text, sample_type: "other" }),
        });

        if (response.ok) {
          const data = await response.json();
          if (data.success && data.data.sample) {
            const newSample: WritingSample = {
              id: data.data.sample.id,
              dbId: data.data.sample.id,
              name: file.name,
              type: extension?.toUpperCase() || "FILE",
              uploadDate: new Date().toLocaleDateString(),
              size: `${data.data.word_count} words`,
            };
            setSamples((prev) => [...prev, newSample]);
          }
        } else {
          const err = await response.json();
          setError(`Failed to upload "${file.name}": ${err.error}`);
        }
      } catch (err) {
        logger.error("Error processing file", err as Error, {
          component: "brand-voice-unified",
          fileName: file.name,
        });
        setError(`Failed to process "${file.name}"`);
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
    const pdfjsLib = await import("pdfjs-dist");
    pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
      "pdfjs-dist/build/pdf.worker.min.mjs",
      import.meta.url
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
    const mammoth = await import("mammoth");
    const arrayBuffer = await file.arrayBuffer();
    const result = await mammoth.extractRawText({ arrayBuffer });
    return result.value.trim();
  };

  const handlePasteSubmit = async () => {
    if (!pasteText.trim() || !shop) return;

    setIsUploading(true);
    try {
      const response = await fetch("/api/content-center/samples", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${shop}`,
        },
        body: JSON.stringify({ sample_text: pasteText, sample_type: "other" }),
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
        const err = await response.json();
        setError(err.error || "Failed to save text");
      }
    } catch (err) {
      logger.error("Failed to save pasted text", err as Error, {
        component: "brand-voice-unified",
      });
      setError("Failed to save text");
    } finally {
      setIsUploading(false);
    }
  };

  const handleUrlSubmit = async () => {
    if (!urlInput.trim()) return;
    // TODO: Implement URL fetching
    setShowUrlDialog(false);
    setUrlInput("");
  };

  const confirmDeleteSample = (sample: WritingSample) => {
    setSampleToDelete(sample);
    setDeleteModalOpen(true);
  };

  const handleDeleteSample = async () => {
    if (!shop || !sampleToDelete) return;

    try {
      const response = await fetch(
        `/api/content-center/samples/${sampleToDelete.id}`,
        {
          method: "DELETE",
          headers: { Authorization: `Bearer ${shop}` },
        }
      );

      if (response.ok) {
        setSamples((prev) => prev.filter((s) => s.id !== sampleToDelete.id));
        showSuccess("Sample deleted successfully!");
      } else {
        const err = await response.json();
        setError(err.error || "Failed to delete sample");
      }
    } catch (err) {
      logger.error("Delete error:", err as Error, {
        component: "brand-voice-unified",
      });
      setError("Failed to delete sample");
    } finally {
      setDeleteModalOpen(false);
      setSampleToDelete(null);
    }
  };

  // ============================================================================
  // Settings Actions
  // ============================================================================

  const handleSaveSettings = async () => {
    if (!shop) return;

    setIsSavingSettings(true);
    setError(null);

    try {
      const response = await fetch("/api/business-profile/settings", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${shop}`,
        },
        body: JSON.stringify({ settings }),
      });

      if (response.ok) {
        setOriginalSettings(settings);
        showSuccess("Voice settings saved successfully!");
      } else {
        const data = await response.json();
        setError(data.error || "Failed to save settings");
      }
    } catch (err) {
      logger.error("Error saving settings:", err as Error, {
        component: "brand-voice-unified",
      });
      setError("Failed to save settings");
    } finally {
      setIsSavingSettings(false);
    }
  };

  const handleSliderChange = useCallback(
    (key: keyof ToneSliders, value: number[]) => {
      setSettings((prev) => ({
        ...prev,
        toneSliders: { ...prev.toneSliders, [key]: value[0] },
      }));
    },
    []
  );

  const addPreferredWord = () => {
    if (
      newPreferredWord.trim() &&
      !settings.voiceVocabulary.preferred.includes(newPreferredWord.trim())
    ) {
      setSettings((prev) => ({
        ...prev,
        voiceVocabulary: {
          ...prev.voiceVocabulary,
          preferred: [...prev.voiceVocabulary.preferred, newPreferredWord.trim()],
        },
      }));
      setNewPreferredWord("");
    }
  };

  const removePreferredWord = (word: string) => {
    setSettings((prev) => ({
      ...prev,
      voiceVocabulary: {
        ...prev.voiceVocabulary,
        preferred: prev.voiceVocabulary.preferred.filter((w) => w !== word),
      },
    }));
  };

  const addAvoidedWord = () => {
    if (
      newAvoidedWord.trim() &&
      !settings.voiceVocabulary.avoided.includes(newAvoidedWord.trim())
    ) {
      setSettings((prev) => ({
        ...prev,
        voiceVocabulary: {
          ...prev.voiceVocabulary,
          avoided: [...prev.voiceVocabulary.avoided, newAvoidedWord.trim()],
        },
      }));
      setNewAvoidedWord("");
    }
  };

  const removeAvoidedWord = (word: string) => {
    setSettings((prev) => ({
      ...prev,
      voiceVocabulary: {
        ...prev.voiceVocabulary,
        avoided: prev.voiceVocabulary.avoided.filter((w) => w !== word),
      },
    }));
  };

  const addValuePillar = () => {
    if (
      newValuePillar.trim() &&
      !settings.valuePillars.includes(newValuePillar.trim())
    ) {
      setSettings((prev) => ({
        ...prev,
        valuePillars: [...prev.valuePillars, newValuePillar.trim()],
      }));
      setNewValuePillar("");
    }
  };

  const removeValuePillar = (pillar: string) => {
    setSettings((prev) => ({
      ...prev,
      valuePillars: prev.valuePillars.filter((p) => p !== pillar),
    }));
  };

  // ============================================================================
  // Helpers
  // ============================================================================

  const showSuccess = (message: string) => {
    setSuccess(message);
    setTimeout(() => setSuccess(null), 3000);
  };

  const cleanProfileText = (text: string): string => {
    return text
      .replace(/\*\*/g, "")
      .replace(/\*/g, "")
      .replace(/\#\#/g, "")
      .replace(/^- /gm, "")
      .replace(/^• /gm, "");
  };

  const formatProfileText = (text: string): React.ReactElement => {
    const cleaned = cleanProfileText(text);
    const lines = cleaned.split("\n");

    return (
      <>
        {lines.map((line, index) => {
          const trimmed = line.trim();
          if (!trimmed) return <br key={index} />;

          const isHeading =
            (trimmed === trimmed.toUpperCase() && trimmed.length > 3) ||
            (trimmed.endsWith(":") && /^[A-Z]/.test(trimmed));

          if (isHeading) {
            return (
              <p
                key={index}
                className="text-sm font-bold text-[#003366] mb-2"
                style={{ marginTop: index > 0 ? "16px" : 0 }}
              >
                {trimmed}
              </p>
            );
          }

          return (
            <p key={index} className="text-sm text-gray-700 mb-2">
              {trimmed}
            </p>
          );
        })}
      </>
    );
  };

  const ToneSlider = ({
    label,
    leftLabel,
    rightLabel,
    sliderKey,
  }: {
    label: string;
    leftLabel: string;
    rightLabel: string;
    sliderKey: keyof ToneSliders;
  }) => (
    <div className="space-y-3 pb-4">
      <Label className="text-base font-semibold">{label}</Label>
      <div className="flex items-center justify-between text-sm text-muted-foreground mb-2">
        <span>{leftLabel}</span>
        <span>{rightLabel}</span>
      </div>
      <Slider
        value={[settings.toneSliders[sliderKey]]}
        min={1}
        max={5}
        step={1}
        onValueChange={(value) => handleSliderChange(sliderKey, value)}
        className="w-full"
      />
    </div>
  );

  const samplesNeeded = Math.max(0, 3 - samples.length);
  const isLoading = shopLoading || isLoadingProfile || isLoadingSamples || isLoadingSettings;

  // ============================================================================
  // Render
  // ============================================================================

  if (isLoading) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardContent className="flex items-center justify-center py-16">
            <ContentLoader message="Loading Brand Voice..." />
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6 max-w-5xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="bg-blue-50 p-2 rounded-lg">
            <MessageSquare className="h-6 w-6 text-blue-600" />
          </div>
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-[#003366]">
              Brand Voice
            </h1>
            <p className="text-muted-foreground">
              Train AI to write in your unique brand style
            </p>
          </div>
        </div>
      </div>

      {/* Alerts */}
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {success && (
        <Alert className="bg-green-50 border-green-200">
          <CheckCircle2 className="h-4 w-4 text-green-600" />
          <AlertTitle className="text-green-800">Success</AlertTitle>
          <AlertDescription className="text-green-700">
            {success}
          </AlertDescription>
        </Alert>
      )}

      {/* Profile Status Card */}
      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {profile ? (
                <CheckCircle2 className="h-5 w-5 text-green-600" />
              ) : isGenerating ? (
                <Loader2 className="h-5 w-5 animate-spin text-blue-600" />
              ) : (
                <AlertCircle className="h-5 w-5 text-amber-500" />
              )}
              <CardTitle className="text-xl">Profile Status</CardTitle>
            </div>
            {profile && !isEditingProfile && (
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={handleEditProfile}>
                  Edit Profile
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleRegenerate}
                  disabled={isGenerating || samples.length < 3}
                >
                  {isGenerating ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <RefreshCw className="h-4 w-4 mr-2" />
                  )}
                  Regenerate
                </Button>
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {profile ? (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Badge className="bg-green-600">Ready</Badge>
                <span className="text-sm text-muted-foreground">
                  Generated from {samples.length} samples on{" "}
                  {new Date(profile.generated_at).toLocaleDateString()}
                </span>
              </div>

              {isEditingProfile ? (
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="profile-text" className="font-semibold">
                      Brand Voice Profile
                    </Label>
                    <Textarea
                      id="profile-text"
                      rows={12}
                      value={editedProfileText}
                      onChange={(e) => setEditedProfileText(e.target.value)}
                      className="mt-2"
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button
                      onClick={handleSaveProfile}
                      disabled={isSavingProfile || !editedProfileText.trim()}
                    >
                      {isSavingProfile ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin mr-2" />
                          Saving...
                        </>
                      ) : (
                        "Save Changes"
                      )}
                    </Button>
                    <Button
                      variant="outline"
                      onClick={handleCancelEdit}
                      disabled={isSavingProfile}
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="bg-gray-50 p-4 rounded-lg">
                  <p className="text-sm font-semibold text-[#003366] mb-3">
                    Your Brand Voice:
                  </p>
                  <div className="leading-relaxed">
                    {formatProfileText(profile.profile_text)}
                  </div>
                </div>
              )}
            </div>
          ) : isGenerating ? (
            <div className="flex items-center gap-3 text-blue-600">
              <Loader2 className="h-5 w-5 animate-spin" />
              <span className="text-sm font-semibold">
                Analyzing your writing samples and generating brand voice
                profile...
              </span>
            </div>
          ) : (
            <div>
              <p className="text-sm text-gray-700 mb-2">
                {samplesNeeded > 0 ? (
                  <>
                    Upload{" "}
                    <strong>
                      {samplesNeeded} more sample{samplesNeeded > 1 ? "s" : ""}
                    </strong>{" "}
                    to generate your brand voice profile.
                  </>
                ) : (
                  "You have enough samples! Profile will generate automatically."
                )}
              </p>
              <p className="text-xs text-muted-foreground">
                Minimum 3 samples required - Current: {samples.length}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Writing Samples Section */}
      <Card className="border-0 shadow-sm">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="bg-blue-50 p-2 rounded-lg">
              <FileText className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <CardTitle className="text-xl">Writing Samples</CardTitle>
              <CardDescription>
                Upload examples to train AI on your unique style
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Info Alert */}
          <Alert className="bg-blue-50 border-blue-200">
            <Sparkles className="h-4 w-4 text-blue-600" />
            <AlertTitle className="text-blue-800">Why upload samples?</AlertTitle>
            <AlertDescription className="text-blue-700">
              AI learns from your existing content to generate new posts that
              match your brand's authentic voice
            </AlertDescription>
          </Alert>

          {/* Existing Samples */}
          {samples.length > 0 && (
            <div className="space-y-3">
              <h4 className="font-semibold text-[#003366]">
                Your Samples ({samples.length})
              </h4>
              <div className="grid gap-3 md:grid-cols-2">
                {samples.map((sample) => (
                  <div
                    key={sample.id}
                    className="flex items-start gap-3 p-4 border rounded-lg bg-white hover:bg-gray-50 transition-colors"
                  >
                    <FileText className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm text-[#003366] truncate">
                        {sample.name}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {sample.type} - {sample.size}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {sample.uploadDate}
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => confirmDeleteSample(sample)}
                      className="flex-shrink-0"
                    >
                      <X className="h-4 w-4 text-gray-400 hover:text-red-500" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Upload Area */}
          <div
            className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors cursor-pointer ${
              isDragging
                ? "border-blue-600 bg-blue-50"
                : "border-gray-300 hover:border-blue-400 hover:bg-blue-50"
            }`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
          >
            <Upload className="h-10 w-10 mx-auto mb-3 text-gray-400" />
            <p className="text-sm font-medium text-[#003366] mb-1">
              Drop files here or click to upload
            </p>
            <p className="text-xs text-muted-foreground mb-1">
              Supported formats: PDF, DOCX, TXT
            </p>
            <p className="text-xs text-muted-foreground">
              For Google Docs: File → Download → Plain Text (.txt) - Max 10MB
            </p>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept=".pdf,.docx,.txt"
              className="hidden"
              onChange={handleFileSelect}
            />
          </div>

          <div className="flex gap-2">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => setShowPasteDialog(true)}
            >
              <FileText className="h-4 w-4 mr-2" />
              Paste Text
            </Button>
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => setShowUrlDialog(true)}
            >
              <Download className="h-4 w-4 mr-2" />
              Import from URL
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Voice Fine-Tuning (Collapsible) */}
      <Collapsible open={isFineTuningOpen} onOpenChange={setIsFineTuningOpen}>
        <Card className="border-0 shadow-sm">
          <CollapsibleTrigger asChild>
            <CardHeader className="cursor-pointer hover:bg-gray-50 transition-colors">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="bg-purple-50 p-2 rounded-lg">
                    <Settings2 className="h-5 w-5 text-purple-600" />
                  </div>
                  <div>
                    <CardTitle className="text-xl">Voice Fine-Tuning</CardTitle>
                    <CardDescription>
                      Advanced controls for tone, vocabulary, and brand identity
                    </CardDescription>
                  </div>
                </div>
                {isFineTuningOpen ? (
                  <ChevronUp className="h-5 w-5 text-gray-500" />
                ) : (
                  <ChevronDown className="h-5 w-5 text-gray-500" />
                )}
              </div>
            </CardHeader>
          </CollapsibleTrigger>

          <CollapsibleContent>
            <CardContent className="space-y-8 pt-0">
              {/* Tone Sliders */}
              <div className="space-y-6">
                <h4 className="font-semibold text-[#003366] flex items-center gap-2">
                  <span>Voice Tone</span>
                  <span className="text-xs text-muted-foreground font-normal">
                    Adjust sliders to fine-tune how your brand communicates
                  </span>
                </h4>
                <div className="grid gap-6 md:grid-cols-2">
                  <ToneSlider
                    label="Playful vs Serious"
                    leftLabel="Playful"
                    rightLabel="Serious"
                    sliderKey="playfulSerious"
                  />
                  <ToneSlider
                    label="Casual vs Elevated"
                    leftLabel="Casual"
                    rightLabel="Elevated"
                    sliderKey="casualElevated"
                  />
                  <ToneSlider
                    label="Trendy vs Classic"
                    leftLabel="Trendy"
                    rightLabel="Classic"
                    sliderKey="trendyClassic"
                  />
                  <ToneSlider
                    label="Friendly vs Professional"
                    leftLabel="Friendly"
                    rightLabel="Professional"
                    sliderKey="friendlyProfessional"
                  />
                  <ToneSlider
                    label="Simple vs Detailed"
                    leftLabel="Simple"
                    rightLabel="Detailed"
                    sliderKey="simpleDetailed"
                  />
                  <ToneSlider
                    label="Bold vs Soft"
                    leftLabel="Bold"
                    rightLabel="Soft"
                    sliderKey="boldSoft"
                  />
                </div>
              </div>

              <Separator />

              {/* Voice Description */}
              <div className="space-y-4">
                <h4 className="font-semibold text-[#003366]">
                  Voice Description
                </h4>
                <div className="grid gap-4 md:grid-cols-3">
                  <div className="space-y-2">
                    <Label htmlFor="voiceTone">Voice Tone</Label>
                    <Input
                      id="voiceTone"
                      value={settings.voiceTone}
                      onChange={(e) =>
                        setSettings((prev) => ({
                          ...prev,
                          voiceTone: e.target.value,
                        }))
                      }
                      placeholder="e.g., Warm, welcoming, confident"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="voiceStyle">Voice Style</Label>
                    <Input
                      id="voiceStyle"
                      value={settings.voiceStyle}
                      onChange={(e) =>
                        setSettings((prev) => ({
                          ...prev,
                          voiceStyle: e.target.value,
                        }))
                      }
                      placeholder="e.g., Conversational with humor"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="voicePersonality">Voice Personality</Label>
                    <Input
                      id="voicePersonality"
                      value={settings.voicePersonality}
                      onChange={(e) =>
                        setSettings((prev) => ({
                          ...prev,
                          voicePersonality: e.target.value,
                        }))
                      }
                      placeholder="e.g., Knowledgeable friend"
                    />
                  </div>
                </div>
              </div>

              <Separator />

              {/* Vocabulary */}
              <div className="space-y-6">
                <h4 className="font-semibold text-[#003366]">
                  Vocabulary Guidelines
                </h4>

                <div className="space-y-3">
                  <Label className="text-base">Preferred Words</Label>
                  <p className="text-sm text-muted-foreground">
                    Words and phrases that should appear in your marketing
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {settings.voiceVocabulary.preferred.map((word) => (
                      <Badge key={word} variant="secondary" className="px-3 py-1">
                        {word}
                        <button
                          onClick={() => removePreferredWord(word)}
                          className="ml-2 hover:text-destructive"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <Input
                      value={newPreferredWord}
                      onChange={(e) => setNewPreferredWord(e.target.value)}
                      placeholder="Add a word or phrase"
                      onKeyDown={(e) => e.key === "Enter" && addPreferredWord()}
                    />
                    <Button onClick={addPreferredWord}>Add</Button>
                  </div>
                </div>

                <div className="space-y-3">
                  <Label className="text-base">Words to Avoid</Label>
                  <p className="text-sm text-muted-foreground">
                    Words and phrases that should never appear
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {settings.voiceVocabulary.avoided.map((word) => (
                      <Badge key={word} variant="secondary" className="px-3 py-1">
                        {word}
                        <button
                          onClick={() => removeAvoidedWord(word)}
                          className="ml-2 hover:text-destructive"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <Input
                      value={newAvoidedWord}
                      onChange={(e) => setNewAvoidedWord(e.target.value)}
                      placeholder="Add a word to avoid"
                      onKeyDown={(e) => e.key === "Enter" && addAvoidedWord()}
                    />
                    <Button onClick={addAvoidedWord}>Add</Button>
                  </div>
                </div>
              </div>

              <Separator />

              {/* Brand Identity */}
              <div className="space-y-6">
                <h4 className="font-semibold text-[#003366]">Brand Identity</h4>

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="customerTerm">
                      How do you refer to customers?
                    </Label>
                    <Input
                      id="customerTerm"
                      value={settings.customerTerm}
                      onChange={(e) =>
                        setSettings((prev) => ({
                          ...prev,
                          customerTerm: e.target.value,
                        }))
                      }
                      placeholder="e.g., community members, guests"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signatureSentence">Signature Sentence</Label>
                    <Input
                      id="signatureSentence"
                      value={settings.signatureSentence}
                      onChange={(e) =>
                        setSettings((prev) => ({
                          ...prev,
                          signatureSentence: e.target.value,
                        }))
                      }
                      placeholder="e.g., Elevating everyday moments"
                    />
                  </div>
                </div>

                <div className="space-y-3">
                  <Label className="text-base">Value Pillars</Label>
                  <p className="text-sm text-muted-foreground">
                    Core values that define your brand
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {settings.valuePillars.map((pillar) => (
                      <Badge key={pillar} variant="secondary" className="px-3 py-1">
                        {pillar}
                        <button
                          onClick={() => removeValuePillar(pillar)}
                          className="ml-2 hover:text-destructive"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <Input
                      value={newValuePillar}
                      onChange={(e) => setNewValuePillar(e.target.value)}
                      placeholder="Add a value pillar"
                      onKeyDown={(e) => e.key === "Enter" && addValuePillar()}
                    />
                    <Button onClick={addValuePillar}>Add</Button>
                  </div>
                </div>
              </div>

              <Separator />

              {/* Target Audience */}
              <div className="space-y-3">
                <h4 className="font-semibold text-[#003366]">Target Audience</h4>
                <div className="space-y-2">
                  <Label htmlFor="audienceDescription">
                    Audience Description
                  </Label>
                  <Textarea
                    id="audienceDescription"
                    value={settings.audienceDescription}
                    onChange={(e) =>
                      setSettings((prev) => ({
                        ...prev,
                        audienceDescription: e.target.value,
                      }))
                    }
                    placeholder="Describe your ideal customer..."
                    rows={4}
                  />
                  <p className="text-xs text-muted-foreground">
                    Who are your customers? What do they care about?
                  </p>
                </div>
              </div>

              {/* Save Settings Button */}
              <div className="flex justify-end gap-3 pt-4">
                <Button
                  variant="outline"
                  onClick={() => setSettings(originalSettings)}
                  disabled={!hasSettingsChanges}
                >
                  Discard Changes
                </Button>
                <Button
                  onClick={handleSaveSettings}
                  disabled={!hasSettingsChanges || isSavingSettings}
                >
                  {isSavingSettings ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    "Save Voice Settings"
                  )}
                </Button>
              </div>
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>

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
              <p className="text-xs text-muted-foreground mt-1">
                {pasteText.length} characters
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPasteDialog(false)}>
              Cancel
            </Button>
            <Button
              onClick={handlePasteSubmit}
              disabled={!pasteText.trim() || isUploading}
            >
              {isUploading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                "Add Sample"
              )}
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
              <p className="text-xs text-muted-foreground mt-2">
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

      {/* Delete Sample Confirmation */}
      <Dialog open={deleteModalOpen} onOpenChange={setDeleteModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete writing sample?</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete "{sampleToDelete?.name}"? This
              action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDeleteSample}>
              <Trash2 className="h-4 w-4 mr-2" />
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Uploading Overlay */}
      {isUploading && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-lg p-6 flex items-center gap-3">
            <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
            <span className="text-sm font-semibold">Uploading samples...</span>
          </div>
        </div>
      )}
    </div>
  );
}
