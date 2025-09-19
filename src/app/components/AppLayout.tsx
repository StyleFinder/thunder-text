'use client'

import { Suspense } from 'react'
import { AppNavigation } from './AppNavigation'
import { Box, Spinner, InlineStack, Text } from '@shopify/polaris'

interface AppLayoutProps {
  children: React.ReactNode
}

function LoadingFallback() {
  return (
    <Box padding="800" minHeight="400px">
      <InlineStack align="center" blockAlign="center" gap="200">
        <Spinner size="small" />
        <Text as="p" variant="bodyMd" tone="subdued">Loading...</Text>
      </InlineStack>
    </Box>
  )
}

export function AppLayout({ children }: AppLayoutProps) {
  return (
    <AppNavigation>
      <Suspense fallback={<LoadingFallback />}>
        {children}
      </Suspense>
    </AppNavigation>
  )
}