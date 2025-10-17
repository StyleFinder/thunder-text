'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Alert } from '@/components/ui/alert'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  MessageSquare,
  Upload,
  FileText,
  X,
  Download,
  Link as LinkIcon,
  Loader2
} from 'lucide-react'
import { useShopifyAuth } from '@/app/components/UnifiedShopifyAuth'
import type { ContentSample, BrandVoiceProfile } from '@/types/content-center'

interface WritingSample {
  id: string
  name: string
  type: string
  uploadDate: string
  size: string
  dbId?: string // Database ID if saved
}

export default function BrandVoicePage() {
  const { shop: shopDomain, isAuthenticated, isLoading: authLoading } = useShopifyAuth()

  // State
  const [samples, setSamples] = useState<WritingSample[]>([])
  const [profile, setProfile] = useState<BrandVoiceProfile | null>(null)
  const [isLoadingSamples, setIsLoadingSamples] = useState(true)
  const [isUploading, setIsUploading] = useState(false)
  const [isGenerating, setIsGenerating] = useState(false)
  const [isDragging, setIsDragging] = useState(false)
  const [showPasteDialog, setShowPasteDialog] = useState(false)
  const [showUrlDialog, setShowUrlDialog] = useState(false)
  const [pasteText, setPasteText] = useState('')
  const [pasteName, setPasteName] = useState('')
  const [urlInput, setUrlInput] = useState('')
  const [showSuccessToast, setShowSuccessToast] = useState(false)
  const [toastMessage, setToastMessage] = useState('')

  // Load existing samples and profile on mount
  useEffect(() => {
    if (shopDomain && isAuthenticated) {
      loadSamples()
      loadProfile()
    }
  }, [shopDomain, isAuthenticated])

  const loadSamples = async () => {
    try {
      const response = await fetch('/api/content-center/samples', {
        headers: {
          'Authorization': `Bearer ${shopDomain}`
        }
      })

      if (response.ok) {
        const data = await response.json()
        if (data.success && data.data.samples) {
          // Convert DB samples to UI format
          const uiSamples: WritingSample[] = data.data.samples.map((s: ContentSample) => ({
            id: s.id,
            dbId: s.id,
            name: `Sample ${s.sample_type}`,
            type: s.sample_type.toUpperCase(),
            uploadDate: new Date(s.created_at).toLocaleDateString(),
            size: `${s.word_count} words`
          }))
          setSamples(uiSamples)
        }
      }
    } catch (error) {
      console.error('Failed to load samples:', error)
    } finally {
      setIsLoadingSamples(false)
    }
  }

  const loadProfile = async () => {
    try {
      const response = await fetch('/api/content-center/voice', {
        headers: {
          'Authorization': `Bearer ${shopDomain}`
        }
      })

      if (response.ok) {
        const data = await response.json()
        if (data.success && data.data.profile) {
          setProfile(data.data.profile)
        }
      }
    } catch (error) {
      console.error('Failed to load profile:', error)
    }
  }

  const showToast = (message: string) => {
    setToastMessage(message)
    setShowSuccessToast(true)
    setTimeout(() => setShowSuccessToast(false), 3000)
  }

  // Auto-generate profile when we have 3+ samples and no profile exists
  useEffect(() => {
    if (samples.length >= 3 && !profile && !isGenerating) {
      generateProfile()
    }
  }, [samples.length, profile])

  const generateProfile = async () => {
    if (isGenerating) return

    setIsGenerating(true)
    try {
      const response = await fetch('/api/content-center/voice/generate', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${shopDomain}`
        }
      })

      if (response.ok) {
        const data = await response.json()
        if (data.success && data.data.profile) {
          setProfile(data.data.profile)
          showToast('Brand voice profile generated successfully!')
        }
      } else {
        const error = await response.json()
        console.error('Profile generation failed:', error)
      }
    } catch (error) {
      console.error('Failed to generate profile:', error)
    } finally {
      setIsGenerating(false)
    }
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

  const processFiles = async (files: File[]) => {
    setIsUploading(true)

    for (const file of files) {
      // Validate file
      const extension = file.name.toLowerCase().split('.').pop()
      const isValidType = ['txt', 'pdf', 'doc', 'docx'].includes(extension || '')
      const isValidSize = file.size <= 10 * 1024 * 1024 // 10MB

      if (!isValidType) {
        alert(`File "${file.name}" is not supported. Please upload PDF, DOC, DOCX, or TXT files.`)
        continue
      }

      if (!isValidSize) {
        alert(`File "${file.name}" is too large. Maximum file size is 10MB.`)
        continue
      }

      try {
        let text: string

        // Extract text based on file type
        if (extension === 'txt') {
          text = await readFileAsText(file)
        } else if (extension === 'pdf') {
          text = await extractTextFromPDF(file)
        } else if (extension === 'doc' || extension === 'docx') {
          text = await extractTextFromWord(file)
        } else {
          continue
        }

        // Validate extracted text
        if (!text || text.trim().length < 100) {
          alert(`File "${file.name}" doesn't contain enough text. Minimum 100 characters required.`)
          continue
        }

        // Upload to API
        const response = await fetch('/api/content-center/samples', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${shopDomain}`
          },
          body: JSON.stringify({
            sample_text: text,
            sample_type: 'other'
          })
        })

        if (response.ok) {
          const data = await response.json()
          if (data.success && data.data.sample) {
            const newSample: WritingSample = {
              id: data.data.sample.id,
              dbId: data.data.sample.id,
              name: file.name,
              type: extension.toUpperCase(),
              uploadDate: new Date().toLocaleDateString(),
              size: `${data.data.word_count} words`
            }
            setSamples(prev => [...prev, newSample])
          }
        } else {
          const error = await response.json()
          alert(`Failed to upload "${file.name}": ${error.error}`)
        }
      } catch (error) {
        console.error(`Error processing ${file.name}:`, error)
        alert(`Failed to process "${file.name}". ${error instanceof Error ? error.message : ''}`)
      }
    }

    setIsUploading(false)
  }

  const readFileAsText = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = (e) => resolve(e.target?.result as string)
      reader.onerror = reject
      reader.readAsText(file)
    })
  }

  const extractTextFromPDF = async (file: File): Promise<string> => {
    // Use pdf.js library
    const pdfjsLib = await import('pdfjs-dist')

    // Set worker source to use the npm package worker
    // Next.js will serve this from node_modules via /_next/static
    pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
      'pdfjs-dist/build/pdf.worker.min.mjs',
      import.meta.url
    ).toString()

    const arrayBuffer = await file.arrayBuffer()
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise

    let fullText = ''

    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i)
      const textContent = await page.getTextContent()
      const pageText = textContent.items
        .map((item: any) => item.str)
        .join(' ')
      fullText += pageText + '\n'
    }

    return fullText.trim()
  }

  const extractTextFromWord = async (file: File): Promise<string> => {
    // Use mammoth library for Word documents
    const mammoth = await import('mammoth')

    const arrayBuffer = await file.arrayBuffer()
    const result = await mammoth.extractRawText({ arrayBuffer })

    return result.value.trim()
  }

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  const removeSample = (id: string) => {
    setSamples(samples.filter(s => s.id !== id))
  }

  const handlePasteSubmit = async () => {
    if (!pasteText.trim()) return

    setIsUploading(true)
    try {
      const response = await fetch('/api/content-center/samples', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${shopDomain}`
        },
        body: JSON.stringify({
          sample_text: pasteText,
          sample_type: 'other'
        })
      })

      if (response.ok) {
        const data = await response.json()
        if (data.success && data.data.sample) {
          const newSample: WritingSample = {
            id: data.data.sample.id,
            dbId: data.data.sample.id,
            name: pasteName.trim() || 'Pasted Text',
            type: 'TEXT',
            uploadDate: new Date().toLocaleDateString(),
            size: `${data.data.word_count} words`
          }
          setSamples(prev => [...prev, newSample])
          setPasteText('')
          setPasteName('')
          setShowPasteDialog(false)
        }
      } else {
        const error = await response.json()
        alert(`Failed to save text: ${error.error}`)
      }
    } catch (error) {
      console.error('Failed to save pasted text:', error)
      alert('Failed to save text. Please try again.')
    } finally {
      setIsUploading(false)
    }
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

  // Loading state
  if (authLoading || isLoadingSamples) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-5xl">
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
        </div>
      </div>
    )
  }

  // Not authenticated
  if (!isAuthenticated || !shopDomain) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-5xl">
        <Alert className="border-red-200 bg-red-50">
          <AlertCircle className="h-4 w-4 text-red-600" />
          <div className="ml-2">
            <p className="text-sm font-medium text-red-800">Authentication Required</p>
            <p className="text-sm text-red-700 mt-1">Please access this page from your Shopify admin.</p>
          </div>
        </Alert>
      </div>
    )
  }

  const samplesNeeded = Math.max(0, 3 - samples.length)
  const hasEnoughSamples = samples.length >= 3

  return (
    <div className="container mx-auto px-4 py-8 max-w-5xl">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <MessageSquare className="h-8 w-8 text-blue-600" />
          <h1 className="text-3xl font-bold text-gray-900">Brand Voice Profile</h1>
        </div>
        <p className="text-gray-600">
          Upload writing samples so AI can learn your brand's unique voice
        </p>
      </div>

      <div className="space-y-6">
        {/* Profile Status Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {profile ? (
                <CheckCircle2 className="h-5 w-5 text-green-600" />
              ) : isGenerating ? (
                <Loader2 className="h-5 w-5 animate-spin text-blue-600" />
              ) : (
                <AlertCircle className="h-5 w-5 text-amber-600" />
              )}
              Profile Status
            </CardTitle>
          </CardHeader>
          <CardContent>
            {profile ? (
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <Badge variant="default" className="bg-green-600">Ready</Badge>
                  <span className="text-sm text-gray-600">
                    Generated from {samples.length} samples on {new Date(profile.generated_at).toLocaleDateString()}
                  </span>
                </div>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <p className="text-sm font-medium text-gray-900 mb-2">Your Brand Voice:</p>
                  <p className="text-sm text-gray-700 whitespace-pre-wrap">{profile.profile_text}</p>
                </div>
              </div>
            ) : isGenerating ? (
              <div className="flex items-center gap-3 text-blue-600">
                <Loader2 className="h-5 w-5 animate-spin" />
                <span className="text-sm font-medium">Analyzing your writing samples and generating brand voice profile...</span>
              </div>
            ) : (
              <div>
                <p className="text-sm text-gray-700 mb-2">
                  {samplesNeeded > 0 ? (
                    <>Upload <strong>{samplesNeeded} more sample{samplesNeeded > 1 ? 's' : ''}</strong> to generate your brand voice profile.</>
                  ) : (
                    <>You have enough samples! Profile will generate automatically.</>
                  )}
                </p>
                <p className="text-xs text-gray-500">
                  Minimum 3 samples required • Current: {samples.length}
                </p>
              </div>
            )}
          </CardContent>
        </Card>

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
              <p className="text-sm text-green-50">{toastMessage}</p>
            </div>
          </div>
        </div>
      )}

      {/* Uploading Overlay */}
      {isUploading && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center">
          <div className="bg-white rounded-lg p-6 flex items-center gap-3">
            <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
            <span className="font-medium">Uploading samples...</span>
          </div>
        </div>
      )}
    </div>
  )
}
