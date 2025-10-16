'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'
import {
  RefreshCw,
  Save,
  Edit3,
  Eye,
  History,
  ChevronDown,
  ChevronUp,
  CheckCircle,
  AlertCircle,
  Sparkles
} from 'lucide-react'
import type { BrandVoiceProfile } from '@/types/content-center'

interface VoiceProfileProps {
  onProfileUpdate?: () => void
}

export function VoiceProfile({ onProfileUpdate }: VoiceProfileProps) {
  const [profile, setProfile] = useState<BrandVoiceProfile | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isEditing, setIsEditing] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [isRegenerating, setIsRegenerating] = useState(false)
  const [editedProfile, setEditedProfile] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [versionHistory, setVersionHistory] = useState<BrandVoiceProfile[]>([])
  const [showHistory, setShowHistory] = useState(false)
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({})

  useEffect(() => {
    fetchProfile()
    fetchVersionHistory()
  }, [])

  const fetchProfile = async () => {
    setIsLoading(true)
    setError(null)
    try {
      const response = await fetch('/api/content-center/voice', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('supabase_token')}`
        }
      })

      const data = await response.json()

      if (data.success && data.data.profile) {
        setProfile(data.data.profile)
        setEditedProfile(data.data.profile.profile_text)
      } else {
        setProfile(null)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load profile')
    } finally {
      setIsLoading(false)
    }
  }

  const fetchVersionHistory = async () => {
    try {
      const response = await fetch('/api/content-center/voice/history', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('supabase_token')}`
        }
      })

      const data = await response.json()

      if (data.success) {
        setVersionHistory(data.data.profiles)
      }
    } catch (err) {
      console.error('Failed to fetch version history:', err)
    }
  }

  const handleSave = async () => {
    if (!profile) return

    setIsSaving(true)
    setError(null)
    setSuccessMessage(null)

    try {
      const response = await fetch(`/api/content-center/voice/${profile.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('supabase_token')}`
        },
        body: JSON.stringify({
          profile_text: editedProfile
        })
      })

      const data = await response.json()

      if (data.success) {
        setProfile(data.data)
        setIsEditing(false)
        setSuccessMessage('Profile saved successfully')
        setTimeout(() => setSuccessMessage(null), 3000)
        onProfileUpdate?.()
      } else {
        throw new Error(data.error || 'Failed to save profile')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save profile')
    } finally {
      setIsSaving(false)
    }
  }

  const handleRegenerate = async () => {
    if (!confirm('This will regenerate your voice profile from your current samples. Continue?')) {
      return
    }

    setIsRegenerating(true)
    setError(null)
    setSuccessMessage(null)

    try {
      const response = await fetch('/api/content-center/voice/generate', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('supabase_token')}`
        }
      })

      const data = await response.json()

      if (data.success) {
        setProfile(data.data.profile)
        setEditedProfile(data.data.profile.profile_text)
        setSuccessMessage('Profile regenerated successfully')
        setTimeout(() => setSuccessMessage(null), 3000)
        fetchVersionHistory()
        onProfileUpdate?.()
      } else {
        throw new Error(data.error || 'Failed to regenerate profile')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to regenerate profile')
    } finally {
      setIsRegenerating(false)
    }
  }

  const toggleSection = (section: string) => {
    setOpenSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }))
  }

  const parseProfileSections = (profileText: string) => {
    const sections: { title: string; content: string }[] = []
    const lines = profileText.split('\n')
    let currentSection: { title: string; content: string } | null = null

    for (const line of lines) {
      const trimmed = line.trim()

      // Check if line is a section header (all caps or ends with :)
      if (trimmed.match(/^[A-Z\s]+:?$/) && trimmed.length > 0 && trimmed.length < 50) {
        if (currentSection) {
          sections.push(currentSection)
        }
        currentSection = {
          title: trimmed.replace(':', ''),
          content: ''
        }
      } else if (currentSection && trimmed) {
        currentSection.content += line + '\n'
      }
    }

    if (currentSection) {
      sections.push(currentSection)
    }

    return sections
  }

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
          <span className="ml-2 text-muted-foreground">Loading voice profile...</span>
        </CardContent>
      </Card>
    )
  }

  if (!profile) {
    return (
      <Card>
        <CardContent className="py-12">
          <div className="text-center space-y-4">
            <Sparkles className="mx-auto h-12 w-12 text-muted-foreground" />
            <div>
              <h3 className="text-lg font-semibold mb-2">No Voice Profile Yet</h3>
              <p className="text-sm text-muted-foreground max-w-md mx-auto">
                Upload at least 3 writing samples to generate your personalized voice profile.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  const sections = parseProfileSections(profile.profile_text)

  return (
    <div className="space-y-6">
      {/* Header Actions */}
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div>
              <CardTitle>Your Brand Voice Profile</CardTitle>
              <CardDescription>
                Version {profile.profile_version} •
                {profile.user_edited ? ' Edited by you' : ' AI Generated'} •
                Updated {new Date(profile.generated_at).toLocaleDateString()}
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              {profile.user_edited && (
                <Badge variant="outline">Custom Edited</Badge>
              )}
              <Badge variant="secondary">v{profile.profile_version}</Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {!isEditing ? (
              <>
                <Button onClick={() => setIsEditing(true)} variant="outline">
                  <Edit3 className="mr-2 h-4 w-4" />
                  Edit Profile
                </Button>
                <Button onClick={handleRegenerate} variant="outline" disabled={isRegenerating}>
                  {isRegenerating ? (
                    <>
                      <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                      Regenerating...
                    </>
                  ) : (
                    <>
                      <RefreshCw className="mr-2 h-4 w-4" />
                      Regenerate
                    </>
                  )}
                </Button>
                <Button onClick={() => setShowHistory(!showHistory)} variant="outline">
                  <History className="mr-2 h-4 w-4" />
                  History ({versionHistory.length})
                </Button>
              </>
            ) : (
              <>
                <Button onClick={handleSave} disabled={isSaving}>
                  {isSaving ? (
                    <>
                      <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="mr-2 h-4 w-4" />
                      Save Changes
                    </>
                  )}
                </Button>
                <Button
                  onClick={() => {
                    setIsEditing(false)
                    setEditedProfile(profile.profile_text)
                  }}
                  variant="outline"
                >
                  Cancel
                </Button>
              </>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Success/Error Messages */}
      {successMessage && (
        <Alert className="border-green-600 bg-green-50">
          <CheckCircle className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-green-600">{successMessage}</AlertDescription>
        </Alert>
      )}

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Version History */}
      {showHistory && versionHistory.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Version History</CardTitle>
            <CardDescription>Previous versions of your voice profile</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {versionHistory.map((version) => (
                <div
                  key={version.id}
                  className={`p-3 rounded-lg border ${
                    version.is_current ? 'border-primary bg-primary/5' : 'border-border'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="font-medium">Version {version.profile_version}</span>
                      {version.is_current && (
                        <Badge variant="default" className="ml-2">Current</Badge>
                      )}
                      {version.user_edited && (
                        <Badge variant="outline" className="ml-2">Edited</Badge>
                      )}
                    </div>
                    <span className="text-sm text-muted-foreground">
                      {new Date(version.generated_at).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Profile Content */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Profile Content</CardTitle>
        </CardHeader>
        <CardContent>
          {isEditing ? (
            <Textarea
              value={editedProfile}
              onChange={(e) => setEditedProfile(e.target.value)}
              rows={20}
              className="font-mono text-sm"
            />
          ) : (
            <div className="space-y-4">
              {sections.map((section, index) => (
                <Collapsible
                  key={index}
                  open={openSections[section.title] !== false}
                  onOpenChange={() => toggleSection(section.title)}
                >
                  <CollapsibleTrigger className="flex w-full items-center justify-between rounded-lg border p-4 hover:bg-muted/50 transition-colors">
                    <h3 className="font-semibold">{section.title}</h3>
                    {openSections[section.title] !== false ? (
                      <ChevronUp className="h-4 w-4" />
                    ) : (
                      <ChevronDown className="h-4 w-4" />
                    )}
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <div className="p-4 border-x border-b rounded-b-lg">
                      <pre className="whitespace-pre-wrap text-sm text-muted-foreground">
                        {section.content.trim()}
                      </pre>
                    </div>
                  </CollapsibleContent>
                </Collapsible>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
