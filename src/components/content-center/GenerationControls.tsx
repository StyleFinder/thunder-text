'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Slider } from '@/components/ui/slider'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Sparkles, Info, AlertCircle } from 'lucide-react'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { ContentType, CTAType } from '@/types/content-center'
import {
  WORD_COUNT_RANGES,
  PARAMETER_PRESETS,
  formatToneIntensityLabel,
  formatCTATypeLabel,
  estimateGenerationTime
} from '@/lib/services/parameter-handler'

interface GenerationControlsProps {
  contentType: ContentType
  onGenerate: (params: GenerationParams) => void
  isGenerating?: boolean
  className?: string
}

export interface GenerationParams {
  topic: string
  wordCount: number
  toneIntensity: number
  ctaType: CTAType
  customCTA?: string
  additionalContext?: string
}

const CTA_TYPES: { value: CTAType; label: string }[] = [
  { value: 'shop_now', label: 'Shop Now' },
  { value: 'learn_more', label: 'Learn More' },
  { value: 'sign_up', label: 'Sign Up' },
  { value: 'contact_us', label: 'Contact Us' },
  { value: 'limited_time', label: 'Limited Time Offer' },
  { value: 'custom', label: 'Custom CTA' },
  { value: 'none', label: 'No CTA' }
]

