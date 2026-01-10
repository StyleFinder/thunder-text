"use client";

import { useState, useEffect } from "react";
import { logger } from "@/lib/logger";
import {
  fetchProductDataForPrePopulation,
  formatKeyFeatures,
  formatSizingData,
  type PrePopulatedProductData,
} from "@/lib/shopify/product-prepopulation";
import { type ProductCategory } from "@/lib/prompts-types";

interface UseProductDataParams {
  source: string | null;
  productId: string | null;
  shop: string | null;
  productTypeParam: string | null;
  vendor: string | null;
}

interface UseProductDataReturn {
  prePopulatedData: PrePopulatedProductData | null;
  dataLoading: boolean;
  dataLoadError: string | null;
  initialFormValues: {
    selectedTemplate: ProductCategory;
    productType: string;
    targetAudience: string;
    fabricMaterial: string;
    keyFeatures: string;
    availableSizing: string;
    additionalNotes: string;
  } | null;
}

export function useProductData({
  source,
  productId,
  shop,
  productTypeParam,
  vendor,
}: UseProductDataParams): UseProductDataReturn {
  const [prePopulatedData, setPrePopulatedData] =
    useState<PrePopulatedProductData | null>(null);
  const [dataLoading, setDataLoading] = useState(false);
  const [dataLoadError, setDataLoadError] = useState<string | null>(null);
  const [initialFormValues, setInitialFormValues] =
    useState<UseProductDataReturn["initialFormValues"]>(null);

  useEffect(() => {
    // Q5: Track mounted state to prevent memory leaks
    let isMounted = true;

    async function fetchProductData() {
      if (source === "admin_extension" && productId && shop) {
        if (isMounted) {
          setDataLoading(true);
          setDataLoadError(null);
        }

        try {
          const data = await fetchProductDataForPrePopulation(productId, shop);

          // Check if component is still mounted before updating state
          if (!isMounted) return;

          if (data) {
            setPrePopulatedData(data);

            // Prepare initial form values
            const formValues: UseProductDataReturn["initialFormValues"] = {
              selectedTemplate:
                (data.category.primary as ProductCategory) || "general",
              productType: data.productType || "",
              targetAudience: data.vendor || "",
              fabricMaterial: data.materials.fabric || "",
              keyFeatures: formatKeyFeatures(data) || "",
              availableSizing: data.metafields.sizing
                ? formatSizingData(data.metafields.sizing) || ""
                : "",
              additionalNotes: data.existingDescription
                ? `Existing description: ${data.existingDescription.replace(/<[^>]*>/g, "").substring(0, 200)}...`
                : "",
            };

            setInitialFormValues(formValues);
          } else {
            setDataLoadError("Could not load product data from Shopify");
          }
        } catch (error) {
          // Check if component is still mounted before updating state
          if (!isMounted) return;

          logger.error("Error fetching product data", error as Error, {
            component: "useProductData",
            operation: "fetchProductData",
            productId,
            shop,
          });
          setDataLoadError(
            `Failed to load product data: ${error instanceof Error ? error.message : "Unknown error"}`,
          );

          // Fallback to basic admin extension data if comprehensive fetch fails
          if (productTypeParam || vendor) {
            setInitialFormValues({
              selectedTemplate:
                (productTypeParam as ProductCategory) || "general",
              productType: productTypeParam || "",
              targetAudience: vendor || "",
              fabricMaterial: "",
              keyFeatures: "",
              availableSizing: "",
              additionalNotes: "",
            });
          }
        } finally {
          if (isMounted) setDataLoading(false);
        }
      }
    }

    fetchProductData();

    // Cleanup: mark as unmounted
    return () => {
      isMounted = false;
    };
  }, [source, productId, shop, productTypeParam, vendor]);

  return {
    prePopulatedData,
    dataLoading,
    dataLoadError,
    initialFormValues,
  };
}
