'use client'

import { usePathname } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import {
  Sparkles,
  FileText,
  User,
  Upload,
  Home,
  Settings
} from 'lucide-react'

interface NavItem {
  href: string
  label: string
  icon: React.ComponentType<{ className?: string }>
  description: string
}

const NAV_ITEMS: NavItem[] = [
  {
    href: '/content-center',
    label: 'Dashboard',
    icon: Home,
    description: 'Overview and stats'
  },
  {
    href: '/content-center/generate',
    label: 'Generate',
    icon: Sparkles,
    description: 'Create new content'
  },
  {
    href: '/content-center/library',
    label: 'Library',
    icon: FileText,
    description: 'Saved content'
  },
  {
    href: '/content-center/voice',
    label: 'Brand Voice',
    icon: User,
    description: 'Voice settings & samples'
  }
]

export default function ContentCenterLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const pathname = usePathname()

  const isActive = (href: string) => {
    if (href === '/content-center') {
      return pathname === href
    }
    return pathname?.startsWith(href)
  }

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900">
      {/* Top Navigation */}
      <header className="border-b border-gray-200 bg-white">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between py-4">
            <div className="flex items-center gap-3">
              <div className="bg-blue-100 p-2 rounded-lg">
                <Sparkles className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">Content Creation Center</h1>
                <p className="text-sm text-gray-600">
                  AI-powered content in your brand voice
                </p>
              </div>
            </div>
          </div>

          {/* Navigation Tabs */}
          <nav className="flex gap-1 overflow-x-auto pb-px -mb-px">
            {NAV_ITEMS.map((item) => {
              const Icon = item.icon
              const active = isActive(item.href)

              return (
                <Link key={item.href} href={item.href}>
                  <Button
                    variant="ghost"
                    className={`
                      relative rounded-b-none h-auto py-3 px-4
                      ${active ? 'text-blue-600 bg-blue-50' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'}
                    `}
                  >
                    <div className="flex items-center gap-2">
                      <Icon className="h-4 w-4" />
                      <div className="text-left">
                        <div className="text-sm font-medium">{item.label}</div>
                        <div className="text-xs">{item.description}</div>
                      </div>
                    </div>
                    {active && (
                      <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600" />
                    )}
                  </Button>
                </Link>
              )
            })}
          </nav>
        </div>
      </header>

      {/* Main Content */}
      <main className="bg-gray-50">{children}</main>
    </div>
  )
}
