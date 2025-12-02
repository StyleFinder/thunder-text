'use client';

import { usePathname } from 'next/navigation';
import { UnifiedShopifyAuth } from './UnifiedShopifyAuth';

export function ConditionalShopifyAuth({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  // Don't render UnifiedShopifyAuth on auth or coach pages
  const shouldSkipAuth = pathname?.startsWith('/auth') || pathname?.startsWith('/coach') || pathname?.startsWith('/bhb');

  if (shouldSkipAuth) {
    return <>{children}</>;
  }

  return <UnifiedShopifyAuth>{children}</UnifiedShopifyAuth>;
}
