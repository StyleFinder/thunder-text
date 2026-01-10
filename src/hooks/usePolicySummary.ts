/**
 * usePolicySummary Hook
 *
 * Q1: Extracted from business-profile/page.tsx to manage policy URL state
 * Handles return and shipping policy URL inputs and AI summarization
 */

import { useState, useCallback } from "react";
import { logger } from "@/lib/logger";

interface UsePolicySummaryOptions {
  shopDomain: string | null;
  onSummaryReceived: (summary: string, type: "return" | "shipping") => void;
  setError: (error: string | null) => void;
}

interface UsePolicySummaryReturn {
  // State
  returnPolicyUrl: string;
  shippingPolicyUrl: string;
  isSummarizingReturn: boolean;
  isSummarizingShipping: boolean;

  // Actions
  setReturnPolicyUrl: (url: string) => void;
  setShippingPolicyUrl: (url: string) => void;
  summarizePolicy: (type: "return" | "shipping") => Promise<void>;
  clearPolicyUrls: () => void;
}

export function usePolicySummary({
  shopDomain,
  onSummaryReceived,
  setError,
}: UsePolicySummaryOptions): UsePolicySummaryReturn {
  const [returnPolicyUrl, setReturnPolicyUrl] = useState("");
  const [shippingPolicyUrl, setShippingPolicyUrl] = useState("");
  const [isSummarizingReturn, setIsSummarizingReturn] = useState(false);
  const [isSummarizingShipping, setIsSummarizingShipping] = useState(false);

  const summarizePolicy = useCallback(
    async (type: "return" | "shipping") => {
      const url = type === "return" ? returnPolicyUrl : shippingPolicyUrl;

      if (!url.trim()) {
        setError(`Please enter a ${type} policy URL first`);
        return;
      }

      // Validate URL format
      try {
        new URL(url);
      } catch {
        setError(
          "Please enter a valid URL (e.g., https://yourstore.com/policies/...)"
        );
        return;
      }

      const setLoading =
        type === "return" ? setIsSummarizingReturn : setIsSummarizingShipping;
      setLoading(true);
      setError(null);

      try {
        const response = await fetch("/api/business-profile/summarize-policy", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${shopDomain}`,
          },
          body: JSON.stringify({ url, type }),
        });

        const data = await response.json();

        if (data.success && data.data?.summary) {
          onSummaryReceived(data.data.summary, type);
        } else {
          setError(data.error || `Failed to summarize ${type} policy`);
        }
      } catch (err) {
        logger.error(`Failed to summarize ${type} policy:`, err as Error, {
          component: "usePolicySummary",
        });
        setError(
          `Failed to summarize ${type} policy. Please try again or enter details manually.`
        );
      } finally {
        setLoading(false);
      }
    },
    [returnPolicyUrl, shippingPolicyUrl, shopDomain, onSummaryReceived, setError]
  );

  const clearPolicyUrls = useCallback(() => {
    setReturnPolicyUrl("");
    setShippingPolicyUrl("");
  }, []);

  return {
    returnPolicyUrl,
    shippingPolicyUrl,
    isSummarizingReturn,
    isSummarizingShipping,
    setReturnPolicyUrl,
    setShippingPolicyUrl,
    summarizePolicy,
    clearPolicyUrls,
  };
}
