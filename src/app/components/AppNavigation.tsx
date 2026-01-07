"use client";

import { useState, useEffect, Suspense } from "react";
import { useSession } from "next-auth/react";
import {
  Home,
  Settings,
  PlusCircle,
  HelpCircle,
  FileText,
  TrendingUp,
  Megaphone,
  User,
  File,
  Menu,
  X,
  Flame,
  LogOut,
  Library,
  ChevronDown,
  FilePlus,
  Package,
  Sparkles,
  Bot,
  Video,
} from "lucide-react";
import { useNavigation } from "../hooks/useNavigation";
import {
  isImageGenerationEnabled,
  isVideoGenerationEnabled,
} from "@/lib/feature-flags";
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

interface NavSubItem {
  url: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  onClick: () => void;
  matches: boolean;
}

interface NavItem {
  url: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  onClick: () => void;
  matches: boolean;
  allowedRoles?: string[]; // undefined = all roles
  subItems?: NavSubItem[]; // For nested navigation
  isParentOnly?: boolean; // True if this is a parent menu with no direct navigation
}

function NavigationContent({ children }: AppNavigationProps) {
  const [mobileNavigationActive, setMobileNavigationActive] = useState(false);
  const [isLargeScreen, setIsLargeScreen] = useState(true);
  const [expandedMenus, setExpandedMenus] = useState<Set<string>>(
    new Set(["Create Description"]),
  ); // Default expanded
  const { data: session, status } = useSession();
  const { buildUrl, navigateTo, isActive, getAuthParams } = useNavigation();

  const toggleMenu = (label: string) => {
    setExpandedMenus((prev) => {
      const next = new Set(prev);
      if (next.has(label)) {
        next.delete(label);
      } else {
        next.add(label);
      }
      return next;
    });
  };

  const { hasAuth, shop } = getAuthParams();

  // Determine user role:
  // PRIORITY: Shop param means store owner (always 'user' role)
  // - If has shop param -> store owner (role: 'user')
  // - If has session with role -> use session role (coach/admin/shop)
  // - 'shop' role from NextAuth session = treat as 'user' for nav purposes
  // - Default to 'user'
  let userRole: string;

  if (shop) {
    // Shop parameter present = store owner accessing via Shopify
    // Always treat as 'user' role regardless of session
    userRole = "user";
  } else if (session?.user?.role) {
    // No shop param, but has session with role
    // Map 'shop' role to 'user' for navigation filtering
    // This ensures standalone users (shop role) see the same nav as Shopify users
    userRole = session.user.role === "shop" ? "user" : session.user.role;
  } else {
    // Default to user
    userRole = "user";
  }

  // Debug log (remove in production)
  useEffect(() => {
    console.log("[AppNavigation] Role determination:", {
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
    window.addEventListener("resize", checkScreenSize);
    return () => window.removeEventListener("resize", checkScreenSize);
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
      allowedRoles: ["user", "admin"], // Store owners only
    },
    // AI Coaches - moved to second position
    {
      url: buildUrl("/ai-coaches"),
      label: "AI Coaches",
      icon: Bot,
      onClick: () => navigateTo("/ai-coaches"),
      matches: isActive({
        label: "AI Coaches",
        url: buildUrl("/ai-coaches"),
        matchPaths: ["/ai-coaches"],
        exactMatch: false,
      }),
      allowedRoles: ["user", "admin"],
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
      allowedRoles: ["coach"], // Coaches only
    },
    // Store owner tools - Create Description with sub-menu
    {
      url: "#",
      label: "Create Description",
      icon: PlusCircle,
      onClick: () => toggleMenu("Create Description"),
      matches: isActive({
        label: "Create Description",
        url: buildUrl("/create-pd"),
        matchPaths: ["/create-pd", "/generate", "/enhance"],
        exactMatch: false,
      }),
      allowedRoles: ["user", "admin"],
      isParentOnly: true,
      subItems: [
        {
          url: buildUrl("/create-pd"),
          label: "New Product",
          icon: FilePlus,
          onClick: () => navigateTo("/create-pd"),
          matches: isActive({
            label: "New Product",
            url: buildUrl("/create-pd"),
            matchPaths: ["/create-pd", "/generate"],
            exactMatch: false,
          }),
        },
        {
          url: buildUrl("/enhance"),
          label: "Existing Product",
          icon: Package,
          onClick: () => navigateTo("/enhance"),
          matches: isActive({
            label: "Existing Product",
            url: buildUrl("/enhance"),
            matchPaths: ["/enhance"],
            exactMatch: false,
          }),
        },
      ],
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
      allowedRoles: ["user", "admin"],
    },
    {
      url: buildUrl("/ads-library"),
      label: "Ads Library",
      icon: Library,
      onClick: () => navigateTo("/ads-library"),
      matches: isActive({
        label: "Ads Library",
        url: buildUrl("/ads-library"),
        matchPaths: ["/ads-library"],
        exactMatch: false,
      }),
      allowedRoles: ["user", "admin"],
    },
    // Image Generation - only shown when feature flag is enabled
    ...(isImageGenerationEnabled()
      ? [
          {
            url: buildUrl("/image-generation"),
            label: "Image Generation",
            icon: Sparkles,
            onClick: () => navigateTo("/image-generation"),
            matches: isActive({
              label: "Image Generation",
              url: buildUrl("/image-generation"),
              matchPaths: ["/image-generation"],
              exactMatch: false,
            }),
            allowedRoles: ["user", "admin"],
          },
        ]
      : []),
    // Video Generation - only shown when feature flag is enabled
    ...(isVideoGenerationEnabled()
      ? [
          {
            url: buildUrl("/content-center/animator"),
            label: "Video Generation",
            icon: Video,
            onClick: () => navigateTo("/content-center/animator"),
            matches: isActive({
              label: "Video Generation",
              url: buildUrl("/content-center/animator"),
              matchPaths: ["/content-center/animator"],
              exactMatch: false,
            }),
            allowedRoles: ["user", "admin"],
          },
        ]
      : []),
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
      allowedRoles: ["user", "admin"],
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
      allowedRoles: ["user", "admin"],
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
      allowedRoles: ["coach"], // Coaches only
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
      allowedRoles: ["coach"], // Coaches only
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
      allowedRoles: ["user", "admin"],
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
      allowedRoles: ["user", "admin"],
    },
  ];

  // Filter navigation items based on user role
  const navigationItems = allNavigationItems.filter((item) => {
    if (!item.allowedRoles) return true; // No restriction, show to all
    return item.allowedRoles.includes(userRole);
  });

  return (
    <div className="min-h-screen flex" style={{ backgroundColor: "#f9fafb" }}>
      {/* Desktop Sidebar (in-flow, no overlays) */}
      {isLargeScreen && (
        <aside
          className="flex flex-col shrink-0 border-r border-gray-200 bg-white"
          style={{
            position: "sticky",
            top: 0,
            height: "100vh",
            width: "240px",
            maxWidth: "240px",
            minWidth: "240px",
          }}
        >
          <div className="px-4 py-6 border-b border-gray-200">
            <h1
              style={{
                fontSize: "20px",
                fontWeight: 700,
                color: "#003366",
                margin: 0,
              }}
            >
              ⚡ Thunder Text
            </h1>
          </div>

          <nav className="px-4 py-6 overflow-y-auto flex-1">
            <div
              style={{ display: "flex", flexDirection: "column", gap: "4px" }}
            >
              {navigationItems.map((item) => {
                const Icon = item.icon;
                const isExpanded = expandedMenus.has(item.label);
                const hasSubItems = item.subItems && item.subItems.length > 0;

                return (
                  <div key={item.label}>
                    <button
                      onClick={item.onClick}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "12px",
                        width: "100%",
                        padding: "10px 12px",
                        borderRadius: "8px",
                        fontSize: "14px",
                        fontWeight: item.matches ? 600 : 500,
                        backgroundColor:
                          item.matches && !hasSubItems
                            ? "#e6f0ff"
                            : "transparent",
                        color: item.matches ? "#0066cc" : "#111827",
                        border: "none",
                        cursor: "pointer",
                        transition: "all 0.15s ease",
                        textAlign: "left",
                      }}
                      onMouseEnter={(e) => {
                        if (!item.matches || hasSubItems) {
                          e.currentTarget.style.backgroundColor = "#f9fafb";
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (!item.matches || hasSubItems) {
                          e.currentTarget.style.backgroundColor =
                            item.matches && !hasSubItems
                              ? "#e6f0ff"
                              : "transparent";
                        }
                      }}
                    >
                      <Icon
                        className={`h-5 w-5 flex-shrink-0 ${item.matches ? "text-[#0066cc]" : "text-[#6b7280]"}`}
                      />
                      <span style={{ flex: 1 }}>{item.label}</span>
                      {hasSubItems && (
                        <ChevronDown
                          className={`h-4 w-4 transition-transform duration-200 ${isExpanded ? "rotate-180" : ""}`}
                          style={{ color: "#6b7280" }}
                        />
                      )}
                    </button>

                    {/* Sub-items */}
                    {hasSubItems && isExpanded && (
                      <div
                        style={{
                          marginLeft: "12px",
                          marginTop: "4px",
                          paddingLeft: "12px",
                          borderLeft: "2px solid #e5e7eb",
                          display: "flex",
                          flexDirection: "column",
                          gap: "2px",
                        }}
                      >
                        {item.subItems!.map((subItem) => {
                          const SubIcon = subItem.icon;
                          return (
                            <button
                              key={subItem.label}
                              onClick={subItem.onClick}
                              style={{
                                display: "flex",
                                alignItems: "center",
                                gap: "10px",
                                width: "100%",
                                padding: "8px 10px",
                                borderRadius: "6px",
                                fontSize: "13px",
                                fontWeight: subItem.matches ? 600 : 500,
                                backgroundColor: subItem.matches
                                  ? "#e6f0ff"
                                  : "transparent",
                                color: subItem.matches ? "#0066cc" : "#4b5563",
                                border: "none",
                                cursor: "pointer",
                                transition: "all 0.15s ease",
                                textAlign: "left",
                              }}
                              onMouseEnter={(e) => {
                                if (!subItem.matches) {
                                  e.currentTarget.style.backgroundColor =
                                    "#f3f4f6";
                                }
                              }}
                              onMouseLeave={(e) => {
                                if (!subItem.matches) {
                                  e.currentTarget.style.backgroundColor =
                                    "transparent";
                                } else {
                                  e.currentTarget.style.backgroundColor =
                                    "#e6f0ff";
                                }
                              }}
                            >
                              <SubIcon
                                className={`h-4 w-4 flex-shrink-0 ${subItem.matches ? "text-[#0066cc]" : "text-[#9ca3af]"}`}
                              />
                              <span>{subItem.label}</span>
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}

              {/* Sign Out Button - Always Visible */}
              <div
                style={{
                  marginTop: "16px",
                  borderTop: "1px solid #e5e7eb",
                  paddingTop: "16px",
                }}
              >
                <button
                  onClick={() => (window.location.href = "/api/auth/logout")}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "12px",
                    width: "100%",
                    padding: "10px 12px",
                    borderRadius: "8px",
                    fontSize: "14px",
                    fontWeight: 500,
                    backgroundColor: "transparent",
                    color: "#dc2626",
                    border: "none",
                    cursor: "pointer",
                    transition: "all 0.15s ease",
                    textAlign: "left",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = "#fef2f2";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = "transparent";
                  }}
                >
                  <LogOut className="h-5 w-5 flex-shrink-0 text-[#dc2626]" />
                  <span>Sign Out</span>
                </button>
              </div>
            </div>
          </nav>

          <div className="px-4 py-4 border-t border-gray-200">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "12px",
                    width: "100%",
                    padding: "10px 12px",
                    borderRadius: "8px",
                    fontSize: "14px",
                    fontWeight: 500,
                    backgroundColor: "transparent",
                    color: "#111827",
                    border: "none",
                    cursor: "pointer",
                    transition: "all 0.15s ease",
                    textAlign: "left",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = "#f9fafb";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = "transparent";
                  }}
                >
                  <div
                    style={{
                      width: "32px",
                      height: "32px",
                      borderRadius: "50%",
                      backgroundColor: "#0066cc",
                      color: "white",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: "14px",
                      fontWeight: 600,
                      flexShrink: 0,
                    }}
                  ></div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p
                      style={{
                        fontSize: "14px",
                        fontWeight: 500,
                        margin: 0,
                        color: "#111827",
                      }}
                    >
                      Thunder Text
                    </p>
                    <p
                      style={{ fontSize: "12px", margin: 0, color: "#6b7280" }}
                    >
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
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => (window.location.href = "/api/auth/logout")}
                  className="text-red-600 focus:text-red-600"
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  Sign Out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </aside>
      )}

      {/* Mobile Header */}
      {!isLargeScreen && (
        <header
          className="text-white sticky top-0 z-50"
          style={{
            backgroundColor: "white",
            height: "64px",
            borderBottom: "1px solid #e5e7eb",
            boxShadow: "0 1px 3px rgba(0, 0, 0, 0.05)",
          }}
        >
          <div className="px-4">
            <div
              className="flex items-center justify-between"
              style={{ height: "64px" }}
            >
              {/* Logo and Menu */}
              <div className="flex items-center gap-3">
                <button
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    padding: "8px",
                    borderRadius: "8px",
                    border: "none",
                    backgroundColor: "transparent",
                    color: "#6b7280",
                    cursor: "pointer",
                    transition: "all 0.15s ease",
                  }}
                  onClick={() =>
                    setMobileNavigationActive(!mobileNavigationActive)
                  }
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = "#f9fafb";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = "transparent";
                  }}
                >
                  {mobileNavigationActive ? (
                    <X className="h-6 w-6" />
                  ) : (
                    <Menu className="h-6 w-6" />
                  )}
                </button>
                <h1
                  style={{
                    fontSize: "18px",
                    fontWeight: 600,
                    color: "#003366",
                    margin: 0,
                  }}
                >
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
                  ></Button>
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
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={() => (window.location.href = "/api/auth/logout")}
                    className="text-red-600 focus:text-red-600"
                  >
                    <LogOut className="mr-2 h-4 w-4" />
                    Sign Out
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
              position: "absolute",
              left: 0,
              top: 0,
              bottom: 0,
              width: "280px",
              backgroundColor: "#ffffff",
              boxShadow:
                "0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ padding: "24px 16px" }}>
              <h2
                style={{
                  fontSize: "18px",
                  fontWeight: 700,
                  color: "#111827",
                  marginBottom: "24px",
                }}
              >
                ⚡ Thunder Text
              </h2>

              <nav
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "4px",
                  marginTop: "24px",
                }}
              >
                {navigationItems.map((item) => {
                  const Icon = item.icon;
                  const isExpanded = expandedMenus.has(item.label);
                  const hasSubItems = item.subItems && item.subItems.length > 0;

                  return (
                    <div key={item.label}>
                      <button
                        onClick={() => {
                          if (hasSubItems) {
                            toggleMenu(item.label);
                          } else {
                            item.onClick();
                            setMobileNavigationActive(false);
                          }
                        }}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "12px",
                          width: "100%",
                          padding: "10px 12px",
                          borderRadius: "8px",
                          fontSize: "14px",
                          fontWeight: item.matches ? 600 : 500,
                          backgroundColor: "transparent",
                          color: item.matches ? "#0066cc" : "#111827",
                          border: "none",
                          cursor: "pointer",
                          transition: "all 0.15s ease",
                          textAlign: "left",
                        }}
                      >
                        <Icon
                          className={`h-5 w-5 flex-shrink-0 ${item.matches ? "text-[#0066cc]" : "text-[#6b7280]"}`}
                        />
                        <span style={{ flex: 1 }}>{item.label}</span>
                        {hasSubItems && (
                          <ChevronDown
                            className={`h-4 w-4 transition-transform duration-200 ${isExpanded ? "rotate-180" : ""}`}
                            style={{ color: "#6b7280" }}
                          />
                        )}
                      </button>

                      {/* Sub-items for mobile */}
                      {hasSubItems && isExpanded && (
                        <div
                          style={{
                            marginLeft: "12px",
                            marginTop: "4px",
                            paddingLeft: "12px",
                            borderLeft: "2px solid #e5e7eb",
                            display: "flex",
                            flexDirection: "column",
                            gap: "2px",
                          }}
                        >
                          {item.subItems!.map((subItem) => {
                            const SubIcon = subItem.icon;
                            return (
                              <button
                                key={subItem.label}
                                onClick={() => {
                                  subItem.onClick();
                                  setMobileNavigationActive(false);
                                }}
                                style={{
                                  display: "flex",
                                  alignItems: "center",
                                  gap: "10px",
                                  width: "100%",
                                  padding: "8px 10px",
                                  borderRadius: "6px",
                                  fontSize: "13px",
                                  fontWeight: subItem.matches ? 600 : 500,
                                  backgroundColor: subItem.matches
                                    ? "#e6f0ff"
                                    : "transparent",
                                  color: subItem.matches
                                    ? "#0066cc"
                                    : "#4b5563",
                                  border: "none",
                                  cursor: "pointer",
                                  transition: "all 0.15s ease",
                                  textAlign: "left",
                                }}
                              >
                                <SubIcon
                                  className={`h-4 w-4 flex-shrink-0 ${subItem.matches ? "text-[#0066cc]" : "text-[#9ca3af]"}`}
                                />
                                <span>{subItem.label}</span>
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}

                {/* Sign Out Button - Always Visible */}
                <div
                  style={{
                    marginTop: "16px",
                    borderTop: "1px solid #e5e7eb",
                    paddingTop: "16px",
                  }}
                >
                  <button
                    onClick={() => (window.location.href = "/api/auth/logout")}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "12px",
                      width: "100%",
                      padding: "10px 12px",
                      borderRadius: "8px",
                      fontSize: "14px",
                      fontWeight: 500,
                      backgroundColor: "transparent",
                      color: "#dc2626",
                      border: "none",
                      cursor: "pointer",
                      transition: "all 0.15s ease",
                      textAlign: "left",
                    }}
                  >
                    <LogOut className="h-5 w-5 flex-shrink-0 text-[#dc2626]" />
                    Sign Out
                  </button>
                </div>
              </nav>
            </div>
          </aside>
        </div>
      )}

      {/* Main Content Area */}
      <div
        className="flex-1 flex flex-col w-full"
        style={{ position: "relative", zIndex: 10 }}
      >
        <main
          id="main-content"
          className="flex-1 overflow-auto"
          style={{
            backgroundColor: "#f9fafb",
            padding: "48px 32px",
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
