'use client'

import { Suspense } from 'react'
import { usePathname } from 'next/navigation'
import { AppNavigation } from './AppNavigation'

interface AppLayoutProps {
  children: React.ReactNode
}

function LoadingFallback() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-oxford-50">
      <div className="flex items-center gap-3">
        <div className="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-smart-500"></div>
        <p className="text-sm text-muted-foreground">Loading...</p>
      </div>
    </div>
  )
}

export function AppLayout({ children }: AppLayoutProps) {
  const pathname = usePathname()

  // Hide navigation on auth, coach login, and welcome pages
  const isAuthPage = pathname?.startsWith('/auth') || pathname?.startsWith('/coach') || pathname?.startsWith('/welcome')

  if (isAuthPage) {
    return (
      <Suspense fallback={<LoadingFallback />}>
        {children}
      </Suspense>
    )
  }

  return (
    <AppNavigation>
      <Suspense fallback={<LoadingFallback />}>
        {children}
      </Suspense>
    </AppNavigation>
  )
}