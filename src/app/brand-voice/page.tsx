"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Page, Spinner, Banner, BlockStack } from "@shopify/polaris";
import BrandVoiceWizard from "./wizard/BrandVoiceWizard";
import type { BrandVoiceProfile } from "../api/brand-voice/route";

export default function BrandVoicePage() {
  const searchParams = useSearchParams();
  const shop = searchParams.get("shop");

  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [existingProfile, setExistingProfile] = useState<BrandVoiceProfile | undefined>();

  useEffect(() => {
    async function loadExistingProfile() {
      if (!shop) {
        setLoadError("Shop domain is required");
        setIsLoading(false);
        return;
      }

      try {
        const response = await fetch(
          `/api/brand-voice?shop=${encodeURIComponent(shop)}`
        );
        const result = await response.json();

        if (!response.ok) {
          throw new Error(result.error || "Failed to load brand voice");
        }

        if (result.exists && result.profile) {
          setExistingProfile(result.profile);
        }

        setIsLoading(false);
      } catch (error) {
        console.error("Error loading brand voice:", error);
        setLoadError(
          error instanceof Error ? error.message : "Failed to load brand voice"
        );
        setIsLoading(false);
      }
    }

    loadExistingProfile();
  }, [shop]);

  if (isLoading) {
    return (
      <Page title="Brand Voice Setup">
        <BlockStack gap="400" inlineAlign="center">
          <Spinner size="large" />
        </BlockStack>
      </Page>
    );
  }

  if (loadError) {
    return (
      <Page title="Brand Voice Setup">
        <Banner tone="critical">
          {loadError}
        </Banner>
      </Page>
    );
  }

  if (!shop) {
    return (
      <Page title="Brand Voice Setup">
        <Banner tone="critical">
          Shop domain is required. Please access this page from the Shopify admin.
        </Banner>
      </Page>
    );
  }

  return <BrandVoiceWizard shopDomain={shop} initialData={existingProfile} />;
}
