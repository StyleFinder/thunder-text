'use client';

import { ReactNode } from 'react';
import { GradientMesh } from './GradientMesh';
import { ThunderTextLogo } from './ThunderTextLogo';

interface AuthSplitLayoutProps {
  children: ReactNode;
  leftPanelContent: ReactNode;
  bottomContent?: ReactNode;
}

/**
 * AuthSplitLayout - Layout for primary auth pages (login, signup)
 * Features:
 * - Left panel with dark gradient and marketing content
 * - Right panel with white background and form
 * - Responsive (left panel hidden on mobile)
 */
export function AuthSplitLayout({ children, leftPanelContent, bottomContent }: AuthSplitLayoutProps) {
  return (
    <div className="min-h-screen flex">
      {/* Left Panel - Brand/Marketing */}
      <div className="hidden lg:flex lg:w-[420px] xl:w-[480px] relative flex-col justify-between p-8 overflow-hidden">
        <GradientMesh />

        {/* Content */}
        <div className="relative z-10">
          {/* Logo */}
          <div className="mb-12">
            <ThunderTextLogo variant="light" />
          </div>

          {leftPanelContent}
        </div>

        {/* Bottom content (testimonial, stats, etc.) */}
        {bottomContent && (
          <div className="relative z-10 pt-8 border-t" style={{ borderColor: 'rgba(255, 255, 255, 0.1)' }}>
            {bottomContent}
          </div>
        )}
      </div>

      {/* Right Panel - Form */}
      <div className="flex-1 flex items-center justify-center bg-gray-50 p-6 lg:p-12">
        <div className="w-full max-w-md">
          {/* Mobile logo */}
          <div className="lg:hidden flex items-center justify-center mb-8">
            <ThunderTextLogo variant="dark" />
          </div>

          {/* Form Card */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}
