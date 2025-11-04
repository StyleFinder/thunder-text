'use client'

import { useState, useEffect } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { Page, Layout, Card, BlockStack, Text, Button, Banner, ProgressBar, Box, InlineStack, Badge } from '@shopify/polaris'
import { AppIntroduction } from '../components/onboarding/AppIntroduction'

export default function OnboardingPage() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const shop = searchParams.get('shop')

  const [currentStep, setCurrentStep] = useState(1)
  const [onboardingComplete, setOnboardingComplete] = useState(false)

  const steps = [
    { id: 1, title: 'Welcome', description: 'Learn about Thunder Text' },
    { id: 2, title: 'Setup', description: 'Configure your preferences' },
    { id: 3, title: 'First Product', description: 'Generate your first description' }
  ]

  const handleIntroComplete = () => {
    setCurrentStep(2)
    // In a real app, this would navigate to setup or first product generation
    router.push(`/settings?shop=${shop}&onboarding=true`)
  }

  const handleCompleteOnboarding = () => {
    setOnboardingComplete(true)
    // Save onboarding completion status
    localStorage.setItem('thunderTextOnboarded', 'true')
    router.push(`/dashboard?shop=${shop}`)
  }

  useEffect(() => {
    // Check if user has already completed onboarding
    const isOnboarded = localStorage.getItem('thunderTextOnboarded')
    if (isOnboarded === 'true') {
      router.push(`/dashboard?shop=${shop}`)
    }
  }, [shop, router])

  return (
    <Page
      title="Welcome to Thunder Text"
      subtitle="Let's get you started with AI-powered product descriptions"
    >
      <Layout>
        {/* Progress Indicator */}
        <Layout.Section>
          <Card>
            <Box padding="400">
              <BlockStack gap="300">
                <InlineStack align="space-between">
                  <Text as="p" variant="bodySm" tone="subdued">
                    Step {currentStep} of {steps.length}
                  </Text>
                  <Badge tone="info">
                    {steps[currentStep - 1].title}
                  </Badge>
                </InlineStack>
                <ProgressBar progress={(currentStep / steps.length) * 100} />
                <Text as="p" variant="bodySm">
                  {steps[currentStep - 1].description}
                </Text>
              </BlockStack>
            </Box>
          </Card>
        </Layout.Section>

        {/* Main Content */}
        <Layout.Section>
          {currentStep === 1 && (
            <AppIntroduction
              onComplete={handleIntroComplete}
              showSkip={true}
            />
          )}

          {currentStep === 2 && (
            <Card>
              <Box padding="600">
                <BlockStack gap="400">
                  <Text as="h2" variant="headingLg">
                    Setting Up Your Account
                  </Text>
                  <Text as="p" variant="bodyMd" tone="subdued">
                    You're being redirected to the settings page to configure your preferences...
                  </Text>
                  <Button variant="primary" onClick={handleIntroComplete}>
                    Continue to Settings
                  </Button>
                </BlockStack>
              </Box>
            </Card>
          )}

          {currentStep === 3 && (
            <Card>
              <Box padding="600">
                <BlockStack gap="400">
                  <Text as="h2" variant="headingLg">
                    Generate Your First Description
                  </Text>
                  <Text as="p" variant="bodyMd" tone="subdued">
                    Ready to see Thunder Text in action? Let's create your first AI-powered product description.
                  </Text>
                  <Button variant="primary" onClick={() => router.push(`/enhance?shop=${shop}&onboarding=true`)}>
                    Start Generating
                  </Button>
                </BlockStack>
              </Box>
            </Card>
          )}
        </Layout.Section>

        {/* Skip Onboarding Option */}
        {!onboardingComplete && (
          <Layout.Section>
            <Box padding="400">
              <InlineStack align="center">
                <Button variant="plain" onClick={handleCompleteOnboarding}>
                  Skip onboarding and go to dashboard
                </Button>
              </InlineStack>
            </Box>
          </Layout.Section>
        )}

        {/* Success Message */}
        {onboardingComplete && (
          <Layout.Section>
            <Banner
              title="Onboarding Complete!"
              tone="success"
              action={{ content: 'Go to Dashboard', onAction: () => router.push(`/dashboard?shop=${shop}`) }}
            >
              <p>You're all set to start generating amazing product descriptions with Thunder Text!</p>
            </Banner>
          </Layout.Section>
        )}
      </Layout>
    </Page>
  )
}