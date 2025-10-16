'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  FileText,
  Megaphone,
  ShoppingBag,
  Facebook,
  Instagram,
  Music,
  Check
} from 'lucide-react'
import { ContentType } from '@/types/content-center'

interface ContentTypeOption {
  type: ContentType
  label: string
  description: string
  icon: React.ComponentType<{ className?: string }>
  platforms?: string[]
  wordCountRange: string
  examples: string[]
}

const CONTENT_TYPES: ContentTypeOption[] = [
  {
    type: 'blog',
    label: 'Blog Post',
    description: 'Long-form content for your blog or website',
    icon: FileText,
    wordCountRange: '500-2000 words',
    examples: ['Product guides', 'Style tips', 'Brand stories', 'How-to articles']
  },
  {
    type: 'ad',
    label: 'Ad Copy',
    description: 'Compelling copy for digital advertising',
    icon: Megaphone,
    wordCountRange: '50-800 words',
    examples: ['Facebook ads', 'Google ads', 'Email campaigns', 'Promotional copy']
  },
  {
    type: 'store_copy',
    label: 'Store Copy',
    description: 'Product descriptions and store content',
    icon: ShoppingBag,
    wordCountRange: '200-1500 words',
    examples: ['Product descriptions', 'Collection pages', 'About page', 'Policies']
  },
  {
    type: 'social_facebook',
    label: 'Facebook Post',
    description: 'Engaging posts for Facebook',
    icon: Facebook,
    platforms: ['Facebook'],
    wordCountRange: '50-500 words',
    examples: ['Product launches', 'Community updates', 'Behind-the-scenes', 'Promotions']
  },
  {
    type: 'social_instagram',
    label: 'Instagram Caption',
    description: 'Captivating captions for Instagram',
    icon: Instagram,
    platforms: ['Instagram'],
    wordCountRange: '50-300 words',
    examples: ['Product photos', 'Lifestyle shots', 'Stories', 'Reels descriptions']
  },
  {
    type: 'social_tiktok',
    label: 'TikTok Caption',
    description: 'Trendy captions for TikTok videos',
    icon: Music,
    platforms: ['TikTok'],
    wordCountRange: '50-200 words',
    examples: ['Video descriptions', 'Trend participation', 'Product demos', 'Tips & tricks']
  }
]

interface ContentTypeSelectorProps {
  selectedType: ContentType | null
  onSelectType: (type: ContentType) => void
  className?: string
}

export function ContentTypeSelector({
  selectedType,
  onSelectType,
  className = ''
}: ContentTypeSelectorProps) {
  const [hoveredType, setHoveredType] = useState<ContentType | null>(null)

  return (
    <div className={`space-y-4 ${className}`}>
      <div>
        <h2 className="text-2xl font-bold mb-2">Choose Content Type</h2>
        <p className="text-muted-foreground">
          Select the type of content you want to create. Each type is optimized for its specific use case.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {CONTENT_TYPES.map((option) => {
          const Icon = option.icon
          const isSelected = selectedType === option.type
          const isHovered = hoveredType === option.type

          return (
            <Card
              key={option.type}
              className={`cursor-pointer transition-all duration-200 ${
                isSelected
                  ? 'ring-2 ring-primary shadow-lg'
                  : isHovered
                  ? 'shadow-md scale-[1.02]'
                  : 'hover:shadow-md'
              }`}
              onClick={() => onSelectType(option.type)}
              onMouseEnter={() => setHoveredType(option.type)}
              onMouseLeave={() => setHoveredType(null)}
            >
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div
                      className={`p-2 rounded-lg ${
                        isSelected
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-muted'
                      }`}
                    >
                      <Icon className="h-5 w-5" />
                    </div>
                    <div>
                      <CardTitle className="text-lg">{option.label}</CardTitle>
                      {option.platforms && (
                        <div className="flex gap-1 mt-1">
                          {option.platforms.map((platform) => (
                            <Badge key={platform} variant="secondary" className="text-xs">
                              {platform}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                  {isSelected && (
                    <div className="bg-primary text-primary-foreground rounded-full p-1">
                      <Check className="h-4 w-4" />
                    </div>
                  )}
                </div>
                <CardDescription className="mt-2">
                  {option.description}
                </CardDescription>
              </CardHeader>

              <CardContent className="space-y-3">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <FileText className="h-4 w-4" />
                  <span>{option.wordCountRange}</span>
                </div>

                <div className="space-y-1">
                  <p className="text-xs font-medium text-muted-foreground">Examples:</p>
                  <ul className="text-xs space-y-0.5">
                    {option.examples.slice(0, 3).map((example, idx) => (
                      <li key={idx} className="text-muted-foreground">
                        • {example}
                      </li>
                    ))}
                  </ul>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {selectedType && (
        <div className="flex justify-end">
          <Button onClick={() => onSelectType(selectedType)}>
            Continue with {CONTENT_TYPES.find(t => t.type === selectedType)?.label}
          </Button>
        </div>
      )}
    </div>
  )
}
