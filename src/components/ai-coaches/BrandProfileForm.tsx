"use client";

import { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  CheckCircle,
  AlertCircle,
  RefreshCw,
  Save,
  Link,
  Sparkles,
  X,
  ArrowRight,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import type {
  CoachBrandProfileFields,
  DiscountComfortLevel,
  InventorySize,
  OwnerTimeConstraint,
} from "@/types/ai-coaches";

interface BrandProfileFormProps {
  shopDomain: string;
  onComplete?: () => void;
  onProfileUpdate?: () => void;
  onClose?: () => void;
  onReturnToCoaches?: () => void;
}

interface ProfileState {
  discount_comfort_level: DiscountComfortLevel | "";
  return_policy_summary: string;
  shipping_policy_summary: string;
  inventory_size: InventorySize | "";
  owner_time_constraint: OwnerTimeConstraint | "";
  primary_goal_this_quarter: string;
}

interface PolicyUrlState {
  return_policy_url: string;
  shipping_policy_url: string;
}

const DISCOUNT_OPTIONS: {
  value: DiscountComfortLevel;
  label: string;
  description: string;
}[] = [
  {
    value: "low",
    label: "Conservative",
    description: "Rarely discount, protect brand value",
  },
  {
    value: "moderate",
    label: "Moderate",
    description: "Strategic discounts for key moments",
  },
  {
    value: "aggressive",
    label: "Aggressive",
    description: "Frequent promotions to drive volume",
  },
];

const INVENTORY_OPTIONS: {
  value: InventorySize;
  label: string;
  description: string;
}[] = [
  { value: "small", label: "Small", description: "Under 100 SKUs" },
  { value: "medium", label: "Medium", description: "100-500 SKUs" },
  { value: "large", label: "Large", description: "Over 500 SKUs" },
];

const TIME_OPTIONS: {
  value: OwnerTimeConstraint;
  label: string;
  description: string;
}[] = [
  {
    value: "very_limited",
    label: "Very Limited",
    description: "Less than 10 hours/week",
  },
  { value: "moderate", label: "Moderate", description: "10-30 hours/week" },
  { value: "flexible", label: "Flexible", description: "Full-time or more" },
];

export function BrandProfileForm({
  shopDomain,
  onComplete,
  onProfileUpdate,
  onClose,
  onReturnToCoaches,
}: BrandProfileFormProps) {
  const [profile, setProfile] = useState<ProfileState>({
    discount_comfort_level: "",
    return_policy_summary: "",
    shipping_policy_summary: "",
    inventory_size: "",
    owner_time_constraint: "",
    primary_goal_this_quarter: "",
  });
  const [existingProfile, setExistingProfile] =
    useState<Partial<CoachBrandProfileFields> | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [isComplete, setIsComplete] = useState(false);

  // Policy URL states
  const [policyUrls, setPolicyUrls] = useState<PolicyUrlState>({
    return_policy_url: "",
    shipping_policy_url: "",
  });
  const [fetchingPolicy, setFetchingPolicy] = useState<
    "return" | "shipping" | null
  >(null);
  const [policyFetchError, setPolicyFetchError] = useState<string | null>(null);

  // Load existing profile
  useEffect(() => {
    const loadProfile = async () => {
      try {
        const response = await fetch("/api/ai-coaches/brand-profile", {
          headers: {
            Authorization: `Bearer ${shopDomain}`,
          },
        });

        if (response.ok) {
          const data = await response.json();
          if (data.success && data.data.profile) {
            const p = data.data.profile;
            setExistingProfile(p);
            setProfile({
              discount_comfort_level: p.discount_comfort_level || "",
              return_policy_summary: p.return_policy_summary || "",
              shipping_policy_summary: p.shipping_policy_summary || "",
              inventory_size: p.inventory_size || "",
              owner_time_constraint: p.owner_time_constraint || "",
              primary_goal_this_quarter: p.primary_goal_this_quarter || "",
            });
            setIsComplete(data.data.is_complete);
          }
        }
      } catch (err) {
        console.error("Failed to load profile:", err);
      } finally {
        setIsLoading(false);
      }
    };

    loadProfile();
  }, [shopDomain]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setError(null);
    setSuccess(false);

    // Build update payload with only changed/filled fields
    const updates: Record<string, string> = {};
    if (profile.discount_comfort_level) {
      updates.discount_comfort_level = profile.discount_comfort_level;
    }
    if (profile.return_policy_summary) {
      updates.return_policy_summary = profile.return_policy_summary;
    }
    if (profile.shipping_policy_summary) {
      updates.shipping_policy_summary = profile.shipping_policy_summary;
    }
    if (profile.inventory_size) {
      updates.inventory_size = profile.inventory_size;
    }
    if (profile.owner_time_constraint) {
      updates.owner_time_constraint = profile.owner_time_constraint;
    }
    if (profile.primary_goal_this_quarter) {
      updates.primary_goal_this_quarter = profile.primary_goal_this_quarter;
    }

    if (Object.keys(updates).length === 0) {
      setError("Please fill in at least one field");
      setIsSaving(false);
      return;
    }

    try {
      const response = await fetch("/api/ai-coaches/brand-profile", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${shopDomain}`,
        },
        body: JSON.stringify(updates),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || "Failed to save profile");
      }

      setSuccess(true);
      onProfileUpdate?.();

      // Check if profile is now complete
      const checkResponse = await fetch("/api/ai-coaches/brand-profile", {
        headers: {
          Authorization: `Bearer ${shopDomain}`,
        },
      });

      if (checkResponse.ok) {
        const checkData = await checkResponse.json();
        if (checkData.data?.is_complete) {
          setIsComplete(true);
          onComplete?.();
        }
      }
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "An error occurred";
      setError(errorMessage);
    } finally {
      setIsSaving(false);
    }
  };

  const handleRenderCoaches = async () => {
    setIsSaving(true);
    setError(null);

    try {
      const response = await fetch("/api/ai-coaches/render", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${shopDomain}`,
        },
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || "Failed to render coaches");
      }

      setSuccess(true);
      onComplete?.();
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "An error occurred";
      setError(errorMessage);
    } finally {
      setIsSaving(false);
    }
  };

  /**
   * Fetch and summarize a policy URL
   */
  const handleFetchPolicy = async (policyType: "return" | "shipping") => {
    const url =
      policyType === "return"
        ? policyUrls.return_policy_url
        : policyUrls.shipping_policy_url;

    if (!url) {
      setPolicyFetchError("Please enter a URL");
      return;
    }

    // Basic URL validation
    try {
      new URL(url);
    } catch {
      setPolicyFetchError(
        "Please enter a valid URL (e.g., https://yourstore.com/policies/shipping)",
      );
      return;
    }

    setFetchingPolicy(policyType);
    setPolicyFetchError(null);

    try {
      const response = await fetch("/api/ai-coaches/summarize-policy", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${shopDomain}`,
        },
        body: JSON.stringify({
          url,
          policy_type: policyType,
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || "Failed to fetch and summarize policy");
      }

      // Update the profile with the summarized content
      const fieldName =
        policyType === "return"
          ? "return_policy_summary"
          : "shipping_policy_summary";
      setProfile((prev) => ({
        ...prev,
        [fieldName]: data.data.summary,
      }));

      // Clear the URL field on success
      setPolicyUrls((prev) => ({
        ...prev,
        [`${policyType}_policy_url`]: "",
      }));
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Failed to fetch policy";
      setPolicyFetchError(errorMessage);
    } finally {
      setFetchingPolicy(null);
    }
  };

  if (isLoading) {
    return (
      <div
        className="flex items-center justify-center"
        style={{ padding: "80px" }}
      >
        <RefreshCw
          className="h-8 w-8 animate-spin"
          style={{ color: "#0066cc" }}
        />
      </div>
    );
  }

  return (
    <Card
      style={{
        background: "#ffffff",
        border: "1px solid #e5e7eb",
        borderRadius: "8px",
        boxShadow: "0 2px 8px rgba(0, 0, 0, 0.08)",
      }}
    >
      <CardHeader
        style={{ padding: "24px", borderBottom: "1px solid #e5e7eb" }}
      >
        <CardTitle
          style={{
            fontSize: "20px",
            fontWeight: 700,
            color: "#003366",
            fontFamily:
              'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
          }}
        >
          Coach Profile Setup
        </CardTitle>
        <CardDescription
          style={{
            fontSize: "14px",
            color: "#6b7280",
            fontFamily:
              'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
          }}
        >
          Help your AI coaches understand your business better. This information
          personalizes their advice.
        </CardDescription>
      </CardHeader>

      <CardContent style={{ padding: "24px" }}>
        {error && (
          <Alert
            variant="destructive"
            style={{
              background: "#fef2f2",
              border: "1px solid #fecaca",
              borderRadius: "8px",
              padding: "16px",
              marginBottom: "24px",
            }}
          >
            <AlertCircle className="h-4 w-4" style={{ color: "#991b1b" }} />
            <AlertTitle
              style={{
                fontSize: "14px",
                fontWeight: 600,
                color: "#991b1b",
                marginBottom: "4px",
              }}
            >
              Error
            </AlertTitle>
            <AlertDescription style={{ fontSize: "13px", color: "#991b1b" }}>
              {error}
            </AlertDescription>
          </Alert>
        )}

        {existingProfile?.boutique_name && (
          <div
            style={{
              background: "#f0f9ff",
              border: "1px solid #bae6fd",
              borderRadius: "8px",
              padding: "16px",
              marginBottom: "24px",
            }}
          >
            <p
              style={{
                fontSize: "14px",
                color: "#0369a1",
                fontFamily:
                  'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
              }}
            >
              <strong>Store:</strong> {existingProfile.boutique_name}
              {existingProfile.boutique_type && (
                <span style={{ marginLeft: "16px" }}>
                  <strong>Type:</strong> {existingProfile.boutique_type}
                </span>
              )}
            </p>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="grid gap-6">
            {/* Discount Comfort Level */}
            <div>
              <Label
                htmlFor="discount_comfort_level"
                style={{
                  fontSize: "14px",
                  fontWeight: 600,
                  color: "#003366",
                  fontFamily:
                    'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
                  display: "block",
                  marginBottom: "8px",
                }}
              >
                Discount Comfort Level *
              </Label>
              <Select
                value={profile.discount_comfort_level}
                onValueChange={(value) =>
                  setProfile((prev) => ({
                    ...prev,
                    discount_comfort_level: value as DiscountComfortLevel,
                  }))
                }
              >
                <SelectTrigger style={{ borderRadius: "8px" }}>
                  <SelectValue placeholder="Select your approach to discounting" />
                </SelectTrigger>
                <SelectContent>
                  {DISCOUNT_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      <div>
                        <span style={{ fontWeight: 500 }}>{option.label}</span>
                        <span style={{ color: "#6b7280", marginLeft: "8px" }}>
                          - {option.description}
                        </span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Owner Time Constraint */}
            <div>
              <Label
                htmlFor="owner_time_constraint"
                style={{
                  fontSize: "14px",
                  fontWeight: 600,
                  color: "#003366",
                  fontFamily:
                    'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
                  display: "block",
                  marginBottom: "8px",
                }}
              >
                Time Available for Business *
              </Label>
              <Select
                value={profile.owner_time_constraint}
                onValueChange={(value) =>
                  setProfile((prev) => ({
                    ...prev,
                    owner_time_constraint: value as OwnerTimeConstraint,
                  }))
                }
              >
                <SelectTrigger style={{ borderRadius: "8px" }}>
                  <SelectValue placeholder="How much time can you dedicate weekly?" />
                </SelectTrigger>
                <SelectContent>
                  {TIME_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      <div>
                        <span style={{ fontWeight: 500 }}>{option.label}</span>
                        <span style={{ color: "#6b7280", marginLeft: "8px" }}>
                          - {option.description}
                        </span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Inventory Size */}
            <div>
              <Label
                htmlFor="inventory_size"
                style={{
                  fontSize: "14px",
                  fontWeight: 600,
                  color: "#003366",
                  fontFamily:
                    'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
                  display: "block",
                  marginBottom: "8px",
                }}
              >
                Inventory Size
              </Label>
              <Select
                value={profile.inventory_size}
                onValueChange={(value) =>
                  setProfile((prev) => ({
                    ...prev,
                    inventory_size: value as InventorySize,
                  }))
                }
              >
                <SelectTrigger style={{ borderRadius: "8px" }}>
                  <SelectValue placeholder="Approximately how many products?" />
                </SelectTrigger>
                <SelectContent>
                  {INVENTORY_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      <div>
                        <span style={{ fontWeight: 500 }}>{option.label}</span>
                        <span style={{ color: "#6b7280", marginLeft: "8px" }}>
                          - {option.description}
                        </span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Return Policy */}
            <div>
              <Label
                htmlFor="return_policy_summary"
                style={{
                  fontSize: "14px",
                  fontWeight: 600,
                  color: "#003366",
                  fontFamily:
                    'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
                  display: "block",
                  marginBottom: "8px",
                }}
              >
                Return Policy Summary
              </Label>

              {/* URL Fetch Section */}
              <div
                style={{
                  background: "#f8fafc",
                  border: "1px solid #e2e8f0",
                  borderRadius: "8px",
                  padding: "12px",
                  marginBottom: "12px",
                }}
              >
                <div
                  className="flex items-center gap-2"
                  style={{ marginBottom: "8px" }}
                >
                  <Link className="h-4 w-4" style={{ color: "#64748b" }} />
                  <span
                    style={{
                      fontSize: "13px",
                      color: "#64748b",
                      fontFamily:
                        'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
                    }}
                  >
                    Auto-generate from URL
                  </span>
                </div>
                <div className="flex gap-2">
                  <Input
                    type="url"
                    value={policyUrls.return_policy_url}
                    onChange={(e) =>
                      setPolicyUrls((prev) => ({
                        ...prev,
                        return_policy_url: e.target.value,
                      }))
                    }
                    placeholder="https://yourstore.com/policies/returns"
                    style={{
                      borderRadius: "6px",
                      fontSize: "13px",
                      flex: 1,
                    }}
                    disabled={fetchingPolicy === "return"}
                  />
                  <Button
                    type="button"
                    onClick={() => handleFetchPolicy("return")}
                    disabled={
                      fetchingPolicy !== null || !policyUrls.return_policy_url
                    }
                    style={{
                      background:
                        fetchingPolicy === "return" ? "#e5e7eb" : "#8b5cf6",
                      color: "#ffffff",
                      borderRadius: "6px",
                      padding: "8px 12px",
                      fontSize: "13px",
                      fontWeight: 500,
                      border: "none",
                      cursor:
                        fetchingPolicy !== null || !policyUrls.return_policy_url
                          ? "not-allowed"
                          : "pointer",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {fetchingPolicy === "return" ? (
                      <>
                        <RefreshCw className="h-4 w-4 animate-spin mr-1" />
                        Fetching...
                      </>
                    ) : (
                      <>
                        <Sparkles className="h-4 w-4 mr-1" />
                        Summarize
                      </>
                    )}
                  </Button>
                </div>
                {policyFetchError && fetchingPolicy === null && (
                  <p
                    style={{
                      fontSize: "12px",
                      color: "#dc2626",
                      marginTop: "8px",
                      fontFamily:
                        'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
                    }}
                  >
                    {policyFetchError}
                  </p>
                )}
              </div>

              <Textarea
                id="return_policy_summary"
                value={profile.return_policy_summary}
                onChange={(e) =>
                  setProfile((prev) => ({
                    ...prev,
                    return_policy_summary: e.target.value,
                  }))
                }
                placeholder="e.g., 30-day returns on unworn items with tags, no restocking fee"
                rows={2}
                style={{
                  borderRadius: "8px",
                  fontSize: "14px",
                  fontFamily:
                    'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
                }}
              />
              <p
                style={{
                  fontSize: "12px",
                  color: "#6b7280",
                  marginTop: "6px",
                  fontFamily:
                    'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
                }}
              >
                Paste your return policy URL above or type a summary directly
              </p>
            </div>

            {/* Shipping Policy */}
            <div>
              <Label
                htmlFor="shipping_policy_summary"
                style={{
                  fontSize: "14px",
                  fontWeight: 600,
                  color: "#003366",
                  fontFamily:
                    'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
                  display: "block",
                  marginBottom: "8px",
                }}
              >
                Shipping Policy Summary
              </Label>

              {/* URL Fetch Section */}
              <div
                style={{
                  background: "#f8fafc",
                  border: "1px solid #e2e8f0",
                  borderRadius: "8px",
                  padding: "12px",
                  marginBottom: "12px",
                }}
              >
                <div
                  className="flex items-center gap-2"
                  style={{ marginBottom: "8px" }}
                >
                  <Link className="h-4 w-4" style={{ color: "#64748b" }} />
                  <span
                    style={{
                      fontSize: "13px",
                      color: "#64748b",
                      fontFamily:
                        'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
                    }}
                  >
                    Auto-generate from URL
                  </span>
                </div>
                <div className="flex gap-2">
                  <Input
                    type="url"
                    value={policyUrls.shipping_policy_url}
                    onChange={(e) =>
                      setPolicyUrls((prev) => ({
                        ...prev,
                        shipping_policy_url: e.target.value,
                      }))
                    }
                    placeholder="https://yourstore.com/policies/shipping"
                    style={{
                      borderRadius: "6px",
                      fontSize: "13px",
                      flex: 1,
                    }}
                    disabled={fetchingPolicy === "shipping"}
                  />
                  <Button
                    type="button"
                    onClick={() => handleFetchPolicy("shipping")}
                    disabled={
                      fetchingPolicy !== null || !policyUrls.shipping_policy_url
                    }
                    style={{
                      background:
                        fetchingPolicy === "shipping" ? "#e5e7eb" : "#8b5cf6",
                      color: "#ffffff",
                      borderRadius: "6px",
                      padding: "8px 12px",
                      fontSize: "13px",
                      fontWeight: 500,
                      border: "none",
                      cursor:
                        fetchingPolicy !== null ||
                        !policyUrls.shipping_policy_url
                          ? "not-allowed"
                          : "pointer",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {fetchingPolicy === "shipping" ? (
                      <>
                        <RefreshCw className="h-4 w-4 animate-spin mr-1" />
                        Fetching...
                      </>
                    ) : (
                      <>
                        <Sparkles className="h-4 w-4 mr-1" />
                        Summarize
                      </>
                    )}
                  </Button>
                </div>
                {policyFetchError && fetchingPolicy === null && (
                  <p
                    style={{
                      fontSize: "12px",
                      color: "#dc2626",
                      marginTop: "8px",
                      fontFamily:
                        'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
                    }}
                  >
                    {policyFetchError}
                  </p>
                )}
              </div>

              <Textarea
                id="shipping_policy_summary"
                value={profile.shipping_policy_summary}
                onChange={(e) =>
                  setProfile((prev) => ({
                    ...prev,
                    shipping_policy_summary: e.target.value,
                  }))
                }
                placeholder="e.g., Free shipping over $75, 3-5 business days, ships from California"
                rows={2}
                style={{
                  borderRadius: "8px",
                  fontSize: "14px",
                  fontFamily:
                    'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
                }}
              />
              <p
                style={{
                  fontSize: "12px",
                  color: "#6b7280",
                  marginTop: "6px",
                  fontFamily:
                    'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
                }}
              >
                Paste your shipping policy URL above or type a summary directly
              </p>
            </div>

            {/* Primary Goal */}
            <div>
              <Label
                htmlFor="primary_goal_this_quarter"
                style={{
                  fontSize: "14px",
                  fontWeight: 600,
                  color: "#003366",
                  fontFamily:
                    'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
                  display: "block",
                  marginBottom: "8px",
                }}
              >
                Primary Goal This Quarter
              </Label>
              <Textarea
                id="primary_goal_this_quarter"
                value={profile.primary_goal_this_quarter}
                onChange={(e) =>
                  setProfile((prev) => ({
                    ...prev,
                    primary_goal_this_quarter: e.target.value,
                  }))
                }
                placeholder="e.g., Launch new spring collection, increase repeat customer rate, clear winter inventory"
                rows={2}
                style={{
                  borderRadius: "8px",
                  fontSize: "14px",
                  fontFamily:
                    'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
                }}
              />
            </div>
          </div>

          <div
            style={{
              marginTop: "32px",
              paddingTop: "24px",
              borderTop: "1px solid #e5e7eb",
            }}
          >
            {/* Success state - show message and action buttons */}
            {success ? (
              <div
                className="flex flex-col items-center"
                style={{ gap: "20px" }}
              >
                {/* Success message */}
                <div
                  className="flex items-center"
                  style={{
                    gap: "12px",
                    padding: "16px 24px",
                    background: "#dcfce7",
                    borderRadius: "8px",
                    border: "1px solid #86efac",
                  }}
                >
                  <CheckCircle
                    className="h-5 w-5"
                    style={{ color: "#166534" }}
                  />
                  <span
                    style={{
                      fontSize: "15px",
                      fontWeight: 600,
                      color: "#166534",
                      fontFamily:
                        'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
                    }}
                  >
                    Profile successfully saved
                  </span>
                </div>

                {/* Action buttons */}
                <div className="flex" style={{ gap: "12px" }}>
                  <Button
                    type="button"
                    onClick={() => {
                      setSuccess(false);
                      onClose?.();
                    }}
                    style={{
                      background: "#ffffff",
                      color: "#374151",
                      borderRadius: "8px",
                      padding: "12px 24px",
                      fontSize: "14px",
                      fontWeight: 600,
                      fontFamily:
                        'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
                      border: "1px solid #d1d5db",
                      cursor: "pointer",
                    }}
                  >
                    <X className="h-4 w-4 mr-2" />
                    Close
                  </Button>

                  <Button
                    type="button"
                    onClick={() => {
                      onReturnToCoaches?.();
                    }}
                    style={{
                      background: "#0066cc",
                      color: "#ffffff",
                      borderRadius: "8px",
                      padding: "12px 24px",
                      fontSize: "14px",
                      fontWeight: 600,
                      fontFamily:
                        'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
                      border: "none",
                      cursor: "pointer",
                    }}
                  >
                    Return to AI Coaches
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </Button>
                </div>
              </div>
            ) : (
              /* Normal state - show save button */
              <div className="flex items-center justify-between">
                <p
                  style={{
                    fontSize: "13px",
                    color: "#6b7280",
                    fontFamily:
                      'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
                  }}
                >
                  * Required fields
                </p>
                <div className="flex" style={{ gap: "12px" }}>
                  <Button
                    type="submit"
                    disabled={isSaving}
                    style={{
                      background: isSaving ? "#e5e7eb" : "#0066cc",
                      color: "#ffffff",
                      borderRadius: "8px",
                      padding: "12px 24px",
                      fontSize: "14px",
                      fontWeight: 600,
                      fontFamily:
                        'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
                      border: "none",
                      cursor: isSaving ? "not-allowed" : "pointer",
                    }}
                  >
                    {isSaving ? (
                      <RefreshCw className="h-4 w-4 animate-spin mr-2" />
                    ) : (
                      <Save className="h-4 w-4 mr-2" />
                    )}
                    Save Profile
                  </Button>

                  {isComplete && (
                    <Button
                      type="button"
                      onClick={handleRenderCoaches}
                      disabled={isSaving}
                      style={{
                        background: isSaving ? "#e5e7eb" : "#166534",
                        color: "#ffffff",
                        borderRadius: "8px",
                        padding: "12px 24px",
                        fontSize: "14px",
                        fontWeight: 600,
                        fontFamily:
                          'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
                        border: "none",
                        cursor: isSaving ? "not-allowed" : "pointer",
                      }}
                    >
                      {isSaving ? (
                        <RefreshCw className="h-4 w-4 animate-spin mr-2" />
                      ) : (
                        <CheckCircle className="h-4 w-4 mr-2" />
                      )}
                      Activate Coaches
                    </Button>
                  )}
                </div>
              </div>
            )}
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
