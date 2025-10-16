'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import Link from 'next/link'
import {
  Sparkles,
  FileText,
  TrendingUp,
  Clock,
  ArrowRight,
  Plus,
  User,
  Upload
} from 'lucide-react'

export default function ContentCenterDashboard() {
  // Mock data - in real app, fetch from API
  const stats = {
    totalContent: 24,
    thisMonth: 8,
    savedDrafts: 3,
    voiceProfileStatus: 'active'
  }

  const recentContent = [
    {
      id: '1',
      title: 'Summer Collection Launch Blog Post',
      type: 'blog',
      wordCount: 1250,
      createdAt: '2 hours ago'
    },
    {
      id: '2',
      title: 'Instagram Caption: New Arrivals',
      type: 'social_instagram',
      wordCount: 150,
      createdAt: '5 hours ago'
    },
    {
      id: '3',
      title: 'Product Description: Floral Dress',
      type: 'store_copy',
      wordCount: 320,
      createdAt: '1 day ago'
    }
  ]

  const quickActions = [
    {
      title: 'Generate Content',
      description: 'Create new AI-powered content',
      icon: Sparkles,
      href: '/content-center/generate',
      variant: 'default' as const
    },
    {
      title: 'View Library',
      description: 'Browse saved content',
      icon: FileText,
      href: '/content-center/library',
      variant: 'outline' as const
    },
    {
      title: 'Update Voice Profile',
      description: 'Refine your brand voice',
      icon: User,
      href: '/content-center/voice',
      variant: 'outline' as const
    },
    {
      title: 'Upload Samples',
      description: 'Add writing samples',
      icon: Upload,
      href: '/content-center/samples',
      variant: 'outline' as const
    }
  ]

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      {/* Welcome Section */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Welcome to Content Center</h1>
        <p className="text-muted-foreground">
          Generate on-brand content powered by AI that matches your unique voice
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Total Content</CardDescription>
            <CardTitle className="text-3xl">{stats.totalContent}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <TrendingUp className="h-4 w-4 text-green-500" />
              <span>All time</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardDescription>This Month</CardDescription>
            <CardTitle className="text-3xl">{stats.thisMonth}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Clock className="h-4 w-4" />
              <span>Last 30 days</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Saved Drafts</CardDescription>
            <CardTitle className="text-3xl">{stats.savedDrafts}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <FileText className="h-4 w-4" />
              <span>Ready to edit</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Voice Profile</CardDescription>
            <CardTitle>
              <Badge variant="default" className="text-sm">
                Active
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <User className="h-4 w-4" />
              <span>Last updated today</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <div className="mb-8">
        <h2 className="text-xl font-semibold mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {quickActions.map((action, idx) => {
            const Icon = action.icon
            return (
              <Link key={idx} href={action.href}>
                <Card className="h-full hover:shadow-lg transition-shadow cursor-pointer">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="bg-primary/10 p-3 rounded-lg">
                        <Icon className="h-6 w-6 text-primary" />
                      </div>
                      <ArrowRight className="h-5 w-5 text-muted-foreground" />
                    </div>
                  </CardHeader>
                  <CardContent>
                    <CardTitle className="text-base mb-1">{action.title}</CardTitle>
                    <CardDescription>{action.description}</CardDescription>
                  </CardContent>
                </Card>
              </Link>
            )
          })}
        </div>
      </div>

      {/* Recent Content */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold">Recent Content</h2>
          <Link href="/content-center/library">
            <Button variant="ghost" size="sm">
              View All
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          </Link>
        </div>

        <Card>
          <CardContent className="p-0">
            <div className="divide-y">
              {recentContent.map((content) => (
                <Link
                  key={content.id}
                  href={`/content-center/library/${content.id}`}
                  className="block p-4 hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-medium">{content.title}</h3>
                        <Badge variant="secondary" className="text-xs">
                          {content.type.replace('_', ' ')}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <span>{content.wordCount} words</span>
                        <span>•</span>
                        <span>{content.createdAt}</span>
                      </div>
                    </div>
                    <ArrowRight className="h-5 w-5 text-muted-foreground mt-1" />
                  </div>
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>

        {recentContent.length === 0 && (
          <Card>
            <CardContent className="py-12 text-center">
              <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No content yet</h3>
              <p className="text-muted-foreground mb-4">
                Start generating AI-powered content for your brand
              </p>
              <Link href="/content-center/generate">
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Content
                </Button>
              </Link>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
