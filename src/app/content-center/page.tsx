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
    <div className="w-full flex flex-col items-center" style={{ background: '#fafaf9', minHeight: '100vh', padding: '32px 24px' }}>
      <div className="w-full" style={{ maxWidth: '1000px' }}>
        {/* Welcome Section */}
        <div className="mb-8" style={{ marginBottom: '32px' }}>
          <h1 style={{ fontSize: '32px', fontWeight: 700, marginBottom: '8px', color: '#003366', fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' }}>Welcome to Content Center</h1>
          <p style={{ fontSize: '14px', color: '#6b7280', fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' }}>
            Generate on-brand content powered by AI that matches your unique voice
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-4 gap-4 mb-8" style={{ marginBottom: '32px', display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px' }}>
          <Card style={{ background: '#ffffff', border: '1px solid #e5e7eb', borderRadius: '8px', boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08)' }}>
            <CardHeader className="pb-3" style={{ padding: '18px 18px 9px 18px' }}>
              <CardDescription style={{ fontSize: '12px', color: '#6b7280', fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif', marginBottom: '6px' }}>Total Content</CardDescription>
              <CardTitle style={{ fontSize: '24px', fontWeight: 700, color: '#003366', fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' }}>{stats.totalContent}</CardTitle>
            </CardHeader>
            <CardContent style={{ padding: '0 18px 18px 18px' }}>
              <div className="flex items-center gap-2" style={{ fontSize: '12px', color: '#6b7280', fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' }}>
                <TrendingUp className="h-3 w-3" style={{ color: '#10b981' }} />
                <span>All time</span>
              </div>
            </CardContent>
          </Card>

          <Card style={{ background: '#ffffff', border: '1px solid #e5e7eb', borderRadius: '8px', boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08)' }}>
            <CardHeader className="pb-3" style={{ padding: '18px 18px 9px 18px' }}>
              <CardDescription style={{ fontSize: '12px', color: '#6b7280', fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif', marginBottom: '6px' }}>This Month</CardDescription>
              <CardTitle style={{ fontSize: '24px', fontWeight: 700, color: '#003366', fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' }}>{stats.thisMonth}</CardTitle>
            </CardHeader>
            <CardContent style={{ padding: '0 18px 18px 18px' }}>
              <div className="flex items-center gap-2" style={{ fontSize: '12px', color: '#6b7280', fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' }}>
                <Clock className="h-3 w-3" style={{ color: '#6b7280' }} />
                <span>Last 30 days</span>
              </div>
            </CardContent>
          </Card>

          <Card style={{ background: '#ffffff', border: '1px solid #e5e7eb', borderRadius: '8px', boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08)' }}>
            <CardHeader className="pb-3" style={{ padding: '18px 18px 9px 18px' }}>
              <CardDescription style={{ fontSize: '12px', color: '#6b7280', fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif', marginBottom: '6px' }}>Saved Drafts</CardDescription>
              <CardTitle style={{ fontSize: '24px', fontWeight: 700, color: '#003366', fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' }}>{stats.savedDrafts}</CardTitle>
            </CardHeader>
            <CardContent style={{ padding: '0 18px 18px 18px' }}>
              <div className="flex items-center gap-2" style={{ fontSize: '12px', color: '#6b7280', fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' }}>
                <FileText className="h-3 w-3" style={{ color: '#6b7280' }} />
                <span>Ready to edit</span>
              </div>
            </CardContent>
          </Card>

          <Card style={{ background: '#ffffff', border: '1px solid #e5e7eb', borderRadius: '8px', boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08)' }}>
            <CardHeader className="pb-3" style={{ padding: '18px 18px 9px 18px' }}>
              <CardDescription style={{ fontSize: '12px', color: '#6b7280', fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif', marginBottom: '6px' }}>Voice Profile</CardDescription>
              <CardTitle>
                <Badge variant="default" style={{ background: '#0066cc', color: '#ffffff', fontSize: '11px', fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif', padding: '2px 6px', borderRadius: '4px' }}>
                  Active
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent style={{ padding: '0 18px 18px 18px' }}>
              <div className="flex items-center gap-2" style={{ fontSize: '12px', color: '#6b7280', fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' }}>
                <User className="h-3 w-3" style={{ color: '#6b7280' }} />
                <span>Last updated today</span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Recent Content */}
        <div>
          <div className="flex items-center justify-between mb-4" style={{ marginBottom: '16px' }}>
            <h2 style={{ fontSize: '20px', fontWeight: 600, color: '#003366', fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' }}>Recent Content</h2>
            <Link href="/content-center/library">
              <Button variant="ghost" size="sm" style={{ background: 'transparent', color: '#0066cc', fontSize: '14px', fontWeight: 600, fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif', padding: '8px 12px', borderRadius: '8px' }}>
                View All
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </Link>
          </div>

          <Card style={{ background: '#ffffff', border: '1px solid #e5e7eb', borderRadius: '8px', boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08)' }}>
            <CardContent className="p-0">
              <div className="divide-y" style={{ borderColor: '#e5e7eb' }}>
                {recentContent.map((content) => (
                  <div
                    key={content.id}
                    className="block p-4"
                    style={{ padding: '16px', background: '#fafaf9' }}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1" style={{ marginBottom: '8px' }}>
                          <h3 style={{ fontSize: '14px', fontWeight: 500, color: '#001429', fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' }}>{content.title}</h3>
                          <Badge variant="secondary" style={{ background: '#f3f4f6', color: '#001429', fontSize: '11px', fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif', padding: '2px 8px', borderRadius: '4px' }}>
                            {content.type.replace('_', ' ')}
                          </Badge>
                          <Badge variant="outline" style={{ border: '1px solid #e5e7eb', color: '#6b7280', fontSize: '11px', fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif', padding: '2px 8px', borderRadius: '4px' }}>
                            Sample
                          </Badge>
                        </div>
                        <div className="flex items-center gap-4" style={{ fontSize: '14px', color: '#6b7280', fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' }}>
                          <span>{content.wordCount} words</span>
                          <span>•</span>
                          <span>{content.createdAt}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
                <div className="p-4 text-center" style={{ padding: '24px', textAlign: 'center' }}>
                  <p style={{ fontSize: '14px', color: '#6b7280', fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' }}>
                    Your generated content will appear here
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {recentContent.length === 0 && (
            <Card style={{ background: '#ffffff', border: '1px solid #e5e7eb', borderRadius: '8px', boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08)' }}>
              <CardContent className="py-12 text-center" style={{ padding: '48px 24px', textAlign: 'center' }}>
                <FileText className="h-12 w-12 mx-auto mb-4" style={{ color: '#6b7280', marginBottom: '16px' }} />
                <h3 style={{ fontSize: '18px', fontWeight: 600, color: '#003366', fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif', marginBottom: '8px' }}>No content yet</h3>
                <p style={{ fontSize: '14px', color: '#6b7280', fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif', marginBottom: '16px' }}>
                  Start generating AI-powered content for your brand
                </p>
                <Link href="/content-center/generate">
                  <Button style={{ background: '#0066cc', color: '#ffffff', borderRadius: '8px', padding: '12px 24px', fontSize: '14px', fontWeight: 600, fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif', border: 'none', cursor: 'pointer' }}>
                    <Plus className="h-4 w-4 mr-2" />
                    Create Content
                  </Button>
                </Link>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}

