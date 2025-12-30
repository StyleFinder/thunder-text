'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import {
  CheckCircle,
  XCircle,
  AlertCircle,
  FileText,
  Target,
  TrendingUp,
  Lightbulb
} from 'lucide-react'

interface OnboardingGuidanceProps {
  activeSampleCount: number
  totalSampleCount: number
  className?: string
}

export function OnboardingGuidance({
  activeSampleCount,
  totalSampleCount,
  className = ''
}: OnboardingGuidanceProps) {
  const isReady = activeSampleCount >= 3
  const progressPercentage = Math.min((activeSampleCount / 3) * 100, 100)

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Progress Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5" />
            Your Progress
          </CardTitle>
          <CardDescription>
            {isReady
              ? "You're ready to generate your voice profile!"
              : `${3 - activeSampleCount} more sample${3 - activeSampleCount !== 1 ? 's' : ''} needed`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium">Active Samples</span>
              <span className="text-muted-foreground">
                {activeSampleCount} / 3 minimum
              </span>
            </div>
            <div className="h-2 bg-muted rounded-full overflow-hidden">
              <div
                className={`h-full transition-all duration-500 ${
                  isReady ? 'bg-green-600' : 'bg-primary'
                }`}
                style={{ width: `${progressPercentage}%` }}
              />
            </div>
            <div className="flex items-center gap-2 text-sm">
              {isReady ? (
                <>
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <span className="text-green-600 font-medium">Ready to generate!</span>
                </>
              ) : (
                <>
                  <AlertCircle className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">
                    Keep going! Quality samples create better profiles.
                  </span>
                </>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Best Practices Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Lightbulb className="h-5 w-5" />
            What Makes a Great Sample?
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Good Examples */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <CheckCircle className="h-5 w-5 text-green-600" />
              <h3 className="font-semibold text-green-600">✓ Good Samples</h3>
            </div>
            <div className="space-y-2 ml-7">
              <div className="flex items-start gap-2">
                <Badge variant="outline" className="mt-0.5">Blog</Badge>
                <p className="text-sm text-muted-foreground">
                  Personal blog posts that showcase your authentic voice
                </p>
              </div>
              <div className="flex items-start gap-2">
                <Badge variant="outline" className="mt-0.5">Email</Badge>
                <p className="text-sm text-muted-foreground">
                  Newsletters or customer emails you've written
                </p>
              </div>
              <div className="flex items-start gap-2">
                <Badge variant="outline" className="mt-0.5">Description</Badge>
                <p className="text-sm text-muted-foreground">
                  Product descriptions you personally crafted
                </p>
              </div>
              <div className="flex items-start gap-2">
                <Badge variant="outline" className="mt-0.5">Social</Badge>
                <p className="text-sm text-muted-foreground">
                  Longer social media posts that reflect your style
                </p>
              </div>
            </div>
          </div>

          {/* Bad Examples */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <XCircle className="h-5 w-5 text-red-600" />
              <h3 className="font-semibold text-red-600">✗ Avoid These</h3>
            </div>
            <div className="space-y-2 ml-7">
              <div className="flex items-start gap-2">
                <span className="text-red-600 mt-0.5">×</span>
                <p className="text-sm text-muted-foreground">
                  AI-generated content (we'll detect it!)
                </p>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-red-600 mt-0.5">×</span>
                <p className="text-sm text-muted-foreground">
                  Content written by others or heavily edited by teams
                </p>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-red-600 mt-0.5">×</span>
                <p className="text-sm text-muted-foreground">
                  Technical documentation or code snippets
                </p>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-red-600 mt-0.5">×</span>
                <p className="text-sm text-muted-foreground">
                  Very short samples (less than 500 words)
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tips for Better Results */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Tips for Better Results
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <Alert>
              <FileText className="h-4 w-4" />
              <AlertDescription>
                <strong>Variety is key:</strong> Upload different types of content (blogs, emails, descriptions) to capture your full range.
              </AlertDescription>
            </Alert>

            <Alert>
              <FileText className="h-4 w-4" />
              <AlertDescription>
                <strong>Quality over quantity:</strong> 3-5 excellent samples work better than 10 mediocre ones.
              </AlertDescription>
            </Alert>

            <Alert>
              <FileText className="h-4 w-4" />
              <AlertDescription>
                <strong>Recent is better:</strong> Use your most recent writing to capture your current voice.
              </AlertDescription>
            </Alert>

            <Alert>
              <FileText className="h-4 w-4" />
              <AlertDescription>
                <strong>Original content only:</strong> Only upload content you personally wrote. This ensures authenticity.
              </AlertDescription>
            </Alert>
          </div>
        </CardContent>
      </Card>

      {/* Sample Requirements */}
      <Card>
        <CardHeader>
          <CardTitle>Technical Requirements</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3 text-sm">
            <div className="flex items-center justify-between py-2 border-b">
              <span className="text-muted-foreground">Word count per sample</span>
              <span className="font-medium">500 - 5,000 words</span>
            </div>
            <div className="flex items-center justify-between py-2 border-b">
              <span className="text-muted-foreground">Minimum samples needed</span>
              <span className="font-medium">3 active samples</span>
            </div>
            <div className="flex items-center justify-between py-2 border-b">
              <span className="text-muted-foreground">Maximum samples allowed</span>
              <span className="font-medium">10 total samples</span>
            </div>
            <div className="flex items-center justify-between py-2 border-b">
              <span className="text-muted-foreground">File formats supported</span>
              <span className="font-medium">.txt, .doc, .docx, .pdf</span>
            </div>
            <div className="flex items-center justify-between py-2">
              <span className="text-muted-foreground">Maximum file size</span>
              <span className="font-medium">5 MB per file</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Example Visual */}
      <Card className="bg-muted/30">
        <CardHeader>
          <CardTitle className="text-lg">Visual Example</CardTitle>
          <CardDescription>Compare these sample snippets</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <span className="text-sm font-medium text-green-600">Good Sample</span>
              </div>
              <div className="bg-background p-4 rounded-lg border border-green-600/20">
                <p className="text-sm italic">
                  "I've been running my boutique for three years now, and let me tell you—finding
                  the perfect inventory balance is like trying to predict the weather. Some seasons,
                  florals fly off the shelves. Others, everyone wants black on black..."
                </p>
              </div>
              <p className="text-xs text-muted-foreground">
                ✓ Personal, authentic voice
                <br />
                ✓ Natural conversational style
                <br />✓ Real experiences and insights
              </p>
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <XCircle className="h-4 w-4 text-red-600" />
                <span className="text-sm font-medium text-red-600">Poor Sample</span>
              </div>
              <div className="bg-background p-4 rounded-lg border border-red-600/20">
                <p className="text-sm italic">
                  "Inventory management is crucial for retail success. Proper forecasting and data
                  analysis enable businesses to optimize stock levels and maximize profitability
                  through strategic purchasing decisions..."
                </p>
              </div>
              <p className="text-xs text-muted-foreground">
                × Generic, corporate language
                <br />
                × No personality or authenticity
                <br />× Sounds AI-generated
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
