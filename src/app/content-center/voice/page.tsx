'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Alert } from '@/components/ui/alert'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Save,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  MessageSquare,
  Target,
  Users
} from 'lucide-react'

interface BrandVoice {
  tone: string[]
  personality: string[]
  writingStyle: string
  vocabulary: {
    preferred: string[]
    avoid: string[]
  }
  audience: string
  brandValues: string[]
  sampleText: string
}

const TONE_OPTIONS = [
  'Professional',
  'Casual',
  'Friendly',
  'Authoritative',
  'Empathetic',
  'Enthusiastic',
  'Witty',
  'Sophisticated',
  'Bold',
  'Warm'
]

const PERSONALITY_OPTIONS = [
  'Innovative',
  'Trustworthy',
  'Playful',
  'Elegant',
  'Down-to-earth',
  'Aspirational',
  'Expert',
  'Approachable',
  'Luxury',
  'Authentic'
]

export default function BrandVoicePage() {
  const [isSaving, setIsSaving] = useState(false)
  const [saveSuccess, setSaveSuccess] = useState(false)
  const [brandVoice, setBrandVoice] = useState<BrandVoice>({
    tone: [],
    personality: [],
    writingStyle: '',
    vocabulary: {
      preferred: [],
      avoid: []
    },
    audience: '',
    brandValues: [],
    sampleText: ''
  })

  const handleSave = async () => {
    setIsSaving(true)
    setSaveSuccess(false)

    try {
      // TODO: API call to save brand voice
      await new Promise(resolve => setTimeout(resolve, 1000))
      setSaveSuccess(true)
      setTimeout(() => setSaveSuccess(false), 3000)
    } catch (error) {
      console.error('Failed to save brand voice:', error)
    } finally {
      setIsSaving(false)
    }
  }

  const toggleTone = (tone: string) => {
    setBrandVoice(prev => ({
      ...prev,
      tone: prev.tone.includes(tone)
        ? prev.tone.filter(t => t !== tone)
        : [...prev.tone, tone]
    }))
  }

  const togglePersonality = (personality: string) => {
    setBrandVoice(prev => ({
      ...prev,
      personality: prev.personality.includes(personality)
        ? prev.personality.filter(p => p !== personality)
        : [...prev.personality, personality]
    }))
  }

  const addKeyword = (type: 'preferred' | 'avoid', value: string) => {
    if (!value.trim()) return

    setBrandVoice(prev => ({
      ...prev,
      vocabulary: {
        ...prev.vocabulary,
        [type]: [...prev.vocabulary[type], value.trim()]
      }
    }))
  }

  const removeKeyword = (type: 'preferred' | 'avoid', index: number) => {
    setBrandVoice(prev => ({
      ...prev,
      vocabulary: {
        ...prev.vocabulary,
        [type]: prev.vocabulary[type].filter((_, i) => i !== index)
      }
    }))
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-5xl">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <MessageSquare className="h-8 w-8 text-blue-600" />
          <h1 className="text-3xl font-bold text-gray-900">Brand Voice</h1>
        </div>
        <p className="text-gray-600">
          Define your brand's messaging style to ensure consistent, on-brand content generation
        </p>
      </div>

      {saveSuccess && (
        <Alert className="mb-6 border-green-200 bg-green-50">
          <CheckCircle2 className="h-4 w-4 text-green-600" />
          <div className="ml-2">
            <p className="text-sm font-medium text-green-800">Brand voice saved successfully</p>
          </div>
        </Alert>
      )}

      <div className="space-y-6">
        {/* Tone Selection */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5 text-blue-600" />
              Tone of Voice
            </CardTitle>
            <CardDescription>
              Select up to 3 tones that best describe your brand's communication style
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {TONE_OPTIONS.map(tone => (
                <Badge
                  key={tone}
                  variant={brandVoice.tone.includes(tone) ? 'default' : 'outline'}
                  className="cursor-pointer hover:opacity-80"
                  onClick={() => toggleTone(tone)}
                >
                  {tone}
                </Badge>
              ))}
            </div>
            {brandVoice.tone.length > 3 && (
              <p className="text-sm text-amber-600 mt-2 flex items-center gap-1">
                <AlertCircle className="h-4 w-4" />
                Try to limit to 3 tones for more consistent results
              </p>
            )}
          </CardContent>
        </Card>

        {/* Personality Traits */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-blue-600" />
              Brand Personality
            </CardTitle>
            <CardDescription>
              Choose personality traits that align with your brand identity
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {PERSONALITY_OPTIONS.map(personality => (
                <Badge
                  key={personality}
                  variant={brandVoice.personality.includes(personality) ? 'default' : 'outline'}
                  className="cursor-pointer hover:opacity-80"
                  onClick={() => togglePersonality(personality)}
                >
                  {personality}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Target Audience */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5 text-blue-600" />
              Target Audience
            </CardTitle>
            <CardDescription>
              Describe who you're speaking to
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Textarea
              placeholder="Example: Fashion-forward women aged 25-45 who value quality and sustainability..."
              value={brandVoice.audience}
              onChange={(e) => setBrandVoice(prev => ({ ...prev, audience: e.target.value }))}
              rows={3}
            />
          </CardContent>
        </Card>

        {/* Writing Style */}
        <Card>
          <CardHeader>
            <CardTitle>Writing Style Guidelines</CardTitle>
            <CardDescription>
              Specific instructions for content creation
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Textarea
              placeholder="Example: Use short, punchy sentences. Start with action verbs. Keep paragraphs under 3 sentences..."
              value={brandVoice.writingStyle}
              onChange={(e) => setBrandVoice(prev => ({ ...prev, writingStyle: e.target.value }))}
              rows={4}
            />
          </CardContent>
        </Card>

        {/* Vocabulary */}
        <Card>
          <CardHeader>
            <CardTitle>Vocabulary Preferences</CardTitle>
            <CardDescription>
              Words and phrases to use or avoid
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Preferred Words */}
            <div>
              <Label htmlFor="preferred-words" className="text-green-700">
                Preferred Words/Phrases
              </Label>
              <div className="flex gap-2 mt-2">
                <Input
                  id="preferred-words"
                  placeholder="Add a word or phrase"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      addKeyword('preferred', e.currentTarget.value)
                      e.currentTarget.value = ''
                    }
                  }}
                />
              </div>
              <div className="flex flex-wrap gap-2 mt-2">
                {brandVoice.vocabulary.preferred.map((word, index) => (
                  <Badge
                    key={index}
                    variant="secondary"
                    className="cursor-pointer hover:bg-gray-300"
                    onClick={() => removeKeyword('preferred', index)}
                  >
                    {word} ×
                  </Badge>
                ))}
              </div>
            </div>

            {/* Words to Avoid */}
            <div>
              <Label htmlFor="avoid-words" className="text-red-700">
                Words/Phrases to Avoid
              </Label>
              <div className="flex gap-2 mt-2">
                <Input
                  id="avoid-words"
                  placeholder="Add a word or phrase to avoid"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      addKeyword('avoid', e.currentTarget.value)
                      e.currentTarget.value = ''
                    }
                  }}
                />
              </div>
              <div className="flex flex-wrap gap-2 mt-2">
                {brandVoice.vocabulary.avoid.map((word, index) => (
                  <Badge
                    key={index}
                    variant="destructive"
                    className="cursor-pointer hover:opacity-80"
                    onClick={() => removeKeyword('avoid', index)}
                  >
                    {word} ×
                  </Badge>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Sample Text */}
        <Card>
          <CardHeader>
            <CardTitle>Brand Voice Example</CardTitle>
            <CardDescription>
              Provide a sample of your ideal brand messaging (optional but recommended)
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Textarea
              placeholder="Paste an example of content that perfectly captures your brand voice..."
              value={brandVoice.sampleText}
              onChange={(e) => setBrandVoice(prev => ({ ...prev, sampleText: e.target.value }))}
              rows={6}
            />
          </CardContent>
        </Card>

        {/* Action Buttons */}
        <div className="flex gap-3 justify-end">
          <Button
            variant="outline"
            onClick={() => window.location.reload()}
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Reset
          </Button>
          <Button
            onClick={handleSave}
            disabled={isSaving}
          >
            {isSaving ? (
              <>
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                Save Brand Voice
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  )
}
