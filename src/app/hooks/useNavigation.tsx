"use client";

import { useRouter, usePathname, useParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { LucideIcon } from "lucide-react";

export interface NavigationItem {
  label: string;
  url: string;
  icon?: LucideIcon;
  badge?: string;
  disabled?: boolean;
  matches?: boolean;
  exactMatch?: boolean;
  matchPaths?: string[];
}

/**
 * UUID-based Navigation Hook
 *
 * This hook supports the new /stores/{shopId}/... routing pattern.
 * It extracts shopId from:
 * 1. URL path params (for /stores/[shopId]/... routes)
 * 2. Session (for authenticated users)
 * 3. Legacy query params (for backward compatibility during migration)
 */
export function useNavigation() {
  const router = useRouter();
  const pathname = usePathname();
  const routeParams = useParams();
  const { data: session } = useSession();

  const [legacyParams, setLegacyParams] = useState({
    shop: null as string | null,
    authenticated: null as string | null,
    host: null as string | null,
    embedded: null as string | null,
  });

  // Get legacy search params on client side only (for backward compatibility)
  useEffect(() => {
    if (typeof window !== "undefined") {
      const urlParams = new URLSearchParams(window.location.search);
      setLegacyParams({
        shop: urlParams.get("shop"),
        authenticated: urlParams.get("authenticated"),
        host: urlParams.get("host"),
        embedded: urlParams.get("embedded"),
      });
    }
  }, [pathname]);

  // Extract shopId from path params (new UUID routing)
  const shopIdFromPath = routeParams?.shopId as string | undefined;

  // Get shopId from session (for shop users, their id IS the shopId)
  const shopIdFromSession = session?.user?.id as string | undefined;

  // Primary shopId - prefer path, then session
  const shopId = shopIdFromPath || shopIdFromSession;

  // Legacy shop domain from query params or session
  const shopDomain = legacyParams.shop || session?.user?.shopDomain;

  const { authenticated, host, embedded } = legacyParams;

  // Check if we're in an embedded context
  const isEmbedded =
    typeof window !== "undefined" &&
    (window.top !== window.self || embedded === "1" || !!host);

  // Check if we're using new UUID-based routing
  const isUuidRouting = pathname?.startsWith("/stores/") || !!shopIdFromPath;

  /**
   * Build URL for navigation
   * Uses UUID-based paths for new routing, falls back to query params for legacy
   */
  const buildUrl = useCallback(
    (path: string) => {
      // If we have a shopId and the path is a shop-specific route, use UUID routing
      if (shopId && !path.startsWith("/stores/") && !path.startsWith("/auth/") && !path.startsWith("/api/") && path !== "/") {
        // Map legacy paths to new /stores/{shopId}/... pattern
        const shopPaths = [
          "/dashboard",
          "/settings",
          "/products",
          "/create-pd",
          "/enhance",
          "/aie",
          "/ads-library",
          "/create-ad",
          "/brand-voice",
          "/content-center",
          "/business-profile",
          "/trends",
          "/facebook-ads",
          "/ad-vault",
          "/image-generation",
        ];

        for (const shopPath of shopPaths) {
          if (path === shopPath || path.startsWith(shopPath + "/")) {
            // Convert to UUID-based path
            const subPath = path.replace(shopPath, "");
            return `/stores/${shopId}${shopPath}${subPath}`;
          }
        }
      }

      // For paths that already include /stores/ or non-shop paths, just return as-is
      // But add query params if needed for embedded context
      if (isEmbedded && host) {
        const params = new URLSearchParams();
        if (host) params.append("host", host);
        if (embedded) params.append("embedded", embedded);
        return `${path}${params.toString() ? `?${params.toString()}` : ""}`;
      }

      return path;
    },
    [shopId, isEmbedded, host, embedded],
  );

  /**
   * Navigate to a path
   */
  const navigateTo = useCallback(
    (path: string) => {
      const targetUrl = buildUrl(path);
      // If navigating to the same page, force a full page reload to reset state
      const currentBasePath = pathname?.split("?")[0];
      const targetBasePath = targetUrl.split("?")[0];
      if (currentBasePath === targetBasePath) {
        window.location.href = targetUrl;
      } else {
        router.push(targetUrl);
      }
    },
    [router, buildUrl, pathname],
  );

  /**
   * Check if a navigation item is active
   * Handles both UUID and legacy URL patterns
   */
  const isActive = useCallback(
    (item: NavigationItem) => {
      if (!pathname) return false;

      // For UUID routing, check if the route matches within /stores/{shopId}/...
      if (isUuidRouting && shopId) {
        const uuidPath = `/stores/${shopId}${item.url}`;
        if (item.matchPaths) {
          const uuidMatchPaths = item.matchPaths.map((p) => `/stores/${shopId}${p}`);
          return uuidMatchPaths.some((path) =>
            item.exactMatch ? pathname === path : pathname.startsWith(path),
          );
        }
        return pathname === uuidPath || pathname.startsWith(uuidPath);
      }

      // Legacy check
      if (item.matchPaths) {
        return item.matchPaths.some((path) =>
          item.exactMatch ? pathname === path : pathname.startsWith(path),
        );
      }
      return pathname === item.url || pathname.startsWith(item.url);
    },
    [pathname, isUuidRouting, shopId],
  );

  /**
   * Get authentication parameters
   * Returns both new shopId and legacy shop domain
   */
  const getAuthParams = useCallback(
    () => ({
      shopId,
      shop: shopDomain,
      authenticated,
      host,
      embedded,
      isEmbedded,
      isUuidRouting,
      hasAuth: !!(shopId || (shopDomain && (authenticated || isEmbedded))),
    }),
    [shopId, shopDomain, authenticated, host, embedded, isEmbedded, isUuidRouting],
  );

  return {
    buildUrl,
    navigateTo,
    isActive,
    getAuthParams,
    currentPath: pathname,
    // New UUID-based identifiers
    shopId,
    isUuidRouting,
    // Legacy identifiers (for backward compatibility)
    shop: shopDomain,
    authenticated,
    host,
    embedded,
    isEmbedded,
  };
}
