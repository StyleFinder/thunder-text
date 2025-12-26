'use client';

import { usePathname, useSearchParams } from 'next/navigation';
import { UnifiedShopifyAuth } from './UnifiedShopifyAuth';
import { Suspense } from 'react';

function ConditionalShopifyAuthContent({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // Skip UnifiedShopifyAuth for:
  // - Auth pages (/auth/*)
  // - Coach pages (/coach/*)
  // - BHB pages (/bhb/*)
  // - UUID-based store routes (/stores/{uuid}/*) - these use NextAuth, not Shopify App Bridge
  // - Any page without a ?shop= query param (not in Shopify embedded context)
  const isAuthPage = pathname?.startsWith('/auth');
  const isCoachPage = pathname?.startsWith('/coach');
  const isBhbPage = pathname?.startsWith('/bhb');
  const isUuidStoreRoute = pathname?.startsWith('/stores/');
  const hasShopQueryParam = searchParams?.has('shop');

  // UnifiedShopifyAuth is ONLY needed when we have a ?shop= query param
  // (Shopify embedded app context). UUID-based routing uses NextAuth sessions.
  const shouldUseShopifyAuth = hasShopQueryParam && !isAuthPage && !isCoachPage && !isBhbPage;

  if (!shouldUseShopifyAuth) {
    return <>{children}</>;
  }

  return <UnifiedShopifyAuth>{children}</UnifiedShopifyAuth>;
}

export function ConditionalShopifyAuth({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={<>{children}</>}>
      <ConditionalShopifyAuthContent>{children}</ConditionalShopifyAuthContent>
    </Suspense>
  );
}
