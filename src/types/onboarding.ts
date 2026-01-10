/**
 * Unified Onboarding System Types
 *
 * Types for the step-by-step onboarding flow that captures:
 * - Shop Profile (business info)
 * - Brand Voice (writing samples)
 * - Business Profile (interview)
 */

// Onboarding step constants
export const ONBOARDING_STEPS = {
  NOT_STARTED: 0,
  WELCOME: 1,
  SHOP_PROFILE: 2,
  BRAND_VOICE: 3,
  BUSINESS_INTERVIEW: 4,
  COMPLETE: 5,
} as const;

export type OnboardingStep = (typeof ONBOARDING_STEPS)[keyof typeof ONBOARDING_STEPS];

// Step metadata for UI rendering
export interface OnboardingStepInfo {
  step: OnboardingStep;
  name: string;
  description: string;
  path: string;
  isRequired: boolean;
}

export const ONBOARDING_STEP_INFO: OnboardingStepInfo[] = [
  {
    step: ONBOARDING_STEPS.WELCOME,
    name: "Welcome",
    description: "Introduction to Thunder Text",
    path: "",
    isRequired: true,
  },
  {
    step: ONBOARDING_STEPS.SHOP_PROFILE,
    name: "Shop Profile",
    description: "Tell us about your business",
    path: "/profile",
    isRequired: true,
  },
  {
    step: ONBOARDING_STEPS.BRAND_VOICE,
    name: "Brand Voice",
    description: "Upload writing samples",
    path: "/voice",
    isRequired: true,
  },
  {
    step: ONBOARDING_STEPS.BUSINESS_INTERVIEW,
    name: "Business Interview",
    description: "Answer questions about your business",
    path: "/interview",
    isRequired: true,
  },
  {
    step: ONBOARDING_STEPS.COMPLETE,
    name: "Complete",
    description: "You're all set!",
    path: "/complete",
    isRequired: true,
  },
];

// Industry options for shop profile
export const INDUSTRY_OPTIONS = [
  "Fashion & Apparel",
  "Beauty & Cosmetics",
  "Health & Wellness",
  "Home & Garden",
  "Electronics & Technology",
  "Food & Beverage",
  "Sports & Outdoors",
  "Toys & Games",
  "Pet Supplies",
  "Jewelry & Accessories",
  "Art & Crafts",
  "Books & Media",
  "Automotive",
  "Baby & Kids",
  "Office & Business",
  "Other",
] as const;

export type Industry = (typeof INDUSTRY_OPTIONS)[number];

// Business size options
export const BUSINESS_SIZE_OPTIONS = [
  "Solo (just me)",
  "Small (2-10 employees)",
  "Medium (11-50 employees)",
  "Enterprise (50+ employees)",
] as const;
export type BusinessSize = (typeof BUSINESS_SIZE_OPTIONS)[number];

// Shop profile data structure
export interface ShopProfile {
  business_name: string;
  business_description: string;
  industry: Industry | string;
  product_types: string[];
  business_size: BusinessSize | "";
}

// Onboarding progress state
export interface OnboardingProgress {
  currentStep: OnboardingStep;
  shopProfileCompleted: boolean;
  voiceProfileCompleted: boolean;
  businessProfileCompleted: boolean;
  onboardingCompleted: boolean;
}

// API response types
export interface OnboardingProgressResponse {
  success: boolean;
  data: OnboardingProgress;
  error?: string;
}

export interface ShopProfileResponse {
  success: boolean;
  data: ShopProfile | null;
  error?: string;
}

// Update payload types
export interface UpdateOnboardingProgressPayload {
  step?: OnboardingStep;
  shopProfileCompleted?: boolean;
  voiceProfileCompleted?: boolean;
  businessProfileCompleted?: boolean;
}

export interface UpdateShopProfilePayload {
  business_name?: string;
  business_description?: string;
  industry?: string;
  product_types?: string[];
  business_size?: string;
}

// Helper functions
export function getStepInfo(step: OnboardingStep): OnboardingStepInfo | undefined {
  return ONBOARDING_STEP_INFO.find((info) => info.step === step);
}

export function getNextStep(currentStep: OnboardingStep): OnboardingStep {
  if (currentStep >= ONBOARDING_STEPS.COMPLETE) {
    return ONBOARDING_STEPS.COMPLETE;
  }
  return (currentStep + 1) as OnboardingStep;
}

export function getPreviousStep(currentStep: OnboardingStep): OnboardingStep {
  if (currentStep <= ONBOARDING_STEPS.WELCOME) {
    return ONBOARDING_STEPS.WELCOME;
  }
  return (currentStep - 1) as OnboardingStep;
}

export function isStepCompleted(
  step: OnboardingStep,
  progress: OnboardingProgress
): boolean {
  switch (step) {
    case ONBOARDING_STEPS.WELCOME:
      return progress.currentStep > ONBOARDING_STEPS.WELCOME;
    case ONBOARDING_STEPS.SHOP_PROFILE:
      return progress.shopProfileCompleted;
    case ONBOARDING_STEPS.BRAND_VOICE:
      return progress.voiceProfileCompleted;
    case ONBOARDING_STEPS.BUSINESS_INTERVIEW:
      return progress.businessProfileCompleted;
    case ONBOARDING_STEPS.COMPLETE:
      return progress.onboardingCompleted;
    default:
      return false;
  }
}

export function canProceedToStep(
  targetStep: OnboardingStep,
  progress: OnboardingProgress
): boolean {
  // Welcome is always accessible
  if (targetStep === ONBOARDING_STEPS.WELCOME) return true;

  // Shop Profile requires Welcome completed
  if (targetStep === ONBOARDING_STEPS.SHOP_PROFILE) {
    return progress.currentStep >= ONBOARDING_STEPS.WELCOME;
  }

  // Brand Voice requires Shop Profile completed
  if (targetStep === ONBOARDING_STEPS.BRAND_VOICE) {
    return progress.shopProfileCompleted;
  }

  // Business Interview requires Brand Voice completed
  if (targetStep === ONBOARDING_STEPS.BUSINESS_INTERVIEW) {
    return progress.voiceProfileCompleted;
  }

  // Complete requires all previous steps
  if (targetStep === ONBOARDING_STEPS.COMPLETE) {
    return (
      progress.shopProfileCompleted &&
      progress.voiceProfileCompleted &&
      progress.businessProfileCompleted
    );
  }

  return false;
}
