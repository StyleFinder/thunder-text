"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Sparkles, FileText, User, Home } from "lucide-react";

interface NavItem {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  description: string;
}

const NAV_ITEMS: NavItem[] = [
  {
    href: "/content-center",
    label: "Dashboard",
    icon: Home,
    description: "Overview and stats",
  },
  {
    href: "/content-center/generate",
    label: "Generate",
    icon: Sparkles,
    description: "Create new content",
  },
  {
    href: "/content-center/library",
    label: "Library",
    icon: FileText,
    description: "Saved content",
  },
  {
    href: "/content-center/voice",
    label: "Brand Voice",
    icon: User,
    description: "Voice settings & samples",
  },
];

export default function ContentCenterLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  const isActive = (href: string) => {
    if (href === "/content-center") {
      return pathname === href;
    }
    return pathname?.startsWith(href);
  };

  return (
    <div style={{ minHeight: '100vh', background: '#fafaf9' }}>
      {/* Top Navigation */}
      <header style={{ borderBottom: '1px solid #e5e7eb', background: '#ffffff' }}>
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between" style={{ padding: '16px 0' }}>
            <div className="flex items-center gap-3">
              <div style={{ background: '#f0f7ff', padding: '8px', borderRadius: '8px' }}>
                <Sparkles className="h-6 w-6" style={{ color: '#0066cc' }} />
              </div>
              <div>
                <h1 style={{ fontSize: '20px', fontWeight: 700, color: '#003366', margin: 0, fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' }}>
                  Content Creation Center
                </h1>
                <p style={{ fontSize: '14px', color: '#6b7280', margin: 0, fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' }}>
                  AI-powered content in your brand voice
                </p>
              </div>
            </div>
          </div>

          {/* Navigation Tabs */}
          <nav className="flex gap-1 overflow-x-auto pb-px -mb-px">
            {NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              const active = isActive(item.href);

              return (
                <Link key={item.href} href={item.href}>
                  <button
                    style={{
                      position: 'relative',
                      borderRadius: '8px 8px 0 0',
                      height: 'auto',
                      padding: '12px 16px',
                      background: active ? '#f0f7ff' : 'transparent',
                      color: active ? '#0066cc' : '#6b7280',
                      border: 'none',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease',
                      fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif'
                    }}
                    onMouseEnter={(e) => {
                      if (!active) {
                        e.currentTarget.style.background = '#f9fafb';
                        e.currentTarget.style.color = '#003366';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!active) {
                        e.currentTarget.style.background = 'transparent';
                        e.currentTarget.style.color = '#6b7280';
                      }
                    }}
                  >
                    <div className="flex items-center" style={{ gap: '12px' }}>
                      <Icon className="h-4 w-4" />
                      <div style={{ textAlign: 'left' }}>
                        <div style={{ fontSize: '14px', fontWeight: 600 }}>{item.label}</div>
                        <div style={{ fontSize: '12px', color: active ? '#0066cc' : '#6b7280' }}>{item.description}</div>
                      </div>
                    </div>
                    {active && (
                      <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: '2px', background: '#0066cc' }} />
                    )}
                  </button>
                </Link>
              );
            })}
          </nav>
        </div>
      </header>

      {/* Main Content */}
      <main style={{ background: '#fafaf9', paddingTop: '32px' }}>{children}</main>
    </div>
  );
}
