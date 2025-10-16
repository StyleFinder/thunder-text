'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert } from '@/components/ui/alert'
import {
  Upload,
  FileText,
  CheckCircle2,
  X,
  Download,
  Sparkles
} from 'lucide-react'

interface WritingSample {
  id: string
  name: string
  type: string
  uploadDate: string
  size: string
}

export default function SamplesPage() {
  const [samples, setSamples] = useState<WritingSample[]>([])
  const [isDragging, setIsDragging] = useState(false)

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
    // TODO: Handle file upload
    console.log('Files dropped:', e.dataTransfer.files)
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    // TODO: Handle file upload
    console.log('Files selected:', e.target.files)
  }

  const removeSample = (id: string) => {
    setSamples(samples.filter(s => s.id !== id))
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-5xl">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <FileText className="h-8 w-8 text-blue-600" />
          <h1 className="text-3xl font-bold text-gray-900">Writing Samples</h1>
        </div>
        <p className="text-gray-600">
          Upload examples of your brand's content to train the AI on your unique style
        </p>
      </div>

      {/* Info Alert */}
      <Alert className="mb-6 border-blue-200 bg-blue-50">
        <Sparkles className="h-4 w-4 text-blue-600" />
        <div className="ml-2">
          <p className="text-sm font-medium text-blue-900">Why upload samples?</p>
          <p className="text-sm text-blue-700 mt-1">
            The AI learns from your existing content to generate new posts that match your brand's authentic voice and style
          </p>
        </div>
      </Alert>

      <div className="space-y-6">
        {/* Upload Area */}
        <Card>
          <CardHeader>
            <CardTitle>Upload Samples</CardTitle>
            <CardDescription>
              Drag and drop files or click to browse (PDF, DOC, TXT, or paste text)
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
              <Button variant="outline" className="flex-1">
                <FileText className="h-4 w-4 mr-2" />
                Paste Text
              </Button>
              <Button variant="outline" className="flex-1">
                <Download className="h-4 w-4 mr-2" />
                Import from URL
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Uploaded Samples */}
        {samples.length > 0 && (
          <Card>
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

        {/* Guidelines */}
        <Card>
          <CardHeader>
            <CardTitle>Best Practices</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 text-sm text-gray-700">
              <li className="flex items-start gap-2">
                <CheckCircle2 className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                <span>Upload 5-10 diverse examples of your best content</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                <span>Include different content types (social posts, emails, product descriptions)</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                <span>Choose content that truly represents your brand voice</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                <span>More samples = better AI understanding of your style</span>
              </li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
