"use client";

import { useState, useEffect, Suspense } from "react";
import { useSession } from "next-auth/react";
import {
  Home,
  Settings,
  PlusCircle,
  HelpCircle,
  Edit,
  FileText,
  TrendingUp,
  Megaphone,
  User,
  Bell,
  File,
  Menu,
  X,
  Flame,
} from "lucide-react";
import { useNavigation } from "../hooks/useNavigation";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface AppNavigationProps {
  children: React.ReactNode;
}

interface NavItem {
  url: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  onClick: () => void;
  matches: boolean;
  allowedRoles?: string[]; // undefined = all roles
}

function NavigationContent({ children }: AppNavigationProps) {
  const [mobileNavigationActive, setMobileNavigationActive] = useState(false);
  const [isLargeScreen, setIsLargeScreen] = useState(true);
  const { data: session, status } = useSession();
  const { buildUrl, navigateTo, isActive, getAuthParams } = useNavigation();

  const { hasAuth, shop } = getAuthParams();

  // Determine user role:
  // PRIORITY: Shop param means store owner (always 'user' role)
  // - If has shop param -> store owner (role: 'user')
  // - If has session with role -> use session role (coach/admin)
  // - Default to 'user'
  let userRole: string;

  if (shop) {
    // Shop parameter present = store owner accessing via Shopify
    // Always treat as 'user' role regardless of session
    userRole = 'user';
  } else if (session?.user?.role) {
    // No shop param, but has session with role = coach or admin
    userRole = session.user.role;
  } else {
    // Default to user
    userRole = 'user';
  }

  // Debug log (remove in production)
  useEffect(() => {
    console.log('[AppNavigation] Role determination:', {
      shop,
      sessionRole: session?.user?.role,
      sessionStatus: status,
      determinedRole: userRole,
    });
  }, [shop, session?.user?.role, status, userRole]);

  useEffect(() => {
    const checkScreenSize = () => {
      setIsLargeScreen(window.innerWidth >= 640);
    };

    checkScreenSize();
    window.addEventListener('resize', checkScreenSize);
    return () => window.removeEventListener('resize', checkScreenSize);
  }, []);

  const allNavigationItems: NavItem[] = [
    // Store Owner Dashboard
    {
      url: buildUrl("/dashboard"),
      label: "Dashboard",
      icon: Home,
      onClick: () => navigateTo("/dashboard"),
      matches: isActive({
        label: "Dashboard",
        url: buildUrl("/dashboard"),
        matchPaths: ["/dashboard"],
        exactMatch: false,
      }),
      allowedRoles: ['user', 'admin'], // Store owners only
    },
    // Coach Dashboard (BHB Dashboard)
    {
      url: buildUrl("/bhb"),
      label: "BHB Dashboard",
      icon: Home,
      onClick: () => navigateTo("/bhb"),
      matches: isActive({
        label: "BHB Dashboard",
        url: buildUrl("/bhb"),
        matchPaths: ["/bhb"],
        exactMatch: false,
      }),
      allowedRoles: ['coach'], // Coaches only
    },
    // Store owner tools
    {
      url: buildUrl("/create-pd"),
      label: "Create Description",
      icon: PlusCircle,
      onClick: () => navigateTo("/create-pd"),
      matches: isActive({
        label: "Create Description",
        url: buildUrl("/create-pd"),
        matchPaths: ["/create-pd", "/generate"],
        exactMatch: false,
      }),
      allowedRoles: ['user', 'admin'],
    },
    {
      url: buildUrl("/enhance"),
      label: "Enhance Product",
      icon: Edit,
      onClick: () => navigateTo("/enhance"),
      matches: isActive({
        label: "Enhance Product",
        url: buildUrl("/enhance"),
        matchPaths: ["/enhance"],
        exactMatch: false,
      }),
      allowedRoles: ['user', 'admin'],
    },
    {
      url: buildUrl("/aie"),
      label: "AI Ad Engine",
      icon: Megaphone,
      onClick: () => navigateTo("/aie"),
      matches: isActive({
        label: "AI Ad Engine",
        url: buildUrl("/aie"),
        matchPaths: ["/aie"],
        exactMatch: false,
      }),
      allowedRoles: ['user', 'admin'],
    },
    {
      url: buildUrl("/business-profile"),
      label: "Business Profile",
      icon: User,
      onClick: () => navigateTo("/business-profile"),
      matches: isActive({
        label: "Business Profile",
        url: buildUrl("/business-profile"),
        matchPaths: ["/business-profile"],
        exactMatch: false,
      }),
      allowedRoles: ['user', 'admin'],
    },
    {
      url: buildUrl("/content-center"),
      label: "Content Center",
      icon: FileText,
      onClick: () => navigateTo("/content-center"),
      matches: isActive({
        label: "Content Center",
        url: buildUrl("/content-center"),
        matchPaths: ["/content-center"],
        exactMatch: false,
      }),
      allowedRoles: ['user', 'admin'],
    },
    // Shared resources
    {
      url: buildUrl("/best-practices"),
      label: "Best Practices",
      icon: File,
      onClick: () => navigateTo("/best-practices"),
      matches: isActive({
        label: "Best Practices",
        url: buildUrl("/best-practices"),
        matchPaths: ["/best-practices"],
        exactMatch: false,
      }),
      allowedRoles: ['coach'], // Coaches only
    },
    {
      url: buildUrl("/bhb/hot-takes"),
      label: "Hot Takes",
      icon: Flame,
      onClick: () => navigateTo("/bhb/hot-takes"),
      matches: isActive({
        label: "Hot Takes",
        url: buildUrl("/bhb/hot-takes"),
        matchPaths: ["/bhb/hot-takes"],
        exactMatch: false,
      }),
      allowedRoles: ['coach'], // Coaches only
    },
    {
      url: buildUrl("/trends"),
      label: "Seasonal Trends",
      icon: TrendingUp,
      onClick: () => navigateTo("/trends"),
      matches: isActive({
        label: "Seasonal Trends",
        url: buildUrl("/trends"),
        matchPaths: ["/trends"],
        exactMatch: false,
      }),
      // Both coaches and store owners
    },
    {
      url: buildUrl("/settings"),
      label: "Settings",
      icon: Settings,
      onClick: () => navigateTo("/settings"),
      matches: isActive({
        label: "Settings",
        url: buildUrl("/settings"),
        matchPaths: ["/settings"],
        exactMatch: false,
      }),
      allowedRoles: ['user', 'admin'],
    },
    {
      url: buildUrl("/help"),
      label: "Help",
      icon: HelpCircle,
      onClick: () => navigateTo("/help"),
      matches: isActive({
        label: "Help",
        url: buildUrl("/help"),
        matchPaths: ["/help"],
        exactMatch: false,
      }),
      allowedRoles: ['user', 'admin'],
    },
  ];

  // Filter navigation items based on user role
  const navigationItems = allNavigationItems.filter(item => {
    if (!item.allowedRoles) return true; // No restriction, show to all
    return item.allowedRoles.includes(userRole);
  });

  return (
    <div className="min-h-screen flex" style={{ backgroundColor: '#f9fafb' }}>
      {/* Desktop Sidebar (in-flow, no overlays) */}
      {isLargeScreen && (
        <aside
          className="flex flex-col shrink-0 border-r border-gray-200 bg-white"
          style={{
            position: 'sticky',
            top: 0,
            height: '100vh',
            width: '240px',
            maxWidth: '240px',
            minWidth: '240px',
          }}
        >
        <div className="px-4 py-6 border-b border-gray-200">
          <h1 style={{ fontSize: '20px', fontWeight: 700, color: '#003366', margin: 0 }}>
            ⚡ Thunder Text
          </h1>
        </div>

        <nav className="px-4 py-6 overflow-y-auto flex-1">
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            {navigationItems.map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.label}
                  onClick={item.onClick}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    width: '100%',
                    padding: '10px 12px',
                    borderRadius: '8px',
                    fontSize: '14px',
                    fontWeight: item.matches ? 600 : 500,
                    backgroundColor: 'transparent',
                    color: item.matches ? '#0066cc' : '#111827',
                    border: 'none',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                    textAlign: 'left',
                  }}
                  onMouseEnter={(e) => {
                    if (!item.matches) {
                      e.currentTarget.style.backgroundColor = '#f9fafb';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!item.matches) {
                      e.currentTarget.style.backgroundColor = 'transparent';
                    }
                  }}
                >
                  <Icon
                    className={`h-5 w-5 flex-shrink-0 ${item.matches ? 'text-[#0066cc]' : 'text-[#6b7280]'}`}
                  />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </div>
        </nav>

        <div className="px-4 py-4 border-t border-gray-200">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                width: '100%',
                padding: '10px 12px',
                borderRadius: '8px',
                fontSize: '14px',
                fontWeight: 500,
                backgroundColor: 'transparent',
                color: '#111827',
                border: 'none',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
                textAlign: 'left',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = '#f9fafb';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'transparent';
              }}>
                <div style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '50%',
                  backgroundColor: '#0066cc',
                  color: 'white',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '14px',
                  fontWeight: 600,
                  flexShrink: 0,
                }}>
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontSize: '14px', fontWeight: 500, margin: 0, color: '#111827' }}>Thunder Text</p>
                  <p style={{ fontSize: '12px', margin: 0, color: '#6b7280' }}>
                    {hasAuth ? "Connected" : "Not Connected"}
                  </p>
                </div>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuItem onClick={() => navigateTo("/settings")}>
                <Settings className="mr-2 h-4 w-4" />
                Settings
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => navigateTo("/help")}>
                <HelpCircle className="mr-2 h-4 w-4" />
                Help Center
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        </aside>
      )}

      {/* Mobile Header */}
      {!isLargeScreen && (
      <header className="text-white sticky top-0 z-50" style={{
        backgroundColor: 'white',
        height: '64px',
        borderBottom: '1px solid #e5e7eb',
        boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)'
      }}>
        <div className="px-4">
          <div className="flex items-center justify-between" style={{ height: '64px' }}>
            {/* Logo and Menu */}
            <div className="flex items-center gap-3">
              <button
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: '8px',
                  borderRadius: '8px',
                  border: 'none',
                  backgroundColor: 'transparent',
                  color: '#6b7280',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                }}
                onClick={() => setMobileNavigationActive(!mobileNavigationActive)}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = '#f9fafb';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'transparent';
                }}
              >
                {mobileNavigationActive ? (
                  <X className="h-6 w-6" />
                ) : (
                  <Menu className="h-6 w-6" />
                )}
              </button>
              <h1 style={{ fontSize: '18px', fontWeight: 600, color: '#003366', margin: 0 }}>
                ⚡ Thunder Text
              </h1>
            </div>

            {/* User Menu */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  className="h-10 w-10 rounded-full bg-primary hover:bg-primary/90 text-white"
                  style={{ padding: 0 }}
                >
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <div className="px-2 py-1.5">
                  <p className="text-sm font-medium">Thunder Text</p>
                  <p className="text-xs text-muted-foreground">
                    {hasAuth ? "Connected to Shopify" : "Not Connected"}
                  </p>
                </div>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => navigateTo("/settings")}>
                  <Settings className="mr-2 h-4 w-4" />
                  Settings
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigateTo("/help")}>
                  <HelpCircle className="mr-2 h-4 w-4" />
                  Help Center
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>
      )}

      {/* Mobile Navigation Sidebar */}
      {!isLargeScreen && mobileNavigationActive && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-40"
          onClick={() => setMobileNavigationActive(false)}
        >
          <aside
            style={{
              position: 'absolute',
              left: 0,
              top: 0,
              bottom: 0,
              width: '280px',
              backgroundColor: '#ffffff',
              boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ padding: '24px 16px' }}>
              <h2 style={{
                fontSize: '18px',
                fontWeight: 700,
                color: '#111827',
                marginBottom: '24px',
              }}>
                ⚡ Thunder Text
              </h2>

              <nav style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginTop: '24px' }}>
                {navigationItems.map((item) => {
                  const Icon = item.icon;
                  return (
                    <button
                      key={item.label}
                      onClick={() => {
                        item.onClick();
                        setMobileNavigationActive(false);
                      }}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px',
                        width: '100%',
                        padding: '10px 12px',
                        borderRadius: '8px',
                        fontSize: '14px',
                        fontWeight: item.matches ? 600 : 500,
                        backgroundColor: 'transparent',
                        color: item.matches ? '#0066cc' : '#111827',
                        border: 'none',
                        cursor: 'pointer',
                        transition: 'all 0.15s ease',
                        textAlign: 'left',
                      }}
                    >
                      <Icon
                        className={`h-5 w-5 flex-shrink-0 ${item.matches ? 'text-[#0066cc]' : 'text-[#6b7280]'}`}
                      />
                      {item.label}
                    </button>
                  );
                })}
              </nav>
            </div>
          </aside>
        </div>
      )}

      {/* Main Content Area */}
      <div
        className="flex-1 flex flex-col w-full"
        style={{ position: 'relative', zIndex: 10 }}
      >
        <main
          id="main-content"
          className="flex-1 overflow-auto"
          style={{
            backgroundColor: '#f9fafb',
            padding: '48px 32px'
          }}
        >
          {children}
        </main>
      </div>
    </div>
  );
}

function NavigationFallback() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-oxford-50">
      <div className="text-center">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-smart-500"></div>
        <p className="mt-4 text-oxford-700">Loading...</p>
      </div>
    </div>
  );
}

export function AppNavigation({ children }: AppNavigationProps) {
  return (
    <Suspense fallback={<NavigationFallback />}>
      <NavigationContent>{children}</NavigationContent>
    </Suspense>
  );
}
