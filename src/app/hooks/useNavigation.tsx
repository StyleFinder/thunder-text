'use client'

import { useRouter, usePathname } from 'next/navigation'
import { useCallback, useEffect, useState } from 'react'
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
  const [params, setParams] = useState({
    shop: null as string | null,
    authenticated: null as string | null,
    host: null as string | null,
    embedded: null as string | null,
  })

  // Get search params on client side only to avoid SSR issues
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search)
      setParams({
        shop: urlParams.get('shop'),
        authenticated: urlParams.get('authenticated'),
        host: urlParams.get('host'),
        embedded: urlParams.get('embedded'),
      })
    }
  }, [])

  const { shop, authenticated, host, embedded } = params

  // Check if we're in an embedded context
  const isEmbedded = typeof window !== 'undefined' && 
    (window.top !== window.self || embedded === '1' || !!host)

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