"use client";

import { useParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { useState, useEffect } from "react";

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
    async function fetchShopDomain() {
      // If we don't have a shopId from the path, we can't fetch
      if (!shopId) {
        setIsLoading(false);
        return;
      }

      // If the user's session already has the domain and they're accessing their own shop
      if (sessionShopDomain && session?.user?.id === shopId) {
        setShopDomain(sessionShopDomain);
        setIsLoading(false);
        return;
      }

      // Otherwise, fetch from API
      try {
        const response = await fetch(`/api/shops/${shopId}`);
        const data = await response.json();

        if (data.success && data.shop?.shop_domain) {
          setShopDomain(data.shop.shop_domain);
        } else {
          setError(data.error || "Shop not found");
        }
      } catch (err) {
        setError("Failed to fetch shop information");
        console.error("Error fetching shop domain:", err);
      } finally {
        setIsLoading(false);
      }
    }

    fetchShopDomain();
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
