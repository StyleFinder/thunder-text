/**
 * Prompt Types and Constants
 *
 * This file contains ONLY types and constants that can be safely imported
 * on both client and server side. It does NOT import supabaseAdmin.
 *
 * For server-side database functions, use @/lib/prompts instead.
 */

// Types for prompt system
export interface SystemPrompt {
  id: string;
  name: string;
  content: string;
  is_default: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  store_id: string;
}

export interface CategoryTemplate {
  id: string;
  name: string;
  category: string;
  content: string;
  is_default: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  store_id: string;
}

export interface CombinedPrompt {
  system_prompt: string;
  category_template: string;
  combined: string;
}

// Product categories - keeping for backward compatibility with existing components
export const PRODUCT_CATEGORIES = [
  { value: "clothing", label: "Clothing" },
  { value: "jewelry_accessories", label: "Jewelry & Accessories" },
  { value: "home_living", label: "Home & Living" },
  { value: "beauty_personal_care", label: "Beauty & Personal Care" },
  { value: "general", label: "General Products" },
] as const;

export type ProductCategory = (typeof PRODUCT_CATEGORIES)[number]["value"];
