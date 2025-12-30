'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { SampleUpload, SampleList } from '@/features/content-center'
import { VoiceAnalysisLoader } from '@/components/ui/loading/VoiceAnalysisLoader'
import { Sparkles, FileText, Wand2, CheckCircle2, ArrowRight, ArrowLeft } from 'lucide-react'
import { useShop } from '@/hooks/useShop'
import { logger } from '@/lib/logger'

type OnboardingStep = 'welcome' | 'upload' | 'generating' | 'review' | 'complete'

interface VoiceProfile {
  profile: {
    profile_text: string
  }
  samples_analyzed: number
  generation_time_ms: number
}

export default function OnboardingPage() {
  const router = useRouter()
  const { shop, shopId, isLoading: shopLoading } = useShop()
  const [currentStep, setCurrentStep] = useState<OnboardingStep>('welcome')
  const [refreshTrigger, setRefreshTrigger] = useState(0)
  const [isGenerating, setIsGenerating] = useState(false)
  const [generatedProfile, setGeneratedProfile] = useState<VoiceProfile | null>(null)

  // Helper to get dynamic routes
  const getCreateUrl = () => shopId ? `/stores/${shopId}/content-center/generate` : '/content-center/generate';

  const handleNext = () => {
    if (currentStep === 'welcome') {
      setCurrentStep('upload')
    } else if (currentStep === 'upload') {
      setCurrentStep('generating')
      generateProfile()
    } else if (currentStep === 'review') {
      setCurrentStep('complete')
    }
  }

  const handleBack = () => {
    if (currentStep === 'upload') {
      setCurrentStep('welcome')
    }
  }

  const generateProfile = async () => {
    if (!shop) {
      alert('Shop authentication required.')
      setCurrentStep('upload')
      return
    }

    setIsGenerating(true)
    try {
      const response = await fetch('/api/content-center/voice/generate', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${shop}`
        }
      })

      const data = await response.json()

      if (data.success) {
        setGeneratedProfile(data.data)
        setCurrentStep('review')
      } else {
        throw new Error(data.error || 'Failed to generate profile')
      }
    } catch (error) {
      logger.error('Profile generation error:', error as Error, { component: 'onboarding' })
      alert('Failed to generate voice profile. Please try again.')
      setCurrentStep('upload')
    } finally {
      setIsGenerating(false)
    }
  }

  const handleComplete = () => {
    router.push(getCreateUrl())
  }

  const getStepNumber = () => {
    const steps: OnboardingStep[] = ['welcome', 'upload', 'generating', 'review', 'complete']
    return steps.indexOf(currentStep) + 1
  }

  const getProgress = () => {
    return (getStepNumber() / 5) * 100
  }

  if (shopLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-background to-muted/20">
        <div className="container max-w-4xl mx-auto py-8 px-4">
          <div className="flex justify-center py-20">
            <VoiceAnalysisLoader isLoading={true} estimatedTimeSeconds={5} />
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20">
      <div className="container max-w-4xl mx-auto py-8 px-4">
        {/* Progress Bar */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium">Step {getStepNumber()} of 5</span>
            <span className="text-sm text-muted-foreground">{Math.round(getProgress())}% Complete</span>
          </div>
          <Progress value={getProgress()} className="h-2" />
        </div>

        {/* Welcome Step */}
        {currentStep === 'welcome' && (
          <Card>
            <CardHeader className="text-center pb-4">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
                <Sparkles className="h-8 w-8 text-primary" />
              </div>
              <CardTitle className="text-3xl">Welcome to Content Creation Center</CardTitle>
              <CardDescription className="text-base mt-2">
                Let's create your personalized brand voice profile
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="flex gap-4">
                  <div className="flex-shrink-0 mt-1">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-100">
                      <FileText className="h-4 w-4 text-blue-600" />
                    </div>
                  </div>
                  <div>
                    <h3 className="font-semibold mb-1">Upload Your Writing Samples</h3>
                    <p className="text-sm text-muted-foreground">
                      Share 3-10 examples of your best writing. We'll analyze your unique style, tone, and voice.
                    </p>
                  </div>
                </div>

                <div className="flex gap-4">
                  <div className="flex-shrink-0 mt-1">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-purple-100">
                      <Wand2 className="h-4 w-4 text-purple-600" />
                    </div>
                  </div>
                  <div>
                    <h3 className="font-semibold mb-1">AI Analyzes Your Voice</h3>
                    <p className="text-sm text-muted-foreground">
                      Our AI identifies patterns in your writing - from sentence structure to vocabulary choices.
                    </p>
                  </div>
                </div>

                <div className="flex gap-4">
                  <div className="flex-shrink-0 mt-1">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-green-100">
                      <CheckCircle2 className="h-4 w-4 text-green-600" />
                    </div>
                  </div>
                  <div>
                    <h3 className="font-semibold mb-1">Generate On-Brand Content</h3>
                    <p className="text-sm text-muted-foreground">
                      Create blogs, ads, and product descriptions that sound authentically like you.
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-muted/50 rounded-lg p-4 space-y-2">
                <p className="text-sm font-medium">What makes a good writing sample?</p>
                <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
                  <li>500-5000 words of original content you wrote</li>
                  <li>Examples that represent your authentic voice</li>
                  <li>Blog posts, emails, or product descriptions work great</li>
                  <li>Avoid AI-generated or heavily edited content</li>
                </ul>
              </div>

              <Button onClick={handleNext} className="w-full" size="lg">
                Get Started
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Upload Step */}
        {currentStep === 'upload' && (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Upload Your Writing Samples</CardTitle>
                <CardDescription>
                  Upload at least 3 samples (500-5000 words each) to create your voice profile
                </CardDescription>
              </CardHeader>
              <CardContent>
                <SampleUpload onUploadSuccess={() => setRefreshTrigger(prev => prev + 1)} />
              </CardContent>
            </Card>

            <SampleList refreshTrigger={refreshTrigger} />

            <div className="flex gap-4">
              <Button onClick={handleBack} variant="outline" className="flex-1">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back
              </Button>
              <Button onClick={handleNext} className="flex-1">
                Generate Voice Profile
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </div>
        )}

        {/* Generating Step */}
        {currentStep === 'generating' && (
          <VoiceAnalysisLoader isLoading={isGenerating} estimatedTimeSeconds={30} />
        )}

        {/* Review Step */}
        {currentStep === 'review' && generatedProfile && (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Your Voice Profile is Ready!</CardTitle>
                <CardDescription>
                  Review your brand voice profile below. You can edit it anytime from your settings.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="prose prose-sm max-w-none">
                  <pre className="whitespace-pre-wrap bg-muted p-4 rounded-lg text-sm">
                    {generatedProfile.profile.profile_text}
                  </pre>
                </div>
                <div className="mt-4 flex items-center gap-4 text-sm text-muted-foreground">
                  <span>Generated from {generatedProfile.samples_analyzed} samples</span>
                  <span>•</span>
                  <span>{Math.round(generatedProfile.generation_time_ms / 1000)}s generation time</span>
                </div>
              </CardContent>
            </Card>

            <Button onClick={handleNext} className="w-full" size="lg">
              Continue
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        )}

        {/* Complete Step */}
        {currentStep === 'complete' && (
          <Card>
            <CardContent className="py-16">
              <div className="text-center space-y-6">
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
                  <CheckCircle2 className="h-10 w-10 text-green-600" />
                </div>
                <div>
                  <h2 className="text-3xl font-bold mb-2">You're All Set!</h2>
                  <p className="text-muted-foreground max-w-md mx-auto">
                    Your voice profile is ready. Start creating on-brand content that sounds authentically like you.
                  </p>
                </div>
                <Button onClick={handleComplete} size="lg">
                  Start Creating Content
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
