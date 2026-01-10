"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, Building2, Loader2 } from "lucide-react";
import { useShop } from "@/hooks/useShop";
import { useOnboardingProgress } from "@/hooks/useOnboardingProgress";
import {
  ShopProfile,
  INDUSTRY_OPTIONS,
  BUSINESS_SIZE_OPTIONS,
  ONBOARDING_STEPS,
} from "@/types/onboarding";

const PRODUCT_TYPE_SUGGESTIONS = [
  "Clothing & Apparel",
  "Shoes & Footwear",
  "Accessories",
  "Skincare",
  "Makeup & Cosmetics",
  "Hair Care",
  "Supplements",
  "Fitness Equipment",
  "Home Decor",
  "Furniture",
  "Kitchen & Dining",
  "Electronics",
  "Gadgets",
  "Food & Snacks",
  "Beverages",
  "Pet Food",
  "Pet Accessories",
  "Jewelry",
  "Watches",
  "Bags & Luggage",
  "Art & Prints",
  "Craft Supplies",
  "Books",
  "Toys",
  "Baby Products",
  "Office Supplies",
];

export default function ShopProfilePage() {
  const router = useRouter();
  const { shopId } = useShop();
  const { progress, advanceToStep, markStepCompleted } = useOnboardingProgress();

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState<ShopProfile>({
    business_name: "",
    business_description: "",
    industry: "",
    product_types: [],
    business_size: "",
  });

  const [productTypeInput, setProductTypeInput] = useState("");

  // Fetch existing profile data
  useEffect(() => {
    async function fetchProfile() {
      try {
        const response = await fetch("/api/shops/profile");
        const data = await response.json();
        if (data.success && data.data) {
          setFormData({
            business_name: data.data.business_name || "",
            business_description: data.data.business_description || "",
            industry: data.data.industry || "",
            product_types: data.data.product_types || [],
            business_size: data.data.business_size || "",
          });
        }
      } catch {
        // Ignore fetch errors, just use defaults
      } finally {
        setIsLoading(false);
      }
    }
    fetchProfile();
  }, []);

  const handleAddProductType = (type: string) => {
    const trimmed = type.trim();
    if (trimmed && !formData.product_types.includes(trimmed)) {
      setFormData((prev) => ({
        ...prev,
        product_types: [...prev.product_types, trimmed],
      }));
    }
    setProductTypeInput("");
  };

  const handleRemoveProductType = (type: string) => {
    setFormData((prev) => ({
      ...prev,
      product_types: prev.product_types.filter((t) => t !== type),
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSaving(true);

    try {
      // Save profile data
      const response = await fetch("/api/shops/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          business_description: formData.business_description,
          industry: formData.industry,
          product_types: formData.product_types,
          business_size: formData.business_size,
        }),
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || "Failed to save profile");
      }

      // Mark step as completed and advance
      await markStepCompleted("shopProfile");
      await advanceToStep(ONBOARDING_STEPS.BRAND_VOICE);

      // Navigate to next step
      router.push(`/stores/${shopId}/onboarding/voice`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save profile");
    } finally {
      setIsSaving(false);
    }
  };

  const handleBack = () => {
    router.push(`/stores/${shopId}/onboarding`);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    );
  }

  const isFormValid =
    formData.business_description.trim().length > 0 &&
    formData.industry.length > 0 &&
    formData.business_size.length > 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center space-y-2">
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-blue-100 mx-auto">
          <Building2 className="w-6 h-6 text-blue-600" />
        </div>
        <h2 className="text-2xl font-bold text-gray-900">Tell Us About Your Business</h2>
        <p className="text-gray-600">
          This helps us tailor AI-generated content to your specific needs
        </p>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Business Name (read-only from Shopify) */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Business Name
          </label>
          <input
            type="text"
            value={formData.business_name}
            disabled
            className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-500"
          />
          <p className="mt-1 text-xs text-gray-500">From your Shopify store</p>
        </div>

        {/* Business Description */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Business Description <span className="text-red-500">*</span>
          </label>
          <textarea
            value={formData.business_description}
            onChange={(e) =>
              setFormData((prev) => ({
                ...prev,
                business_description: e.target.value,
              }))
            }
            placeholder="Briefly describe what your business does and what makes it unique..."
            rows={3}
            className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
          />
          <p className="mt-1 text-xs text-gray-500">
            1-2 sentences about your business
          </p>
        </div>

        {/* Industry */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Industry <span className="text-red-500">*</span>
          </label>
          <select
            value={formData.industry}
            onChange={(e) =>
              setFormData((prev) => ({ ...prev, industry: e.target.value }))
            }
            className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
          >
            <option value="">Select your industry...</option>
            {INDUSTRY_OPTIONS.map((industry) => (
              <option key={industry} value={industry}>
                {industry}
              </option>
            ))}
          </select>
        </div>

        {/* Product Types */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Product Types
          </label>
          <div className="space-y-3">
            {/* Selected tags */}
            {formData.product_types.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {formData.product_types.map((type) => (
                  <span
                    key={type}
                    className="inline-flex items-center gap-1 px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm"
                  >
                    {type}
                    <button
                      type="button"
                      onClick={() => handleRemoveProductType(type)}
                      className="hover:text-blue-900"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            )}

            {/* Input */}
            <div className="flex gap-2">
              <input
                type="text"
                value={productTypeInput}
                onChange={(e) => setProductTypeInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleAddProductType(productTypeInput);
                  }
                }}
                placeholder="Type or select product types..."
                className="flex-1 px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <button
                type="button"
                onClick={() => handleAddProductType(productTypeInput)}
                disabled={!productTypeInput.trim()}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 disabled:opacity-50"
              >
                Add
              </button>
            </div>

            {/* Suggestions */}
            <div className="flex flex-wrap gap-2">
              {PRODUCT_TYPE_SUGGESTIONS.filter(
                (s) => !formData.product_types.includes(s)
              )
                .slice(0, 8)
                .map((suggestion) => (
                  <button
                    key={suggestion}
                    type="button"
                    onClick={() => handleAddProductType(suggestion)}
                    className="px-3 py-1 bg-gray-50 text-gray-600 rounded-full text-sm hover:bg-gray-100 border border-gray-200"
                  >
                    + {suggestion}
                  </button>
                ))}
            </div>
          </div>
        </div>

        {/* Business Size */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Business Size <span className="text-red-500">*</span>
          </label>
          <div className="grid grid-cols-2 gap-3">
            {BUSINESS_SIZE_OPTIONS.map((size) => (
              <button
                key={size}
                type="button"
                onClick={() =>
                  setFormData((prev) => ({ ...prev, business_size: size }))
                }
                className={`
                  px-4 py-3 rounded-xl border-2 text-sm font-medium transition-colors text-left
                  ${
                    formData.business_size === size
                      ? "border-blue-500 bg-blue-50 text-blue-700"
                      : "border-gray-200 bg-white text-gray-700 hover:border-gray-300"
                  }
                `}
              >
                {size}
              </button>
            ))}
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
            {error}
          </div>
        )}

        {/* Navigation */}
        <div className="flex justify-between pt-4">
          <button
            type="button"
            onClick={handleBack}
            className="inline-flex items-center gap-2 px-6 py-3 text-gray-600 hover:text-gray-900"
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </button>
          <button
            type="submit"
            disabled={!isFormValid || isSaving}
            className="
              inline-flex items-center gap-2 px-8 py-3 rounded-xl
              bg-blue-600 text-white font-semibold
              hover:bg-blue-700 transition-colors
              disabled:opacity-50 disabled:cursor-not-allowed
            "
          >
            {isSaving ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                Continue
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
