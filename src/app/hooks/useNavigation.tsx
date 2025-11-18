'use client'

import { useRouter, usePathname, useSearchParams } from 'next/navigation'
import { useCallback } from 'react'
import { LucideIcon } from 'lucide-react'

export interface NavigationItem {
  label: string
  url: string
  icon?: LucideIcon
  badge?: string
  disabled?: boolean
  matches?: boolean
  exactMatch?: boolean
  matchPaths?: string[]
}

export function useNavigation() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  // Get params from searchParams - will be consistent after Suspense resolves
  const shop = searchParams.get('shop')
  const authenticated = searchParams.get('authenticated')
  const host = searchParams.get('host')
  const embedded = searchParams.get('embedded')

  // Check if we're in an embedded context based on URL params only
  // This ensures consistent values during SSR and client hydration
  const isEmbedded = embedded === '1' || !!host

  const buildUrl = useCallback((path: string) => {
    const params = new URLSearchParams()

    if (shop) params.append('shop', shop)
    if (host) params.append('host', host)
    if (embedded) params.append('embedded', embedded)

    // In embedded context, ensure we have authentication
    const authValue = isEmbedded ? (authenticated || 'true') : authenticated
    if (authValue) params.append('authenticated', authValue)

    return `${path}${params.toString() ? `?${params.toString()}` : ''}`
  }, [shop, authenticated, host, embedded, isEmbedded])

  const navigateTo = useCallback((path: string) => {
    router.push(buildUrl(path))
  }, [router, buildUrl])

  const isActive = useCallback((item: NavigationItem) => {
    if (item.matchPaths) {
      return item.matchPaths.some(path => 
        item.exactMatch ? pathname === path : pathname.startsWith(path)
      )
    }
    return pathname === item.url || pathname.startsWith(item.url)
  }, [pathname])

  const getAuthParams = useCallback(() => ({
    shop,
    authenticated,
    host,
    embedded,
    isEmbedded,
    hasAuth: !!(shop && (authenticated || isEmbedded))
  }), [shop, authenticated, host, embedded, isEmbedded])

  return {
    buildUrl,
    navigateTo,
    isActive,
    getAuthParams,
    currentPath: pathname,
    shop,
    authenticated,
    host,
    embedded,
    isEmbedded
  }
}