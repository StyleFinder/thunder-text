"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Flame, LogOut, Zap, Users } from "lucide-react";
import { signOut } from "next-auth/react";

interface BHBLayoutProps {
  children: React.ReactNode;
  coachName?: string;
  coachEmail?: string;
  isAdmin?: boolean;
}

// Animated background gradient mesh (from Welcome page)
function GradientMesh() {
  return (
    <div className="absolute inset-0 overflow-hidden">
      {/* Base gradient */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "linear-gradient(135deg, #001429 0%, #002952 40%, #003d7a 100%)",
        }}
      />

      {/* Animated orbs */}
      <div
        className="absolute w-[600px] h-[600px] rounded-full blur-3xl"
        style={{
          background:
            "radial-gradient(circle, rgba(0,102,204,0.3) 0%, transparent 70%)",
          top: "-20%",
          right: "-30%",
          opacity: 0.5,
          animation: "bhb-float 20s ease-in-out infinite",
        }}
      />
      <div
        className="absolute w-[400px] h-[400px] rounded-full blur-3xl"
        style={{
          background:
            "radial-gradient(circle, rgba(0,153,255,0.25) 0%, transparent 70%)",
          bottom: "10%",
          left: "-20%",
          opacity: 0.4,
          animation: "bhb-float 25s ease-in-out infinite reverse",
        }}
      />

      {/* Subtle noise texture overlay */}
      <div
        className="absolute inset-0 opacity-[0.06]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
        }}
      />
    </div>
  );
}

interface NavItemProps {
  href: string;
  icon: React.ElementType;
  label: string;
  isActive: boolean;
}

function NavItem({ href, icon: Icon, label, isActive }: NavItemProps) {
  return (
    <Link
      href={href}
      className={`
        relative flex items-center gap-3 px-4 py-3 rounded-xl
        transition-all duration-200 group
        ${
          isActive
            ? "bg-white/15 text-white"
            : "text-white/70 hover:text-white hover:bg-white/10"
        }
      `}
    >
      <Icon className="w-5 h-5 flex-shrink-0" />
      <span className="text-sm font-medium">{label}</span>
      {isActive && (
        <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-amber-400 rounded-r-full" />
      )}
    </Link>
  );
}

export function BHBLayout({
  children,
  coachName,
  coachEmail,
  isAdmin,
}: BHBLayoutProps) {
  const pathname = usePathname();

  const navItems = [
    { href: "/bhb", icon: LayoutDashboard, label: "Dashboard" },
    { href: "/bhb/hot-takes", icon: Flame, label: "Hot Takes" },
  ];

  // Admin-only items
  const adminItems = isAdmin
    ? [{ href: "/admin/coaches", icon: Users, label: "Manage Coaches" }]
    : [];

  return (
    <div className="min-h-screen flex bg-gray-50">
      {/* Left Panel - Navigation */}
      <aside className="hidden lg:flex lg:w-[280px] xl:w-[300px] relative flex-col">
        <GradientMesh />

        {/* Content */}
        <div className="relative z-10 flex flex-col h-full p-6">
          {/* Logo & Brand */}
          <div className="mb-8">
            <div className="flex items-center gap-3 mb-1">
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center"
                style={{ backgroundColor: "rgba(255,255,255,0.15)" }}
              >
                <Zap className="w-6 h-6 text-amber-400" />
              </div>
              <span className="text-xl font-bold text-white">Thunder Text</span>
            </div>
            <p className="text-sm text-white/60 ml-[52px]">BHB Coach Portal</p>
          </div>

          {/* Coach Info */}
          {(coachName || coachEmail) && (
            <div className="mb-8 px-4 py-3 rounded-xl bg-white/10">
              <p className="text-sm font-medium text-white truncate">
                {coachName || "Coach"}
              </p>
              {coachEmail && (
                <p className="text-xs text-white/60 truncate">{coachEmail}</p>
              )}
            </div>
          )}

          {/* Navigation */}
          <nav className="flex-1 space-y-1">
            {navItems.map((item) => (
              <NavItem
                key={item.href}
                href={item.href}
                icon={item.icon}
                label={item.label}
                isActive={pathname === item.href}
              />
            ))}

            {adminItems.length > 0 && (
              <>
                <div className="my-4 border-t border-white/10" />
                <p className="px-4 text-xs font-semibold text-white/40 uppercase tracking-wider mb-2">
                  Admin
                </p>
                {adminItems.map((item) => (
                  <NavItem
                    key={item.href}
                    href={item.href}
                    icon={item.icon}
                    label={item.label}
                    isActive={pathname === item.href}
                  />
                ))}
              </>
            )}
          </nav>

          {/* Bottom Actions */}
          <div className="mt-auto pt-6 border-t border-white/10 space-y-1">
            <button
              onClick={() => signOut({ callbackUrl: "/coach/login" })}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-white/70 hover:text-white hover:bg-white/10 transition-all duration-200"
            >
              <LogOut className="w-5 h-5" />
              <span className="text-sm font-medium">Sign Out</span>
            </button>
          </div>
        </div>
      </aside>

      {/* Mobile Header */}
      <div
        className="lg:hidden fixed top-0 left-0 right-0 z-50 px-4 py-3 flex items-center justify-between"
        style={{
          background: "linear-gradient(135deg, #001429 0%, #002952 100%)",
        }}
      >
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center">
            <Zap className="w-5 h-5 text-amber-400" />
          </div>
          <span className="text-lg font-bold text-white">BHB</span>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/bhb"
            className={`p-2 rounded-lg ${pathname === "/bhb" ? "bg-white/20" : "bg-white/10"}`}
          >
            <LayoutDashboard className="w-5 h-5 text-white" />
          </Link>
          <Link
            href="/bhb/hot-takes"
            className={`p-2 rounded-lg ${pathname === "/bhb/hot-takes" ? "bg-white/20" : "bg-white/10"}`}
          >
            <Flame className="w-5 h-5 text-white" />
          </Link>
        </div>
      </div>

      {/* Main Content */}
      <main className="flex-1 lg:ml-0 mt-14 lg:mt-0">
        <div className="min-h-screen p-4 lg:p-8">{children}</div>
      </main>

      {/* Animation keyframes */}
      <style jsx global>{`
        @keyframes bhb-float {
          0%,
          100% {
            transform: translate(0, 0) rotate(0deg);
          }
          33% {
            transform: translate(10px, -10px) rotate(2deg);
          }
          66% {
            transform: translate(-5px, 5px) rotate(-1deg);
          }
        }
      `}</style>
    </div>
  );
}
