'use client'

import { AppProvider } from '@shopify/polaris'
import '@shopify/polaris/build/esm/styles.css'
import { ReactNode } from 'react'

interface PolarisProviderProps {
  children: ReactNode
}

export function PolarisProvider({ children }: PolarisProviderProps) {
  return (
    <AppProvider i18n={{}}>
      {children}
    </AppProvider>
  )
}