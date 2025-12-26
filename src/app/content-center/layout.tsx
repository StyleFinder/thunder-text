"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import { Sparkles, FileText, User, Home } from "lucide-react";
import { useShop } from "@/hooks/useShop";

interface NavItem {
  basePath: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  description: string;
}

const NAV_ITEMS: NavItem[] = [
  {
    basePath: "",
    label: "Dashboard",
    icon: Home,
    description: "Overview and stats",
  },
  {
    basePath: "/generate",
    label: "Generate",
    icon: Sparkles,
    description: "Create new content",
  },
  {
    basePath: "/library",
    label: "Library",
    icon: FileText,
    description: "Saved content",
  },
  {
    basePath: "/voice",
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
  const { shopId } = useShop();

  // Determine base path based on whether we're in UUID routing or legacy routing
  const isUuidRouting = pathname?.includes('/stores/') && shopId;
  const contentCenterBase = isUuidRouting
    ? `/stores/${shopId}/content-center`
    : '/content-center';

  const getHref = (basePath: string) => {
    return `${contentCenterBase}${basePath}`;
  };

  const isActive = (basePath: string) => {
    const fullPath = getHref(basePath);
    if (basePath === "") {
      // Dashboard - exact match for base path
      return pathname === contentCenterBase || pathname === `${contentCenterBase}/`;
    }
    return pathname?.startsWith(fullPath);
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
              const active = isActive(item.basePath);
              const href = getHref(item.basePath);

              return (
                <Link key={item.basePath} href={href}>
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
