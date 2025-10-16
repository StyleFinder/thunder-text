'use client'

import { useState, useEffect } from 'react'
import { ContentTypeSelector } from '@/components/content-center/ContentTypeSelector'
import { GenerationControls, GenerationParams } from '@/components/content-center/GenerationControls'
import { GenerationResultView } from '@/components/content-center/GenerationResultView'
import { ContentLoader } from '@/components/ui/loading/ContentLoader'
import { Button } from '@/components/ui/button'
import { ArrowLeft, Sparkles } from 'lucide-react'
import { ContentType, GeneratedContent } from '@/types/content-center'

type GenerationStep = 'select-type' | 'configure' | 'result'

export default function GeneratePage() {
  const [currentStep, setCurrentStep] = useState<GenerationStep>('select-type')
  const [selectedType, setSelectedType] = useState<ContentType | null>(null)
  const [isGenerating, setIsGenerating] = useState(false)
  const [generationResult, setGenerationResult] = useState<{
    content: GeneratedContent
    generationTimeMs: number
    costEstimate: number
  } | null>(null)
  const [shopDomain, setShopDomain] = useState<string | null>(null)

  useEffect(() => {
    // Get shop domain from URL parameters or localStorage
    const getShopDomain = () => {
      const params = new URLSearchParams(window.location.search)
      let shop = params.get('shop')

      if (!shop) {
        // Try to get from localStorage (set during Shopify OAuth)
        shop = localStorage.getItem('shop_domain')
      }

      if (shop) {
        setShopDomain(shop)
        localStorage.setItem('shop_domain', shop)
      }
    }
    getShopDomain()
  }, [])

  const handleSelectType = (type: ContentType) => {
    setSelectedType(type)
    setCurrentStep('configure')
  }

  const handleGenerate = async (params: GenerationParams) => {
    if (!selectedType) return

    if (!shopDomain) {
      alert('Shop authentication required. Please access this page from your Shopify admin.')
      return
    }

    setIsGenerating(true)

    try {
      const response = await fetch('/api/content-center/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${shopDomain}`
        },
        body: JSON.stringify({
          content_type: selectedType,
          topic: params.topic,
          word_count: params.wordCount,
          tone_intensity: params.toneIntensity,
          cta_type: params.ctaType,
          custom_cta: params.customCTA,
          additional_context: params.additionalContext,
          save: false
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Generation failed')
      }

      const data = await response.json()

      if (data.success) {
        setGenerationResult({
          content: data.data.content,
          generationTimeMs: data.data.generation_time_ms,
          costEstimate: data.data.cost_estimate
        })
        setCurrentStep('result')
      } else {
        throw new Error(data.error || 'Generation failed')
      }
    } catch (error) {
      console.error('Error generating content:', error)
      alert(`Failed to generate content: ${error instanceof Error ? error.message : 'Unknown error'}`)
    } finally {
      setIsGenerating(false)
    }
  }

  const handleSave = async (content: GeneratedContent) => {
    if (!shopDomain) {
      alert('Shop authentication required.')
      return
    }

    try {
      const response = await fetch(`/api/content-center/content/${content.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${shopDomain}`
        },
        body: JSON.stringify({
          generated_text: content.generated_text,
          is_saved: true
        })
      })

      if (!response.ok) {
        throw new Error('Save failed')
      }

      alert('Content saved successfully!')
    } catch (error) {
      console.error('Error saving content:', error)
      alert('Failed to save content. Please try again.')
    }
  }

  const handleRegenerate = () => {
    setCurrentStep('configure')
    setGenerationResult(null)
  }

  const handleExport = (format: 'txt' | 'html' | 'md') => {
    if (!generationResult) return

    const content = generationResult.content.generated_text
    let blob: Blob
    let filename: string

    switch (format) {
      case 'txt':
        // Strip HTML tags for plain text
        const text = content.replace(/<[^>]*>/g, '')
        blob = new Blob([text], { type: 'text/plain' })
        filename = `content-${generationResult.content.id}.txt`
        break
      case 'html':
        blob = new Blob([content], { type: 'text/html' })
        filename = `content-${generationResult.content.id}.html`
        break
      case 'md':
        // Simple HTML to Markdown conversion
        let markdown = content
          .replace(/<h1>/g, '# ')
          .replace(/<h2>/g, '## ')
          .replace(/<h3>/g, '### ')
          .replace(/<\/h[1-6]>/g, '\n\n')
          .replace(/<strong>/g, '**')
          .replace(/<\/strong>/g, '**')
          .replace(/<em>/g, '*')
          .replace(/<\/em>/g, '*')
          .replace(/<p>/g, '')
          .replace(/<\/p>/g, '\n\n')
          .replace(/<br\s*\/?>/g, '\n')
        blob = new Blob([markdown], { type: 'text/markdown' })
        filename = `content-${generationResult.content.id}.md`
        break
    }

    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  const handleBackToTypeSelection = () => {
    setCurrentStep('select-type')
    setSelectedType(null)
    setGenerationResult(null)
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-4">
          {currentStep !== 'select-type' && (
            <Button
              variant="ghost"
              size="sm"
              onClick={
                currentStep === 'configure'
                  ? handleBackToTypeSelection
                  : handleRegenerate
              }
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
          )}
          <div className="flex items-center gap-2">
            <Sparkles className="h-8 w-8 text-primary" />
            <h1 className="text-3xl font-bold">Content Generator</h1>
          </div>
        </div>
        <p className="text-muted-foreground">
          Create on-brand content powered by AI that matches your unique voice
        </p>
      </div>

      {/* Progress Indicator */}
      <div className="mb-8 flex items-center justify-center gap-2">
        <div className="flex items-center gap-2">
          <div
            className={`h-2 w-2 rounded-full ${
              currentStep === 'select-type' ? 'bg-primary' : 'bg-muted'
            }`}
          />
          <span
            className={`text-sm ${
              currentStep === 'select-type' ? 'font-semibold' : 'text-muted-foreground'
            }`}
          >
            Select Type
          </span>
        </div>

        <div className="h-px w-12 bg-border" />

        <div className="flex items-center gap-2">
          <div
            className={`h-2 w-2 rounded-full ${
              currentStep === 'configure' ? 'bg-primary' : 'bg-muted'
            }`}
          />
          <span
            className={`text-sm ${
              currentStep === 'configure' ? 'font-semibold' : 'text-muted-foreground'
            }`}
          >
            Configure
          </span>
        </div>

        <div className="h-px w-12 bg-border" />

        <div className="flex items-center gap-2">
          <div
            className={`h-2 w-2 rounded-full ${
              currentStep === 'result' ? 'bg-primary' : 'bg-muted'
            }`}
          />
          <span
            className={`text-sm ${
              currentStep === 'result' ? 'font-semibold' : 'text-muted-foreground'
            }`}
          >
            Review
          </span>
        </div>
      </div>

      {/* Content */}
      <div className="mb-8">
        {currentStep === 'select-type' && (
          <ContentTypeSelector
            selectedType={selectedType}
            onSelectType={handleSelectType}
          />
        )}

        {currentStep === 'configure' && selectedType && !isGenerating && (
          <GenerationControls
            contentType={selectedType}
            onGenerate={handleGenerate}
            isGenerating={isGenerating}
          />
        )}

        {isGenerating && (
          <div className="flex flex-col items-center justify-center py-20 space-y-6">
            <ContentLoader
              message="Generating your content..."
              size="lg"
              variant="pulse"
            />
            <div className="text-center space-y-2">
              <p className="text-lg font-medium">Creating amazing content</p>
              <p className="text-sm text-muted-foreground">
                This usually takes 15-30 seconds
              </p>
            </div>
          </div>
        )}

        {currentStep === 'result' && generationResult && (
          <GenerationResultView
            result={generationResult.content}
            generationTimeMs={generationResult.generationTimeMs}
            costEstimate={generationResult.costEstimate}
            onSave={handleSave}
            onRegenerate={handleRegenerate}
            onExport={handleExport}
          />
        )}
      </div>
    </div>
  )
}
