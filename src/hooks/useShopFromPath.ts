"use client";

import { useParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { useState, useEffect } from "react";
import { logger } from "@/lib/logger";

/**
 * Hook to get shop information from UUID path params
 *
 * This hook provides shop context for pages under /stores/[shopId]/...
 * It fetches the shop domain from the database based on the UUID.
 *
 * Returns:
 * - shopId: The UUID from the path
 * - shopDomain: The shop's myshopify.com domain (fetched from DB)
 * - isLoading: Whether the shop domain is being fetched
 * - error: Any error that occurred during fetch
 */
export function useShopFromPath() {
  const params = useParams();
  const { data: session } = useSession();
  const [shopDomain, setShopDomain] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Get shopId from path params
  const shopId = params?.shopId as string | undefined;

  // Get shop domain from session if available (for shop users)
  const sessionShopDomain = session?.user?.shopDomain;

  useEffect(() => {
    // Q5: AbortController for cleanup to prevent memory leaks
    const abortController = new AbortController();
    let isMounted = true;

    async function fetchShopDomain() {
      // If we don't have a shopId from the path, we can't fetch
      if (!shopId) {
        if (isMounted) setIsLoading(false);
        return;
      }

      // If the user's session already has the domain and they're accessing their own shop
      if (sessionShopDomain && session?.user?.id === shopId) {
        if (isMounted) {
          setShopDomain(sessionShopDomain);
          setIsLoading(false);
        }
        return;
      }

      // Otherwise, fetch from API
      try {
        const response = await fetch(`/api/shops/${shopId}`, {
          signal: abortController.signal,
        });
        const data = await response.json();

        if (isMounted) {
          if (data.success && data.shop?.shop_domain) {
            setShopDomain(data.shop.shop_domain);
          } else {
            setError(data.error || "Shop not found");
          }
        }
      } catch (err) {
        // Don't update state if aborted
        if (err instanceof Error && err.name === "AbortError") return;
        if (isMounted) {
          setError("Failed to fetch shop information");
          logger.error("Error fetching shop domain", err as Error, { hook: "useShopFromPath", shopId });
        }
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }

    fetchShopDomain();

    // Cleanup: abort fetch and mark as unmounted
    return () => {
      isMounted = false;
      abortController.abort();
    };
  }, [shopId, sessionShopDomain, session?.user?.id]);

  return {
    shopId,
    shopDomain,
    isLoading,
    error,
    // For API calls that still need ?shop= param
    shopQueryParam: shopDomain || shopId,
  };
}
