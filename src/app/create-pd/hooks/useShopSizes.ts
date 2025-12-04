"use client";

import { useState, useEffect, useCallback } from "react";
import { logger } from "@/lib/logger";

interface SizeOption {
  label: string;
  value: string;
}

interface ShopSize {
  name: string;
  is_default: boolean;
  sizes: string[];
}

interface UseShopSizesParams {
  shop: string | null;
}

interface UseShopSizesReturn {
  sizingOptions: SizeOption[];
  defaultSizing: string;
}

const defaultSizingOptions: SizeOption[] = [
  { label: "One Size", value: "One Size" },
  { label: "XS - XL", value: "XS - XL" },
  { label: "XS - XXL", value: "XS - XXL" },
  { label: "XS - XXXL", value: "XS - XXXL" },
  { label: "Numeric (6-16)", value: "Numeric (6-16)" },
  { label: "Numeric (28-44)", value: "Numeric (28-44)" },
  { label: "Children (2T-14)", value: "Children (2T-14)" },
];

export function useShopSizes({ shop }: UseShopSizesParams): UseShopSizesReturn {
  const [sizingOptions, setSizingOptions] =
    useState<SizeOption[]>(defaultSizingOptions);
  const [defaultSizing, setDefaultSizing] = useState("");

  const fetchShopSizes = useCallback(async () => {
    try {
      const response = await fetch(`/api/shop-sizes?shop=${shop}`);
      const data = await response.json();

      if (data.success && data.data.length > 0) {
        // Convert shop sizes to dropdown options
        const options = data.data.map((size: ShopSize) => ({
          label: `${size.name}${size.is_default ? " (Default)" : ""}: ${size.sizes.join(", ")}`,
          value: size.sizes.join(", "),
        }));
        setSizingOptions(options);

        // Set default sizing if available
        const defaultSize = data.data.find((size: ShopSize) => size.is_default);
        if (defaultSize) {
          setDefaultSizing(defaultSize.sizes.join(", "));
        }
      } else {
        // Fallback to hardcoded defaults if no shop sizes exist
        setSizingOptions(defaultSizingOptions);
      }
    } catch (err) {
      logger.error("Error fetching shop sizes", err as Error, {
        component: "useShopSizes",
        operation: "fetchShopSizes",
        shop,
      });
      // Fallback to hardcoded defaults on error
      setSizingOptions(defaultSizingOptions);
    }
  }, [shop]);

  useEffect(() => {
    if (shop) {
      fetchShopSizes();
    }
  }, [shop, fetchShopSizes]);

  return {
    sizingOptions,
    defaultSizing,
  };
}
