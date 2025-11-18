"use client";

import { useState, useRef, useEffect } from "react";
import {
  Page,
  Card,
  BlockStack,
  InlineStack,
  Button,
  Text,
  Banner,
} from "@shopify/polaris";
import Step1Personality from "./Step1Personality";
import Step2Linguistics from "./Step2Linguistics";
import Step3ValuePillars from "./Step3ValuePillars";
import Step4Audience from "./Step4Audience";
import Step5Examples from "./Step5Examples";
import type { BrandVoiceProfile } from "@/app/api/brand-voice/route";

interface BrandVoiceWizardProps {
  shopDomain: string;
  initialData?: BrandVoiceProfile;
}

export default function BrandVoiceWizard({
  shopDomain,
  initialData,
}: BrandVoiceWizardProps) {
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [showSuccess, setShowSuccess] = useState(false);

  // Use ref to persist success state across Fast Refresh
  const showSuccessRef = useRef(false);
  const successTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Sync ref with state
  useEffect(() => {
    if (showSuccessRef.current && !showSuccess) {
      setShowSuccess(true);
    }
  }, [showSuccess]);

  const [formData, setFormData] = useState<BrandVoiceProfile>({
    // Step 1: Tone sliders (default to 5)
    tone_playful_serious: initialData?.tone_playful_serious ?? 5,
    tone_casual_elevated: initialData?.tone_casual_elevated ?? 5,
    tone_trendy_classic: initialData?.tone_trendy_classic ?? 5,
    tone_friendly_professional: initialData?.tone_friendly_professional ?? 5,
    tone_simple_detailed: initialData?.tone_simple_detailed ?? 5,
    tone_bold_soft: initialData?.tone_bold_soft ?? 5,

    // Step 2: Linguistics
    voice_vocabulary: initialData?.voice_vocabulary ?? {
      words_love: [],
      words_avoid: [],
    },
    customer_term: initialData?.customer_term ?? "",
    signature_sentence: initialData?.signature_sentence ?? "",

    // Step 3: Value pillars
    value_pillars: initialData?.value_pillars ?? [],

    // Step 4: Audience
    audience_description: initialData?.audience_description ?? "",

    // Step 5: Writing samples
    writing_samples: initialData?.writing_samples ?? "",
  });

  const handleFieldChange = (field: string, value: any) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleSave = async () => {
    console.log('🔘 Save button clicked - handleSave started');
    console.log('📊 formData:', formData);
    console.log('🏪 shopDomain:', shopDomain);
    setIsSaving(true);
    setSaveError(null);
    setShowSuccess(false);
    showSuccessRef.current = false;

    // Clear any existing timer
    if (successTimerRef.current) {
      clearTimeout(successTimerRef.current);
      successTimerRef.current = null;
    }

    try {
      console.log('🌐 About to fetch /api/brand-voice');
      const response = await fetch(
        `/api/brand-voice?shop=${encodeURIComponent(shopDomain)}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            ...formData,
            wizard_completed: true,
          }),
        }
      );

      console.log('✅ Fetch complete, status:', response.status);
      const result = await response.json();
      console.log('📦 Result:', result);

      if (!response.ok || !result.success) {
        throw new Error(result.error || "Failed to save brand voice");
      }

      // Show success banner for 3 seconds - using ref to persist across Fast Refresh
      console.log('🎉 Setting showSuccess to true (ref + state)');
      showSuccessRef.current = true;
      setShowSuccess(true);

      successTimerRef.current = setTimeout(() => {
        console.log('⏰ Timer expired - hiding banner');
        showSuccessRef.current = false;
        setShowSuccess(false);
      }, 3000);
    } catch (error) {
      console.error("❌ Error saving brand voice:", error);
      setSaveError(
        error instanceof Error ? error.message : "Failed to save brand voice"
      );
    } finally {
      setIsSaving(false);
    }
  };

  console.log('🎨 RENDER - showSuccess:', showSuccess, 'showSuccessRef.current:', showSuccessRef.current, 'saveError:', saveError);

  return (
    <Page
      title="Brand Voice Setup"
      subtitle="Tell Thunder Text about your brand - scroll down to fill out all sections"
    >
      <BlockStack gap="600">
        {/* Error messages */}
        {saveError && (
          <Banner tone="critical" onDismiss={() => setSaveError(null)}>
            {saveError}
          </Banner>
        )}

        {/* All steps displayed in sequence */}
        <Step1Personality data={formData} onChange={handleFieldChange} />

        <Step2Linguistics data={formData} onChange={handleFieldChange} />

        <Step3ValuePillars data={formData} onChange={handleFieldChange} />

        <Step4Audience data={formData} onChange={handleFieldChange} />

        <Step5Examples data={formData} onChange={handleFieldChange} />

        {/* Save button with inline success message */}
        <Card>
          <BlockStack gap="400">
            {/* Success message next to button */}
            {showSuccess && (
              <Banner tone="success" onDismiss={() => setShowSuccess(false)}>
                Your brand voice has been successfully saved.
              </Banner>
            )}

            <InlineStack align="end">
              <Button
                variant="primary"
                onClick={handleSave}
                loading={isSaving}
              >
                Save Brand Voice
              </Button>
            </InlineStack>
          </BlockStack>
        </Card>
      </BlockStack>
    </Page>
  );
}
