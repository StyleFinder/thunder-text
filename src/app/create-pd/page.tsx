"use client";

export const dynamic = "force-dynamic";

import {
  useState,
  useCallback,
  useEffect,
  Suspense,
  useRef,
  useMemo,
} from "react";
import { useSearchParams } from "next/navigation";
import {
  Loader2,
  Zap,
  ArrowLeft,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  Save,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { logger } from "@/lib/logger";
import { authenticatedFetch } from "@/lib/shopify/api-client";
import { type ProductCategory } from "@/lib/prompts-types";
import { useShop } from "@/hooks/useShop";

// Extracted components
import {
  PrimaryPhotoUpload,
  SecondaryPhotoUpload,
  ProductDataBanner,
  GenerationModal,
  GeneratedContentModal,
  ProductCreatedModal,
} from "./components";

// Extracted hooks
import {
  useProductData,
  useColorDetection,
  useFileUpload,
  useShopSizes,
} from "./hooks";

// Existing components
import { CategoryTemplateSelector } from "@/app/components/CategoryTemplateSelector";
import { ProductTypeSelector } from "@/app/components/ProductTypeSelector";

// Blog linking components
import { BlogLinkingSection } from "@/app/components/shared/blog-linking";
import type { BlogSelection } from "@/types/blog-linking";

interface GeneratedContent {
  title?: string;
  description?: string;
  metaDescription?: string;
  bulletPoints?: string[];
  keywords?: string[];
  [key: string]: unknown;
}

// Step indicator component for individual sections
function StepIndicator({
  step,
  title,
  isActive,
  isComplete,
}: {
  step: number;
  title: string;
  isActive?: boolean;
  isComplete?: boolean;
}) {
  return (
    <div className="flex items-center gap-3 mb-4">
      <div
        className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold ${
          isComplete
            ? "bg-green-100 text-green-600"
            : isActive
              ? "bg-blue-100 text-blue-600"
              : "bg-gray-100 text-gray-500"
        }`}
      >
        {isComplete ? <CheckCircle2 className="w-4 h-4" /> : step}
      </div>
      <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
    </div>
  );
}

// Progress stepper component showing overall progress at top
function ProgressStepper({
  steps,
  currentStep,
}: {
  steps: { id: string; label: string; complete: boolean }[];
  currentStep: number;
}) {
  const completedSteps = steps.filter((s) => s.complete).length;
  const progressPercent = Math.round((completedSteps / steps.length) * 100);

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4 mb-6">
      {/* Progress bar */}
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm font-medium text-gray-700">
          Progress: {completedSteps} of {steps.length} steps complete
        </span>
        <span className="text-sm font-semibold" style={{ color: "#0066cc" }}>
          {progressPercent}%
        </span>
      </div>
      <div className="h-2 bg-gray-100 rounded-full overflow-hidden mb-4">
        <div
          className="h-full rounded-full transition-all duration-500 ease-out"
          style={{
            width: `${progressPercent}%`,
            background: "linear-gradient(135deg, #0066cc 0%, #0099ff 100%)",
          }}
        />
      </div>

      {/* Step indicators */}
      <div className="flex items-center justify-between">
        {steps.map((step, index) => (
          <div key={step.id} className="flex items-center">
            <div className="flex flex-col items-center">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold transition-all ${
                  step.complete
                    ? "bg-green-100 text-green-600"
                    : index === currentStep
                      ? "bg-blue-100 text-blue-600 ring-2 ring-blue-300"
                      : "bg-gray-100 text-gray-400"
                }`}
              >
                {step.complete ? (
                  <CheckCircle2 className="w-4 h-4" />
                ) : (
                  index + 1
                )}
              </div>
              <span
                className={`text-xs mt-1 max-w-[80px] text-center ${
                  step.complete
                    ? "text-green-600 font-medium"
                    : index === currentStep
                      ? "text-blue-600 font-medium"
                      : "text-gray-400"
                }`}
              >
                {step.label}
              </span>
            </div>
            {index < steps.length - 1 && (
              <div
                className={`w-8 sm:w-12 md:w-16 h-0.5 mx-1 ${
                  step.complete ? "bg-green-300" : "bg-gray-200"
                }`}
              />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// Validation feedback component
function ValidationFeedback({
  isValid,
  message,
  showWhenValid = false,
}: {
  isValid: boolean;
  message: string;
  showWhenValid?: boolean;
}) {
  if (isValid && !showWhenValid) return null;

  return (
    <div
      className={`flex items-center gap-2 mt-2 text-sm ${
        isValid ? "text-green-600" : "text-amber-600"
      }`}
    >
      {isValid ? (
        <CheckCircle2 className="w-4 h-4" />
      ) : (
        <AlertCircle className="w-4 h-4" />
      )}
      <span>{message}</span>
    </div>
  );
}

// Generate button disabled reasons component
function GenerateButtonStatus({
  canGenerate,
  reasons,
}: {
  canGenerate: boolean;
  reasons: string[];
}) {
  if (canGenerate) return null;

  return (
    <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-4">
      <p className="text-sm font-medium text-amber-800 mb-1">
        Complete these items to enable generation:
      </p>
      <ul className="text-sm text-amber-700 space-y-1">
        {reasons.map((reason, i) => (
          <li key={i} className="flex items-center gap-2">
            <AlertCircle className="w-3 h-3" />
            {reason}
          </li>
        ))}
      </ul>
    </div>
  );
}

// Draft saved indicator component
function DraftIndicator({
  lastSaved,
  hasDraft,
  onClearDraft,
}: {
  lastSaved: Date | null;
  hasDraft: boolean;
  onClearDraft: () => void;
}) {
  if (!hasDraft) return null;

  return (
    <div className="flex items-center justify-between bg-blue-50 border border-blue-200 rounded-lg px-4 py-2 mb-4">
      <div className="flex items-center gap-2 text-sm text-blue-700">
        <Save className="w-4 h-4" />
        <span>
          Draft saved
          {lastSaved && (
            <span className="text-blue-500 ml-1">
              at{" "}
              {lastSaved.toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
              })}
            </span>
          )}
        </span>
      </div>
      <button
        onClick={onClearDraft}
        className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 transition-colors"
      >
        <Trash2 className="w-3 h-3" />
        Clear draft
      </button>
    </div>
  );
}

// Constants for auto-save
const DRAFT_STORAGE_KEY = "thunder-text-create-pd-draft";
const AUTO_SAVE_INTERVAL = 30000; // 30 seconds

function CreateProductContent() {
  const searchParams = useSearchParams();
  const { shop, isAuthenticated } = useShop();

  // Admin extension redirect parameters
  const productId = searchParams?.get("productId");
  const productTypeParam = searchParams?.get("productType");
  const vendor = searchParams?.get("vendor");
  const source = searchParams?.get("source");

  // Progress timer ref
  const progressTimer = useRef<NodeJS.Timeout | null>(null);

  // Custom hooks
  const { prePopulatedData, dataLoading, dataLoadError, initialFormValues } =
    useProductData({
      source,
      productId,
      shop,
      productTypeParam,
      vendor,
    });

  const {
    detectedVariants,
    colorDetectionLoading,
    detectColorsFromPhotos,
    updateVariantOverride,
    clearVariants,
  } = useColorDetection({ shop });

  const {
    primaryPhotos,
    secondaryPhotos,
    handlePrimaryPhotosDrop,
    handleSecondaryPhotosDrop,
    removePrimaryPhoto,
    removeSecondaryPhoto,
    clearAllPhotos,
  } = useFileUpload();

  const { sizingOptions, defaultSizing } = useShopSizes({ shop });

  // Form state
  const [selectedTemplate, setSelectedTemplate] =
    useState<ProductCategory>("general");
  const [productType, setProductType] = useState("");
  const [availableSizing, setAvailableSizing] = useState("");
  const [, setTemplatePreview] = useState<{
    id: string;
    name: string;
    category: string;
    content: string;
    is_default: boolean;
  } | null>(null);
  const [fabricMaterial, setFabricMaterial] = useState("");
  const [occasionUse, setOccasionUse] = useState("");
  const [targetAudience, setTargetAudience] = useState("");
  const [keyFeatures, setKeyFeatures] = useState("");
  const [additionalNotes, setAdditionalNotes] = useState("");
  const [, setCategoryDetected] = useState(false);
  const [suggestedCategory, setSuggestedCategory] = useState<{
    category: string;
    confidence: number;
  } | null>(null);

  // Generation state
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [generatedContent, setGeneratedContent] =
    useState<GeneratedContent | null>(null);
  const [creatingProduct, setCreatingProduct] = useState(false);
  const [productCreated, setProductCreated] = useState<Record<
    string,
    unknown
  > | null>(null);
  const [progress, setProgress] = useState(0);

  // Draft/auto-save state
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);
  const [hasDraft, setHasDraft] = useState(false);
  const autoSaveTimerRef = useRef<NodeJS.Timeout | null>(null);
  const isLoadingDraftRef = useRef(false);

  // Blog linking state
  const [blogLinkEnabled, setBlogLinkEnabled] = useState(false);
  const [selectedBlog, setSelectedBlog] = useState<BlogSelection | null>(null);
  const [blogSummary, setBlogSummary] = useState("");

  // Clear draft from localStorage
  const clearDraft = useCallback(() => {
    try {
      localStorage.removeItem(DRAFT_STORAGE_KEY);
      setHasDraft(false);
      setLastSavedAt(null);
    } catch (e) {
      console.warn("Failed to clear draft:", e);
    }
  }, []);

  // Reset form to initial state for creating a new product
  const resetForm = useCallback(() => {
    // Clear all photos and detected colors
    clearAllPhotos();
    clearVariants();

    // Reset form fields
    setSelectedTemplate("general");
    setProductType("");
    setAvailableSizing(defaultSizing || "");
    setTemplatePreview(null);
    setFabricMaterial("");
    setOccasionUse("");
    setTargetAudience("");
    setKeyFeatures("");
    setAdditionalNotes("");
    setCategoryDetected(false);
    setSuggestedCategory(null);

    // Reset generation state
    setGenerating(false);
    setError(null);
    setShowModal(false);
    setGeneratedContent(null);
    setCreatingProduct(false);
    setProductCreated(null);
    setProgress(0);

    // Reset blog linking state
    setBlogLinkEnabled(false);
    setSelectedBlog(null);
    setBlogSummary("");

    // Clear saved draft
    clearDraft();

    // Scroll to top of page
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [clearAllPhotos, clearVariants, defaultSizing, clearDraft]);

  // Apply initial form values from pre-populated data
  useEffect(() => {
    if (initialFormValues) {
      setSelectedTemplate(initialFormValues.selectedTemplate);
      setProductType(initialFormValues.productType);
      setTargetAudience(initialFormValues.targetAudience);
      setFabricMaterial(initialFormValues.fabricMaterial);
      setKeyFeatures(initialFormValues.keyFeatures);
      setAvailableSizing(initialFormValues.availableSizing);
      setAdditionalNotes(initialFormValues.additionalNotes);
      setCategoryDetected(true);
    }
  }, [initialFormValues]);

  // Set default sizing when loaded
  useEffect(() => {
    if (defaultSizing && !availableSizing) {
      setAvailableSizing(defaultSizing);
    }
  }, [defaultSizing, availableSizing]);

  // Load draft from localStorage on mount
  useEffect(() => {
    // Don't load draft if we have pre-populated data from URL params
    if (initialFormValues || productId) return;

    try {
      const savedDraft = localStorage.getItem(DRAFT_STORAGE_KEY);
      if (savedDraft) {
        isLoadingDraftRef.current = true;
        const draft = JSON.parse(savedDraft);

        // Restore form fields
        if (draft.selectedTemplate) setSelectedTemplate(draft.selectedTemplate);
        if (draft.productType) setProductType(draft.productType);
        if (draft.availableSizing) setAvailableSizing(draft.availableSizing);
        if (draft.fabricMaterial) setFabricMaterial(draft.fabricMaterial);
        if (draft.occasionUse) setOccasionUse(draft.occasionUse);
        if (draft.targetAudience) setTargetAudience(draft.targetAudience);
        if (draft.keyFeatures) setKeyFeatures(draft.keyFeatures);
        if (draft.additionalNotes) setAdditionalNotes(draft.additionalNotes);

        setHasDraft(true);
        if (draft.savedAt) {
          setLastSavedAt(new Date(draft.savedAt));
        }

        // Small delay to prevent immediate re-save
        setTimeout(() => {
          isLoadingDraftRef.current = false;
        }, 100);
      }
    } catch (e) {
      console.warn("Failed to load draft:", e);
    }
  }, [initialFormValues, productId]);

  // Auto-save form data to localStorage
  useEffect(() => {
    // Don't save if we're loading a draft or have no meaningful data
    if (isLoadingDraftRef.current) return;

    const hasData =
      productType ||
      (selectedTemplate && selectedTemplate !== "general") ||
      fabricMaterial ||
      occasionUse ||
      targetAudience ||
      keyFeatures ||
      additionalNotes;

    if (!hasData) return;

    // Clear existing timer
    if (autoSaveTimerRef.current) {
      clearTimeout(autoSaveTimerRef.current);
    }

    // Set new timer for auto-save
    autoSaveTimerRef.current = setTimeout(() => {
      try {
        const draft = {
          selectedTemplate,
          productType,
          availableSizing,
          fabricMaterial,
          occasionUse,
          targetAudience,
          keyFeatures,
          additionalNotes,
          savedAt: new Date().toISOString(),
        };
        localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(draft));
        setHasDraft(true);
        setLastSavedAt(new Date());
      } catch (e) {
        console.warn("Failed to save draft:", e);
      }
    }, AUTO_SAVE_INTERVAL);

    // Cleanup
    return () => {
      if (autoSaveTimerRef.current) {
        clearTimeout(autoSaveTimerRef.current);
      }
    };
  }, [
    selectedTemplate,
    productType,
    availableSizing,
    fabricMaterial,
    occasionUse,
    targetAudience,
    keyFeatures,
    additionalNotes,
  ]);

  // Progress steps calculation
  const progressSteps = useMemo(
    () => [
      { id: "product-type", label: "Product Type", complete: !!productType },
      { id: "photos", label: "Photos", complete: primaryPhotos.length > 0 },
      {
        id: "category",
        label: "Category",
        complete: !!selectedTemplate && selectedTemplate !== "general",
      },
      { id: "details", label: "Details", complete: !!availableSizing },
      {
        id: "features",
        label: "Features",
        complete: !!keyFeatures || !!fabricMaterial,
      },
    ],
    [
      productType,
      primaryPhotos.length,
      selectedTemplate,
      availableSizing,
      keyFeatures,
      fabricMaterial,
    ],
  );

  // Current active step (first incomplete step)
  const currentActiveStep = useMemo(() => {
    const firstIncomplete = progressSteps.findIndex((s) => !s.complete);
    return firstIncomplete === -1 ? progressSteps.length - 1 : firstIncomplete;
  }, [progressSteps]);

  // Validation state for generate button
  const validationState = useMemo(() => {
    const reasons: string[] = [];

    if (primaryPhotos.length === 0) {
      reasons.push("Upload at least one primary photo");
    }
    if (!selectedTemplate) {
      reasons.push("Select a product category template");
    }
    if (!productType) {
      reasons.push("Specify the product type");
    }

    return {
      canGenerate: reasons.length === 0 && !generating,
      reasons,
    };
  }, [primaryPhotos.length, selectedTemplate, productType, generating]);

  // Cleanup progress timer on unmount
  useEffect(() => {
    return () => {
      if (progressTimer.current) {
        clearInterval(progressTimer.current);
      }
    };
  }, []);

  // Fetch global default template
  useEffect(() => {
    async function fetchGlobalDefaultTemplate() {
      if (!shop || !isAuthenticated) return;

      try {
        const response = await fetch(
          `/api/prompts?store_id=${shop}&get_default=true`,
        );
        const data = await response.json();

        if (data.default_template && !initialFormValues) {
          setSelectedTemplate(data.default_template);
        }
      } catch (err) {
        logger.error("Error fetching global default template", err as Error, {
          component: "create-pd-page",
          operation: "fetchGlobalDefaultTemplate",
          storeId: shop,
        });
      }
    }

    fetchGlobalDefaultTemplate();
  }, [shop, isAuthenticated, initialFormValues]);

  // Category detection from image
  const detectCategoryFromImage = useCallback(
    async (file: File) => {
      try {
        const reader = new FileReader();
        const imageData = await new Promise<string>((resolve, reject) => {
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(file);
        });

        const response = await authenticatedFetch(
          "/api/detect-category",
          {
            method: "POST",
            body: JSON.stringify({ imageData }),
          },
          shop || undefined,
        );

        const result = await response.json();

        if (result.success && result.data) {
          const { subCategory, confidence } = result.data;

          if (
            confidence === "high" &&
            (!selectedTemplate || selectedTemplate === "general")
          ) {
            setSelectedTemplate(subCategory.toLowerCase() as ProductCategory);
            setCategoryDetected(true);
          }
        }
      } catch (error) {
        logger.error("Error detecting category from image", error as Error, {
          component: "create-pd-page",
          operation: "detectCategoryFromImage",
          shop,
        });
      }
    },
    [shop, selectedTemplate],
  );

  // Handle primary photos with color detection
  const handlePrimaryPhotosAdd = useCallback(
    (files: File[]) => {
      const updatedPhotos = handlePrimaryPhotosDrop(files);
      detectColorsFromPhotos(updatedPhotos);

      if (primaryPhotos.length === 0 && files.length > 0) {
        setCategoryDetected(true);
        detectCategoryFromImage(files[0]);
      }
    },
    [
      handlePrimaryPhotosDrop,
      detectColorsFromPhotos,
      primaryPhotos.length,
      detectCategoryFromImage,
    ],
  );

  // Handle primary photo removal with re-detection
  const handlePrimaryPhotoRemove = useCallback(
    (index: number) => {
      const remainingPhotos = removePrimaryPhoto(index);
      detectColorsFromPhotos(remainingPhotos);
    },
    [removePrimaryPhoto, detectColorsFromPhotos],
  );

  // Template change handler
  const handleTemplateChange = useCallback(
    (category: string, categoryType?: ProductCategory) => {
      setSelectedTemplate(categoryType || "general");
    },
    [],
  );

  // Category suggestion from content
  const suggestCategoryFromContent = async (content: GeneratedContent) => {
    try {
      const response = await authenticatedFetch(
        "/api/categories/suggest",
        {
          method: "POST",
          body: JSON.stringify({
            title: content.title,
            description: content.description,
            keywords: content.keywords,
          }),
        },
        shop || undefined,
      );

      const data = await response.json();

      if (data.success && data.suggestion) {
        const { category, confidence, shouldAutoAssign } = data.suggestion;
        setSuggestedCategory({ category, confidence });

        if (shouldAutoAssign && confidence >= 0.6) {
          if (!selectedTemplate || selectedTemplate === "general") {
            setSelectedTemplate(category);
            setCategoryDetected(true);
          }
        }
      }
    } catch (err) {
      logger.error("Error getting category suggestion", err as Error, {
        component: "create-pd-page",
        operation: "suggestCategoryFromContent",
        shop,
      });
    }
  };

  // Generate description handler
  const handleGenerateDescription = async () => {
    if (primaryPhotos.length === 0) {
      setError("Please upload at least one primary photo");
      return;
    }

    if (!selectedTemplate) {
      setError("Please select a product category template");
      return;
    }

    if (!shop) {
      setError(
        "Shop parameter is required. Please include ?shop=your-store.myshopify.com in the URL.",
      );
      return;
    }

    setGenerating(true);
    setError(null);
    setProgress(0);
    setShowModal(true);

    let currentProgress = 0;
    progressTimer.current = setInterval(() => {
      currentProgress += Math.random() * 8 + 2;
      if (currentProgress >= 90) {
        currentProgress = 90;
        if (progressTimer.current) {
          clearInterval(progressTimer.current);
        }
      }
      setProgress(Math.min(currentProgress, 90));
    }, 800);

    try {
      const allPhotos = [...primaryPhotos, ...secondaryPhotos];
      const imageData = await Promise.all(
        allPhotos.map(async ({ file }) => {
          return new Promise<string>((resolve) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result as string);
            reader.readAsDataURL(file);
          });
        }),
      );

      const response = await authenticatedFetch(
        "/api/generate/create",
        {
          method: "POST",
          body: JSON.stringify({
            images: imageData,
            category: selectedTemplate,
            sizing: availableSizing,
            template: selectedTemplate,
            productType,
            fabricMaterial,
            occasionUse,
            targetAudience,
            keyFeatures,
            additionalNotes,
          }),
        },
        shop || undefined,
      );

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || "Generation failed");
      }

      if (progressTimer.current) {
        clearInterval(progressTimer.current);
      }
      setProgress(100);

      setGeneratedContent(data.data.generatedContent);

      if (data.data.generatedContent) {
        try {
          await suggestCategoryFromContent(data.data.generatedContent);
        } catch (suggestionError) {
          logger.error("Category suggestion failed", suggestionError as Error, {
            component: "create-pd-page",
            operation: "handleGenerateDescription-suggestCategory",
            shop,
          });
        }
      }
    } catch (err) {
      logger.error("Error generating content", err as Error, {
        component: "create-pd-page",
        operation: "handleGenerateDescription",
        category: selectedTemplate,
        photosCount: primaryPhotos.length + secondaryPhotos.length,
        shop,
      });
      setError("Failed to generate product description. Please try again.");
    } finally {
      if (progressTimer.current) {
        clearInterval(progressTimer.current);
      }
      setGenerating(false);
      setShowModal(false);
    }
  };

  // Create in Shopify handler
  const handleCreateInShopify = async () => {
    if (!generatedContent) return;

    setCreatingProduct(true);
    setError(null);

    try {
      const allPhotos = [...primaryPhotos, ...secondaryPhotos];
      const uploadedImagesData = await Promise.all(
        allPhotos.map(async ({ file }) => {
          return new Promise<{
            dataUrl: string;
            name: string;
            altText: string;
          }>((resolve) => {
            const reader = new FileReader();
            reader.onload = () => {
              resolve({
                dataUrl: reader.result as string,
                name: file.name,
                altText: generatedContent?.title || file.name,
              });
            };
            reader.readAsDataURL(file);
          });
        }),
      );

      const url = new URL(
        "/api/shopify/products/create",
        window.location.origin,
      );
      if (shop) {
        url.searchParams.append("shop", shop);
      }

      const finalCategory =
        suggestedCategory && suggestedCategory.confidence >= 0.6
          ? suggestedCategory.category
          : selectedTemplate;

      // Prepare blog link data if enabled
      const blogLink = blogLinkEnabled && selectedBlog && blogSummary
        ? {
            blogId: selectedBlog.id,
            blogSource: selectedBlog.source,
            title: selectedBlog.title,
            summary: blogSummary,
            url: selectedBlog.source === "shopify" && shop
              ? `https://${shop}/blogs/${selectedBlog.blogHandle || "news"}/${selectedBlog.handle || selectedBlog.id}`
              : `#blog-${selectedBlog.id}`,
          }
        : undefined;

      const response = await fetch(url.toString(), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          generatedContent,
          productData: {
            category: finalCategory,
            productType,
            sizing: availableSizing,
            template: selectedTemplate,
            fabricMaterial,
            occasionUse,
            targetAudience,
            keyFeatures,
            additionalNotes,
            colorVariants: detectedVariants,
          },
          uploadedImages: uploadedImagesData,
          blogLink,
        }),
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || "Failed to create product in Shopify");
      }

      setProductCreated(data.data);
      setGeneratedContent(null);
    } catch (err) {
      logger.error("Error creating product in Shopify", err as Error, {
        component: "create-pd-page",
        operation: "handleCreateInShopify",
        shop,
      });
      setError(
        `Failed to create product in Shopify: ${err instanceof Error ? err.message : "Unknown error"}`,
      );
    } finally {
      setCreatingProduct(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <main className="max-w-4xl mx-auto px-6 py-8">
        {/* Page Header */}
        <div className="flex items-start justify-between mb-8">
          <div className="flex items-center gap-4">
            <div
              className="w-12 h-12 rounded-xl flex items-center justify-center"
              style={{
                background: "linear-gradient(135deg, #ffcc00 0%, #ff9900 100%)",
              }}
            >
              <Sparkles className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                Create New Product
              </h1>
              <p className="text-gray-500 text-sm">
                Generate AI-powered product descriptions from images
              </p>
            </div>
          </div>
          <Button
            variant="outline"
            onClick={() =>
              (window.location.href = `/dashboard?${searchParams?.toString() || ""}`)
            }
            className="border-gray-200 hover:bg-gray-50"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Dashboard
          </Button>
        </div>

        {/* Progress Stepper */}
        <ProgressStepper
          steps={progressSteps}
          currentStep={currentActiveStep}
        />

        {/* Draft Saved Indicator */}
        <DraftIndicator
          lastSaved={lastSavedAt}
          hasDraft={hasDraft}
          onClearDraft={clearDraft}
        />

        {/* Product Data Banner */}
        <ProductDataBanner
          dataLoading={dataLoading}
          dataLoadError={dataLoadError}
          prePopulatedData={prePopulatedData}
        />

        {/* Step 1: Product Type Selection */}
        <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
          <StepIndicator
            step={1}
            title="What Product Are You Selling?"
            isActive={!productType}
            isComplete={!!productType}
          />
          <p className="text-gray-500 text-sm mb-4 ml-11">
            Specify the primary product type first. This helps the AI focus on
            the correct item when analyzing images.
          </p>
          <div className="ml-11">
            <ProductTypeSelector
              value={productType}
              onChange={setProductType}
              shopDomain={shop || undefined}
            />
            <ValidationFeedback
              isValid={!!productType}
              message={
                productType
                  ? "Product type specified"
                  : "Please specify what product you're selling"
              }
              showWhenValid={true}
            />
          </div>
        </div>

        {/* Step 2: Primary Photos */}
        <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
          <StepIndicator
            step={2}
            title="Upload Primary Photos"
            isActive={!!productType && primaryPhotos.length === 0}
            isComplete={primaryPhotos.length > 0}
          />
          <p className="text-gray-500 text-sm mb-4 ml-11">
            Upload clear photos of your product. The AI will analyze these to
            generate descriptions.
          </p>
          <div className="ml-11">
            <PrimaryPhotoUpload
              photos={primaryPhotos}
              productType={productType}
              detectedVariants={detectedVariants}
              colorDetectionLoading={colorDetectionLoading}
              onPhotosAdd={handlePrimaryPhotosAdd}
              onPhotoRemove={handlePrimaryPhotoRemove}
              onVariantOverride={updateVariantOverride}
            />
            <ValidationFeedback
              isValid={primaryPhotos.length > 0}
              message={
                primaryPhotos.length > 0
                  ? `${primaryPhotos.length} photo${primaryPhotos.length > 1 ? "s" : ""} uploaded`
                  : "Upload at least one primary photo to generate a description"
              }
              showWhenValid={true}
            />
          </div>
        </div>

        {/* Step 3: Secondary Photos */}
        <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
          <StepIndicator
            step={3}
            title="Additional Photos (Optional)"
            isActive={primaryPhotos.length > 0 && secondaryPhotos.length === 0}
            isComplete={secondaryPhotos.length > 0}
          />
          <p className="text-gray-500 text-sm mb-4 ml-11">
            Add more photos showing different angles, details, or styling
            options.
          </p>
          <div className="ml-11">
            <SecondaryPhotoUpload
              photos={secondaryPhotos}
              onPhotosAdd={handleSecondaryPhotosDrop}
              onPhotoRemove={removeSecondaryPhoto}
            />
          </div>
        </div>

        {/* Step 4 & 5: Product Details - Two columns */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          {/* Step 4: Product Details */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <StepIndicator step={4} title="Product Details" />

            {primaryPhotos.length === 0 && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4 ml-11">
                <p className="text-sm text-blue-700">
                  Upload primary photos first, then select the product category
                  below
                </p>
              </div>
            )}

            {suggestedCategory && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4 ml-11">
                <p className="text-sm text-green-700 font-medium">
                  Suggested Category: {suggestedCategory.category}
                </p>
                <p className="text-sm text-green-600">
                  Confidence: {(suggestedCategory.confidence * 100).toFixed(0)}%
                  {suggestedCategory.confidence >= 0.6
                    ? " (Auto-assigned)"
                    : " (Please review)"}
                </p>
                {suggestedCategory.confidence < 0.6 && (
                  <Button
                    size="sm"
                    className="mt-2"
                    style={{ background: "#16a34a" }}
                    onClick={() => {
                      setSelectedTemplate(
                        suggestedCategory.category as ProductCategory,
                      );
                      setCategoryDetected(true);
                    }}
                  >
                    Use This Suggestion
                  </Button>
                )}
              </div>
            )}

            <div className="space-y-4 ml-11">
              {/* Available Sizing */}
              <div className="space-y-2">
                <Label
                  htmlFor="sizing-select"
                  className="text-gray-700 font-medium"
                >
                  Available Sizing
                </Label>
                <Select
                  value={availableSizing}
                  onValueChange={setAvailableSizing}
                >
                  <SelectTrigger id="sizing-select">
                    <SelectValue placeholder="Select the available size range" />
                  </SelectTrigger>
                  <SelectContent>
                    {sizingOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Product Templates */}
              <div>
                <CategoryTemplateSelector
                  value={selectedTemplate}
                  onChange={handleTemplateChange}
                  storeId={shop || "test-store"}
                  onPreview={setTemplatePreview}
                />
              </div>
            </div>
          </div>

          {/* Step 5: Additional Information */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <StepIndicator step={5} title="Additional Information" />

            <div className="space-y-4 ml-11">
              <div className="space-y-2">
                <Label
                  htmlFor="fabric-material"
                  className="text-gray-700 font-medium"
                >
                  Fabric/Material Content
                </Label>
                <Textarea
                  id="fabric-material"
                  placeholder="e.g. 100% organic cotton, stainless steel, recycled plastic"
                  value={fabricMaterial}
                  onChange={(e) => setFabricMaterial(e.target.value)}
                  rows={2}
                  className="resize-none"
                />
              </div>

              <div className="space-y-2">
                <Label
                  htmlFor="occasion-use"
                  className="text-gray-700 font-medium"
                >
                  Occasion Use
                </Label>
                <Textarea
                  id="occasion-use"
                  placeholder="e.g. outdoor activities, formal events, everyday use"
                  value={occasionUse}
                  onChange={(e) => setOccasionUse(e.target.value)}
                  rows={2}
                  className="resize-none"
                />
              </div>

              <div className="space-y-2">
                <Label
                  htmlFor="target-audience"
                  className="text-gray-700 font-medium"
                >
                  Target Audience
                </Label>
                <Textarea
                  id="target-audience"
                  placeholder="e.g. young professionals, parents, fitness enthusiasts"
                  value={targetAudience}
                  onChange={(e) => setTargetAudience(e.target.value)}
                  rows={2}
                  className="resize-none"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Step 6: Features & Additional Details */}
        <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
          <StepIndicator step={6} title="Features & Additional Details" />

          <div className="space-y-4 ml-11">
            <div className="space-y-2">
              <Label
                htmlFor="key-features"
                className="text-gray-700 font-medium"
              >
                List the main features and benefits
              </Label>
              <Textarea
                id="key-features"
                placeholder="e.g. waterproof, eco-friendly, machine washable, lifetime warranty"
                value={keyFeatures}
                onChange={(e) => setKeyFeatures(e.target.value)}
                rows={3}
                className="resize-none"
              />
            </div>

            <div className="space-y-2">
              <Label
                htmlFor="additional-notes"
                className="text-gray-700 font-medium"
              >
                Additional Notes
              </Label>
              <Textarea
                id="additional-notes"
                placeholder="Any other important information about this product"
                value={additionalNotes}
                onChange={(e) => setAdditionalNotes(e.target.value)}
                rows={3}
                className="resize-none"
              />
            </div>
          </div>
        </div>

        {/* Step 7: Blog Linking (Optional) */}
        <div className="mb-6">
          <BlogLinkingSection
            enabled={blogLinkEnabled}
            onEnabledChange={setBlogLinkEnabled}
            selectedBlog={selectedBlog}
            onBlogSelect={setSelectedBlog}
            summary={blogSummary}
            onSummaryChange={setBlogSummary}
            storeId={shop || ""}
            shopDomain={shop || undefined}
            loading={generating}
          />
        </div>

        {/* Error Display */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-6">
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}

        {/* Generation Requirements Status */}
        <GenerateButtonStatus
          canGenerate={validationState.canGenerate}
          reasons={validationState.reasons}
        />

        {/* Action Buttons */}
        <div className="flex justify-end gap-3">
          <Button
            variant="outline"
            onClick={() => window.history.back()}
            className="border-gray-200"
          >
            Cancel
          </Button>
          <Button
            onClick={handleGenerateDescription}
            disabled={
              primaryPhotos.length === 0 || !selectedTemplate || generating
            }
            className="px-6"
            style={{
              background:
                primaryPhotos.length === 0 || !selectedTemplate || generating
                  ? "#e5e7eb"
                  : "linear-gradient(135deg, #0066cc 0%, #0099ff 100%)",
              color:
                primaryPhotos.length === 0 || !selectedTemplate || generating
                  ? "#9ca3af"
                  : "#ffffff",
              border: "none",
            }}
          >
            {generating ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 mr-2" />
                Generate Description
              </>
            )}
          </Button>
        </div>
      </main>

      {/* Modals */}
      <GenerationModal
        open={showModal}
        onOpenChange={setShowModal}
        progress={progress}
      />

      <GeneratedContentModal
        content={generatedContent}
        onContentChange={setGeneratedContent}
        onClose={() => setGeneratedContent(null)}
        onRegenerate={() => {
          setGeneratedContent(null);
          handleGenerateDescription();
        }}
        onCreateInShopify={handleCreateInShopify}
        creatingProduct={creatingProduct}
        blogLinkEnabled={blogLinkEnabled}
        selectedBlog={selectedBlog}
        blogSummary={blogSummary}
        shopDomain={shop || undefined}
      />

      <ProductCreatedModal data={productCreated} onClose={resetForm} />
    </div>
  );
}

export default function CreateProductPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="flex flex-col items-center gap-4">
            <div
              className="w-12 h-12 rounded-xl flex items-center justify-center"
              style={{
                background: "linear-gradient(135deg, #ffcc00 0%, #ff9900 100%)",
              }}
            >
              <Zap className="w-6 h-6 text-white" />
            </div>
            <div className="flex items-center gap-3">
              <Loader2
                className="h-5 w-5 animate-spin"
                style={{ color: "#0066cc" }}
              />
              <p className="text-sm text-gray-500">Loading Create Product...</p>
            </div>
          </div>
        </div>
      }
    >
      <CreateProductContent />
    </Suspense>
  );
}