export function GenerationControls({
  contentType,
  onGenerate,
  isGenerating = false,
  className = ''
}: GenerationControlsProps) {
  const wordCountRange = WORD_COUNT_RANGES[contentType]

  const [topic, setTopic] = useState('')
  const [wordCount, setWordCount] = useState(wordCountRange.recommended)
  const [toneIntensity, setToneIntensity] = useState(3)
  const [ctaType, setCtaType] = useState<CTAType>('learn_more')
  const [customCTA, setCustomCTA] = useState('')
  const [additionalContext, setAdditionalContext] = useState('')

  const handleApplyPreset = (presetKey: string) => {
    const preset = PARAMETER_PRESETS[presetKey]
    if (preset.contentType === contentType) {
      setWordCount(preset.wordCount)
      setToneIntensity(preset.toneIntensity)
      setCtaType(preset.ctaType)
    }
  }

  const handleGenerate = () => {
    if (!topic.trim()) return

    onGenerate({
      topic: topic.trim(),
      wordCount,
      toneIntensity,
      ctaType,
      customCTA: ctaType === 'custom' ? customCTA : undefined,
      additionalContext: additionalContext.trim() || undefined
    })
  }

  const relevantPresets = Object.entries(PARAMETER_PRESETS)
    .filter(([_, preset]) => preset.contentType === contentType)
    .slice(0, 3)

  const estimatedTime = estimateGenerationTime(contentType, wordCount)
  const canGenerate = topic.trim().length > 0 && !isGenerating

  return (
    <div className={`space-y-6 ${className}`}>
      <div>
        <h2 className="text-2xl font-bold mb-2">Generation Settings</h2>
        <p className="text-muted-foreground">
          Configure your content parameters. All content will match your brand voice profile.
        </p>
      </div>

      {/* Presets */}
      {relevantPresets.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Quick Presets</CardTitle>
            <CardDescription>Start with optimized settings for common use cases</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {relevantPresets.map(([key, preset]) => (
                <Button
                  key={key}
                  variant="outline"
                  size="sm"
                  onClick={() => handleApplyPreset(key)}
                  disabled={isGenerating}
                >
                  {preset.name}
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Main Parameters */}
      <Card>
        <CardHeader>
          <CardTitle>Content Parameters</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Topic */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Label htmlFor="topic">Topic *</Label>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Info className="h-4 w-4 text-muted-foreground cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p className="max-w-xs">
                      What should this content be about? Be specific for best results.
                    </p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
            <Input
              id="topic"
              placeholder="e.g., Summer dress collection launch"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              disabled={isGenerating}
              className="text-base"
            />
          </div>

          {/* Word Count */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Label>Word Count</Label>
                <Badge variant="secondary">{wordCount} words</Badge>
              </div>
              <span className="text-xs text-muted-foreground">
                Range: {wordCountRange.min}-{wordCountRange.max}
              </span>
            </div>
            <Slider
              value={[wordCount]}
              onValueChange={([value]) => setWordCount(value)}
              min={wordCountRange.min}
              max={wordCountRange.max}
              step={50}
              disabled={isGenerating}
              className="w-full"
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Shorter</span>
              <span>Longer</span>
            </div>
          </div>

          {/* Tone Intensity */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Label>Tone Intensity</Label>
                <Badge variant="secondary">{formatToneIntensityLabel(toneIntensity)}</Badge>
              </div>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Info className="h-4 w-4 text-muted-foreground cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p className="max-w-xs">
                      How strongly should your brand personality come through?
                      Higher = more distinctive voice, Lower = more neutral tone
                    </p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
            <Slider
              value={[toneIntensity]}
              onValueChange={([value]) => setToneIntensity(value)}
              min={1}
              max={5}
              step={1}
              disabled={isGenerating}
              className="w-full"
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Subtle</span>
              <span>Moderate</span>
              <span>Strong</span>
            </div>
          </div>

          {/* CTA Type */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Label htmlFor="cta-type">Call-to-Action</Label>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Info className="h-4 w-4 text-muted-foreground cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p className="max-w-xs">
                      How should the content encourage reader action?
                    </p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
            <Select
              value={ctaType}
              onValueChange={(value) => setCtaType(value as CTAType)}
              disabled={isGenerating}
            >
              <SelectTrigger id="cta-type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CTA_TYPES.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Custom CTA */}
          {ctaType === 'custom' && (
            <div className="space-y-2">
              <Label htmlFor="custom-cta">Custom CTA Text</Label>
              <Input
                id="custom-cta"
                placeholder="e.g., Book Your Consultation"
                value={customCTA}
                onChange={(e) => setCustomCTA(e.target.value)}
                disabled={isGenerating}
              />
            </div>
          )}

          {/* Additional Context */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Label htmlFor="context">Additional Context (Optional)</Label>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Info className="h-4 w-4 text-muted-foreground cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p className="max-w-xs">
                      Add specific details, keywords, or requirements to guide the generation
                    </p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
            <Textarea
              id="context"
              placeholder="e.g., Focus on sustainability, mention free shipping, include sizing guide link..."
              value={additionalContext}
              onChange={(e) => setAdditionalContext(e.target.value)}
              disabled={isGenerating}
              rows={3}
              className="resize-none"
            />
            <p className="text-xs text-muted-foreground">
              {additionalContext.length}/500 characters
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Generation Info */}
      <Card className="border-primary/20 bg-primary/5">
        <CardContent className="pt-6">
          <div className="flex items-start gap-3">
            <div className="bg-primary/10 rounded-full p-2">
              <Sparkles className="h-5 w-5 text-primary" />
            </div>
            <div className="flex-1 space-y-1">
              <p className="text-sm font-medium">Ready to generate</p>
              <p className="text-xs text-muted-foreground">
                Estimated time: ~{estimatedTime} seconds • Content will match your brand voice profile
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Generate Button */}
      <div className="flex justify-end gap-3">
        <Button
          size="lg"
          onClick={handleGenerate}
          disabled={!canGenerate}
          className="min-w-[200px]"
        >
          {isGenerating ? (
            <>
              <Sparkles className="h-5 w-5 mr-2 animate-spin" />
              Generating...
            </>
          ) : (
            <>
              <Sparkles className="h-5 w-5 mr-2" />
              Generate Content
            </>
          )}
        </Button>
      </div>

      {/* Validation Message */}
      {!topic.trim() && (
        <div className="flex items-start gap-2 p-3 rounded-lg bg-muted">
          <AlertCircle className="h-4 w-4 text-muted-foreground mt-0.5" />
          <p className="text-sm text-muted-foreground">
            Enter a topic to start generating content
          </p>
        </div>
      )}
    </div>
  )
}
