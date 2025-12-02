'use client'

import { ReactNode } from 'react'

interface ModernUIProviderProps {
  children: ReactNode
}

export function ModernUIProvider({ children }: ModernUIProviderProps) {
  return <>{children}</>
}

// Legacy export for backwards compatibility during migration
export const PolarisProvider = ModernUIProvider