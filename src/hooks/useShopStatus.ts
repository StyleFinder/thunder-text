import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";

interface ShopStatus {
  shopDomain: string;
  isActive: boolean;
  isConnected: boolean;
  wasUninstalled: boolean;
  uninstalledAt: string | null;
  status: "connected" | "uninstalled" | "disconnected" | "not_found";
}

interface UseShopStatusOptions {
  shop?: string | null;
  redirectOnDisconnect?: boolean;
}

export function useShopStatus(options: UseShopStatusOptions = {}) {
  const { shop, redirectOnDisconnect = true } = options;
  const router = useRouter();
  const [status, setStatus] = useState<ShopStatus | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const checkStatus = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const url = shop
        ? `/api/shop/status?shop=${encodeURIComponent(shop)}`
        : "/api/shop/status";

      const response = await fetch(url, {
        credentials: "include",
      });

      const data = await response.json();

      if (!response.ok) {
        // Don't redirect on 401 - might just not have session yet
        if (response.status === 401) {
          setStatus(null);
          return;
        }
        throw new Error(data.error || "Failed to check shop status");
      }

      if (data.success && data.data) {
        setStatus(data.data);

        // Redirect to disconnected page if shop is not connected
        if (redirectOnDisconnect && !data.data.isConnected) {
          const shopParam = data.data.shopDomain
            ? `?shop=${encodeURIComponent(data.data.shopDomain)}`
            : "";
          router.push(`/shopify-disconnected${shopParam}`);
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setIsLoading(false);
    }
  }, [shop, redirectOnDisconnect, router]);

  useEffect(() => {
    checkStatus();
  }, [checkStatus]);

  return {
    status,
    isLoading,
    error,
    isConnected: status?.isConnected ?? false,
    wasUninstalled: status?.wasUninstalled ?? false,
    refetch: checkStatus,
  };
}
