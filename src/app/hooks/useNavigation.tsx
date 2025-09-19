'use client'

import { useRouter, useSearchParams, usePathname } from 'next/navigation'
import { useCallback } from 'react'

export interface NavigationItem {
  label: string
  url: string
  icon?: any
  badge?: string
  disabled?: boolean
  matches?: boolean
  exactMatch?: boolean
  matchPaths?: string[]
}

export function useNavigation() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const pathname = usePathname()
  
  const shop = searchParams?.get('shop')
  const authenticated = searchParams?.get('authenticated')

  const buildUrl = useCallback((path: string) => {
    const params = new URLSearchParams()
    if (shop) params.append('shop', shop)
    // Always include authenticated=true in development mode
    const authValue = authenticated || 'true'
    if (authValue) params.append('authenticated', authValue)
    return `${path}${params.toString() ? `?${params.toString()}` : ''}`
  }, [shop, authenticated])

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
    hasAuth: !!(shop && authenticated)
  }), [shop, authenticated])

  return {
    buildUrl,
    navigateTo,
    isActive,
    getAuthParams,
    currentPath: pathname,
    shop,
    authenticated
  }
}