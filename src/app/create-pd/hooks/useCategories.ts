"use client";

import { useState, useEffect, useCallback } from "react";
import { logger } from "@/lib/logger";

interface Category {
  id: string;
  name: string;
  [key: string]: unknown;
}

interface UseCategoriesParams {
  shop: string | null;
  authenticated: string | null;
}

interface UseCategoriesReturn {
  customCategories: Category[];
  parentCategories: Category[];
  subCategories: Category[];
  categoriesLoading: boolean;
  categoriesError: string | null;
  selectedParentCategory: string;
  selectedSubCategory: string;
  setSelectedParentCategory: (value: string) => void;
  setSelectedSubCategory: (value: string) => void;
  categoryOptions: { label: string; value: string }[];
}

const defaultCategories = [
  "Fashion & Apparel",
  "Electronics & Gadgets",
  "Home & Garden",
  "Health & Beauty",
  "Sports & Outdoors",
  "Books & Media",
  "Toys & Games",
  "Food & Beverages",
  "Automotive",
  "Arts & Crafts",
  "Jewelry & Accessories",
  "Office & Business",
  "Pet Supplies",
  "Other",
];

export function useCategories({
  shop,
  authenticated,
}: UseCategoriesParams): UseCategoriesReturn {
  const [customCategories, setCustomCategories] = useState<Category[]>([]);
  const [parentCategories, setParentCategories] = useState<Category[]>([]);
  const [subCategories, setSubCategories] = useState<Category[]>([]);
  const [categoriesLoading, setCategoriesLoading] = useState(true);
  const [categoriesError, setCategoriesError] = useState<string | null>(null);
  const [selectedParentCategory, setSelectedParentCategory] = useState("");
  const [selectedSubCategory, setSelectedSubCategory] = useState("");

  const fetchCustomCategories = useCallback(async () => {
    try {
      const response = await fetch(`/api/categories?shop=${shop}`);

      if (!response.ok) {
        const errorMsg = `Categories API error: ${response.status} ${response.statusText}`;
        logger.error(errorMsg, new Error(errorMsg), {
          component: "useCategories",
          operation: "fetchCustomCategories",
          status: response.status,
          shop,
        });
        setCategoriesError(errorMsg);
        return;
      }

      const data = await response.json();

      if (data.success && data.data.length > 0) {
        setCustomCategories(data.data);
        setCategoriesError(null);
      } else {
        console.log("No custom categories found, using defaults");
      }
    } catch (err) {
      const errorMsg = `Failed to load categories: ${err instanceof Error ? err.message : "Unknown error"}`;
      logger.error(errorMsg, err as Error, {
        component: "useCategories",
        operation: "fetchCustomCategories",
        shop,
      });
      setCategoriesError(errorMsg);
    } finally {
      setCategoriesLoading(false);
    }
  }, [shop]);

  const fetchParentCategories = useCallback(async () => {
    try {
      const response = await fetch(
        `/api/categories/children?shop=${shop}&parentId=null`,
      );
      const data = await response.json();

      if (data.success) {
        setParentCategories(data.data);
      }
    } catch (err) {
      logger.error("Error fetching parent categories", err as Error, {
        component: "useCategories",
        operation: "fetchParentCategories",
        shop,
      });
    }
  }, [shop]);

  const fetchSubCategories = useCallback(
    async (parentId: string) => {
      try {
        const response = await fetch(
          `/api/categories/children?shop=${shop}&parentId=${parentId}`,
        );
        const data = await response.json();

        if (data.success) {
          setSubCategories(data.data);
        }
      } catch (err) {
        logger.error("Error fetching sub-categories", err as Error, {
          component: "useCategories",
          operation: "fetchSubCategories",
          shop,
          parentId,
        });
      }
    },
    [shop],
  );

  // Fetch initial data on component mount
  useEffect(() => {
    if (shop && authenticated) {
      fetchCustomCategories();
      fetchParentCategories();
    }
  }, [shop, authenticated, fetchCustomCategories, fetchParentCategories]);

  // Load sub-categories when parent category is selected
  useEffect(() => {
    if (selectedParentCategory) {
      fetchSubCategories(selectedParentCategory);
    } else {
      setSubCategories([]);
      setSelectedSubCategory("");
    }
  }, [selectedParentCategory, fetchSubCategories]);

  // Generate category options from custom categories or fallback to defaults
  const categoryOptions = [
    { label: "Select a category", value: "" },
    ...(customCategories && customCategories.length > 0
      ? customCategories.map((cat) => ({ label: cat.name, value: cat.name }))
      : defaultCategories.map((cat) => ({ label: cat, value: cat }))),
  ];

  return {
    customCategories,
    parentCategories,
    subCategories,
    categoriesLoading,
    categoriesError,
    selectedParentCategory,
    selectedSubCategory,
    setSelectedParentCategory,
    setSelectedSubCategory,
    categoryOptions,
  };
}
