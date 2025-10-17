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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Save,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  MessageSquare,
  Target,
  Users,
  Upload,
  FileText,
  X,
  Download,
  Link as LinkIcon
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

interface WritingSample {
  id: string
  name: string
  type: string
  uploadDate: string
  size: string
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
  const [showSuccessToast, setShowSuccessToast] = useState(false)
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

  // Writing samples state
  const [samples, setSamples] = useState<WritingSample[]>([])
  const [isDragging, setIsDragging] = useState(false)
  const [showPasteDialog, setShowPasteDialog] = useState(false)
  const [showUrlDialog, setShowUrlDialog] = useState(false)
  const [pasteText, setPasteText] = useState('')
  const [pasteName, setPasteName] = useState('')
  const [urlInput, setUrlInput] = useState('')

  const handleSave = async () => {
    setIsSaving(true)

    try {
      // TODO: API call to save brand voice
      await new Promise(resolve => setTimeout(resolve, 1000))

      // Show success toast
      setShowSuccessToast(true)

      // Auto-hide after 3 seconds
      setTimeout(() => setShowSuccessToast(false), 3000)
    } catch (error) {
      console.error('Failed to save brand voice:', error)
      alert('Failed to save brand voice. Please try again.')
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

  // Sample handling functions
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const handleDragLeave = () => {
    setIsDragging(false)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)

    const files = Array.from(e.dataTransfer.files)
    processFiles(files)
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return

    const files = Array.from(e.target.files)
    processFiles(files)

    // Reset input so same file can be selected again
    e.target.value = ''
  }

  const processFiles = (files: File[]) => {
    const validFiles = files.filter(file => {
      const isValidType = ['.pdf', '.doc', '.docx', '.txt'].some(ext =>
        file.name.toLowerCase().endsWith(ext)
      )
      const isValidSize = file.size <= 10 * 1024 * 1024 // 10MB

      if (!isValidType) {
        alert(`File "${file.name}" is not a supported format. Please upload PDF, DOC, DOCX, or TXT files.`)
        return false
      }

      if (!isValidSize) {
        alert(`File "${file.name}" is too large. Maximum file size is 10MB.`)
        return false
      }

      return true
    })

    const newSamples: WritingSample[] = validFiles.map(file => ({
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      name: file.name,
      type: file.name.split('.').pop()?.toUpperCase() || 'File',
      uploadDate: new Date().toLocaleDateString(),
      size: formatFileSize(file.size)
    }))

    if (newSamples.length > 0) {
      setSamples(prev => [...prev, ...newSamples])
    }
  }

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  const removeSample = (id: string) => {
    setSamples(samples.filter(s => s.id !== id))
  }

  const handlePasteSubmit = () => {
    if (!pasteText.trim()) return

    const newSample: WritingSample = {
      id: Date.now().toString(),
      name: pasteName.trim() || 'Pasted Text',
      type: 'Text',
      uploadDate: new Date().toLocaleDateString(),
      size: `${Math.round(pasteText.length / 1024)}KB`
    }

    setSamples([...samples, newSample])
    setPasteText('')
    setPasteName('')
    setShowPasteDialog(false)
  }

  const handleUrlSubmit = async () => {
    if (!urlInput.trim()) return

    const newSample: WritingSample = {
      id: Date.now().toString(),
      name: 'Content from URL',
      type: 'URL',
      uploadDate: new Date().toLocaleDateString(),
      size: 'Processing...'
    }

    setSamples([...samples, newSample])
    setUrlInput('')
    setShowUrlDialog(false)
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

        {/* Divider */}
        <div className="border-t border-gray-300 my-12"></div>

        {/* Writing Samples Section */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-6">
            <FileText className="h-8 w-8 text-blue-600" />
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Writing Samples</h2>
              <p className="text-sm text-gray-600">
                Upload examples to train the AI on your unique style
              </p>
            </div>
          </div>

          {/* Info Alert */}
          <Alert className="mb-6 border-blue-200 bg-blue-50">
            <Sparkles className="h-4 w-4 text-blue-600" />
            <div className="ml-2">
              <p className="text-sm font-medium text-blue-900">Why upload samples?</p>
              <p className="text-sm text-blue-700 mt-1">
                The AI learns from your existing content to generate new posts that match your brand's authentic voice
              </p>
            </div>
          </Alert>

          {/* Uploaded Samples - Shown First */}
          {samples.length > 0 && (
            <Card className="mb-6">
              <CardHeader>
                <CardTitle>Your Samples ({samples.length})</CardTitle>
                <CardDescription>
                  These samples are used to train the AI on your brand voice
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {samples.map(sample => (
                    <div
                      key={sample.id}
                      className="flex items-center justify-between p-4 border border-gray-200 rounded-lg bg-white hover:bg-gray-50"
                    >
                      <div className="flex items-center gap-3">
                        <FileText className="h-5 w-5 text-blue-600" />
                        <div>
                          <p className="font-medium text-gray-900">{sample.name}</p>
                          <p className="text-sm text-gray-500">
                            {sample.type} • {sample.size} • Uploaded {sample.uploadDate}
                          </p>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeSample(sample.id)}
                      >
                        <X className="h-4 w-4 text-gray-500" />
                      </Button>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Upload Area */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Upload Samples</CardTitle>
              <CardDescription>
                Drag and drop files or click to browse
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div
                className={`
                  border-2 border-dashed rounded-lg p-12 text-center transition-colors
                  ${isDragging ? 'border-blue-500 bg-blue-50' : 'border-gray-300 bg-white'}
                  hover:border-blue-400 hover:bg-blue-50 cursor-pointer
                `}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => document.getElementById('file-upload')?.click()}
              >
                <Upload className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-lg font-medium text-gray-900 mb-2">
                  Drop files here or click to upload
                </p>
                <p className="text-sm text-gray-500">
                  Supported formats: PDF, DOC, DOCX, TXT
                </p>
                <p className="text-xs text-gray-400 mt-2">
                  Maximum file size: 10MB per file
                </p>

                <input
                  id="file-upload"
                  type="file"
                  multiple
                  accept=".pdf,.doc,.docx,.txt"
                  className="hidden"
                  onChange={handleFileSelect}
                />
              </div>

              <div className="mt-4 flex gap-2">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={(e) => {
                    e.stopPropagation()
                    setShowPasteDialog(true)
                  }}
                >
                  <FileText className="h-4 w-4 mr-2" />
                  Paste Text
                </Button>
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={(e) => {
                    e.stopPropagation()
                    setShowUrlDialog(true)
                  }}
                >
                  <Download className="h-4 w-4 mr-2" />
                  Import from URL
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

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

      {/* Paste Text Dialog */}
      <Dialog open={showPasteDialog} onOpenChange={setShowPasteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Paste Text Sample</DialogTitle>
            <DialogDescription>
              Paste your content below to add it as a writing sample
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="sample-name">Sample Name (Optional)</Label>
              <Input
                id="sample-name"
                placeholder="e.g., Instagram caption for summer collection"
                value={pasteName}
                onChange={(e) => setPasteName(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="sample-text">Content</Label>
              <Textarea
                id="sample-text"
                placeholder="Paste your content here..."
                rows={10}
                value={pasteText}
                onChange={(e) => setPasteText(e.target.value)}
              />
              <p className="text-xs text-gray-500 mt-1">
                {pasteText.length} characters
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPasteDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handlePasteSubmit} disabled={!pasteText.trim()}>
              Add Sample
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Import from URL Dialog */}
      <Dialog open={showUrlDialog} onOpenChange={setShowUrlDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Import from URL</DialogTitle>
            <DialogDescription>
              Enter a URL to import content as a writing sample
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="url-input">URL</Label>
              <div className="flex gap-2">
                <LinkIcon className="h-4 w-4 text-gray-400 mt-3" />
                <Input
                  id="url-input"
                  type="url"
                  placeholder="https://example.com/blog-post"
                  value={urlInput}
                  onChange={(e) => setUrlInput(e.target.value)}
                />
              </div>
              <p className="text-xs text-gray-500 mt-2">
                We'll extract the text content from this URL
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowUrlDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleUrlSubmit} disabled={!urlInput.trim()}>
              Import Content
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Success Toast - Bottom Right */}
      {showSuccessToast && (
        <div className="fixed bottom-8 right-8 z-50 animate-in slide-in-from-bottom-5 duration-300">
          <div className="bg-green-600 text-white px-6 py-4 rounded-lg shadow-lg flex items-center gap-3 min-w-[300px]">
            <CheckCircle2 className="h-5 w-5 flex-shrink-0" />
            <div>
              <p className="font-semibold">Success!</p>
              <p className="text-sm text-green-50">Brand voice saved successfully</p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
